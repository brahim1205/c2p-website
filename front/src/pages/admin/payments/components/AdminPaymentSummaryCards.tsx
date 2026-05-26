interface AdminPaymentSummaryCardsProps {
  commissionTotal: number;
  subscriptionMrr: number;
  activeSubscriptionsCount: number;
  pendingEscrowsCount: number;
  pendingEscrowsAmount: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
  getPanelClassName: (panel: string) => string;
}

export default function AdminPaymentSummaryCards({
  commissionTotal,
  subscriptionMrr,
  activeSubscriptionsCount,
  pendingEscrowsCount,
  pendingEscrowsAmount,
  pendingPayoutsCount,
  pendingPayoutsAmount,
  getPanelClassName,
}: AdminPaymentSummaryCardsProps) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
      <div id="panel-outbox" className={`rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm ${getPanelClassName('outbox')}`}>
        <p className="text-sm text-gray-500">Ledger total C2P</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{commissionTotal.toLocaleString('fr-FR')} FCFA</p>
        <p className="mt-2 text-sm text-gray-500">Commissions et abonnements reconnus</p>
      </div>
      <div id="panel-provider" className={`rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm ${getPanelClassName('provider')}`}>
        <p className="text-sm text-gray-500">MRR abonnements</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{subscriptionMrr.toLocaleString('fr-FR')} FCFA</p>
        <p className="mt-2 text-sm text-gray-500">{activeSubscriptionsCount} abonnement(s) actif(s)</p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-sm text-gray-500">Séquestres à superviser</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{pendingEscrowsCount}</p>
        <p className="mt-2 text-sm text-gray-500">{pendingEscrowsAmount.toLocaleString('fr-FR')} FCFA engagés</p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-sm text-gray-500">Retraits en attente</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{pendingPayoutsCount}</p>
        <p className="mt-2 text-sm text-gray-500">{pendingPayoutsAmount.toLocaleString('fr-FR')} FCFA à traiter</p>
      </div>
    </section>
  );
}
