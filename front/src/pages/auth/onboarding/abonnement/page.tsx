import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import { formatPlanPrice, isMonetizedRole, monetizedRoleContent, type PublicSubscriptionPlan } from '@/lib/publicSubscriptions';
import { hasAcceptedMonetizedClauses } from '@/lib/onboardingClauses';

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

  const paidPlans = useMemo(() => plans.filter((plan) => Number(plan.price_monthly || 0) > 0), [plans]);
  const visiblePlans = useMemo(() => {
    if (!selectedPlanId) return paidPlans;
    return [...paidPlans].sort((left, right) => {
      if (left.id === selectedPlanId) return -1;
      if (right.id === selectedPlanId) return 1;
      return 0;
    });
  }, [paidPlans, selectedPlanId]);

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
    navigate(
      `/paiement?type=abonnement&plan=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&planRole=${encodeURIComponent(String(role))}&returnTo=${encodeURIComponent(next)}`,
      { replace: true },
    );
  };

  return (
    <main className="min-h-dvh bg-[#e8f5d8] px-3 py-3 text-[#0f1c35] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1050px] items-center justify-center">
        <section className="w-full rounded-[16px] border border-[#d6dbe1] bg-white px-5 py-4 shadow-[0_20px_56px_rgba(15,28,53,0.10)] sm:px-7 sm:py-5">
          <div className="mb-5">
            <div className="flex max-w-[270px] gap-1.5" aria-hidden="true">
              {Array.from({ length: 4 }, (_, item) => (
                <span key={item} className="h-1.5 flex-1 rounded-full bg-[#4d7f16]" />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#64748b]">
              <span className="rounded-full bg-[#e8f5d8] px-2.5 py-1 text-[#4d7f16]">Étape 4/4</span>
              <span>Accès {content.shortLabel.toLowerCase()}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1a9a96]">{content.shortLabel}</p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-[32px]">Choisissez votre abonnement C2P</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">{content.gateLabel}</p>
            </div>
            <span className="rounded-full border border-[#d6dbe1] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-[#475569]">
              {visiblePlans.length} option{visiblePlans.length > 1 ? 's' : ''} disponible{visiblePlans.length > 1 ? 's' : ''}
            </span>
          </div>

          {loadingPlans ? (
            <div className="mt-6 rounded-2xl border border-[#d6dbe1] bg-[#f7f8fc] p-8 text-center text-sm text-[#64748b]">
              Chargement des plans...
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#d6dbe1] bg-[#f7f8fc] p-8 text-center text-sm text-[#64748b]">
              Aucun plan actif n est disponible pour ce rôle pour le moment.
            </div>
          ) : (
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {visiblePlans.map((plan, index) => (
                <article key={plan.id} className={`flex min-h-[315px] flex-col rounded-[20px] border bg-white p-5 ${getPlanTone(index + 1, plan.id === selectedPlanId)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{plan.name}</h2>
                        {plan.id === selectedPlanId ? (
                          <span className="rounded-full bg-[#e8fbf8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                            sélectionné
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xl font-bold text-[#1a9a96]">{formatPlanPrice(plan.price_monthly, plan.currency)}</p>
                    </div>
                    <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-medium text-[#475569]">
                      commission {plan.commission_rate}%
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2.5 text-sm leading-6 text-[#64748b]">
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
                    className="mt-auto w-full rounded-xl bg-[#0f1c35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17233f] disabled:cursor-not-allowed disabled:opacity-50"
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
