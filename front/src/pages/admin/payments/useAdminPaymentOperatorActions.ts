import { useState } from 'react';
import {
  forceSyncDexPayProviderTransaction,
  ignoreOutboxEvent,
  processOutboxNow,
  reconcileDexPay,
  replayOutboxEvent,
  reprocessDexPayWebhookReceipt,
  requeueOutboxEvent,
} from '@/lib/adminApi';

type ToastFn = (title: string, message?: string) => void;

type AdminPaymentOperatorActionsArgs = {
  error: ToastFn;
  refetchPayments: () => Promise<unknown>;
  success: ToastFn;
};

export function useAdminPaymentOperatorActions({
  error,
  refetchPayments,
  success,
}: AdminPaymentOperatorActionsArgs) {
  const [processingOutbox, setProcessingOutbox] = useState(false);
  const [reconcilingProvider, setReconcilingProvider] = useState(false);
  const [operatorBusyKey, setOperatorBusyKey] = useState<string | null>(null);

  const runOperatorAction = async (actionKey: string, action: () => Promise<void>, errorMessage: string) => {
    try {
      setOperatorBusyKey(actionKey);
      await action();
      await refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', errorMessage);
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const handleProcessOutbox = async () => {
    try {
      setProcessingOutbox(true);
      const result = await processOutboxNow(25);
      success('Worker outbox relancé', `${result.processed} traite(s), ${result.failed} echec(s).`);
      await refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible de relancer l'outbox.");
    } finally {
      setProcessingOutbox(false);
    }
  };

  const handleReconcileProvider = async () => {
    try {
      setReconcilingProvider(true);
      const result = await reconcileDexPay(25, { onlyPending: true });
      success('Réconciliation DexPay lancée', result.jobId);
      await refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de lancer la réconciliation provider.');
    } finally {
      setReconcilingProvider(false);
    }
  };

  const handleRequeueOutboxEvent = async (eventId: string) => {
    await runOperatorAction(`outbox-requeue:${eventId}`, async () => {
      await requeueOutboxEvent(eventId, 'admin_manual_requeue');
      success('Événement relancé', eventId);
    }, "Impossible de relancer cet événement.");
  };

  const handleIgnoreOutboxEvent = async (eventId: string) => {
    await runOperatorAction(`outbox-ignore:${eventId}`, async () => {
      await ignoreOutboxEvent(eventId, 'admin_manual_ignore');
      success('Dead-letter ignoré', eventId);
    }, "Impossible d'ignorer cet événement.");
  };

  const handleReplayOutboxEvent = async (eventId: string) => {
    await runOperatorAction(`outbox-replay:${eventId}`, async () => {
      await replayOutboxEvent(eventId, 'admin_manual_replay');
      success('Événement rejoué', eventId);
    }, 'Impossible de rejouer cet événement.');
  };

  const handleReprocessWebhookReceipt = async (receiptId: string) => {
    await runOperatorAction(`receipt-reprocess:${receiptId}`, async () => {
      await reprocessDexPayWebhookReceipt(receiptId, 'admin_manual_reprocess');
      success('Webhook reprocessé', receiptId);
    }, 'Impossible de reprocesser ce webhook.');
  };

  const handleForceSyncProviderTransaction = async (providerReference: string) => {
    await runOperatorAction(`provider-force-sync:${providerReference}`, async () => {
      await forceSyncDexPayProviderTransaction(providerReference, 'admin_manual_force_sync');
      success('Transaction resynchronisée', providerReference);
    }, 'Impossible de resynchroniser cette transaction provider.');
  };

  return {
    handleForceSyncProviderTransaction,
    handleIgnoreOutboxEvent,
    handleProcessOutbox,
    handleReconcileProvider,
    handleReplayOutboxEvent,
    handleReprocessWebhookReceipt,
    handleRequeueOutboxEvent,
    operatorBusyKey,
    processingOutbox,
    reconcilingProvider,
  };
}
