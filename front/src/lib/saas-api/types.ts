export const FINANCE_CAPABILITY_CONTRACT_VERSION = 1 as const;

export interface FinanceCapabilitySnapshot {
  contractVersion: 1;
  machineVersion: 1;
  kind: 'transaction' | 'escrow' | 'payout' | 'subscription' | 'invoice' | 'provider_transaction' | 'payment_intent';
  id: string;
  actorScope: 'admin' | 'self' | 'external';
  currentState: string;
  finality: 'mutable' | 'terminal';
  terminalStates: string[];
  allowedTransitions: string[];
  allowedActions: string[];
  transitionGraph: Record<string, string[]>;
  correlation: {
    financialOperationId?: string | null;
    providerReference?: string | null;
    paymentIntentId?: string | null;
    paymentTransactionId?: string | null;
    sourceType?: string | null;
    sourceId?: string | number | null;
    bookingId?: string | number | null;
    accountId?: string | null;
    invoiceNumber?: string | null;
  };
  metadata: Record<string, unknown>;
}

export type FinanceCapabilityEntity =
  | 'transaction'
  | 'escrow'
  | 'payout'
  | 'subscription'
  | 'invoice'
  | 'provider_transaction'
  | 'payment_intent';

export interface FinanceCapabilityContractDescriptor {
  contractVersion: 1;
  machineVersion: 1;
  genericEndpoint: string;
  legacyEntityEndpointsSupported: boolean;
  entities: Array<FinanceCapabilityEntity | 'provider-transaction' | 'payment-intent'>;
  kinds: FinanceCapabilityEntity[];
  actions: string[];
  actorScopes: Array<'admin' | 'self' | 'external'>;
}

export interface WalletAccount {
  id: number | string;
  user_id: string;
  balance: number;
  currency: string;
  held_balance?: number;
  pending_release_balance?: number;
  pending_payout_amount?: number;
  available_balance?: number;
  subscription_status?: string | null;
  subscription_plan_name?: string | null;
}

export interface SubscriptionPlan {
  id: string;
  role: string;
  name: string;
  slug: string;
  price_monthly: number;
  duration_value?: number;
  duration_unit?: 'jour' | 'mois' | 'an' | 'ponctuel';
  promotional?: boolean;
  description?: string;
  currency: string;
  commission_rate: number;
  priority_matching?: string | null;
  analytics_level?: string | null;
  support_level?: string | null;
  verified_badge?: boolean;
  features?: string[];
  active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  role: string;
  plan_id: string;
  plan_name: string;
  status: 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled';
  amount: number;
  currency: string;
  commission_rate: number;
  auto_renew: boolean;
  started_at: string;
  renews_at: string;
  last_billed_at?: string | null;
  days_remaining?: number | null;
  is_expiring_soon?: boolean;
  financial_operation_id?: string | null;
  plan?: SubscriptionPlan | null;
}

export interface ProviderVisibilityProduct {
  id: string;
  role: string;
  name: string;
  slug: string;
  tier: 'standard' | 'priority' | 'premium';
  price: number;
  currency: string;
  duration_days: number;
  matching_priority: 'low' | 'medium' | 'high';
  alerts_enabled: boolean;
  verification_eligible: boolean;
  description?: string | null;
  features: string[];
  active: boolean;
}

export interface ProviderVisibilityPassRecord {
  id: string;
  provider_id?: string | number | null;
  user_id: string;
  product_id?: string | null;
  product_name?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  pass_tier: 'standard' | 'priority' | 'premium';
  pass_label: string;
  code: string;
  status: 'active' | 'superseded' | 'expired' | 'cancelled';
  issued_at: string;
  expires_at: string | null;
  alerts_enabled: boolean;
  verification_eligible: boolean;
  matching_priority: 'low' | 'medium' | 'high';
  source_type?: string | null;
  source_id?: string | null;
}

export interface ProviderVisibilityOrder {
  id: string;
  provider_id?: string | number | null;
  user_id: string;
  product_id?: string | null;
  product_name?: string | null;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  purchased_at: string;
  financial_operation_id?: string | null;
  transaction_id?: string | null;
  pass_id?: string | null;
  pass_tier: 'standard' | 'priority' | 'premium';
  pass_label?: string | null;
  pass_code?: string | null;
  expires_at?: string | null;
}

export interface EscrowCase {
  id: string;
  booking_id: number | string;
  client_id: string;
  provider_id?: number | null;
  provider_user_id?: string | null;
  requested_provider_id?: number | string | null;
  service?: string | null;
  amount_total: number;
  currency: string;
  platform_fee_amount: number;
  provider_amount: number;
  status: string;
  funded_at?: string | null;
  released_at?: string | null;
  refunded_at?: string | null;
  note?: string | null;
  financial_operation_id?: string | null;
  client_name?: string | null;
  provider_name?: string | null;
  booking_title?: string | null;
}

export interface CommissionEntry {
  id: string;
  source_type: string;
  source_id: string | number;
  user_id: string;
  beneficiary_user_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string;
  recognized_at: string;
  financial_operation_id?: string | null;
  actor_name?: string | null;
  beneficiary_name?: string | null;
}

export interface PayoutAccount {
  id: string;
  user_id: string;
  method: string;
  account_name: string;
  account_identifier: string;
  label: string;
  is_default: boolean;
  status?: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  account_id: string;
  account_label?: string | null;
  account_identifier?: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  requested_at: string;
  processed_at?: string | null;
  note?: string | null;
  financial_operation_id?: string | null;
}

export interface FinanceTransaction {
  id: string;
  user_id?: string;
  type: 'payment' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  method: 'orange_money' | 'wave' | 'yas' | 'kaypay' | 'card' | 'wallet' | 'dexpay' | 'bank' | 'paypal' | 'free_money' | 'mtn_money';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
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

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceRecord {
  id: string;
  user_id?: string | null;
  number: string;
  type: 'formation' | 'prestation' | 'projet' | 'abonnement';
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  recipient: {
    name: string;
    email: string;
  };
  items: InvoiceLine[];
  financial_operation_id?: string | null;
  source_type?: string | null;
  source_id?: string | number | null;
  payment_transaction_id?: string | null;
  provider_reference?: string | null;
  provider_status?: string | null;
}

export interface FinanceSnapshot {
  wallet: WalletAccount | null;
  subscriptions: UserSubscription[];
  plans: SubscriptionPlan[];
  providerVisibilityProducts: ProviderVisibilityProduct[];
  providerVisibilityOrders: ProviderVisibilityOrder[];
  providerVisibilityPasses: ProviderVisibilityPassRecord[];
  escrowCases: EscrowCase[];
  commissionEntries: CommissionEntry[];
  payoutAccounts: PayoutAccount[];
  payoutRequests: PayoutRequest[];
  invoices: InvoiceRecord[];
}
