interface AdminEscrowOperationRow {
  id: string | number;
  booking_id: string | number;
  booking_title?: string | null;
  service?: string | null;
  status: string;
  amount_total?: number | string | null;
  provider_amount?: number | string | null;
  client: string;
  provider: string;
}

interface AdminPayoutOperationRow {
  id: string | number;
  user: string;
  account_label?: string | null;
  method?: string | null;
  status: string;
  amount?: number | string | null;
}

interface AdminSubscriptionOperationRow {
  id: string | number;
  user: string;
  plan_name: string;
  renews_at: string | Date;
  amount?: number | string | null;
}

interface AdminFinanceOperationsPanelProps<TEscrow extends AdminEscrowOperationRow, TPayout extends AdminPayoutOperationRow, TSubscription extends AdminSubscriptionOperationRow> {
  pendingEscrows: TEscrow[];
  pendingPayouts: TPayout[];
  activeSubscriptions: TSubscription[];
  canReleaseEscrow: (escrow: TEscrow) => boolean;
  canRefundEscrow: (escrow: TEscrow) => boolean;
  canApprovePayout: (request: TPayout) => boolean;
  canMarkPayoutPaid: (request: TPayout) => boolean;
  canRejectPayout: (request: TPayout) => boolean;
  onEscrowAction: (escrow: TEscrow, status: 'released' | 'refunded') => void;
  onPayoutAction: (request: TPayout, status: 'approved' | 'paid' | 'rejected') => void;
}

export default function AdminFinanceOperationsPanel<TEscrow extends AdminEscrowOperationRow, TPayout extends AdminPayoutOperationRow, TSubscription extends AdminSubscriptionOperationRow>({
  pendingEscrows,
  pendingPayouts,
  activeSubscriptions,
  canReleaseEscrow,
  canRefundEscrow,
  canApprovePayout,
  canMarkPayoutPaid,
  canRejectPayout,
  onEscrowAction,
  onPayoutAction,
}: AdminFinanceOperationsPanelProps<TEscrow, TPayout, TSubscription>) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Séquestres C2P</h2>
            <p className="text-sm text-gray-500">Validation finale avant libération ou remboursement.</p>
          </div>
          <span className="text-sm text-gray-500">{pendingEscrows.length} dossier(s)</span>
        </div>
        <div className="space-y-3">
          {pendingEscrows.slice(0, 5).map((escrow) => (
            <div key={escrow.id} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{escrow.booking_title || escrow.service || `Mission ${escrow.booking_id}`}</p>
                  <p className="mt-1 text-sm text-gray-600">{escrow.client} → {escrow.provider}</p>
                  <p className="mt-1 text-xs text-gray-500">Statut: {escrow.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{Number(escrow.amount_total || 0).toLocaleString('fr-FR')} FCFA</p>
                  <p className="mt-1 text-xs text-gray-500">Net prestataire {Number(escrow.provider_amount || 0).toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canReleaseEscrow(escrow) ? (
                  <button onClick={() => onEscrowAction(escrow, 'released')} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">
                    Libérer
                  </button>
                ) : null}
                {canRefundEscrow(escrow) ? (
                  <button onClick={() => onEscrowAction(escrow, 'refunded')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                    Rembourser
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {pendingEscrows.length === 0 && <p className="text-sm text-gray-500">Aucun séquestre à traiter.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Retraits et abonnements</h2>
            <p className="text-sm text-gray-500">Décaissements à approuver et base récurrente active.</p>
          </div>
          <span className="text-sm text-gray-500">{pendingPayouts.length} retrait(s)</span>
        </div>
        <div className="space-y-3">
          {pendingPayouts.slice(0, 4).map((request) => (
            <div key={request.id} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{request.user}</p>
                  <p className="mt-1 text-sm text-gray-600">{request.account_label || request.method}</p>
                  <p className="mt-1 text-xs text-gray-500">{request.status}</p>
                </div>
                <p className="font-semibold text-gray-900">{Number(request.amount || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canApprovePayout(request) ? (
                  <button onClick={() => onPayoutAction(request, 'approved')} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    Approuver
                  </button>
                ) : null}
                {canMarkPayoutPaid(request) ? (
                  <button onClick={() => onPayoutAction(request, 'paid')} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">
                    Marquer payé
                  </button>
                ) : null}
                {canRejectPayout(request) ? (
                  <button onClick={() => onPayoutAction(request, 'rejected')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                    Rejeter
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {activeSubscriptions.slice(0, 3).map((subscription) => (
            <div key={subscription.id} className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{subscription.user}</p>
                  <p className="mt-1 text-sm text-gray-600">{subscription.plan_name} · renouvellement {new Date(subscription.renews_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <p className="font-semibold text-gray-900">{Number(subscription.amount || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
