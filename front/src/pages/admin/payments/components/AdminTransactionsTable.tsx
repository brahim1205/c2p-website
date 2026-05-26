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
  return (
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
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.id}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.user}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.type}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.amount.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.method}</td>
                <td className="px-6 py-4">{renderStatusBadge(transaction.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(transaction.date).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onOpenDetails(transaction)} className="px-3 py-1.5 text-[#5fa6f3] hover:text-[#27346b] text-sm font-medium whitespace-nowrap hover:bg-[#5fa6f3]/10 rounded-lg transition-colors">Details</button>
                    {transaction.status !== 'completed' && <button onClick={() => onMarkCompleted(transaction)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="Valider"><i className="ri-check-line text-green-500 text-sm"></i></button>}
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
  );
}
