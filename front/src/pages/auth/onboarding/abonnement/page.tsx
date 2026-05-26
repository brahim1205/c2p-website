import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { activateSubscriptionPlan } from '@/lib/paymentsApi';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import { formatPlanPrice, isMonetizedRole, monetizedRoleContent, type PublicSubscriptionPlan } from '@/lib/publicSubscriptions';
import { hasAcceptedMonetizedClauses } from '@/lib/onboardingClauses';

const TRIAL_DAYS = 14;

function getPlanTone(index: number, selected: boolean) {
  if (selected || index === 1) return 'border-[#1a9a96] shadow-[0_26px_70px_rgba(26,154,150,0.16)]';
  return 'border-[#d6dbe1] shadow-[0_18px_50px_rgba(15,28,53,0.06)]';
}

function getErrorMessage(requestError: unknown, fallback: string) {
  if (requestError instanceof Error) return requestError.message;
  if (requestError && typeof requestError === 'object' && 'message' in requestError) {
    return String((requestError as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export default function OnboardingSubscriptionPage() {
  const { user, isLoading } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [submittingTrial, setSubmittingTrial] = useState(false);
  const role = user?.role;
  const content = isMonetizedRole(role) ? monetizedRoleContent[role] : null;
  const next = searchParams.get('next') || (role ? `/dashboard/${role}` : '/dashboard');
  const selectedPlanId = searchParams.get('plan');

  useEffect(() => {
    if (!role || !isMonetizedRole(role)) return;
    let mounted = true;
    void fetchPublicSubscriptionPlans(role)
      .then((response) => {
        if (!mounted) return;
        setPlans(response.filter((plan) => plan.role === role && plan.active));
      })
      .catch(() => {
        if (!mounted) return;
        setPlans([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingPlans(false);
      });

    return () => {
      mounted = false;
    };
  }, [role]);

  const recommendedTrialPlan = useMemo(() => (
    [...plans].sort((left, right) => Number(left.price_monthly || 0) - Number(right.price_monthly || 0))[0] ?? null
  ), [plans]);
  const visiblePlans = useMemo(() => {
    if (!selectedPlanId) return plans;
    return [...plans].sort((left, right) => {
      if (left.id === selectedPlanId) return -1;
      if (right.id === selectedPlanId) return 1;
      return 0;
    });
  }, [plans, selectedPlanId]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!content || !isMonetizedRole(role)) return <Navigate to={next} replace />;
  if (!hasAcceptedMonetizedClauses(user)) {
    const targetParams = new URLSearchParams(searchParams);
    targetParams.set('next', next);
    return <Navigate to={`/auth/onboarding/clauses?${targetParams.toString()}`} replace />;
  }

  const goToDashboard = () => navigate(next, { replace: true });

  const activatePlan = async (plan: PublicSubscriptionPlan) => {
    setSubmittingPlanId(plan.id);
    navigate(`/dashboard/paiements?plan=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&planRole=${encodeURIComponent(String(role))}`, { replace: true });
  };

  const startTrial = async () => {
    if (!recommendedTrialPlan) {
      error('Essai indisponible', 'Aucun plan disponible pour démarrer un essai.');
      return;
    }
    setSubmittingTrial(true);
    try {
      await activateSubscriptionPlan({
        plan_id: recommendedTrialPlan.id,
        auto_renew: false,
        trial: true,
        trial_days: TRIAL_DAYS,
      });
      success('Essai gratuit activé', `Vous avez ${TRIAL_DAYS} jours pour tester les fonctions de démarrage.`);
      goToDashboard();
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Impossible d activer l essai gratuit.');
      error('Essai impossible', message);
    } finally {
      setSubmittingTrial(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-10 text-[#0f1c35]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[30px] border border-[#d6dbe1] bg-white p-6 shadow-[0_24px_70px_rgba(15,28,53,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1a9a96]">{content.shortLabel}</p>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Choisissez votre accès C2P</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#64748b]">{content.gateLabel}</p>
            </div>
            <span className="rounded-full border border-[#d6dbe1] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-[#475569]">
              3 options disponibles
            </span>
          </div>

          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            <strong>Limites de l essai :</strong> vous pouvez démarrer votre espace et tester les fonctions de base. Les analytics avancés, les financements, les options de visibilité payantes et certaines fonctions premium demandent un plan complet.
          </div>

          {loadingPlans ? (
            <div className="mt-8 rounded-2xl border border-[#d6dbe1] bg-[#f7f8fc] p-8 text-center text-sm text-[#64748b]">
              Chargement des plans...
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#d6dbe1] bg-[#f7f8fc] p-8 text-center text-sm text-[#64748b]">
              Aucun plan actif n est disponible pour ce rôle pour le moment.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <article className="flex min-h-[360px] flex-col rounded-[24px] border border-[#d6dbe1] bg-white p-6 shadow-[0_18px_50px_rgba(15,28,53,0.06)]">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">Essai gratuit</h2>
                      <p className="mt-2 text-2xl font-bold text-[#1a9a96]">0 FCFA</p>
                    </div>
                    <span className="rounded-full bg-[#e8fbf8] px-3 py-1 text-xs font-medium text-[#0f766e]">
                      {TRIAL_DAYS} jours
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#64748b]">
                    Testez l espace sans paiement. L essai sert à démarrer, vérifier votre besoin et préparer votre abonnement.
                  </p>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-[#64748b]">
                    <li className="flex gap-3">
                      <i className="ri-check-line mt-0.5 text-[#1a9a96]" />
                      <span>Accès aux fonctions de démarrage</span>
                    </li>
                    <li className="flex gap-3">
                      <i className="ri-check-line mt-0.5 text-[#1a9a96]" />
                      <span>Création et préparation de votre espace</span>
                    </li>
                    <li className="flex gap-3">
                      <i className="ri-lock-line mt-0.5 text-amber-600" />
                      <span>Fonctions premium limitées pendant l essai</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={startTrial}
                  disabled={submittingTrial || !recommendedTrialPlan}
                  className="mt-auto w-full rounded-xl border border-[#1a9a96] bg-[#e8fbf8] px-5 py-3 text-sm font-semibold text-[#0f766e] hover:bg-[#d7f7f2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingTrial ? 'Activation...' : 'Commencer l essai gratuit'}
                </button>
              </article>
              {visiblePlans.map((plan, index) => (
                <article key={plan.id} className={`flex min-h-[360px] flex-col rounded-[24px] border bg-white p-6 ${getPlanTone(index + 1, plan.id === selectedPlanId)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{plan.name}</h2>
                        {plan.id === selectedPlanId ? (
                          <span className="rounded-full bg-[#e8fbf8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                            sélectionné
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-2xl font-bold text-[#1a9a96]">{formatPlanPrice(plan.price_monthly, plan.currency)}</p>
                    </div>
                    <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-medium text-[#475569]">
                      commission {plan.commission_rate}%
                    </span>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-[#64748b]">
                    {(plan.features || []).map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <i className="ri-check-line mt-0.5 text-[#1a9a96]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void activatePlan(plan)}
                    disabled={Boolean(submittingPlanId)}
                    className="mt-auto w-full rounded-xl bg-[#0f1c35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17233f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingPlanId === plan.id ? 'Redirection...' : 'Continuer vers le paiement'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
