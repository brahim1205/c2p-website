import { hasFinanceCapabilityAction } from '@/lib/paymentStatus';
import type { FinanceCapabilitySnapshot, InvoiceRecord } from '@/lib/saasApi';

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type InvoiceType = 'formation' | 'prestation' | 'projet' | 'abonnement';
export type Invoice = InvoiceRecord;
export type InvoiceStatusFilter = InvoiceStatus | 'all';
export type InvoiceTypeFilter = InvoiceType | 'all';

export interface InvoiceFilters {
  status: InvoiceStatusFilter;
  type: InvoiceTypeFilter;
}

export interface InvoiceUrlContext {
  financialOperationId: string;
  invoiceNumber: string;
  transactionId: string;
}

export interface InvoiceBusinessContext {
  sourceType: string;
  sourceId: string | null;
  financialOperationId: string | null;
  paymentTransactionId: string | null;
  invoiceNumber: string | null;
  currentState: InvoiceStatus;
  finality: string;
  canOpenFinancialContext: boolean;
  canOpenLinkedTransactions: boolean;
  canDownload: boolean;
}

export interface InvoiceStats {
  paid: number;
  pending: number;
  overdue: number;
  paidAmount: number;
}

const statusColors: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<InvoiceStatus, string> = {
  paid: 'Payée',
  pending: 'En attente',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const typeLabels: Record<InvoiceType, string> = {
  formation: 'Formation',
  prestation: 'Prestation',
  projet: 'Projet',
  abonnement: 'Abonnement',
};

export function getStatusColor(status: InvoiceStatus): string {
  return statusColors[status];
}

export function getStatusLabel(status: InvoiceStatus): string {
  return statusLabels[status];
}

export function getTypeLabel(type: InvoiceType): string {
  return typeLabels[type];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

export function filterInvoices(invoices: Invoice[], filters: InvoiceFilters, context: InvoiceUrlContext): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.status !== 'all' && invoice.status !== filters.status) return false;
    if (filters.type !== 'all' && invoice.type !== filters.type) return false;
    if (context.invoiceNumber && invoice.number !== context.invoiceNumber) return false;
    if (context.financialOperationId && String(invoice.financial_operation_id || '') !== context.financialOperationId) {
      return false;
    }
    return true;
  });
}

export function getInvoiceStats(invoices: Invoice[]): InvoiceStats {
  return {
    paid: invoices.filter((invoice) => invoice.status === 'paid').length,
    pending: invoices.filter((invoice) => invoice.status === 'pending').length,
    overdue: invoices.filter((invoice) => invoice.status === 'overdue').length,
    paidAmount: invoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  };
}

export function getInvoiceState(invoice: Invoice, snapshot: FinanceCapabilitySnapshot | null): InvoiceStatus {
  const currentState = snapshot?.currentState;
  if (currentState && ['paid', 'pending', 'overdue', 'cancelled'].includes(currentState)) {
    return currentState as InvoiceStatus;
  }
  return invoice.status;
}

export function getInvoiceContext(invoice: Invoice, snapshot: FinanceCapabilitySnapshot | null): InvoiceBusinessContext {
  return {
    sourceType: String(snapshot?.correlation.sourceType || invoice.source_type || invoice.type || ''),
    sourceId: toNullableString(snapshot?.correlation.sourceId || invoice.source_id || invoice.payment_transaction_id || invoice.financial_operation_id || null),
    financialOperationId: toNullableString(snapshot?.correlation.financialOperationId || invoice.financial_operation_id || null),
    paymentTransactionId: toNullableString(snapshot?.correlation.paymentTransactionId || invoice.payment_transaction_id || null),
    invoiceNumber: snapshot?.correlation.invoiceNumber || invoice.number || null,
    currentState: getInvoiceState(invoice, snapshot),
    finality: snapshot?.finality || 'mutable',
    canOpenFinancialContext: snapshot ? hasFinanceCapabilityAction(snapshot, 'open_financial_context') : Boolean(invoice.financial_operation_id || invoice.source_id),
    canOpenLinkedTransactions: snapshot ? hasFinanceCapabilityAction(snapshot, 'open_linked_transactions') : Boolean(invoice.financial_operation_id || invoice.payment_transaction_id),
    canDownload: snapshot ? hasFinanceCapabilityAction(snapshot, 'download_invoice') : true,
  };
}

function toNullableString(value: string | number | null | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : String(value);
}

export function buildInvoiceHtml(invoice: Invoice): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${invoice.number}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f1e8; color: #111; margin: 0; padding: 40px; }
    main { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 24px; border: 1px solid #e7dfd0; padding: 40px; }
    .eyebrow { color: #9a7a2f; letter-spacing: 0.3em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
    h1 { margin: 16px 0 24px; font-size: 36px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card { background: #faf7ef; border-radius: 18px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #ece7da; font-size: 14px; }
    th { color: #6b6b6b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .total { margin-top: 28px; text-align: right; font-size: 22px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>Facture ${invoice.number}</h1>
    <div class="grid">
      <div class="card"><strong>Destinataire</strong><br />${invoice.recipient.name}<br />${invoice.recipient.email}</div>
      <div class="card"><strong>Meta</strong><br />Type : ${getTypeLabel(invoice.type)}<br />Emission : ${formatDate(invoice.issueDate)}<br />Echeance : ${formatDate(invoice.dueDate)}</div>
    </div>
    <p>${invoice.description}</p>
    <table>
      <thead>
        <tr><th>Ligne</th><th>Quantite</th><th>Prix unitaire</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${invoice.items.map((item) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${formatAmount(item.unitPrice, invoice.currency)}</td><td>${formatAmount(item.total, invoice.currency)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="total">Total : ${formatAmount(invoice.amount, invoice.currency)}</div>
  </main>
</body>
</html>`;
}

export function buildInvoiceCsvRows(invoices: Invoice[]) {
  return invoices.map((invoice) => ({
    numero: invoice.number,
    description: invoice.description,
    type: getTypeLabel(invoice.type),
    montant: invoice.amount,
    devise: invoice.currency,
    statut: getStatusLabel(invoice.status),
    emission: invoice.issueDate,
    echeance: invoice.dueDate,
    destinataire: invoice.recipient.name,
    email: invoice.recipient.email,
  }));
}
