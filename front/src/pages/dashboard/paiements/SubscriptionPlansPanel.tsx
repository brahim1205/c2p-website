import type { PayoutAccount, SubscriptionPlan, UserSubscription } from '@/lib/saasApi';
import { formatAmount, type PaymentMethodId } from './paymentPageModel';

interface SubscriptionPlansPanelProps {
  activeSubscription: UserSubscription | null;
  defaultPayoutAccount: PayoutAccount | null;
  plans: SubscriptionPlan[];
  selectedPlanId: string;
  selectedPlan: SubscriptionPlan | null;
  selectedPlanUnavailable: boolean;
  selectedPlanName: string;
  selectedPlanRole: string;
  availableBalance: number;
  dexPayAvailable: boolean;
  onActivatePlan: (plan: SubscriptionPlan, paymentMethod: PaymentMethodId) => void;
}

export default function SubscriptionPlansPanel({
  activeSubscription,
  defaultPayoutAccount,
  plans,
  selectedPlanId,
  selectedPlan,
  selectedPlanUnavailable,
  selectedPlanName,
  selectedPlanRole,
  availableBalance,
  dexPayAvailable,
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

      {selectedPlan ? (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Plan cible : <strong>{selectedPlan.name}</strong>. Vous pouvez l’activer directement ci-dessous.
        </div>
      ) : selectedPlanUnavailable ? (
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
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => onActivatePlan(plan, dexPayAvailable ? 'dexpay' : 'wave')}
                  className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  {isActive ? 'Renouveler directement' : 'Payer directement'}
                </button>
                <button
                  onClick={() => onActivatePlan(plan, 'wallet')}
                  disabled={!canUseWallet}
                  className="w-full rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Utiliser mon solde C2P
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
