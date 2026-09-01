import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import WavePaymentQr from '@/components/feature/WavePaymentQr';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createClientManagedBooking } from '@/lib/clientDashboardApi';
import { getCourseDeliveryLabel } from '@/lib/courseDelivery';
import {
  enrollEspaceCourse,
  fetchEspaceCourseContext,
  fetchEspaceCourseDetail,
  purchaseEspaceCourse,
  purchaseEspaceCourseWithExternalPayment,
} from '@/lib/espaceNumeriqueApi';
import {
  activateSubscriptionPlan,
  createWavePaymentIntent,
  type WavePaymentIntent,
} from '@/lib/paymentsApi';
import {
  clearPendingPrestationPayment,
  readPendingPrestationPayment,
  type PendingPrestationPayment,
} from '@/lib/paymentCheckoutStorage';
import { fetchFinanceTransactions, fetchSubscriptionPlans, type FinanceTransaction, type SubscriptionPlan } from '@/lib/saasApi';
import { formatCoursePrice, isPaidCourse, type Course, type EnrollmentRecord } from '../espace-numerique/formation/formationDetailModel';

type PaymentKind = 'formation' | 'abonnement' | 'prestation';

function formatAmount(amount: number, currency = 'FCFA') {
  return `${new Intl.NumberFormat('fr-SN').format(amount)} ${currency === 'XAF' ? 'FCFA' : currency}`;
}

