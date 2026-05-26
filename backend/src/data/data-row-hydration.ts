import type { Row } from './mock-store.js';
import { clone } from './data-app-store.js';
import { hydrateFinanceRow } from './data-finance-hydration.js';
import { hydrateLearningRow } from './data-learning-hydration.js';
import { hydrateMarketplaceRow } from './data-marketplace-hydration.js';
import { hydrateOperationsRow } from './data-operations-hydration.js';
import { hydrateProjectRow } from './data-project-hydration.js';

export function hydrateRow(table: string, row: Row): Row {
  const hydrated = clone(row);

  const marketplaceRow = hydrateMarketplaceRow(table, hydrated);
  if (marketplaceRow) return marketplaceRow;

  const projectRow = hydrateProjectRow(table, hydrated);
  if (projectRow) return projectRow;

  const learningRow = hydrateLearningRow(table, hydrated);
  if (learningRow) return learningRow;

  const financeRow = hydrateFinanceRow(table, hydrated);
  if (financeRow) return financeRow;

  const operationsRow = hydrateOperationsRow(table, hydrated);
  if (operationsRow) return operationsRow;

  return hydrated;
}

export function hydrateRows(table: string, rows: Row[]) {
  return rows.map((row) => hydrateRow(table, row));
}
