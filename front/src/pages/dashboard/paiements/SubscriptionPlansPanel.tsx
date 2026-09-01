import { Link } from 'react-router-dom';
import type { PayoutAccount, SubscriptionPlan, UserSubscription } from '@/lib/saasApi';
import { formatAmount, type PaymentMethodId } from './paymentPageModel';

interface SubscriptionPlansPanelProps {
  activeSubscription: UserSubscription | null;
  defaultPayoutAccount: PayoutAccount | null;
  plans: SubscriptionPlan[];
  selectedPlanId: string;
  selectedPlanUnavailable: boolean;
  selectedPlanName: string;
  selectedPlanRole: string;
  availableBalance: number;
  onActivatePlan: (plan: SubscriptionPlan, paymentMethod: PaymentMethodId) => void;
}

export default function SubscriptionPlansPanel({
  activeSubscription,
  defaultPayoutAccount,
  plans,
  selectedPlanId,
  selectedPlanUnavailable,
  selectedPlanName,
  selectedPlanRole,
  availableBalance,
  onActivatePlan,
}: SubscriptionPlansPanelProps) {
  return (
    <div id="c2p-subscription-plans" className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Abonnement C2P</h3>
          <p className="text-sm text-gray-600">Le plan pilote votre niveau de commission, la priorisation et l’accès aux services SaaS.</p>
        </div>
        {defaultPayoutAccount ? (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Retrait par défaut : {defaultPayoutAccount.label}
          </span>
        ) : null}
      </div>

      {selectedPlanUnavailable ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {selectedPlanName ? `Le plan ${selectedPlanName}` : 'Ce plan'} n’est pas disponible pour votre compte actuel{selectedPlanRole ? ` (${selectedPlanRole})` : ''}.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isActive = activeSubscription?.plan_id === plan.id;
          const isSelected = selectedPlanId === String(plan.id);
          const canUseWallet = availableBalance >= Number(plan.price_monthly ?? 0);
          return (
            <div key={plan.id} className={`rounded-2xl border p-5 ${isActive ? 'border-teal-300 bg-teal-50' : isSelected ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                  <p className="mt-1 text-sm text-gray-500">{formatAmount(plan.price_monthly, plan.currency)} / mois</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-teal-700">
                  commission {plan.commission_rate}%
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {(plan.features || []).slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <i className="ri-check-line mt-0.5 text-teal-600"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/paiement?type=abonnement&plan=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&planRole=${encodeURIComponent(plan.role)}&returnTo=${encodeURIComponent('/dashboard/paiements')}`}
                className="mt-5 inline-flex w-full justify-center rounded-lg bg-[#0f1c35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#17233f]"
              >
                Continuer vers le paiement
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
