import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadCsvFile, downloadHtmlFile, printHtmlDocument } from '@/lib/downloads';
import { fetchInvoiceCapabilities, fetchInvoices, type FinanceCapabilitySnapshot } from '@/lib/saasApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildInvoiceCsvRows,
  buildInvoiceHtml,
  filterInvoices,
  getInvoiceContext,
  getInvoiceState,
  getInvoiceStats,
  type Invoice,
  type InvoiceBusinessContext,
  type InvoiceFilters,
  type InvoiceStatus,
  type InvoiceStatusFilter,
  type InvoiceTypeFilter,
  type InvoiceUrlContext,
} from './facturesModel';

export function useFacturesSession() {
  const { user } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatusFilter>('all');
  const [filterType, setFilterType] = useState<InvoiceTypeFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceCapabilities, setInvoiceCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});

  const urlContext: InvoiceUrlContext = useMemo(() => ({
    financialOperationId: searchParams.get('financialOperationId')?.trim() || '',
    invoiceNumber: searchParams.get('invoice')?.trim() || '',
    transactionId: searchParams.get('transaction')?.trim() || '',
  }), [searchParams]);

  const filters: InvoiceFilters = useMemo(() => ({
    status: filterStatus,
    type: filterType,
  }), [filterStatus, filterType]);

  const invoicesQuery = useQuery({
    queryKey: queryKeys.finance.invoices(user?.id),
    queryFn: fetchInvoices,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (invoicesQuery.isError) {
      console.error(invoicesQuery.error);
    }
  }, [invoicesQuery.error, invoicesQuery.isError]);

  const invoices: Invoice[] = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, filters, urlContext),
    [filters, invoices, urlContext],
  );
  const invoiceStats = useMemo(() => getInvoiceStats(invoices), [invoices]);
  const hasInvoiceContext = Boolean(urlContext.financialOperationId || urlContext.invoiceNumber || urlContext.transactionId);

  useEffect(() => {
    const candidateIds = Array.from(new Set(
      [
        ...filteredInvoices.map((invoice) => String(invoice.id)),
        selectedInvoice ? String(selectedInvoice.id) : null,
      ].filter((value): value is string => Boolean(value)),
    ));
    const missingIds = candidateIds.filter((id) => !invoiceCapabilities[id]);
    if (!missingIds.length) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled(
      missingIds.map(async (id) => [id, await fetchInvoiceCapabilities(id)] as const),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const nextEntries: Record<string, FinanceCapabilitySnapshot> = {};
      for (const result of results) {
        if (result.status !== 'fulfilled') {
          continue;
        }
        const [id, snapshot] = result.value;
        nextEntries[id] = snapshot;
      }

      if (Object.keys(nextEntries).length > 0) {
        setInvoiceCapabilities((current) => ({ ...current, ...nextEntries }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filteredInvoices, invoiceCapabilities, selectedInvoice]);

  const getInvoiceCapabilitySnapshot = useCallback(
    (invoice: Invoice) => invoiceCapabilities[String(invoice.id)] ?? null,
    [invoiceCapabilities],
  );

  const resolveInvoiceState = useCallback(
    (invoice: Invoice): InvoiceStatus => getInvoiceState(invoice, getInvoiceCapabilitySnapshot(invoice)),
    [getInvoiceCapabilitySnapshot],
  );

  const resolveInvoiceContext = useCallback(
    (invoice: Invoice): InvoiceBusinessContext => getInvoiceContext(invoice, getInvoiceCapabilitySnapshot(invoice)),
    [getInvoiceCapabilitySnapshot],
  );

  const downloadInvoice = useCallback((invoice: Invoice) => {
    downloadHtmlFile(`${invoice.number}.html`, buildInvoiceHtml(invoice));
    success('Telechargement', `La facture ${invoice.number} a ete telechargee.`);
  }, [success]);

  const printInvoice = useCallback((invoice: Invoice) => {
    printHtmlDocument(invoice.number, buildInvoiceHtml(invoice));
    success('Impression', `La facture ${invoice.number} a ete ouverte pour impression.`);
  }, [success]);

  const exportAll = useCallback(() => {
    downloadCsvFile('factures.csv', buildInvoiceCsvRows(filteredInvoices));
    success('Export', `${filteredInvoices.length} facture(s) exportee(s) au format CSV.`);
  }, [filteredInvoices, success]);

  const openFinanceContext = useCallback((invoice: Invoice) => {
    const context = resolveInvoiceContext(invoice);
    const params = new URLSearchParams();
    if (context.financialOperationId) {
      params.set('financialOperationId', context.financialOperationId);
    }
    if (context.invoiceNumber) {
      params.set('invoice', context.invoiceNumber);
    }
    if (context.paymentTransactionId) {
      params.set('transaction', context.paymentTransactionId);
    }
    navigate(`/dashboard/paiements${params.toString() ? `?${params.toString()}` : ''}`);
  }, [navigate, resolveInvoiceContext]);

  const openCurrentPaymentContext = useCallback(() => {
    navigate(`/dashboard/paiements${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  }, [navigate, searchParams]);

  const clearInvoiceContext = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  useEffect(() => {
    if (!hasInvoiceContext || selectedInvoice || filteredInvoices.length !== 1) {
      return;
    }
    setSelectedInvoice(filteredInvoices[0]);
  }, [filteredInvoices, hasInvoiceContext, selectedInvoice]);

  return {
    filters,
    filteredInvoices,
    hasInvoiceContext,
    invoiceStats,
    selectedInvoice,
    urlContext,
    clearInvoiceContext,
    downloadInvoice,
    exportAll,
    openCurrentPaymentContext,
    openFinanceContext,
    printInvoice,
    resolveInvoiceContext,
    resolveInvoiceState,
    setFilterStatus,
    setFilterType,
    setSelectedInvoice,
  };
}
