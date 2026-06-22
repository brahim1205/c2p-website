import { Link } from 'react-router-dom';
import {
  getPlanPeriod,
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
    return { to: `/auth/register?${search}`, label: 'Choisir ce plan', variant: 'featured_orange' as const };
  }

  if (currentRole === plan.role || currentRole === 'admin') {
    return {
      to: `/dashboard/paiements?plan=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&planRole=${encodeURIComponent(plan.role)}`,
      label: 'Activer ce plan',
      variant: 'featured_orange' as const,
    };
  }

  return { to: '/dashboard/paiements', label: 'Voir mon abonnement', variant: 'secondary' as const };
}

export function FreePlanCard({ role }: { role: MonetizedRole }) {
  return (
    <article className="relative flex min-h-[480px] flex-col justify-between rounded-[22px] border border-[#d6dbe1] bg-white px-7 py-8 shadow-[0_18px_46px_rgba(15,28,53,0.06)] sm:px-8">
      <div>
        <p className="text-xl font-semibold text-[#0f1c35]">Essentiel</p>
        <div className="mt-3">
          <span className="block text-5xl font-semibold tracking-tight text-[#0f1c35]">Gratuit</span>
        </div>
        <p className="mt-4 max-w-xs text-base leading-7 text-[#475569]">Démarrez votre parcours sur C2P sans frais.</p>
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
  );
}

type PaidPlanCardProps = {
  plan: PublicSubscriptionPlan;
  contentSummary: string;
  index: number;
  isAuthenticated: boolean;
  currentRole: string | null | undefined;
};

export function PaidPlanCard({ plan, contentSummary, index, isAuthenticated, currentRole }: PaidPlanCardProps) {
  const isPopular = index === 0;
  const isBestValue = index === 1;
  const cta = getPlanCta(plan, isAuthenticated, currentRole);
  const period = getPlanPeriod(plan);

  return (
    <article className={`relative flex min-h-[480px] flex-col justify-between rounded-[22px] border bg-white px-7 py-8 shadow-[0_18px_46px_rgba(15,28,53,0.06)] sm:px-8 ${isPopular ? 'border-[#08b84f]' : isBestValue ? 'border-[#f5bb00]' : 'border-[#d6dbe1]'}`}>
      {isPopular || isBestValue ? (
        <span className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-6 py-2 text-sm font-semibold text-white ${isBestValue ? 'bg-[#f5bb00] text-[#0f1c35]' : 'bg-[#08a846]'}`}>
          {isBestValue ? 'Meilleure valeur' : 'Le plus populaire'}
        </span>
      ) : null}
      <div>
        <h4 className="text-xl font-semibold text-[#0f1c35]">{plan.name}</h4>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <span className="text-5xl font-semibold tracking-tight text-[#0f1c35]">{formatAmountOnly(plan.price_monthly)}</span>
          <span className="pb-2 text-base text-[#64748b]">{formatCurrencyLabel(plan.currency)}{period.suffix}</span>
        </div>
        {period.label || plan.promotional ? (
          <p className="mt-2 text-sm font-medium text-[#1a9a96]">
            {[period.label, plan.promotional ? 'Tarif promotionnel' : ''].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <p className="mt-4 max-w-xs text-base leading-7 text-[#475569]">{plan.description || contentSummary}</p>
        <ul className="mt-7 space-y-4 text-sm leading-6 text-[#0f1c35]">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <i className="ri-checkbox-circle-line mt-0.5 text-xl text-[#08b84f]"></i>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link to={cta.to} className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-5 py-4 text-base font-semibold transition-colors ${isBestValue ? 'bg-[#ffc400] text-[#0f1c35] hover:bg-[#f2b800]' : isPopular ? 'bg-[#08a846] text-white hover:bg-[#078f3d]' : cta.variant === 'featured_orange' ? 'bg-[#0f1c35] text-white hover:bg-[#1b2d4a]' : 'border border-[#d6dbe1] bg-white text-[#0f1c35] hover:border-[#1a9a96]'}`}>
        {isBestValue ? "Contacter l'équipe" : isPopular ? 'Commencer maintenant' : cta.label}
      </Link>
    </article>
  );
}
