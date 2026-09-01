import type { ReactNode } from 'react';

export type AdminPaymentsTab = 'all' | 'completed' | 'pending' | 'failed';

interface AdminTransactionTableRow {
  id: string;
  user: string;
  type: string;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description?: string;
  reference?: string;
  target_type?: string | null;
  operation_kind?: string | null;
}

interface AdminTransactionsTableProps<TRow extends AdminTransactionTableRow> {
  activeTab: AdminPaymentsTab;
  transactions: TRow[];
  filteredTransactions: TRow[];
  onTabChange: (tab: AdminPaymentsTab) => void;
  renderStatusBadge: (status: TRow['status']) => ReactNode;
  onOpenDetails: (transaction: TRow) => void;
  onMarkCompleted: (transaction: TRow) => void;
  onRetry: (transaction: TRow) => void;
  onRefund: (transaction: TRow) => void;
  canRetry: (transaction: TRow) => boolean;
  canRefund: (transaction: TRow) => boolean;
}

export default function AdminTransactionsTable<TRow extends AdminTransactionTableRow>({
  activeTab,
  transactions,
  filteredTransactions,
  onTabChange,
  renderStatusBadge,
  onOpenDetails,
  onMarkCompleted,
  onRetry,
  onRefund,
  canRetry,
  canRefund,
}: AdminTransactionsTableProps<TRow>) {
  const wavePendingTransactions = transactions.filter((transaction) => (
    transaction.method === 'wave'
    && transaction.status === 'pending'
    && String(transaction.operation_kind ?? '').includes('wave')
  ));

  return (
    <div className="space-y-5">
      {wavePendingTransactions.length > 0 ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Wave à confirmer</p>
              <h2 className="mt-1 text-xl font-black text-[#0f1c35]">{wavePendingTransactions.length} paiement(s) en attente</h2>
              <p className="mt-1 text-sm text-slate-600">
                Confirmez uniquement après vérification du paiement sur le compte Wave C2P.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange('pending')}
              className="rounded-2xl bg-[#0f1c35] px-4 py-2 text-sm font-bold text-white"
            >
              Voir les attentes
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {wavePendingTransactions.slice(0, 6).map((transaction) => (
              <article key={transaction.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{transaction.target_type || transaction.type}</p>
                    <h3 className="mt-1 text-base font-black text-[#0f1c35]">{transaction.amount.toLocaleString('fr-FR')} FCFA</h3>
                  </div>
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">En attente</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{transaction.description || transaction.user}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Réf. {transaction.reference || transaction.id}</p>
                <button
                  type="button"
                  onClick={() => onMarkCompleted(transaction)}
                  className="mt-4 w-full rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
                >
                  Confirmer Wave
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 px-6 overflow-x-auto">
          {(['all', 'completed', 'pending', 'failed'] as const).map((tab) => (
            <button key={tab} onClick={() => onTabChange(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#5fa6f3] text-[#5fa6f3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'all' && `Toutes (${transactions.length})`}
              {tab === 'completed' && `Completees (${transactions.filter((item) => item.status === 'completed').length})`}
              {tab === 'pending' && `En attente (${transactions.filter((item) => item.status === 'pending').length})`}
              {tab === 'failed' && `Echouees (${transactions.filter((item) => item.status === 'failed').length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Transaction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Methode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <div>{transaction.reference || transaction.id}</div>
                  {transaction.reference ? <div className="mt-1 text-xs font-normal text-gray-400">{transaction.id}</div> : null}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.user}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.target_type || transaction.type}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.amount.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.method}</td>
                <td className="px-6 py-4">{renderStatusBadge(transaction.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(transaction.date).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onOpenDetails(transaction)} className="px-3 py-1.5 text-[#5fa6f3] hover:text-[#27346b] text-sm font-medium whitespace-nowrap hover:bg-[#5fa6f3]/10 rounded-lg transition-colors">Details</button>
                    {transaction.status !== 'completed' && (
                      <button
                        onClick={() => onMarkCompleted(transaction)}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-100"
                        title="Valider"
                      >
                        {transaction.method === 'wave' ? 'Confirmer Wave' : 'Valider'}
                      </button>
                    )}
                    {canRetry(transaction) && <button onClick={() => onRetry(transaction)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 transition-colors" title="Relancer"><i className="ri-restart-line text-orange-500 text-sm"></i></button>}
                    {canRefund(transaction) && <button onClick={() => onRefund(transaction)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Rembourser"><i className="ri-refund-line text-red-500 text-sm"></i></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
