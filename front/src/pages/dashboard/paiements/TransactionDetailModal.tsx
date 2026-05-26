import {
  getPaymentLifecycleLabel,
  getPaymentLifecycleTone,
} from '@/lib/paymentStatus';
import {
  formatAmount,
  formatDate,
  getMethodName,
  getStatusColor,
  getStatusLabel,
  getTypeLabel,
  isProviderBackedTransaction,
  type Transaction,
} from './paymentPageModel';

type TransactionDetailModalProps = {
  transaction: Transaction;
  syncingDexPay: boolean;
  getLifecycleState: (transaction: Transaction) => NonNullable<Transaction['lifecycle_status']>;
  getCapabilitySummary: (transaction: Transaction) => string;
  canOpenLinkedInvoices: (transaction: Transaction) => boolean;
  canSyncProvider: (transaction: Transaction) => boolean;
  onClose: () => void;
  onOpenRelatedInvoices: (transaction: Transaction) => void;
  onSyncDexPay: () => void;
  onDownloadReceipt: (transaction: Transaction) => void;
};

export default function TransactionDetailModal({
  transaction,
  syncingDexPay,
  getLifecycleState,
  getCapabilitySummary,
  canOpenLinkedInvoices,
  canSyncProvider,
  onClose,
  onOpenRelatedInvoices,
  onSyncDexPay,
  onDownloadReceipt,
}: TransactionDetailModalProps) {
  const lifecycleState = getLifecycleState(transaction);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${transaction.type === 'payment' ? 'bg-red-100' : transaction.type === 'refund' ? 'bg-green-100' : transaction.type === 'deposit' ? 'bg-blue-100' : 'bg-purple-100'}`}>
              <i className={`${transaction.type === 'payment' ? 'ri-arrow-up-line text-red-600' : transaction.type === 'refund' ? 'ri-arrow-down-line text-green-600' : transaction.type === 'deposit' ? 'ri-add-line text-blue-600' : 'ri-subtract-line text-purple-600'} text-lg`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{transaction.id}</h2>
              <p className="text-xs text-gray-500">{getTypeLabel(transaction.type)}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600"><i className="ri-close-line text-xl" /></button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">Montant</span>
            <span className={`text-lg font-bold ${transaction.type === 'payment' || transaction.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
              {transaction.type === 'payment' || transaction.type === 'withdrawal' ? '-' : '+'}{formatAmount(transaction.amount, transaction.currency)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">Statut</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>{getStatusLabel(transaction.status)}</span>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">Moyen de paiement</p>
              <p className="text-sm font-medium text-gray-900">{getMethodName(transaction.method)}</p>
            </div>
            {isProviderBackedTransaction(transaction) && (
              <>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs text-gray-500">Cycle provider</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentLifecycleTone(lifecycleState)}`}>{getPaymentLifecycleLabel(lifecycleState)}</span>
                  <p className="mt-2 text-xs text-gray-500">{getCapabilitySummary(transaction)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs text-gray-500">Statut brut provider</p>
                  <p className="text-sm font-medium text-gray-900">{transaction.provider_status || 'En attente de confirmation'}</p>
                </div>
              </>
            )}
            <div className="col-span-2 rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">Description</p><p className="text-sm font-medium text-gray-900">{transaction.description}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">Date</p><p className="text-sm font-medium text-gray-900">{formatDate(transaction.date)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">Référence</p><p className="text-sm font-medium text-gray-900">{transaction.reference}</p></div>
            {(transaction.financial_operation_id || transaction.provider_reference || transaction.payment_intent_id) && (
              <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-xs text-gray-500">Objets liés</p>
                <div className="flex flex-wrap gap-2">
                  {transaction.financial_operation_id && <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">Opération {transaction.financial_operation_id}</span>}
                  {transaction.payment_intent_id && <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">Intent {transaction.payment_intent_id}</span>}
                  {transaction.provider_reference && <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">Provider {transaction.provider_reference}</span>}
                </div>
              </div>
            )}
            {transaction.payment_account && <div className="col-span-2 rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">Instructions de paiement DexPay</p><p className="text-sm font-medium text-gray-900">{transaction.payment_account.accountName} · {transaction.payment_account.accountNumber} · {transaction.payment_account.bankName}</p></div>}
            {transaction.deposit_address && <div className="col-span-2 rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs text-gray-500">Adresse de depot DexPay</p><p className="break-all text-sm font-medium text-gray-900">{transaction.deposit_address}</p></div>}
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Fermer</button>
          {(transaction.financial_operation_id || transaction.reference) && canOpenLinkedInvoices(transaction) && <button onClick={() => onOpenRelatedInvoices(transaction)} className="flex-1 whitespace-nowrap rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50">Voir les factures liées</button>}
          {transaction.method === 'dexpay' && canSyncProvider(transaction) && <button onClick={onSyncDexPay} disabled={syncingDexPay} className="flex-1 whitespace-nowrap rounded-lg border border-[#0f766e]/30 px-4 py-2 text-sm font-medium text-[#0f766e] transition-colors hover:bg-[#f5faf9] disabled:opacity-60">{syncingDexPay ? 'Synchronisation...' : 'Synchroniser DexPay'}</button>}
          <button onClick={() => onDownloadReceipt(transaction)} className="flex-1 whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"><i className="ri-download-line mr-1" />Télécharger le reçu</button>
        </div>
      </div>
    </div>
  );
}
