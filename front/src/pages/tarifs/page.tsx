import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import {
  groupPlansByRole,
  monetizedRoleContent,
  type MonetizedRole,
  type PublicSubscriptionPlan,
} from '@/lib/publicSubscriptions';

function formatAmountOnly(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount);
}

function formatCurrencyLabel(currency: string) {
  return currency === 'XAF' ? 'FCFA' : currency;
}

function getPlanCta(
  plan: PublicSubscriptionPlan,
  isAuthenticated: boolean,
  currentRole: string | null | undefined,
) {
  const search = new URLSearchParams({
    role: plan.role,
    plan: plan.id,
    planName: plan.name,
    planRole: plan.role,
  }).toString();

  if (!isAuthenticated) {
    return {
      to: `/auth/register?${search}`,
      label: 'Choisir ce plan',
      variant: 'featured_orange' as const,
    };
  }

  if (currentRole === plan.role || currentRole === 'admin') {
    return {
      to: `/dashboard/paiements?plan=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&planRole=${encodeURIComponent(plan.role)}`,
      label: 'Activer ce plan',
      variant: 'featured_orange' as const,
    };
  }

  return {
    to: '/dashboard/paiements',
    label: 'Voir mon abonnement',
    variant: 'secondary' as const,
  };
}

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void fetchPublicSubscriptionPlans()
      .then((response) => {
        if (!isMounted) return;
        setPlans(response);
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage('Impossible de charger les plans pour le moment.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const plansByRole = useMemo(() => groupPlansByRole(plans), [plans]);

  const monetizedRoles = Object.keys(monetizedRoleContent) as MonetizedRole[];

  return (
    <div className="public-premium-page bg-c2p-bg text-c2p-text">
      <section className="relative overflow-hidden bg-[#ffffff] px-5 pb-14 pt-28 sm:px-8 lg:px-10 lg:pb-18 lg:pt-32">
        <img
          src="/images/home/precision.jpg"
          alt="Plans d'abonnement C2P"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.36]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.84)_52%,rgba(248,250,252,0.58)_100%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="c2p-eyebrow">
            Tarifs et abonnements
          </p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#0f1c35] sm:text-5xl">
                Des plans simples pour passer à l’action.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#64748b] sm:text-lg">
                Créez votre compte gratuitement. L’abonnement intervient uniquement quand vous voulez publier,
                vendre, piloter ou développer une activité premium sur C2P.
              </p>
            </div>
            <div className="c2p-panel p-6">
              <p className="c2p-eyebrow text-sm tracking-[0.2em]">Compte gratuit</p>
              <h2 className="mt-4 text-2xl font-semibold text-[#0f1c35]">Vous pouvez démarrer sans payer.</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#64748b]">
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Créer un compte et accéder à votre espace.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Explorer les services, formations et projets publics.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Passer à un plan premium au moment où vous en avez besoin.</span></li>
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth/register" className="c2p-btn-accent px-6 py-3">
                  Créer mon compte
                </Link>
                <Link to="/auth/login" className="c2p-btn-secondary px-6 py-3">
                  Me connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a9a96]">Plans premium</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#0f1c35] sm:text-3xl">Choisissez selon votre rôle</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#64748b]">
              Chaque rôle peut démarrer gratuitement. Les plans payants débloquent les actions de publication, de gestion avancée et de visibilité.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : (
            <div className="space-y-12">
              {monetizedRoles.map((role) => {
                const content = monetizedRoleContent[role];
                const rolePlans = [...plansByRole[role]].sort((left, right) => left.price_monthly - right.price_monthly);
                const visibleRolePlans = role === 'prestataire'
                  ? rolePlans.filter((plan) => plan.price_monthly > 0)
                  : rolePlans;
                return (
                  <section
                    id={`${role}-plans`}
                    key={role}
                    className="text-[#0f1c35]"
                  >
                    <div className="mb-7 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1a9a96]">{content.shortLabel}</p>
                        <h3 className="mt-2 text-3xl font-semibold text-[#0f1c35]">{content.label}</h3>
                      </div>
                      <p className="max-w-2xl text-sm leading-6 text-[#64748b]">{content.purpose}</p>
                    </div>

                    {isLoading ? (
                      <div className="grid gap-8 lg:grid-cols-3">
                        {[1, 2, 3].map((placeholder) => (
                          <div
                            key={placeholder}
                            className="min-h-[480px] animate-pulse rounded-[22px] border border-[#d6dbe1] bg-white"
                          />
                        ))}
                      </div>
                    ) : visibleRolePlans.length === 0 ? (
                      <div className="rounded-[24px] border border-[#d6dbe1] bg-[#ffffff] px-6 py-6 text-sm text-[#64748b]">
                        Aucun plan public actif pour ce rôle.
                      </div>
                    ) : (
                      <div className="grid gap-8 lg:grid-cols-3">
                        <article className="relative flex min-h-[480px] flex-col justify-between rounded-[22px] border border-[#d6dbe1] bg-white px-7 py-8 shadow-[0_18px_46px_rgba(15,28,53,0.06)] sm:px-8">
                          <div>
                            <p className="text-xl font-semibold text-[#0f1c35]">Essentiel</p>
                            <div className="mt-3">
                              <span className="block text-5xl font-semibold tracking-tight text-[#0f1c35]">Gratuit</span>
                            </div>
                            <p className="mt-4 max-w-xs text-base leading-7 text-[#475569]">
                              Démarrez votre parcours sur C2P sans frais.
                            </p>
                            <ul className="mt-7 space-y-4 text-sm leading-6 text-[#0f1c35]">
                              <li className="flex items-start gap-3"><i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i><span>Accès au compte de base</span></li>
                              <li className="flex items-start gap-3"><i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i><span>Préparer votre profil public</span></li>
                              <li className="flex items-start gap-3"><i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i><span>Explorer les services et formations</span></li>
                              <li className="flex items-start gap-3"><i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i><span>Passer au premium quand vous êtes prêt</span></li>
                            </ul>
                          </div>
                          <Link to={`/auth/register?role=${role}`} className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-[#d6dbe1] bg-white px-5 py-4 text-base font-semibold text-[#0f1c35] transition-colors hover:border-[#1a9a96]">
                            Créer un compte
                          </Link>
                        </article>
                        {visibleRolePlans.map((plan, index) => {
                          const isPopular = index === 0;
                          const isBestValue = index === 1;
                          const cta = getPlanCta(plan, isAuthenticated, user?.role);
                          return (
                            <article
                              key={plan.id}
                              className={`relative flex min-h-[480px] flex-col justify-between rounded-[22px] border bg-white px-7 py-8 shadow-[0_18px_46px_rgba(15,28,53,0.06)] sm:px-8 ${
                                isPopular
                                  ? 'border-[#08b84f]'
                                  : isBestValue
                                    ? 'border-[#f5bb00]'
                                    : 'border-[#d6dbe1]'
                              }`}
                            >
                              {isPopular || isBestValue ? (
                                <span
                                  className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-6 py-2 text-sm font-semibold text-white ${
                                    isBestValue ? 'bg-[#f5bb00] text-[#0f1c35]' : 'bg-[#08a846]'
                                  }`}
                                >
                                  {isBestValue ? 'Meilleure valeur' : 'Le plus populaire'}
                                </span>
                              ) : null}
                              <div>
                                <h4 className="text-xl font-semibold text-[#0f1c35]">{plan.name}</h4>
                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                  <span className="text-5xl font-semibold tracking-tight text-[#0f1c35]">
                                    {formatAmountOnly(plan.price_monthly)}
                                  </span>
                                  <span className="pb-2 text-base text-[#64748b]">
                                    {formatCurrencyLabel(plan.currency)}/mois
                                  </span>
                                </div>
                                <p className="mt-4 max-w-xs text-base leading-7 text-[#475569]">
                                  {content.summary}
                                </p>

                                <ul className="mt-7 space-y-4 text-sm leading-6 text-[#0f1c35]">
                                  {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                      <i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i>
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Link
                                to={cta.to}
                                className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-5 py-4 text-base font-semibold transition-colors ${
                                  isBestValue
                                    ? 'bg-[#ffc400] text-[#0f1c35] hover:bg-[#f2b800]'
                                    : isPopular
                                      ? 'bg-[#08a846] text-white hover:bg-[#078f3d]'
                                      : cta.variant === 'featured_orange'
                                        ? 'bg-[#0f1c35] text-white hover:bg-[#1b2d4a]'
                                        : 'border border-[#d6dbe1] bg-white text-[#0f1c35] hover:border-[#1a9a96]'
                                }`}
                              >
                                {isBestValue ? "Contacter l'équipe" : isPopular ? 'Commencer maintenant' : cta.label}
                              </Link>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
