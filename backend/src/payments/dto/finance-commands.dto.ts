import { z } from 'zod';

const paymentMethodSchema = z.enum([
  'orange_money',
  'wave',
  'yas',
  'kaypay',
  'card',
  'wallet',
  'dexpay',
  'bank',
  'paypal',
  'free_money',
  'mtn_money',
]);

export const walletTopupSchema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
  method: paymentMethodSchema.optional(),
  description: z.string().trim().max(180).optional(),
});

export const walletWithdrawSchema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
  method: paymentMethodSchema.optional(),
  description: z.string().trim().max(180).optional(),
});

export const payoutAccountCreateSchema = z.object({
  method: z.enum(['bank', 'paypal', 'orange_money', 'wave', 'free_money', 'mtn_money']),
  account_name: z.string().trim().min(1).max(120),
  account_identifier: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(120),
  is_default: z.boolean().optional(),
});

export const payoutRequestCreateSchema = z.object({
  amount: z.number().int().min(1000).max(1_000_000_000),
  account_id: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
});

export const subscriptionActivateSchema = z.object({
  plan_id: z.string().trim().min(1),
  auto_renew: z.boolean().optional(),
  renew_now: z.boolean().optional(),
  trial: z.boolean().optional(),
  trial_days: z.number().int().min(1).max(30).optional(),
});

export const providerVisibilityPurchaseSchema = z.object({
  product_id: z.string().trim().min(1),
});

export const adminEscrowStatusSchema = z.object({
  status: z.enum(['released', 'refunded']),
});

export const adminPayoutStatusSchema = z.object({
  status: z.enum(['approved', 'paid', 'rejected']),
});

export const adminTransactionStatusSchema = z.object({
  status: z.enum(['completed', 'pending', 'failed']),
});

export type WalletTopupDto = z.infer<typeof walletTopupSchema>;
export type WalletWithdrawDto = z.infer<typeof walletWithdrawSchema>;
export type PayoutAccountCreateDto = z.infer<typeof payoutAccountCreateSchema>;
export type PayoutRequestCreateDto = z.infer<typeof payoutRequestCreateSchema>;
export type SubscriptionActivateDto = z.infer<typeof subscriptionActivateSchema>;
export type ProviderVisibilityPurchaseDto = z.infer<typeof providerVisibilityPurchaseSchema>;
export type AdminEscrowStatusDto = z.infer<typeof adminEscrowStatusSchema>;
export type AdminPayoutStatusDto = z.infer<typeof adminPayoutStatusSchema>;
export type AdminTransactionStatusDto = z.infer<typeof adminTransactionStatusSchema>;
