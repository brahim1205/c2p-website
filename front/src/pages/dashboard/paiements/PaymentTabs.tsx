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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {paymentTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <div className="w-5 h-5 inline-flex items-center justify-center mr-2">
                <i className={`${tab.icon} text-base`}></i>
              </div>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}
