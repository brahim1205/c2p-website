import type {
  CommissionEntry,
  EscrowCase,
  PayoutRequest,
  UserSubscription,
} from '@/lib/saasApi';
import type { Transaction } from './paymentPageModel';

interface FinanceContextBannerProps {
  invoiceNumber: string;
  financialOperationId: string;
  providerReference: string;
  transactionId: string;
  relatedTransactions: Transaction[];
  relatedEscrows: EscrowCase[];
  relatedPayoutRequests: PayoutRequest[];
  relatedSubscriptions: UserSubscription[];
  relatedCommissionEntries: CommissionEntry[];
  onOpenTransaction: (transaction: Transaction) => void;
  onOpenWallet: () => void;
  onClear: () => void;
}

export default function FinanceContextBanner({
  invoiceNumber,
  financialOperationId,
  providerReference,
  transactionId,
  relatedTransactions,
  relatedEscrows,
  relatedPayoutRequests,
  relatedSubscriptions,
  relatedCommissionEntries,
  onOpenTransaction,
  onOpenWallet,
  onClear,
}: FinanceContextBannerProps) {
  const hasWalletContext = relatedEscrows.length > 0 || relatedPayoutRequests.length > 0 || relatedSubscriptions.length > 0;

  return (
    <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-700">Contexte financier lié</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {invoiceNumber ? <ContextChip label={`Facture ${invoiceNumber}`} /> : null}
            {financialOperationId ? <ContextChip label={`Opération ${financialOperationId}`} /> : null}
            {providerReference ? <ContextChip label={`Provider ${providerReference}`} /> : null}
            {transactionId ? <ContextChip label={`Transaction ${transactionId}`} /> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <ContextMetric label="Transactions" value={relatedTransactions.length} />
            <ContextMetric label="Séquestres" value={relatedEscrows.length} />
            <ContextMetric label="Retraits" value={relatedPayoutRequests.length} />
            <ContextMetric label="Abonnements" value={relatedSubscriptions.length} />
            <ContextMetric label="Ledger" value={relatedCommissionEntries.length} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {relatedTransactions.length > 0 ? (
            <button
              onClick={() => onOpenTransaction(relatedTransactions[0])}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Ouvrir la transaction
            </button>
          ) : null}
          {hasWalletContext ? (
            <button
              onClick={onOpenWallet}
              className="rounded-lg border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-white"
            >
              Ouvrir le portefeuille
            </button>
          ) : null}
          <button
            onClick={onClear}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Effacer le contexte
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}

function ContextMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
