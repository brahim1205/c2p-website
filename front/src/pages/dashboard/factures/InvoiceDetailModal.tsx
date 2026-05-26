import BrandLogo from '@/components/base/BrandLogo';
import {
  formatAmount,
  formatDate,
  getStatusColor,
  getStatusLabel,
  type Invoice,
  type InvoiceBusinessContext,
  type InvoiceStatus,
} from './facturesModel';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  getInvoiceContext: (invoice: Invoice) => InvoiceBusinessContext;
  getInvoiceState: (invoice: Invoice) => InvoiceStatus;
  onClose: () => void;
  onDownload: (invoice: Invoice) => void;
  onOpenFinanceContext: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
}

export default function InvoiceDetailModal({
  invoice,
  getInvoiceContext,
  getInvoiceState,
  onClose,
  onDownload,
  onOpenFinanceContext,
  onPrint,
}: InvoiceDetailModalProps) {
  const state = getInvoiceState(invoice);
  const context = getInvoiceContext(invoice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Détails de la facture</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600">
            <div className="flex h-5 w-5 items-center justify-center"><i className="ri-close-line text-xl" /></div>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between border-b border-gray-200 pb-6">
            <div className="flex items-center space-x-3">
              <BrandLogo className="flex items-center" imageClassName="h-12 w-auto object-contain" />
              <div>
                <p className="font-bold text-gray-900">Centre C2P</p>
                <p className="text-sm text-gray-600">Yaoundé, Cameroun</p>
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1 text-2xl font-bold text-gray-900">{invoice.number}</p>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(state)}`}>{getStatusLabel(state)}</span>
            </div>
          </div>
          <InvoiceRecipient invoice={invoice} />
          <InvoiceDates invoice={invoice} />
          <InvoiceBusinessContextCard context={context} onOpen={() => onOpenFinanceContext(invoice)} />
          <InvoiceItemsTable invoice={invoice} />
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-gray-900">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(invoice.amount, invoice.currency)}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {context.canDownload ? (
              <button onClick={() => onDownload(invoice)} className="flex-1 whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
                <div className="mr-2 inline-flex h-4 w-4 items-center justify-center"><i className="ri-download-line text-base" /></div>
                Télécharger PDF
              </button>
            ) : null}
            <button onClick={() => onPrint(invoice)} className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <div className="mr-2 inline-flex h-4 w-4 items-center justify-center"><i className="ri-printer-line text-base" /></div>
              Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceRecipient({ invoice }: { invoice: Invoice }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-gray-500">Facturé à</p>
      <p className="font-medium text-gray-900">{invoice.recipient.name}</p>
      <p className="text-sm text-gray-600">{invoice.recipient.email}</p>
    </div>
  );
}

function InvoiceDates({ invoice }: { invoice: Invoice }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      <DateItem label="Date d'émission" value={formatDate(invoice.issueDate)} />
      <DateItem label="Date d'échéance" value={formatDate(invoice.dueDate)} />
      {invoice.paidDate ? <DateItem label="Date de paiement" value={formatDate(invoice.paidDate)} /> : null}
    </div>
  );
}

function DateItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function InvoiceBusinessContextCard({ context, onOpen }: { context: InvoiceBusinessContext; onOpen: () => void }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Contexte métier</p>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(context.currentState)}`}>
          {getStatusLabel(context.currentState)}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ContextField label="Source" value={context.sourceType || 'Document financier'} />
        <ContextField label="Source ID" value={String(context.sourceId || '-')} />
        <ContextField label="Opération financière" value={context.financialOperationId || '-'} />
      </div>
      {(context.canOpenFinancialContext || context.canOpenLinkedTransactions) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {context.canOpenFinancialContext ? (
            <button onClick={onOpen} className="rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
              Ouvrir le contexte financier
            </button>
          ) : null}
          {context.canOpenLinkedTransactions ? (
            <button onClick={onOpen} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white">
              Ouvrir les paiements liés
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <p className="break-all text-sm text-gray-900">{value}</p>
    </div>
  );
}

function InvoiceItemsTable({ invoice }: { invoice: Invoice }) {
  return (
    <div className="mb-6">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qté</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Prix unitaire</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoice.items.map((item, index) => (
            <tr key={`${item.description}-${index}`}>
              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">{formatAmount(item.unitPrice, invoice.currency)}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatAmount(item.total, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
