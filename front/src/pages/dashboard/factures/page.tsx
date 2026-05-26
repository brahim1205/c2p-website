import Breadcrumb from '@/components/base/Breadcrumb';
import DashboardLayout from '../components/DashboardLayout';
import {
  InvoiceContextBanner,
  InvoiceDetailModal,
  InvoiceFiltersPanel,
  InvoiceStatsGrid,
  InvoicesTable,
} from './FacturesPanels';
import { useFacturesSession } from './useFacturesSession';

export default function FacturesPage() {
  const session = useFacturesSession();

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Factures' }]} />
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Factures</h1>
        <p className="text-gray-600">Consultez et gérez vos factures</p>
      </div>

      {session.hasInvoiceContext ? (
        <InvoiceContextBanner
          context={session.urlContext}
          count={session.filteredInvoices.length}
          onClear={session.clearInvoiceContext}
          onOpenPayments={session.openCurrentPaymentContext}
        />
      ) : null}

      <InvoiceStatsGrid stats={session.invoiceStats} />

      <InvoiceFiltersPanel
        status={session.filters.status}
        type={session.filters.type}
        onExport={session.exportAll}
        onStatusChange={session.setFilterStatus}
        onTypeChange={session.setFilterType}
      />

      <InvoicesTable
        invoices={session.filteredInvoices}
        getInvoiceContext={session.resolveInvoiceContext}
        getInvoiceState={session.resolveInvoiceState}
        onDownload={session.downloadInvoice}
        onPrint={session.printInvoice}
        onSelect={session.setSelectedInvoice}
      />

      {session.selectedInvoice ? (
        <InvoiceDetailModal
          invoice={session.selectedInvoice}
          getInvoiceContext={session.resolveInvoiceContext}
          getInvoiceState={session.resolveInvoiceState}
          onClose={() => session.setSelectedInvoice(null)}
          onDownload={session.downloadInvoice}
          onOpenFinanceContext={session.openFinanceContext}
          onPrint={session.printInvoice}
        />
      ) : null}
    </DashboardLayout>
  );
}
