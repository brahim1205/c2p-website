import type { DexPayBank } from '@/lib/paymentsApi';

export interface DexPayCheckoutForm {
  direction: 'onramp' | 'offramp';
  fiatAmount: string;
  tokenAmount: string;
  asset: string;
  chain: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  recipientWallet: string;
}

interface DexPayCheckoutModalProps {
  form: DexPayCheckoutForm;
  banks: DexPayBank[];
  submitting: boolean;
  onFormChange: (patch: Partial<DexPayCheckoutForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function DexPayCheckoutModal({
  form,
  banks,
  submitting,
  onFormChange,
  onClose,
  onSubmit,
}: DexPayCheckoutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nouvelle operation DexPay</h2>
            <p className="mt-1 text-sm text-gray-500">Flux devise fiat / stablecoin pilote par DexPay</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600">
            <div className="flex h-5 w-5 items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Direction</label>
            <select
              value={form.direction}
              onChange={(event) => onFormChange({ direction: event.target.value as 'onramp' | 'offramp' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="onramp">On-ramp fiat vers stablecoin</option>
              <option value="offramp">Off-ramp stablecoin vers fiat</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Montant fiat (XAF)</label>
            <input
              type="number"
              value={form.fiatAmount}
              onChange={(event) => onFormChange({ fiatAmount: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Ex: 25000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Actif</label>
            <input
              type="text"
              value={form.asset}
              onChange={(event) => onFormChange({ asset: event.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chain</label>
            <input
              type="text"
              value={form.chain}
              onChange={(event) => onFormChange({ chain: event.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          {form.direction === 'onramp' ? (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Wallet de destination</label>
              <input
                type="text"
                value={form.recipientWallet}
                onChange={(event) => onFormChange({ recipientWallet: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="0x..."
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Banque</label>
                <select
                  value={form.bankCode}
                  onChange={(event) => onFormChange({ bankCode: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Selectionner une banque</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} {bank.currency ? `(${bank.currency})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Titulaire</label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(event) => onFormChange({ accountName: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Numero de compte</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(event) => onFormChange({ accountNumber: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onSubmit} disabled={submitting} className="flex-1 whitespace-nowrap rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d665f] disabled:opacity-60">
            {submitting ? 'Traitement...' : 'Creer l operation'}
          </button>
        </div>
      </div>
    </div>
  );
}
