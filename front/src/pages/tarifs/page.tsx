import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import { usePageMeta } from '@/lib/usePageMeta';
import {
  groupPlansByRole,
  monetizedRoleContent,
  type MonetizedRole,
  type PublicSubscriptionPlan,
} from '@/lib/publicSubscriptions';
import { FreePlanCard, PaidPlanCard } from './PricingPlanCards';

export default function PricingPage() {
  usePageMeta({
    title: 'Tarifs C2P | Abonnements prestataires, formateurs et partenaires',
    description: 'Comparez les plans C2P pour publier vos services, vendre vos formations, accompagner des projets ou rejoindre le réseau partenaire.',
    path: '/tarifs',
    image: 'https://c2p.sn/images/brand/images11.jpeg',
  });

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
    <div className="public-premium-page bg-[#fbfdf7] text-c2p-text">
      <section className="relative overflow-hidden bg-[#e8f5d8] px-4 pb-10 pt-[92px] sm:px-6 lg:px-20 lg:pb-16 lg:pt-28">
        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-[#f5c542]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#147f7b] shadow-sm">
              <i className="ri-price-tag-3-line text-lg" />
              Tarifs et abonnements
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] text-[#0f1c35] sm:text-5xl lg:text-6xl">
              Des plans simples pour évoluer sur C2P.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#506176] sm:text-lg">
              Créez votre compte gratuitement. Les abonnements débloquent les actions premium : publier, vendre, financer, accompagner ou développer votre activité.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth/register" className="c2p-btn-accent px-7 py-4">
                Créer mon compte
              </Link>
              <a href="#plans-premium" className="c2p-btn-secondary bg-white px-7 py-4">
                Voir les plans
              </a>
            </div>
          </div>

          <div className="relative">
            <img
              src="/images/brand/images11.jpeg"
              alt="Plans d'abonnement C2P"
              className="h-[320px] w-full rounded-[32px] object-cover object-center shadow-[0_28px_80px_rgba(15,28,53,0.16)] sm:h-[430px] lg:h-[520px]"
            />
            <div className="absolute right-4 top-4 rounded-3xl bg-white/92 px-5 py-4 shadow-[0_18px_45px_rgba(15,28,53,0.12)]">
              <p className="text-2xl font-black text-[#147f7b]">Promo</p>
              <p className="text-xs font-semibold text-[#64748b]">tarifs évolutifs</p>
            </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-3xl bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,28,53,0.12)] backdrop-blur">
              <p className="text-sm font-black text-[#0f1c35]">Compte gratuit</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#64748b]">
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Créer un compte et accéder à votre espace.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Explorer les services, formations et projets publics.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Passer à un plan premium au moment où vous en avez besoin.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="plans-premium" className="px-4 py-10 sm:px-6 lg:px-20 lg:py-14">
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
          <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            Offre promotionnelle en cours, sans période d’essai. Les plans Pro sont valables 1 mois et les plans Premium 1 an.
            Les tarifs pourront évoluer après la phase de promotion.
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
                        {role !== 'partenaire' ? (
                          <FreePlanCard role={role} />
                        ) : null}
                        {visibleRolePlans.map((plan, index) => (
                          <PaidPlanCard
                            key={plan.id}
                            plan={plan}
                            contentSummary={content.summary}
                            index={index}
                            isAuthenticated={isAuthenticated}
                            currentRole={user?.role}
                          />
                        ))}
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
