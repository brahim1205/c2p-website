import WavePaymentQr from '@/components/feature/WavePaymentQr';
import type { PaymentMethodId } from './paymentPageModel';
import { formatAmount } from './paymentPageModel';

interface RechargeWalletModalProps {
  amount: string;
  paymentMethod: PaymentMethodId;
  onAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethodId) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function RechargeWalletModal({
  amount,
  paymentMethod,
  onAmountChange,
  onPaymentMethodChange,
  onClose,
  onSubmit,
}: RechargeWalletModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recharger le portefeuille</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600">
            <div className="flex h-5 w-5 items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </div>
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Montant (XAF)</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="Ex: 25000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Moyen de paiement</label>
            <select
              value={paymentMethod}
              onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethodId)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="card">Carte Bancaire</option>
            </select>
          </div>
          {paymentMethod === 'wave' ? <WavePaymentQr compact /> : null}
        </div>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onSubmit} className="flex-1 whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
            Recharger
          </button>
        </div>
      </div>
    </div>
  );
}

interface WithdrawWalletModalProps {
  amount: string;
  availableBalance: number;
  currency: string;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function WithdrawWalletModal({
  amount,
  availableBalance,
  currency,
  onAmountChange,
  onClose,
  onSubmit,
}: WithdrawWalletModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Retirer des fonds</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600">
            <div className="flex h-5 w-5 items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-600">Solde disponible : {formatAmount(availableBalance, currency)}</p>
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Montant (XAF)</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="Ex: 10000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Moyen de retrait</label>
            <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
              <option>Orange Money</option>
              <option>Wave</option>
              <option>Carte Bancaire</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onSubmit} className="flex-1 whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
            Retirer
          </button>
        </div>
      </div>
    </div>
  );
}
