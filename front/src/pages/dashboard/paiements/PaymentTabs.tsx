import type { ReactNode } from 'react';
import type { PaymentTab } from './paymentPageModel';

interface PaymentTabsProps {
  activeTab: PaymentTab;
  onTabChange: (tab: PaymentTab) => void;
  children: ReactNode;
}

const paymentTabs: Array<{ id: PaymentTab; label: string; icon: string }> = [
  { id: 'transactions', label: 'Historique des transactions', icon: 'ri-exchange-line' },
  { id: 'methods', label: 'Moyens de paiement', icon: 'ri-bank-card-line' },
  { id: 'wallet', label: 'Portefeuille C2P', icon: 'ri-wallet-3-line' },
];

export default function PaymentTabs({ activeTab, onTabChange, children }: PaymentTabsProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto px-3 py-3 sm:px-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {paymentTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="inline-flex h-5 w-5 items-center justify-center">
                <i className={`${tab.icon} text-base`}></i>
              </div>
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
