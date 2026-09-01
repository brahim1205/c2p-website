import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount } from './paymentPageModel';

interface WalletBalanceCardProps {
  availableBalance: number;
  currency: string;
  loading: boolean;
  hasWallet: boolean;
  onRecharge?: () => void;
  onWithdraw?: () => void;
  compactOnMobile?: boolean;
  showActionButtons?: boolean;
  showWalletLink?: boolean;
}

export default function WalletBalanceCard({
  availableBalance,
  currency,
  loading,
  hasWallet,
  onRecharge,
  onWithdraw,
  compactOnMobile = false,
  showActionButtons = true,
  showWalletLink = false,
}: WalletBalanceCardProps) {
  const [masked, setMasked] = useState(false);
  const amountLabel = masked ? '••••••' : formatAmount(availableBalance, currency);

  return (
    <div
      className={`mb-6 rounded-[28px] border border-[#0f766e] bg-[#0f766e] text-white shadow-lg ${
        compactOnMobile ? 'w-full max-w-[21.5rem] p-4 sm:max-w-none sm:p-7' : 'p-5 sm:p-8'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-sm text-white/72">Solde du portefeuille C2P</p>
          <div className="flex items-center gap-2">
            <p className={`${compactOnMobile ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-4xl'} font-bold tracking-tight`}>
              {amountLabel}
            </p>
            <button
              type="button"
              onClick={() => setMasked((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition-colors hover:bg-white/16"
              aria-label={masked ? 'Afficher le solde' : 'Masquer le solde'}
              title={masked ? 'Afficher le solde' : 'Masquer le solde'}
            >
              <i className={`${masked ? 'ri-eye-line' : 'ri-eye-off-line'} text-lg`}></i>
            </button>
          </div>
          {showWalletLink ? (
            <Link
              to="/dashboard/paiements"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              <i className="ri-wallet-3-line text-base"></i>
              Ouvrir mon portefeuille
            </Link>
          ) : null}
          {showActionButtons ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:flex">
              <button
                onClick={onRecharge}
                disabled={loading || !hasWallet || !onRecharge}
                className="whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#0f766e] transition-colors hover:bg-[#f3f7f6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mr-2 inline-flex h-4 w-4 items-center justify-center"><i className="ri-add-line text-base"></i></div>
                Recharger
              </button>
              <button
                onClick={onWithdraw}
                disabled={loading || !hasWallet || !onWithdraw}
                className="whitespace-nowrap rounded-xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mr-2 inline-flex h-4 w-4 items-center justify-center"><i className="ri-arrow-up-line text-base"></i></div>
                Retirer
              </button>
            </div>
          ) : null}
        </div>
        <div
          className={`flex items-center justify-center rounded-full bg-white/10 ${
            compactOnMobile ? 'h-16 w-16 shrink-0 self-end sm:h-20 sm:w-20' : 'h-20 w-20 self-end sm:h-24 sm:w-24'
          }`}
        >
          <div className={`${compactOnMobile ? 'h-10 w-10' : 'h-12 w-12'} flex items-center justify-center`}>
            <i className={`${compactOnMobile ? 'text-4xl' : 'text-5xl'} ri-wallet-3-line text-white`}></i>
          </div>
        </div>
      </div>
    </div>
  );
}
