import {
  formatAmount,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getTypeLabel,
  type Invoice,
  type InvoiceBusinessContext,
  type InvoiceStats,
  type InvoiceStatus,
  type InvoiceStatusFilter,
  type InvoiceTypeFilter,
  type InvoiceUrlContext,
} from './facturesModel';

export { default as InvoiceDetailModal } from './InvoiceDetailModal';

interface InvoiceContextBannerProps {
  context: InvoiceUrlContext;
  count: number;
  onClear: () => void;
  onOpenPayments: () => void;
}

export function InvoiceContextBanner({ context, count, onClear, onOpenPayments }: InvoiceContextBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Contexte facture lié</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {context.invoiceNumber ? <ContextChip label={`Facture ${context.invoiceNumber}`} /> : null}
            {context.financialOperationId ? <ContextChip label={`Opération ${context.financialOperationId}`} /> : null}
            {context.transactionId ? <ContextChip label={`Transaction ${context.transactionId}`} /> : null}
          </div>
          <p className="mt-3 text-sm text-gray-600">{count} facture(s) liée(s) au contexte courant.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onOpenPayments} className="rounded-lg border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-white">
            Ouvrir les paiements liés
          </button>
          <button onClick={onClear} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
            Effacer le contexte
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextChip({ label }: { label: string }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">{label}</span>;
}

export function InvoiceStatsGrid({ stats }: { stats: InvoiceStats }) {
  const cards = [
    { label: 'Factures payées', value: stats.paid, icon: 'ri-check-line', tone: 'green' },
    { label: 'En attente', value: stats.pending, icon: 'ri-time-line', tone: 'yellow' },
    { label: 'En retard', value: stats.overdue, icon: 'ri-alert-line', tone: 'red' },
    { label: 'Total payé', value: formatAmount(stats.paidAmount, 'XAF'), icon: 'ri-money-dollar-circle-line', tone: 'teal' },
  ];
  const toneClasses: Record<string, { icon: string; wrap: string }> = {
    green: { icon: 'text-green-600', wrap: 'bg-green-100' },
    yellow: { icon: 'text-yellow-600', wrap: 'bg-yellow-100' },
    red: { icon: 'text-red-600', wrap: 'bg-red-100' },
    teal: { icon: 'text-teal-600', wrap: 'bg-teal-100' },
  };

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[card.tone].wrap}`}>
              <div className="flex h-5 w-5 items-center justify-center">
                <i className={`${card.icon} text-lg ${toneClasses[card.tone].icon}`} />
              </div>
            </div>
          </div>
          <p className="mb-1 text-2xl font-bold text-gray-900">{card.value}</p>
          <p className="text-sm text-gray-600">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

interface InvoiceFiltersPanelProps {
  status: InvoiceStatusFilter;
  type: InvoiceTypeFilter;
  onExport: () => void;
  onStatusChange: (status: InvoiceStatusFilter) => void;
  onTypeChange: (type: InvoiceTypeFilter) => void;
}

export function InvoiceFiltersPanel({ status, type, onExport, onStatusChange, onTypeChange }: InvoiceFiltersPanelProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Statut</label>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as InvoiceStatusFilter)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500">
            <option value="all">Tous les statuts</option>
            <option value="paid">Payées</option>
            <option value="pending">En attente</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulées</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
          <select value={type} onChange={(event) => onTypeChange(event.target.value as InvoiceTypeFilter)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-teal-500">
            <option value="all">Tous les types</option>
            <option value="formation">Formations</option>
            <option value="prestation">Prestations</option>
            <option value="projet">Projets</option>
            <option value="abonnement">Abonnements</option>
          </select>
        </div>
        <div className="ml-auto flex items-end">
          <button onClick={onExport} className="cursor-pointer whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <div className="mr-2 inline-flex h-4 w-4 items-center justify-center"><i className="ri-download-line text-base" /></div>
            Exporter tout
          </button>
        </div>
      </div>
    </div>
  );
}

interface InvoicesTableProps {
  invoices: Invoice[];
  getInvoiceContext: (invoice: Invoice) => InvoiceBusinessContext;
  getInvoiceState: (invoice: Invoice) => InvoiceStatus;
  onDownload: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onSelect: (invoice: Invoice) => void;
}

export function InvoicesTable({ invoices, getInvoiceContext, getInvoiceState, onDownload, onPrint, onSelect }: InvoicesTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Numéro', 'Description', 'Type', 'Montant', 'Échéance', 'Statut', 'Actions'].map((header) => (
                <th key={header} className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice) => {
              const state = getInvoiceState(invoice);
              const context = getInvoiceContext(invoice);
              return (
                <tr key={invoice.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{invoice.description}</p>
                    <p className="text-xs text-gray-500">{invoice.recipient.name}</p>
                    {(invoice.financial_operation_id || invoice.source_id) && (
                      <p className="mt-1 text-xs text-teal-700">
                        {invoice.source_type || invoice.type} · {String(invoice.source_id || invoice.financial_operation_id)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4"><span className="text-sm text-gray-600">{getTypeLabel(invoice.type)}</span></td>
                  <td className="whitespace-nowrap px-6 py-4"><p className="text-sm font-medium text-gray-900">{formatAmount(invoice.amount, invoice.currency)}</p></td>
                  <td className="whitespace-nowrap px-6 py-4"><p className="text-sm text-gray-600">{formatDate(invoice.dueDate)}</p></td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(state)}`}>{getStatusLabel(state)}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <IconButton icon="ri-eye-line" label="Voir détails" tone="teal" onClick={() => onSelect(invoice)} />
                      {context.canDownload ? <IconButton icon="ri-download-line" label="Télécharger" onClick={() => onDownload(invoice)} /> : null}
                      <IconButton icon="ri-printer-line" label="Imprimer" onClick={() => onPrint(invoice)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {invoices.length === 0 && <InvoicesEmptyState />}
    </div>
  );
}

function IconButton({ icon, label, onClick, tone = 'gray' }: { icon: string; label: string; onClick: () => void; tone?: 'gray' | 'teal' }) {
  const classes = tone === 'teal' ? 'text-teal-600 hover:bg-teal-50' : 'text-gray-600 hover:bg-gray-100';
  return (
    <button onClick={onClick} className={`rounded-lg p-2 transition-colors ${classes}`} title={label}>
      <div className="flex h-4 w-4 items-center justify-center"><i className={`${icon} text-base`} /></div>
    </button>
  );
}

function InvoicesEmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <div className="flex h-8 w-8 items-center justify-center"><i className="ri-file-list-line text-3xl text-gray-400" /></div>
      </div>
      <p className="text-gray-600">Aucune facture trouvée</p>
    </div>
  );
}
