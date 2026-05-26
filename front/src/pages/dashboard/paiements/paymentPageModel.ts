export type PaymentMethodId = 'orange_money' | 'wave' | 'yas' | 'kaypay' | 'card' | 'wallet' | 'dexpay';
export type TransactionType = 'payment' | 'refund' | 'deposit' | 'withdrawal';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled';
export type PaymentTab = 'transactions' | 'methods' | 'wallet';

export interface Transaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  method: PaymentMethodId;
  status: TransactionStatus;
  description: string;
  date: string;
  reference: string;
  financial_operation_id?: string | null;
  payment_intent_id?: string | null;
  provider_order_id?: string;
  provider_reference?: string | null;
  provider_status?: string;
  lifecycle_status?: 'initiated' | 'pending_provider' | 'processing' | 'confirmed' | 'failed' | 'refunded' | 'reconciled';
  payment_account?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  } | null;
  deposit_address?: string | null;
  settled_to_wallet?: boolean;
}

export interface MethodItem {
  id: PaymentMethodId;
  name: string;
  icon: string;
  color: string;
  active: boolean;
}

export const paymentMethods: MethodItem[] = [
  { id: 'dexpay', name: 'DexPay', icon: 'ri-secure-payment-line', color: 'bg-[#0f766e]', active: true },
  { id: 'orange_money', name: 'Orange Money', icon: 'ri-smartphone-line', color: 'bg-orange-500', active: true },
  { id: 'wave', name: 'Wave', icon: 'ri-wallet-3-line', color: 'bg-blue-500', active: true },
  { id: 'yas', name: 'YAS', icon: 'ri-bank-card-line', color: 'bg-purple-500', active: false },
  { id: 'kaypay', name: 'KayPay', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500', active: false },
  { id: 'card', name: 'Carte Bancaire', icon: 'ri-bank-card-2-line', color: 'bg-gray-700', active: true },
];

export const isProviderBackedTransaction = (transaction: Transaction) =>
  transaction.method === 'dexpay' || Boolean(transaction.provider_status || transaction.provider_order_id || transaction.lifecycle_status);

export const getMethodName = (method: PaymentMethodId): string => {
  const names: Record<PaymentMethodId, string> = {
    orange_money: 'Orange Money',
    wave: 'Wave',
    yas: 'YAS',
    kaypay: 'KayPay',
    card: 'Carte Bancaire',
    wallet: 'Portefeuille C2P',
    dexpay: 'DexPay',
  };
  return names[method];
};

export const getTypeLabel = (type: TransactionType): string => {
  const labels: Record<TransactionType, string> = {
    payment: 'Paiement',
    refund: 'Remboursement',
    deposit: 'Dépôt',
    withdrawal: 'Retrait',
  };
  return labels[type];
};

export const getStatusColor = (status: TransactionStatus): string => {
  const colors: Record<TransactionStatus, string> = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status];
};

export const getStatusLabel = (status: TransactionStatus): string => {
  const labels: Record<TransactionStatus, string> = {
    completed: 'Complété',
    pending: 'En attente',
    failed: 'Échoué',
    cancelled: 'Annulé',
  };
  return labels[status];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatAmount = (amount: number, currency: string): string => `${amount.toLocaleString('fr-FR')} ${currency}`;

export const buildReceiptHtml = (transaction: Transaction) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${transaction.id}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7f6; color: #111; margin: 0; padding: 40px; }
    main { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #d9ece8; padding: 36px; }
    .eyebrow { color: #0f766e; letter-spacing: 0.28em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
    h1 { margin: 16px 0 26px; font-size: 32px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .card { background: #f5faf9; border-radius: 16px; padding: 16px; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>Recu de transaction ${transaction.id}</h1>
    <div class="grid">
      <div class="card"><strong>Montant</strong><br />${formatAmount(transaction.amount, transaction.currency)}</div>
      <div class="card"><strong>Statut</strong><br />${getStatusLabel(transaction.status)}</div>
      <div class="card"><strong>Type</strong><br />${getTypeLabel(transaction.type)}</div>
      <div class="card"><strong>Methode</strong><br />${getMethodName(transaction.method)}</div>
      <div class="card"><strong>Date</strong><br />${formatDate(transaction.date)}</div>
      <div class="card"><strong>Reference</strong><br />${transaction.reference}</div>
    </div>
    <p style="margin-top: 24px;">${transaction.description}</p>
  </main>
</body>
</html>`;
