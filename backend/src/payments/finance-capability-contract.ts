import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const FINANCE_CAPABILITY_CONTRACT_VERSION = 1 as const;
export const FINANCE_CAPABILITY_MACHINE_VERSION = 1 as const;

export const FINANCE_CAPABILITY_KIND_VALUES = [
  'transaction',
  'escrow',
  'payout',
  'subscription',
  'invoice',
  'provider_transaction',
  'payment_intent',
] as const;

export const FINANCE_CAPABILITY_ENTITY_ROUTE_VALUES = [
  ...FINANCE_CAPABILITY_KIND_VALUES,
  'provider-transaction',
  'payment-intent',
] as const;

export const FINANCE_CAPABILITY_ACTION_VALUES = [
  'view',
  'sync_provider',
  'force_sync_provider',
  'retry_transaction',
  'refund_transaction',
  'open_financial_context',
  'open_linked_invoices',
  'open_linked_transactions',
  'release_escrow',
  'refund_escrow',
  'approve_payout',
  'reject_payout',
  'cancel_payout',
  'mark_payout_paid',
  'renew_subscription',
  'cancel_subscription',
  'download_invoice',
  'mark_invoice_paid',
  'mark_invoice_cancelled',
] as const;

export type FinanceCapabilityKind = (typeof FINANCE_CAPABILITY_KIND_VALUES)[number];
export type FinanceCapabilityEntityRoute = (typeof FINANCE_CAPABILITY_ENTITY_ROUTE_VALUES)[number];
export type FinanceCapabilityAction = (typeof FINANCE_CAPABILITY_ACTION_VALUES)[number];

const financeCapabilityKindSchema = z.enum(FINANCE_CAPABILITY_KIND_VALUES);
const financeCapabilityActionSchema = z.enum(FINANCE_CAPABILITY_ACTION_VALUES);

export const financeCapabilitySnapshotSchema = z.object({
  contractVersion: z.literal(FINANCE_CAPABILITY_CONTRACT_VERSION),
  machineVersion: z.literal(FINANCE_CAPABILITY_MACHINE_VERSION),
  kind: financeCapabilityKindSchema,
  id: z.string().min(1),
  actorScope: z.enum(['admin', 'self', 'external']),
  currentState: z.string().min(1),
  finality: z.enum(['mutable', 'terminal']),
  terminalStates: z.array(z.string().min(1)),
  allowedTransitions: z.array(z.string().min(1)),
  allowedActions: z.array(financeCapabilityActionSchema),
  transitionGraph: z.record(z.string(), z.array(z.string())),
  correlation: z.object({
    financialOperationId: z.string().min(1).nullable().optional(),
    providerReference: z.string().min(1).nullable().optional(),
    paymentIntentId: z.string().min(1).nullable().optional(),
    paymentTransactionId: z.string().min(1).nullable().optional(),
    sourceType: z.string().min(1).nullable().optional(),
    sourceId: z.union([z.string().min(1), z.number()]).nullable().optional(),
    bookingId: z.union([z.string().min(1), z.number()]).nullable().optional(),
    accountId: z.string().min(1).nullable().optional(),
    invoiceNumber: z.string().min(1).nullable().optional(),
  }),
  metadata: z.record(z.string(), z.unknown()),
});

export const financeCapabilityContractDescriptorSchema = z.object({
  contractVersion: z.literal(FINANCE_CAPABILITY_CONTRACT_VERSION),
  machineVersion: z.literal(FINANCE_CAPABILITY_MACHINE_VERSION),
  genericEndpoint: z.string().min(1),
  legacyEntityEndpointsSupported: z.boolean(),
  entities: z.array(z.enum(FINANCE_CAPABILITY_ENTITY_ROUTE_VALUES)),
  kinds: z.array(financeCapabilityKindSchema),
  actions: z.array(financeCapabilityActionSchema),
  actorScopes: z.array(z.enum(['admin', 'self', 'external'])),
});

export function resolveFinanceCapabilityContractVersion(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return FINANCE_CAPABILITY_CONTRACT_VERSION;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException('contractVersion invalide.');
  }

  if (parsed !== FINANCE_CAPABILITY_CONTRACT_VERSION) {
    throw new BadRequestException(
      `contractVersion non supportée. Version attendue: ${FINANCE_CAPABILITY_CONTRACT_VERSION}.`,
    );
  }

  return FINANCE_CAPABILITY_CONTRACT_VERSION;
}

export function validateFinanceCapabilitySnapshot(snapshot: unknown) {
  return financeCapabilitySnapshotSchema.parse(snapshot);
}

export function buildFinanceCapabilityContractDescriptor() {
  return financeCapabilityContractDescriptorSchema.parse({
    contractVersion: FINANCE_CAPABILITY_CONTRACT_VERSION,
    machineVersion: FINANCE_CAPABILITY_MACHINE_VERSION,
    genericEndpoint: '/payments/capabilities/:entity/:entityId',
    legacyEntityEndpointsSupported: true,
    entities: [...FINANCE_CAPABILITY_ENTITY_ROUTE_VALUES],
    kinds: [...FINANCE_CAPABILITY_KIND_VALUES],
    actions: [...FINANCE_CAPABILITY_ACTION_VALUES],
    actorScopes: ['admin', 'self', 'external'],
  });
}
