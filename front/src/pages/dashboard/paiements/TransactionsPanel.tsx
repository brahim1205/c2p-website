import { getPaymentLifecycleLabel, getPaymentLifecycleTone } from '@/lib/paymentStatus';
import {
  formatAmount,
  formatDate,
  getMethodName,
  getStatusColor,
  getStatusLabel,
  getTypeLabel,
  isProviderBackedTransaction,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
} from './paymentPageModel';

interface TransactionsPanelProps {
  filterType: TransactionType | 'all';
  filterStatus: TransactionStatus | 'all';
  onFilterTypeChange: (value: TransactionType | 'all') => void;
  onFilterStatusChange: (value: TransactionStatus | 'all') => void;
  onExport: () => void;
  loading: boolean;
  transactions: Transaction[];
  hasFinanceContext: boolean;
  relatedTransactions: Transaction[];
  getTransactionLifecycleState: (transaction: Transaction) => NonNullable<Transaction['lifecycle_status']>;
  onOpenTransaction: (transaction: Transaction) => void;
}

export default function TransactionsPanel({
  filterType,
  filterStatus,
  onFilterTypeChange,
  onFilterStatusChange,
  onExport,
  loading,
  transactions,
  hasFinanceContext,
  relatedTransactions,
  getTransactionLifecycleState,
  onOpenTransaction,
}: TransactionsPanelProps) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={filterType}
            onChange={(event) => onFilterTypeChange(event.target.value as TransactionType | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Tous les types</option>
            <option value="payment">Paiements</option>
            <option value="refund">Remboursements</option>
            <option value="deposit">Dépôts</option>
            <option value="withdrawal">Retraits</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Statut</label>
          <select
            value={filterStatus}
            onChange={(event) => onFilterStatusChange(event.target.value as TransactionStatus | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="completed">Complétés</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoués</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
        <div className="ml-auto flex items-end">
          <button
            onClick={onExport}
            className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <div className="mr-2 inline-flex h-4 w-4 items-center justify-center">
              <i className="ri-download-line text-base"></i>
            </div>
            Exporter
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {hasFinanceContext && transactions.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Aucun flux direct ne correspond au contexte demandé. Vérifiez le cycle provider ou les objets liés du portefeuille.
          </div>
        ) : null}

        {!loading && transactions.length === 0 && !hasFinanceContext ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400">
              <i className="ri-exchange-line text-2xl"></i>
            </div>
            <p className="font-medium text-gray-900">Aucune transaction</p>
            <p className="mt-1 text-sm text-gray-500">Vos paiements, remboursements et retraits apparaîtront ici.</p>
          </div>
        ) : null}

        {transactions.map((transaction) => {
          const isContextTransaction = hasFinanceContext && relatedTransactions.some((entry) => entry.id === transaction.id);
          const isDebit = transaction.type === 'payment' || transaction.type === 'withdrawal';

          return (
            <div
              key={transaction.id}
              className={`rounded-lg border p-4 transition-colors ${
                isContextTransaction ? 'border-teal-300 bg-teal-50/40' : 'border-gray-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-start space-x-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${
                      transaction.type === 'payment'
                        ? 'bg-red-100'
                        : transaction.type === 'refund'
                          ? 'bg-green-100'
                          : transaction.type === 'deposit'
                            ? 'bg-blue-100'
                            : 'bg-purple-100'
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center">
                      <i
                        className={`${
                          transaction.type === 'payment'
                            ? 'ri-arrow-up-line text-red-600'
                            : transaction.type === 'refund'
                              ? 'ri-arrow-down-line text-green-600'
                              : transaction.type === 'deposit'
                                ? 'ri-add-line text-blue-600'
                                : 'ri-subtract-line text-purple-600'
                        } text-xl`}
                      ></i>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="mb-1 flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{transaction.description}</h3>
                      {isProviderBackedTransaction(transaction) ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getPaymentLifecycleTone(
                            getTransactionLifecycleState(transaction),
                          )}`}
                        >
                          {getPaymentLifecycleLabel(getTransactionLifecycleState(transaction))}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{getTypeLabel(transaction.type)}</span>
                      <span>•</span>
                      <span>{getMethodName(transaction.method)}</span>
                      <span>•</span>
                      <span>{formatDate(transaction.date)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Réf: {transaction.reference}</p>
                    {isProviderBackedTransaction(transaction) && transaction.provider_status ? (
                      <p className="mt-1 text-xs text-gray-500">Provider: {transaction.provider_status}</p>
                    ) : null}
                  </div>
                </div>

                <div className="ml-4 text-right">
                  <p className={`text-lg font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                    {isDebit ? '-' : '+'}
                    {formatAmount(transaction.amount, transaction.currency)}
                  </p>
                  <button onClick={() => onOpenTransaction(transaction)} className="mt-2 cursor-pointer text-sm text-teal-600 hover:text-teal-700">
                    Voir détails
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
