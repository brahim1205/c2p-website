import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { persistMarketplaceProjection } from './platform-marketplace-projection.js';

type MarketplaceRowsByTable = {
  providers: Row[];
  provider_services: Row[];
  provider_reviews: Row[];
  client_orders: Row[];
  client_favorites: Row[];
  provider_verification_requests: Row[];
};

export type MarketplaceSnapshotSyncSummary = {
  marketplaceProviders: number;
  marketplaceProviderServices: number;
  marketplaceProviderReviews: number;
  marketplaceClientOrders: number;
  marketplaceClientFavorites: number;
  marketplaceProviderVerificationRequests: number;
};

export function buildMarketplaceRows(groupedRows: Partial<Record<string, Row[]>>): MarketplaceRowsByTable {
  return {
    providers: groupedRows.providers ?? [],
    provider_services: groupedRows.provider_services ?? [],
    provider_reviews: groupedRows.provider_reviews ?? [],
    client_orders: groupedRows.client_orders ?? [],
    client_favorites: groupedRows.client_favorites ?? [],
    provider_verification_requests: groupedRows.provider_verification_requests ?? [],
  };
}

export async function syncMarketplaceSnapshot(
  tx: Prisma.TransactionClient,
  rowsByTable: MarketplaceRowsByTable,
) {
  await tx.marketplaceProviderVerificationRequest.deleteMany({ where: { source: 'app_row' } });
  await tx.marketplaceClientFavorite.deleteMany({ where: { source: 'app_row' } });
  await tx.marketplaceClientOrder.deleteMany({ where: { source: 'app_row' } });
  await tx.marketplaceProviderReview.deleteMany({ where: { source: 'app_row' } });
  await tx.marketplaceProviderService.deleteMany({ where: { source: 'app_row' } });
  await tx.marketplaceProvider.deleteMany({ where: { source: 'app_row' } });
  await persistMarketplaceProjection(tx, rowsByTable);
}

export function summarizeMarketplaceRows(rowsByTable: MarketplaceRowsByTable): MarketplaceSnapshotSyncSummary {
  return {
    marketplaceProviders: rowsByTable.providers.length,
    marketplaceProviderServices: rowsByTable.provider_services.length,
    marketplaceProviderReviews: rowsByTable.provider_reviews.length,
    marketplaceClientOrders: rowsByTable.client_orders.length,
    marketplaceClientFavorites: rowsByTable.client_favorites.length,
    marketplaceProviderVerificationRequests: rowsByTable.provider_verification_requests.length,
  };
}

export function buildEmptyMarketplaceSummary(): MarketplaceSnapshotSyncSummary {
  return {
    marketplaceProviders: 0,
    marketplaceProviderServices: 0,
    marketplaceProviderReviews: 0,
    marketplaceClientOrders: 0,
    marketplaceClientFavorites: 0,
    marketplaceProviderVerificationRequests: 0,
  };
}
