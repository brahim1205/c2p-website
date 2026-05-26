import { formatAmount } from './paymentPageModel';

interface WalletBalanceCardProps {
  availableBalance: number;
  currency: string;
  loading: boolean;
  hasWallet: boolean;
  dexPayAvailable: boolean;
  onRecharge: () => void;
  onOpenDexPay: () => void;
  onWithdraw: () => void;
}

export default function WalletBalanceCard({
  availableBalance,
  currency,
  loading,
  hasWallet,
  dexPayAvailable,
  onRecharge,
  onOpenDexPay,
  onWithdraw,
}: WalletBalanceCardProps) {
  return (
    <div className="mb-8 rounded-xl border border-[#0f766e] bg-[#0f766e] p-8 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-2 text-sm text-white/72">Solde du portefeuille C2P</p>
          <p className="text-4xl font-bold mb-4">{formatAmount(availableBalance, currency)}</p>
          <div className="flex space-x-3">
            <button
              onClick={onRecharge}
              disabled={loading || !hasWallet}
              className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0f766e] transition-colors hover:bg-[#f3f7f6]"
            >
              <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-add-line text-base"></i></div>
              Recharger
            </button>
            <button
              onClick={onOpenDexPay}
              disabled={loading || !dexPayAvailable}
              className="whitespace-nowrap rounded-lg border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-50"
              title={!dexPayAvailable ? 'DexPay n est pas encore configure' : undefined}
            >
              <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-secure-payment-line text-base"></i></div>
              DexPay
            </button>
            <button
              onClick={onWithdraw}
              disabled={loading || !hasWallet}
              className="whitespace-nowrap rounded-lg border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16"
            >
              <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-arrow-up-line text-base"></i></div>
              Retirer
            </button>
          </div>
        </div>
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 flex items-center justify-center">
            <i className="ri-wallet-3-line text-5xl text-white"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
