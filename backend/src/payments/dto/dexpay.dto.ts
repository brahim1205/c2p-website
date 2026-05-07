import { z } from 'zod';

export const dexpayCheckoutSchema = z.object({
  direction: z.enum(['onramp', 'offramp']),
  fiatAmount: z.number().positive().max(100_000_000).optional(),
  tokenAmount: z.number().positive().max(1_000_000).optional(),
  asset: z.string().trim().min(2).max(16).default('DUSD'),
  chain: z.string().trim().min(2).max(16).default('BSC'),
  bankCode: z.string().trim().min(2).max(32).optional(),
  accountName: z.string().trim().min(3).max(120).optional(),
  accountNumber: z.string().trim().min(6).max(64).optional(),
  recipientWallet: z.string().trim().min(8).max(180).optional(),
}).superRefine((payload, ctx) => {
  if (!payload.fiatAmount && !payload.tokenAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'fiatAmount ou tokenAmount est requis.',
      path: ['fiatAmount'],
    });
  }

  if (payload.direction === 'onramp' && !payload.recipientWallet) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recipientWallet est requis pour un on-ramp.',
      path: ['recipientWallet'],
    });
  }

  if (payload.direction === 'offramp') {
    if (!payload.bankCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bankCode est requis pour un off-ramp.',
        path: ['bankCode'],
      });
    }
    if (!payload.accountName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'accountName est requis pour un off-ramp.',
        path: ['accountName'],
      });
    }
    if (!payload.accountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'accountNumber est requis pour un off-ramp.',
        path: ['accountNumber'],
      });
    }
  }
});

export const dexpaySyncSchema = z.object({
  transactionId: z.string().trim().min(3).max(120).optional(),
});

export type DexPayCheckoutDto = z.infer<typeof dexpayCheckoutSchema>;
export type DexPaySyncDto = z.infer<typeof dexpaySyncSchema>;