export default function PaymentCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const kind = (searchParams.get('type') || '').trim() as PaymentKind;
  const returnTo = searchParams.get('returnTo') || '';
  const courseId = searchParams.get('course') || '';
  const planId = searchParams.get('plan') || '';
  const planRole = searchParams.get('planRole') || user?.role || '';

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pendingPrestation, setPendingPrestation] = useState<PendingPrestationPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waveIntent, setWaveIntent] = useState<WavePaymentIntent | null>(null);
  const [creatingWaveIntent, setCreatingWaveIntent] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user?.id) {
      navigate('/auth/login', { replace: true, state: { from: `/paiement?${searchParams.toString()}` } });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        if (kind === 'formation' && courseId) {
          const [snapshot, context] = await Promise.all([
            fetchEspaceCourseDetail(courseId),
            fetchEspaceCourseContext(courseId).catch(() => ({ enrollment: null, lessonProgress: [] })),
          ]);
          setCourse((snapshot.course as Course | null) || null);
          setEnrollment((context.enrollment as EnrollmentRecord | null) || null);
        }

        if (kind === 'abonnement') {
          setPlans(await fetchSubscriptionPlans(planRole || undefined));
        }

        if (kind === 'prestation') {
          setPendingPrestation(readPendingPrestationPayment());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [courseId, isLoading, kind, navigate, planRole, searchParams, user?.id]);

  const plan = useMemo(() => plans.find((entry) => String(entry.id) === String(planId)) ?? null, [planId, plans]);
  const participantName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Utilisateur C2P';

  const payableAmount = useMemo(() => {
    if (kind === 'formation' && course) {
      return isPaidCourse(course) ? Number(course.current_price ?? course.price ?? 0) : 0;
    }
    if (kind === 'abonnement' && plan) {
      return Number(plan.price_monthly ?? 0);
    }
    if (kind === 'prestation' && pendingPrestation) {
      return Number(pendingPrestation.price ?? 0);
    }
    return 0;
  }, [course, kind, pendingPrestation, plan]);

  const summary = useMemo(() => {
    if (kind === 'formation' && course) {
      return {
        eyebrow: 'Paiement formation',
        title: course.title,
        amount: isPaidCourse(course) ? formatCoursePrice(course) : 'Gratuit',
        lines: [
          ['Participant', participantName],
          ['Email', user?.email || 'Non renseigné'],
          ['Format', getCourseDeliveryLabel(course.delivery_mode)],
        ],
      };
    }
    if (kind === 'abonnement' && plan) {
      return {
        eyebrow: 'Paiement abonnement',
        title: plan.name,
        amount: formatAmount(Number(plan.price_monthly || 0), plan.currency),
        lines: [
          ['Rôle', plan.role],
          ['Commission', `${plan.commission_rate}%`],
          ['Renouvellement', plan.duration_unit === 'an' ? 'Annuel' : 'Mensuel'],
        ],
      };
    }
    if (kind === 'prestation' && pendingPrestation) {
      return {
        eyebrow: 'Paiement prestation',
        title: pendingPrestation.service,
        amount: pendingPrestation.price ? formatAmount(Number(pendingPrestation.price)) : 'Sur devis',
        lines: [
          ['Client', `${pendingPrestation.user.firstName} ${pendingPrestation.user.lastName}`],
          ['Date', `${pendingPrestation.bookingDate} ${pendingPrestation.bookingTime || ''}`.trim()],
          ['Adresse', pendingPrestation.address],
        ],
      };
    }
    return null;
  }, [course, kind, participantName, pendingPrestation, plan, user?.email]);

  const paymentTarget = useMemo(() => {
    if (kind === 'formation' && course) {
      return { id: String(course.id), label: `Formation - ${course.title}` };
    }
    if (kind === 'abonnement' && plan) {
      return { id: String(plan.id), label: `Abonnement - ${plan.name}` };
    }
    if (kind === 'prestation' && pendingPrestation) {
      return { id: String(pendingPrestation.requestedProviderId), label: `Prestation - ${pendingPrestation.service}` };
    }
    return null;
  }, [course, kind, pendingPrestation, plan]);

  const startWavePayment = async () => {
    if (!paymentTarget || payableAmount <= 0) {
      toastError('Paiement Wave indisponible', 'Aucun montant payant à régler.');
      return;
    }
    setCreatingWaveIntent(true);
    try {
      const intent = await createWavePaymentIntent({
        amount: payableAmount,
        currency: 'XAF',
        description: paymentTarget.label,
        target_type: kind,
        target_id: paymentTarget.id,
        return_to: returnTo || window.location.pathname + window.location.search,
      });
      setWaveIntent(intent);
      window.open(intent.paymentUrl, '_blank', 'noopener,noreferrer');
      success('Paiement Wave lancé', `Référence à indiquer si besoin : ${intent.reference}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Impossible de préparer le paiement Wave.';
      toastError('Wave indisponible', message);
    } finally {
      setCreatingWaveIntent(false);
    }
  };

  const findConfirmedWaveTransaction = async () => {
    if (!waveIntent?.transaction?.id) {
      toastError('Paiement Wave requis', 'Lancez d’abord le paiement Wave.');
      return null;
    }
    const transactions = await fetchFinanceTransactions();
    const transaction = transactions.find((entry) => String(entry.id) === String(waveIntent.transaction.id));
    if (!transaction || transaction.status !== 'completed') {
      toastError(
        'Paiement Wave non confirmé',
        'Le paiement est encore en attente. C2P doit recevoir ou valider la transaction avant de débloquer l’accès.',
      );
      return null;
    }
    if (Number(transaction.amount ?? 0) < payableAmount) {
      toastError('Montant insuffisant', 'Le paiement confirmé ne couvre pas le montant demandé.');
      return null;
    }
    return transaction;
  };

  const finalizeWavePayment = async (transaction: FinanceTransaction) => {
    if (kind === 'formation') {
      if (!course) throw new Error('Formation introuvable.');
      await purchaseEspaceCourseWithExternalPayment(course.id, transaction.id);
      success('Accès activé', `Votre accès à "${course.title}" est actif.`);
      navigate('/espace-numerique/mon-apprentissage');
      return;
    }

    if (kind === 'abonnement') {
      if (!plan) throw new Error('Plan introuvable.');
      await activateSubscriptionPlan({
        plan_id: plan.id,
        payment_method: 'wave',
        confirmed_transaction_id: transaction.id,
        auto_renew: true,
        renew_now: true,
      });
      success('Abonnement activé', `Le plan ${plan.name} est actif.`);
      navigate(returnTo || (plan.role ? `/dashboard/${plan.role}` : '/dashboard'));
      return;
    }

    if (kind === 'prestation') {
      if (!pendingPrestation) throw new Error('Demande introuvable.');
      await createClientManagedBooking({
        ...pendingPrestation,
        paymentMethod: 'wave',
        paymentTransactionId: transaction.id,
        financialOperationId: transaction.financial_operation_id ?? waveIntent?.transaction?.financial_operation_id ?? null,
      });
      clearPendingPrestationPayment();
      success('Demande créée', 'Votre demande a été transmise à C2P avec le paiement confirmé.');
      navigate(pendingPrestation.returnTo || returnTo || '/dashboard/client/reservations');
    }
  };

  const finalizePayment = async (paymentMethod: 'wallet' | 'wave') => {
    setSubmitting(true);
    try {
      if (paymentMethod === 'wave') {
        const transaction = await findConfirmedWaveTransaction();
        if (!transaction) return;
        await finalizeWavePayment(transaction);
        return;
      }

      if (kind === 'formation') {
        if (!course) throw new Error('Formation introuvable.');
        if (paymentMethod === 'wallet' && isPaidCourse(course)) {
          await purchaseEspaceCourse(course.id);
        } else if (!isPaidCourse(course)) {
          await enrollEspaceCourse(course.id);
        }
        success('Accès activé', `Votre accès à "${course.title}" est actif.`);
        navigate('/espace-numerique/mon-apprentissage');
        return;
      }

      if (kind === 'abonnement') {
        if (!plan) throw new Error('Plan introuvable.');
        await activateSubscriptionPlan({ plan_id: plan.id, payment_method: paymentMethod, auto_renew: true, renew_now: true });
        success('Abonnement activé', `Le plan ${plan.name} est actif.`);
        navigate(returnTo || (plan.role ? `/dashboard/${plan.role}` : '/dashboard'));
        return;
      }

      if (kind === 'prestation') {
        if (!pendingPrestation) throw new Error('Demande introuvable.');
        await createClientManagedBooking({ ...pendingPrestation, paymentMethod });
        clearPendingPrestationPayment();
        success('Demande créée', 'Votre demande a été transmise à C2P avec le mode de paiement choisi.');
        navigate(pendingPrestation.returnTo || returnTo || '/dashboard/client/reservations');
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Impossible de finaliser ce paiement.';
      toastError('Paiement impossible', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoading && !user) return <Navigate to="/auth/login" replace />;

  if (loading || isLoading) {
    return (
      <div className="public-premium-page flex min-h-screen items-center justify-center bg-[#f6fbf6]">
        <div className="h-16 w-16 animate-pulse rounded-full bg-teal-100" />
      </div>
    );
  }

  if (!summary || (kind === 'formation' && enrollment)) {
    return (
      <div className="public-premium-page flex min-h-screen items-center justify-center bg-[#f6fbf6] px-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#0f1c35]">{enrollment ? 'Accès déjà actif' : 'Paiement introuvable'}</h1>
          <Link to={enrollment ? '/espace-numerique/mon-apprentissage' : '/'} className="mt-5 inline-flex rounded-2xl bg-[#0f1c35] px-5 py-3 font-bold text-white">
            Continuer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="public-premium-page min-h-screen bg-[#f6fbf6] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[34px] bg-white p-5 shadow-[0_22px_70px_rgba(15,28,53,0.08)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-teal-700">{summary.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-[#0f1c35] sm:text-4xl">Finaliser le paiement C2P</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748b]">
                Tous les paiements passent par cette page. Choisissez Wave ou votre portefeuille C2P, puis finalisez l’action.
              </p>

              <div className="mt-7 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#64748b]">Résumé</p>
                <h2 className="mt-2 text-2xl font-bold text-[#0f1c35]">{summary.title}</h2>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {summary.lines.map(([label, value]) => (
                    <PaymentInfo key={label} label={label} value={value} />
                  ))}
                  <PaymentInfo label="Montant" value={summary.amount} strong />
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <WavePaymentQr />
              {waveIntent ? (
                <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Référence Wave</p>
                  <p className="mt-2 text-2xl font-black text-[#0f1c35]">{waveIntent.reference}</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    Après paiement, cliquez sur vérifier. L’accès ne s’active que si la transaction est confirmée.
                  </p>
                  <a
                    href={waveIntent.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full justify-center rounded-2xl border border-sky-200 bg-white px-5 py-3 font-bold text-sky-700"
                  >
                    Rouvrir Wave
                  </a>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (waveIntent) {
                    void finalizePayment('wave');
                  } else {
                    void startWavePayment();
                  }
                }}
                disabled={submitting || creatingWaveIntent || payableAmount <= 0}
                className="w-full rounded-2xl border border-[#1e90ff] bg-white px-5 py-3 font-bold text-[#1e90ff] transition hover:bg-sky-50 disabled:opacity-60"
              >
                {submitting
                  ? 'Vérification...'
                  : creatingWaveIntent
                    ? 'Préparation Wave...'
                    : waveIntent
                      ? 'Vérifier et finaliser'
                      : 'Payer avec Wave'}
              </button>

              <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5">
                <h2 className="text-xl font-bold text-[#0f1c35]">Portefeuille C2P</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">Débit immédiat si votre solde C2P est suffisant.</p>
                <button
                  type="button"
                  onClick={() => void finalizePayment('wallet')}
                  disabled={submitting}
                  className="mt-5 w-full rounded-2xl bg-[#0f1c35] px-5 py-3 font-bold text-white transition hover:bg-[#172947] disabled:opacity-60"
                >
                  {submitting ? 'Paiement en cours...' : 'Payer avec mon portefeuille C2P'}
                </button>
                <Link to="/dashboard/paiements" className="mt-3 inline-flex w-full justify-center rounded-2xl border border-teal-200 bg-white px-5 py-3 font-semibold text-teal-800">
                  Recharger mon portefeuille
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function PaymentInfo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className={`mt-1 ${strong ? 'font-black text-teal-700' : 'font-semibold text-[#0f1c35]'}`}>{value}</p>
    </div>
  );
}
