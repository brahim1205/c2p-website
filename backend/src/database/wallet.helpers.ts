import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export function walletOperationScopedId(prefix: string, operationId: string) {
  return `${prefix}_${operationId}`;
}

export function walletOperationReference(prefix: string, operationId: string) {
  return `${prefix}-${operationId.toUpperCase()}`;
}

export function assertPositiveWalletAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Le montant est invalide.');
  }
}

export function walletJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function walletRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function walletNullableString(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

export function walletAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function walletNullableInt(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  return walletAmount(value);
}

export function walletDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function resolveWalletCurrency(value: unknown) {
  return walletNullableString(value) ?? 'XAF';
}

export function resolveWalletLedgerDirection(kind: string) {
  if (new Set(['wallet_topup', 'refund', 'escrow_release']).has(kind)) {
    return 'credit';
  }
  return 'debit';
}
