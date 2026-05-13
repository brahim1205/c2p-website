import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import {
  getPriceRangeLabel,
  groupPlansByRole,
  monetizedRoleContent,
  publicAccessRoles,
  type MonetizedRole,
  type PublicSubscriptionPlan,
} from '@/lib/publicSubscriptions';

function formatAmountOnly(amount: number) {
  return new Intl.NumberFormat('fr-SN').format(amount);
}

function formatCurrencyLabel(currency: string) {
  return currency === 'XAF' ? 'FCFA' : currency;
}

function getSupportLabel(level: string | null) {
  if (!level) return 'Standard';
  if (level === 'vip') return 'VIP';
  if (level === 'priority') return 'Prioritaire';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function getFeatureIcon(feature: string) {
  const normalized = feature.toLowerCase();
  if (normalized.includes('badge') || normalized.includes('certifi')) return 'ri-verified-badge-line';
  if (normalized.includes('matching') || normalized.includes('visibilit')) return 'ri-flashlight-line';
  if (normalized.includes('mission') || normalized.includes('demande')) return 'ri-briefcase-line';
  if (normalized.includes('cours') || normalized.includes('classe') || normalized.includes('formation')) return 'ri-book-open-line';
  if (normalized.includes('analytics') || normalized.includes('rapport') || normalized.includes('kpi')) return 'ri-line-chart-line';
  if (normalized.includes('support')) return 'ri-customer-service-2-line';
  if (normalized.includes('mentor') || normalized.includes('incubation')) return 'ri-team-line';
  if (normalized.includes('financement') || normalized.includes('levee')) return 'ri-bank-card-line';
  if (normalized.includes('projet') || normalized.includes('jalon')) return 'ri-rocket-line';
  return 'ri-check-line';
}

function getFeaturedPlanIndex(plans: PublicSubscriptionPlan[]) {
  if (plans.length <= 1) return 0;
  if (plans.length === 2) return 1;
  return 1;
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
    <div className="bg-c2p-bg text-c2p-text">
      <section className="relative overflow-hidden bg-[#ffffff] px-5 pb-18 pt-32 sm:px-8 lg:px-10 lg:pb-24 lg:pt-36">
        <img
          src="/images/brand/image8.jpeg"
          alt="Plans d abonnement C2P"
          className="absolute inset-0 h-full w-full object-cover opacity-24"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(247,248,252,0.94)_0%,rgba(247,248,252,0.78)_52%,rgba(247,248,252,0.88)_100%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="c2p-eyebrow">
            Tarifs et abonnements
          </p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#06053a] sm:text-5xl lg:text-6xl">
                Sachez avant inscription ce qui est payant, a quel prix, et ce que chaque plan debloque.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
                C2P ne demande pas un abonnement a tout le monde. Les plans concernent surtout les acteurs qui
                publient une offre ou exploitent un parcours premium : prestataires, formateurs et porteurs de projet.
              </p>
            </div>
            <div className="c2p-panel p-6">
              <p className="c2p-eyebrow text-sm tracking-[0.2em]">Quand on vous le demande</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#27346b]">
                <p>Pas a l inscription, pas a la connexion.</p>
                <p>L abonnement devient requis quand vous voulez publier un service, lancer une formation ou soumettre un projet premium.</p>
                <p>Le backend bloque ensuite les ecritures premium si aucun plan actif n existe.</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth/register" className="c2p-btn-accent px-6 py-3">
                  Creer mon compte
                </Link>
                <Link to="/auth/login" className="c2p-btn-secondary px-6 py-3">
                  Me connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#27346b]">Rôles monétisés</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#06053a] sm:text-4xl">
                Trois familles de plans publics aujourd’hui
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#27346b]">
              Chaque famille correspond à un usage métier distinct. Les prix et les fonctionnalités affichés ici sont les vrais plans actifs exposés par la plateforme.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {monetizedRoles.map((role) => {
              const content = monetizedRoleContent[role];
              const priceRange = getPriceRangeLabel(plans, role);
              return (
                <article
                  key={role}
                  className="rounded-[22px] border border-[#80bfdf] bg-white px-5 py-6 shadow-[0_18px_45px_rgba(12,14,58,0.08)] sm:rounded-[24px] sm:px-6 sm:py-7 sm:shadow-[0_22px_60px_rgba(12,14,58,0.08)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#27346b]">{content.shortLabel}</p>
                  <h3 className="mt-3 text-xl font-semibold text-[#06053a] sm:mt-4 sm:text-2xl">{content.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#27346b] sm:mt-4 sm:leading-7">{content.summary}</p>
                  <p className="mt-3 text-sm font-medium text-[#06053a] sm:mt-4">
                    {priceRange ?? (isLoading ? 'Chargement des prix...' : 'Plans indisponibles')}
                  </p>
                  <ul className="mt-4 space-y-2.5 text-sm leading-6 text-[#27346b] sm:mt-5 sm:space-y-3">
                    {content.unlocks.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <i className="ri-check-line mt-0.5 text-[#27346b]"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="senpresta-visibility" className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#27346b]">SenPresta</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#06053a] sm:text-4xl">Visibilité, alertes et vérification</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#27346b]">
              Le client a demandé trois niveaux clairs dans SenPresta : consultation visiteur, accès abonné et profil vérifié. Les plans prestataire servent aujourd’hui à porter cette logique.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: 'Visiteur',
                tone: 'border-[#d7e6fb] bg-[#f8fbff]',
                pass: 'Billet standard',
                text: 'Consulte les annonces, voit le profil résumé et passe par C2P pour la mise en relation.',
              },
              {
                title: 'Abonné',
                tone: 'border-[#80bfdf] bg-white',
                pass: 'Billet prioritaire',
                text: 'Active les alertes, ouvre plus de détails et gagne en visibilité standard sur SenPresta.',
              },
              {
                title: 'Vérifié',
                tone: 'border-[#dbad29]/30 bg-[#fff8e6]',
                pass: 'Billet premium',
                text: 'Débloque le badge C2P, la priorité de matching et la visibilité premium dans les flux.',
              },
            ].map((item) => (
              <article key={item.title} className={`rounded-[22px] border px-5 py-6 shadow-[0_18px_45px_rgba(12,14,58,0.06)] ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#27346b]">{item.title}</p>
                <p className="mt-3 inline-flex rounded-full border border-[#80bfdf]/45 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#06053a]">
                  {item.pass}
                </p>
                <p className="mt-4 text-sm leading-7 text-[#27346b]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#27346b]">À quoi sert l’abonnement</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#06053a] sm:text-4xl">L’accès premium se déclenche au premier usage</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#27346b]">
              Vous pouvez créer un compte librement. La plateforme vous demandera ensuite un plan actif quand vous voudrez utiliser une capacité premium liée à votre rôle.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {monetizedRoles.map((role, index) => (
              <article key={role} className="border-t border-[#d8cdb9] pt-5 sm:pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#27346b]">Etape 0{index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold text-[#06053a] sm:text-2xl">{monetizedRoleContent[role].label}</h3>
                <p className="mt-3 text-sm leading-6 text-[#27346b] sm:mt-4 sm:leading-7">{monetizedRoleContent[role].purpose}</p>
                <p className="mt-4 rounded-2xl bg-[#ffffff] px-4 py-4 text-sm font-medium leading-6 text-[#06053a]">
                  {monetizedRoleContent[role].gateLabel}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#27346b]">Plans actifs</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#06053a] sm:text-4xl">Prix mensuels et fonctionnalités</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#27346b]">
              Les plans ci-dessous viennent du backend public. Si l’équipe C2P modifie un tarif ou une fonctionnalité, cette page suit directement la source métier.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : (
            <div className="space-y-10">
              {monetizedRoles.map((role) => {
                const content = monetizedRoleContent[role];
                const rolePlans = [...plansByRole[role]].sort((left, right) => left.price_monthly - right.price_monthly);
                const featuredIndex = getFeaturedPlanIndex(rolePlans);
                return (
                  <section
                    id={`${role}-plans`}
                    key={role}
                    className="overflow-hidden rounded-[32px] border border-[#80bfdf] bg-[radial-gradient(circle_at_top,rgba(39,52,107,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(219,173,41,0.08),transparent_26%),linear-gradient(180deg,#ffffff,#ffffff)] px-5 py-8 text-[#06053a] shadow-[0_24px_70px_rgba(39,52,107,0.10)] sm:px-8 lg:px-10"
                  >
                    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#27346b]">{content.shortLabel}</p>
                        <h3 className="mt-3 text-3xl font-semibold text-[#06053a]">{content.label}</h3>
                      </div>
                      <p className="max-w-2xl text-sm leading-7 text-[#27346b]">{content.purpose}</p>
                    </div>

                    <div className="mb-6 flex justify-center sm:mb-8">
                      <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#80bfdf] bg-[#ffffff] px-4 py-2.5 text-center text-xs text-[#27346b] sm:gap-3 sm:px-5 sm:py-3 sm:text-sm">
                        <span className="rounded-full bg-[#27346b] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                          Mensuel
                        </span>
                        <span>Facturation active actuellement</span>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="grid gap-5 lg:grid-cols-3">
                        {[1, 2, 3].map((placeholder) => (
                          <div
                            key={placeholder}
                            className="min-h-[540px] animate-pulse rounded-[28px] border border-[#80bfdf] bg-white"
                          />
                        ))}
                      </div>
                    ) : rolePlans.length === 0 ? (
                      <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] px-6 py-6 text-sm text-[#27346b]">
                        Aucun plan public actif pour ce rôle.
                      </div>
                    ) : (
                      <div className={`grid gap-5 ${rolePlans.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                        {rolePlans.map((plan, index) => {
                          const isFeatured = index === featuredIndex;
                          const cta = getPlanCta(plan, isAuthenticated, user?.role);
                          return (
                          <article
                            key={plan.id}
                            className={`relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_50px_rgba(39,52,107,0.10)] transition-transform duration-300 sm:min-h-[560px] sm:rounded-[28px] sm:p-6 ${
                              isFeatured
                                ? 'border-[#27346b] bg-[radial-gradient(circle_at_top_left,rgba(39,52,107,0.12),transparent_42%),linear-gradient(180deg,#ffffff,#ffffff)] shadow-[0_0_0_1px_rgba(39,52,107,0.28),0_28px_80px_rgba(39,52,107,0.18)]'
                                : 'border-[#80bfdf] bg-[radial-gradient(circle_at_top_left,rgba(39,52,107,0.06),transparent_42%),linear-gradient(180deg,#ffffff,#ffffff)]'
                            }`}
                          >
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(39,52,107,0.03))]" />
                            <div>
                              <div className="relative z-10 flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <h4 className="text-xl font-semibold text-[#06053a] sm:text-2xl">{plan.name}</h4>
                                    {isFeatured ? (
                                      <span className="rounded-full bg-[#fff4ec] px-3 py-1 text-xs font-semibold text-[#d0b55e]">
                                        Le plus choisi
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-end gap-2 sm:mt-5">
                                    <span className="text-4xl font-semibold tracking-tight text-[#06053a] sm:text-5xl">
                                      {formatAmountOnly(plan.price_monthly)}
                                    </span>
                                    <span className="pb-1 text-xl font-semibold text-[#06053a] sm:text-2xl">
                                      {formatCurrencyLabel(plan.currency)}
                                    </span>
                                    <span className="pb-1.5 text-base text-[#5fa6f3] sm:pb-2 sm:text-lg">/ mois</span>
                                  </div>
                                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#27346b] sm:mt-4 sm:leading-7">
                                    {content.summary}
                                  </p>
                                </div>
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm ${
                                    isFeatured
                                      ? 'border-[#27346b] bg-[#27346b] text-white'
                                      : 'border-[#5fa6f3] text-[#5fa6f3]'
                                  }`}
                                >
                                  <i className={isFeatured ? 'ri-check-line' : 'ri-circle-line'}></i>
                                </span>
                              </div>

                              <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:mt-6">
                                <div className="rounded-2xl border border-[#80bfdf] bg-white px-3 py-3.5 sm:px-4 sm:py-4">
                                  <p className="text-lg font-semibold text-[#06053a]">{plan.commission_rate}%</p>
                                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#5fa6f3]">Commission</p>
                                </div>
                                <div className="rounded-2xl border border-[#80bfdf] bg-white px-3 py-3.5 sm:px-4 sm:py-4">
                                  <p className="text-lg font-semibold text-[#06053a]">{getSupportLabel(plan.support_level)}</p>
                                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#5fa6f3]">Support</p>
                                </div>
                              </div>

                              <ul className="relative z-10 mt-5 space-y-3 text-sm leading-6 text-[#06053a] sm:mt-6 sm:space-y-4">
                                {plan.features.map((feature) => (
                                  <li key={feature} className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#ffffff] text-[#27346b] sm:h-10 sm:w-10">
                                      <i className={`${getFeatureIcon(feature)} text-base sm:text-lg`}></i>
                                    </span>
                                    <span className="pt-0.5 text-sm leading-6 text-[#06053a] sm:pt-1 sm:text-base sm:leading-7">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <Link
                              to={cta.to}
                              className={`relative z-10 mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:mt-8 ${
                                cta.variant === 'featured_orange' && isFeatured
                                  ? 'bg-[#dbad29] text-white hover:bg-[#e1a913]'
                                  : cta.variant === 'featured_orange'
                                    ? 'bg-[#27346b] text-white hover:bg-[#5b32cb]'
                                    : 'border border-[#5fa6f3] bg-white text-[#27346b] hover:border-[#27346b] hover:bg-[#ffffff]'
                              }`}
                            >
                              {cta.label}
                            </Link>
                          </article>
                        )})}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#27346b]">Sans abonnement</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#06053a] sm:text-4xl">Qui peut entrer sans plan mensuel</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#27346b]">
              Tous les rôles ne sont pas monétisés par abonnement. C2P garde une entrée libre pour les usages d’exploration, d’achat ou d’onboarding encadré.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {publicAccessRoles.map((item) => (
              <article key={item.role} className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] px-6 py-7">
                <h3 className="text-2xl font-semibold text-[#06053a]">{item.label}</h3>
                <p className="mt-4 text-sm leading-7 text-[#27346b]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
