import {
  clone,
  compareValues,
  findRow,
  getDaysSince,
  normalizeText,
  registerAppStoreDerivedDataRecomputer,
  registerAppStoreRowHydrator,
  store,
} from './data-app-store.js';
import { recomputeDerivedData as recomputeDerivedDataByPolicy } from './data-derived-data.js';
import {
  computeBookingFinancials,
  getPlatformRuleNumber,
} from './data-finance-context.js';
import { syncCourseModerationItems } from './data-course-moderation.js';
import {
  getDefaultLiveProvider,
  normalizeEscrowStatus,
  parseBoolean,
  requireNumberOrFallback,
  toNumber,
} from './data-normalizers.js';
import {
  ensureConstraints as ensureInsertConstraints,
  prepareInsert as prepareInsertByPolicy,
} from './data-write-policy.js';
import { hydrateRow } from './data-row-hydration.js';
import type { Row } from './mock-store.js';

export function prepareInsert(table: string, row: Row): Row {
  return prepareInsertByPolicy(table, row, {
    store,
    getDefaultLiveProvider,
    getPlatformRuleNumber,
  });
}

export function ensureConstraints(table: string, rows: Row[]) {
  ensureInsertConstraints(table, rows, store);
}

export function recomputeDerivedData() {
  recomputeDerivedDataByPolicy(store, {
    clone,
    compareValues,
    computeBookingFinancials,
    findRow,
    getDaysSince,
    normalizeEscrowStatus,
    normalizeText,
    parseBoolean,
    requireNumberOrFallback,
    syncCourseModerationItems,
    toNumber,
  });
}

registerAppStoreRowHydrator(hydrateRow);
registerAppStoreDerivedDataRecomputer(recomputeDerivedData);
