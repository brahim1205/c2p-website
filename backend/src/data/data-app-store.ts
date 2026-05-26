import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { createInitialStore, type Row, type Store } from './mock-store.js';
import { toNumber } from './data-normalizers.js';

export const initialStore: Store = createInitialStore();
export const store: Store = Object.fromEntries(Object.keys(initialStore).map((table) => [table, []]));

let appStoreHydrated = false;
let appStoreHydratedAt = 0;
let syncAppStorePromise: Promise<void> | null = null;
let recomputeAppStoreDerivedData: () => void = () => undefined;
let hydrateAppStoreRow: (table: string, row: Row) => Row = (_table, row) => clone(row);

const APP_STORE_SYNC_TTL_MS = 60_000;

export function registerAppStoreDerivedDataRecomputer(recomputer: () => void) {
  recomputeAppStoreDerivedData = recomputer;
  recomputeAppStoreDerivedData();
}

export function registerAppStoreRowHydrator(hydrator: (table: string, row: Row) => Row) {
  hydrateAppStoreRow = hydrator;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function matches(row: Row, query: Record<string, string | string[] | undefined>) {
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true;

    const firstValue = Array.isArray(value) ? value[0] : value;
    if (key.startsWith('eq_')) {
      const field = key.slice(3);
      return String(row[field]) === firstValue;
    }

    if (key.startsWith('neq_')) {
      const field = key.slice(4);
      return String(row[field]) !== firstValue;
    }

    if (key.startsWith('in_')) {
      const field = key.slice(3);
      return firstValue.split(',').includes(String(row[field]));
    }

    return true;
  });
}

export function withId(row: Row): Row {
  return {
    ...row,
    id: row.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export function ensureTable(table: string) {
  if (!store[table]) {
    store[table] = [];
  }
}

export function compareValues(left: unknown, right: unknown) {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  const leftDate = typeof left === 'string' ? Date.parse(left) : Number.NaN;
  const rightDate = typeof right === 'string' ? Date.parse(right) : Number.NaN;
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

export function getDaysSince(dateValue: unknown) {
  if (typeof dateValue !== 'string' || !dateValue) return null;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export function findRow(table: string, id: unknown) {
  return (store[table] ?? []).find((row) => String(row.id) === String(id));
}

export function listAppRows(table: string) {
  ensureTable(table);
  return clone(store[table] ?? []);
}

export function appendAppRows(table: string, rows: Row[]) {
  ensureTable(table);
  store[table] = [...(store[table] ?? []), ...rows];
  recomputeAppStoreDerivedData();
  return rows.map((row) => hydrateAppStoreRow(table, findRow(table, row.id) ?? row));
}

export function patchAppRows(
  table: string,
  predicate: (row: Row) => boolean,
  patch: Row | ((row: Row) => Row),
) {
  ensureTable(table);
  const rows = store[table] ?? [];
  const updated = rows.map((row) => {
    if (!predicate(row)) return row;
    const nextPatch = typeof patch === 'function' ? patch(row) : patch;
    return {
      ...row,
      ...nextPatch,
      updated_at: new Date().toISOString(),
    };
  });
  store[table] = updated;
  recomputeAppStoreDerivedData();
  return updated.filter(predicate).map((row) => hydrateAppStoreRow(table, row));
}

export function mergeRowsToPersist(target: Record<string, Row[]>, table: string, rows: Row[]) {
  if (rows.length === 0) return;
  target[table] = [...(target[table] ?? []), ...rows.map((row) => clone(row))];
}

export function collectRowsByIds(table: string, ids: Array<string | number>) {
  const allowed = new Set(ids.map(String));
  return listAppRows(table).filter((row) => allowed.has(String(row.id)));
}

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function resetStore(nextStore: Store) {
  for (const key of Object.keys(store)) {
    delete store[key];
  }

  for (const [key, value] of Object.entries(nextStore)) {
    store[key] = clone(value);
  }
}

function buildAppRows() {
  return Object.entries(store).flatMap<Prisma.AppRowCreateManyInput>(([table, rows]) =>
    rows.map((row) => ({
      key: `${table}::${String(row.id)}`,
      table,
      rowId: String(row.id),
      data: row as Prisma.InputJsonValue,
    })),
  );
}

export async function syncAppStoreFromDatabase(prisma: PrismaService, options: { force?: boolean } = {}) {
  if (!prisma.isConnected) {
    resetStore(Object.fromEntries(Object.keys(initialStore).map((table) => [table, []])));
    recomputeAppStoreDerivedData();
    appStoreHydrated = true;
    return;
  }

  if (appStoreHydrated && !options.force && (Date.now() - appStoreHydratedAt) < APP_STORE_SYNC_TTL_MS) {
    return;
  }

  if (syncAppStorePromise) {
    return syncAppStorePromise;
  }

  syncAppStorePromise = (async () => {
    const records = await prisma.appRow.findMany();
    const nextStore: Store = {};
    for (const record of records) {
      if (!nextStore[record.table]) {
        nextStore[record.table] = [];
      }
      nextStore[record.table].push(clone(record.data as Row));
    }

    for (const table of Object.keys(initialStore)) {
      if (!nextStore[table]) {
        nextStore[table] = [];
      }
    }

    resetStore(nextStore);
    recomputeAppStoreDerivedData();
    appStoreHydrated = true;
    appStoreHydratedAt = Date.now();
  })().finally(() => {
    syncAppStorePromise = null;
  });

  return syncAppStorePromise;
}

export async function persistAppStoreToDatabase(prisma: PrismaService) {
  if (!prisma.isConnected) {
    return;
  }

  const records = buildAppRows();
  await prisma.$transaction(async (tx) => {
    await tx.appRow.deleteMany({});
    if (records.length > 0) {
      await tx.appRow.createMany({ data: records });
    }
  });
  appStoreHydratedAt = Date.now();
}
