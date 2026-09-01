import type { ReactNode } from 'react';

type PaymentModalTransaction = {
  id: string;
  user: string;
  email: string;
  amount: number;
  fee: number;
  net: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  reference?: string;
  target_type?: string | null;
  target_id?: string | null;
  financial_operation_id?: string | null;
};

type AdminPaymentModalsProps = {
  transaction: PaymentModalTransaction | null;
  showDetail: boolean;
  showRefund: boolean;
  renderStatusBadge: (status: PaymentModalTransaction['status']) => ReactNode;
  onCloseDetail: () => void;
  onCloseRefund: () => void;
  onConfirmRefund: () => void | Promise<void>;
};

function TransactionDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{children}</span>
    </div>
  );
}

export function AdminPaymentModals({
  transaction,
  showDetail,
  showRefund,
  renderStatusBadge,
  onCloseDetail,
  onCloseRefund,
  onConfirmRefund,
}: AdminPaymentModalsProps) {
  if (!transaction) return null;

  return (
    <>
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Detail transaction</h3>
              <button onClick={onCloseDetail} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"><i className="ri-close-line text-xl text-gray-500" /></button>
            </div>
            <div className="space-y-4 text-sm">
              <TransactionDetailRow label="ID">{transaction.id}</TransactionDetailRow>
              {transaction.reference ? <TransactionDetailRow label="Référence">{transaction.reference}</TransactionDetailRow> : null}
              <TransactionDetailRow label="Utilisateur">{transaction.user}</TransactionDetailRow>
              <TransactionDetailRow label="Email">{transaction.email}</TransactionDetailRow>
              <TransactionDetailRow label="Montant">{transaction.amount.toLocaleString('fr-FR')} FCFA</TransactionDetailRow>
              <TransactionDetailRow label="Frais">{transaction.fee.toLocaleString('fr-FR')} FCFA</TransactionDetailRow>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Net</span><span className="font-medium text-green-600">{transaction.net.toLocaleString('fr-FR')} FCFA</span></div>
              <TransactionDetailRow label="Methode">{transaction.method}</TransactionDetailRow>
              {transaction.target_type ? <TransactionDetailRow label="Cible">{transaction.target_type}</TransactionDetailRow> : null}
              {transaction.target_id ? <TransactionDetailRow label="ID cible">{transaction.target_id}</TransactionDetailRow> : null}
              {transaction.financial_operation_id ? <TransactionDetailRow label="Opération">{transaction.financial_operation_id}</TransactionDetailRow> : null}
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Statut</span><span>{renderStatusBadge(transaction.status)}</span></div>
              <div className="py-2"><span className="mb-1 block text-gray-500">Description</span><span className="font-medium text-gray-900">{transaction.description}</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseDetail} className="flex-1 rounded-lg bg-[#5fa6f3] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27346b]">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Rembourser la transaction</h3>
              <button onClick={onCloseRefund} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"><i className="ri-close-line text-xl text-gray-500" /></button>
            </div>
            <p className="mb-6 text-sm text-red-600">Vous allez rembourser {transaction.amount.toLocaleString('fr-FR')} FCFA a {transaction.user}.</p>
            <div className="flex gap-3">
              <button onClick={onCloseRefund} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Annuler</button>
              <button onClick={() => void onConfirmRefund()} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
