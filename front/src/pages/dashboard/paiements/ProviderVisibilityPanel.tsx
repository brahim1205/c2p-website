import type {
  ProviderVisibilityOrder,
  ProviderVisibilityPassRecord,
  ProviderVisibilityProduct,
} from '@/lib/saasApi';
import { formatAmount, formatDate, type PaymentMethodId } from './paymentPageModel';

interface ProviderVisibilityPanelProps {
  products: ProviderVisibilityProduct[];
  activePass: ProviderVisibilityPassRecord | null;
  latestOrder: ProviderVisibilityOrder | null;
  orders: ProviderVisibilityOrder[];
  purchasingProductId: string | null;
  availableBalance: number;
  onPurchaseProduct: (product: ProviderVisibilityProduct, paymentMethod: PaymentMethodId) => void;
}

export default function ProviderVisibilityPanel({
  products,
  activePass,
  latestOrder,
  orders,
  purchasingProductId,
  availableBalance,
  onPurchaseProduct,
}: ProviderVisibilityPanelProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div id="senpresta-visibility" className="mb-6 rounded-2xl border border-[#27346b]/10 bg-white p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Billets SenPresta</h3>
          <p className="text-sm text-gray-600">Achetez un billet pour renforcer votre visibilité, vos alertes et votre niveau de priorisation dans les flux SenPresta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activePass ? (
            <span className="rounded-full bg-[#27346b]/10 px-3 py-1 text-xs font-medium text-[#27346b]">
              Actif : {activePass.pass_label} {activePass.code ? `· ${activePass.code}` : ''}
            </span>
          ) : null}
          {latestOrder ? (
            <span className="rounded-full bg-[#dbad29]/15 px-3 py-1 text-xs font-medium text-[#8a6a12]">
              Dernier achat : {formatDate(latestOrder.purchased_at)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {products.map((product) => {
          const isCurrentTier = activePass?.pass_tier === product.tier;
          const isBusy = purchasingProductId === product.id;
          const canUseWallet = availableBalance >= Number(product.price ?? 0);
          return (
            <div key={product.id} className={`rounded-2xl border p-5 ${isCurrentTier ? 'border-[#dbad29]/40 bg-[#dbad29]/5' : 'border-gray-200 bg-white'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <p className="mt-1 text-sm text-gray-500">{formatAmount(product.price, product.currency)} / {product.duration_days} jours</p>
                </div>
                <span className="rounded-full bg-[#27346b]/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[#27346b]">
                  {product.tier}
                </span>
              </div>
              {product.description ? (
                <p className="mb-3 text-sm text-gray-600">{product.description}</p>
              ) : null}
              <ul className="space-y-2 text-sm text-gray-600">
                {product.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <i className="ri-check-line mt-0.5 text-[#27346b]"></i>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2.5 py-1">
                  Priorité {product.matching_priority}
                </span>
                {product.alerts_enabled ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1">Alertes incluses</span>
                ) : null}
                {product.verification_eligible ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1">Éligible vérification</span>
                ) : null}
              </div>
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => onPurchaseProduct(product, 'wave')}
                  disabled={isBusy}
                  className="w-full rounded-lg bg-[#27346b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d2854] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? 'Achat en cours...' : 'Payer directement'}
                </button>
                <button
                  onClick={() => onPurchaseProduct(product, 'wallet')}
                  disabled={isBusy || !canUseWallet}
                  className="w-full rounded-lg border border-[#27346b]/20 bg-white px-4 py-2 text-sm font-medium text-[#27346b] transition-colors hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Utiliser mon solde C2P
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-900">Billet actif</p>
          {activePass ? (
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p><span className="font-medium text-gray-900">{activePass.pass_label}</span> · {activePass.code}</p>
              <p>Échéance : {activePass.expires_at ? formatDate(activePass.expires_at) : 'non définie'}</p>
              <p>Source : {activePass.product_name || activePass.plan_name || 'SenPresta'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Aucun billet actif pour le moment.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Historique des achats</p>
            <span className="text-xs text-gray-500">{orders.length} achat(s)</span>
          </div>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun achat de billet enregistré.</p>
            ) : orders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{order.product_name || 'Billet SenPresta'}</p>
                    <p className="mt-1 text-sm text-gray-600">{formatDate(order.purchased_at)} · {order.pass_code || order.pass_tier}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatAmount(order.amount, order.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
