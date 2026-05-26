import { useEffect, useState } from 'react';
import {
  fetchTransactionCapabilities,
  type FinanceCapabilitySnapshot,
} from '@/lib/saasApi';
import type { Transaction } from './paymentPageModel';
import {
  getMissingTransactionCapabilityIds,
  getSelfServiceCapabilities as resolveSelfServiceCapabilities,
  getTransactionLifecycleState as resolveTransactionLifecycleState,
} from './paymentPageState';

type UseTransactionCapabilitiesArgs = {
  filteredTransactions: Transaction[];
  selectedTransaction: Transaction | null;
};

export function useTransactionCapabilities({
  filteredTransactions,
  selectedTransaction,
}: UseTransactionCapabilitiesArgs) {
  const [transactionCapabilities, setTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});

  useEffect(() => {
    const missingIds = getMissingTransactionCapabilityIds({
      capabilities: transactionCapabilities,
      selectedTransaction,
      transactions: filteredTransactions,
    });
    if (!missingIds.length) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled(
      missingIds.map(async (id) => [id, await fetchTransactionCapabilities(id)] as const),
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
        setTransactionCapabilities((current) => ({ ...current, ...nextEntries }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filteredTransactions, selectedTransaction, transactionCapabilities]);

  const getTransactionLifecycleState = (transaction: Transaction) =>
    resolveTransactionLifecycleState(transactionCapabilities, transaction);

  const getSelfServiceCapabilities = (
    transaction: Transaction,
    context: 'transaction_list' | 'transaction_modal' | 'provider_console' = 'transaction_list',
  ) => resolveSelfServiceCapabilities(transactionCapabilities, transaction, context);

  return {
    getSelfServiceCapabilities,
    getTransactionLifecycleState,
  };
}
