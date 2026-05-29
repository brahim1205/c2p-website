import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

type MarketplaceRowsByTable = {
  providers: Row[];
  provider_services: Row[];
  provider_reviews: Row[];
  client_orders: Row[];
  client_favorites: Row[];
  provider_verification_requests: Row[];
};

type MarketplaceRemovalsByTable = Record<keyof MarketplaceRowsByTable, string[]>;

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function toString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  return fallback;
}

function toNullableString(value: unknown) {
  const normalized = toString(value).trim();
  return normalized || undefined;
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(toString(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function toInt(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
}

function toFloat(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const digits = toString(value).replace(/[^\d.-]/g, '');
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isFinite(amount) ? Math.round(amount) : undefined;
}

export async function persistMarketplaceProjection(
  tx: Prisma.TransactionClient,
  rowsByTable: MarketplaceRowsByTable,
) {
  await persistProviders(tx, rowsByTable.providers);
  await persistProviderServices(tx, rowsByTable.provider_services);
  await persistProviderReviews(tx, rowsByTable.provider_reviews);
  await persistClientOrders(tx, rowsByTable.client_orders);
  await persistClientFavorites(tx, rowsByTable.client_favorites);
  await persistVerificationRequests(tx, rowsByTable.provider_verification_requests);
}

export async function deleteMarketplaceProjection(
  tx: Prisma.TransactionClient,
  removalsByTable: MarketplaceRemovalsByTable,
) {
  if (removalsByTable.providers.length) {
    await tx.marketplaceProvider.deleteMany({ where: { id: { in: removalsByTable.providers } } });
  }
  if (removalsByTable.provider_services.length) {
    await tx.marketplaceProviderService.deleteMany({ where: { id: { in: removalsByTable.provider_services } } });
  }
  if (removalsByTable.provider_reviews.length) {
    await tx.marketplaceProviderReview.deleteMany({ where: { id: { in: removalsByTable.provider_reviews } } });
  }
  if (removalsByTable.client_orders.length) {
    await tx.marketplaceClientOrder.deleteMany({ where: { id: { in: removalsByTable.client_orders } } });
  }
  if (removalsByTable.client_favorites.length) {
    await tx.marketplaceClientFavorite.deleteMany({ where: { id: { in: removalsByTable.client_favorites } } });
  }
  if (removalsByTable.provider_verification_requests.length) {
    await tx.marketplaceProviderVerificationRequest.deleteMany({
      where: { id: { in: removalsByTable.provider_verification_requests } },
    });
  }
}

async function persistProviders(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceProviderCreateInput = {
      id: toString(row.id),
      userId: toNullableString(row.user_id),
      name: toString(row.name ?? row.public_alias ?? row.id, 'Prestataire'),
      title: toNullableString(row.title),
      category: toNullableString(row.category),
      location: toNullableString(row.location ?? row.city),
      avatar: toNullableString(row.avatar ?? row.image),
      coverImage: toNullableString(row.cover_image),
      rating: toFloat(row.rating),
      reviewCount: toInt(row.reviews_count ?? row.reviews),
      verified: toBool(row.verified),
      active: toString(row.status, 'active') !== 'inactive',
      services: row.services === undefined ? undefined : toJson(row.services),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceProvider.upsert({ where: { id }, create: data, update });
  }
}

async function persistProviderServices(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceProviderServiceCreateInput = {
      id: toString(row.id),
      providerId: toString(row.provider_id),
      providerUserId: toNullableString(row.provider_user_id),
      title: toString(row.title ?? row.name ?? row.id, 'Service'),
      description: toNullableString(row.description),
      category: toNullableString(row.category),
      location: toNullableString(row.location),
      price: parseAmount(row.price ?? row.amount),
      priceLabel: toNullableString(row.price),
      priceType: toNullableString(row.price_type ?? row.priceType),
      status: toString(row.status, 'active'),
      image: toNullableString(row.image),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceProviderService.upsert({ where: { id }, create: data, update });
  }
}

async function persistProviderReviews(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceProviderReviewCreateInput = {
      id: toString(row.id),
      providerId: toString(row.provider_id),
      clientId: toNullableString(row.client_id),
      clientName: toNullableString(row.client_name),
      rating: toInt(row.rating),
      comment: toNullableString(row.comment),
      service: toNullableString(row.service),
      response: toNullableString(row.response),
      helpful: toInt(row.helpful),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceProviderReview.upsert({ where: { id }, create: data, update });
  }
}

async function persistClientOrders(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceClientOrderCreateInput = {
      id: toString(row.id),
      clientId: toString(row.client_id),
      providerId: toNullableString(row.provider_id),
      service: toNullableString(row.service),
      status: toString(row.status, 'pending'),
      amount: parseAmount(row.amount ?? row.total),
      currency: toString(row.currency, 'FCFA'),
      scheduledAt: toDate(row.scheduled_at ?? row.date),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at ?? row.date) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceClientOrder.upsert({ where: { id }, create: data, update });
  }
}

async function persistClientFavorites(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceClientFavoriteCreateInput = {
      id: toString(row.id),
      clientId: toString(row.client_id),
      providerId: toString(row.provider_id),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.added_at ?? row.created_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.added_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceClientFavorite.upsert({ where: { id }, create: data, update });
  }
}

async function persistVerificationRequests(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.MarketplaceProviderVerificationRequestCreateInput = {
      id: toString(row.id),
      providerId: toString(row.provider_id),
      userId: toString(row.user_id),
      requestedLevel: toNullableString(row.requested_level ?? row.level),
      status: toString(row.status, 'pending'),
      note: toNullableString(row.note),
      reviewedBy: toNullableString(row.reviewed_by),
      requestedAt: toDate(row.requested_at ?? row.created_at),
      reviewedAt: toDate(row.reviewed_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.requested_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.reviewed_at ?? row.requested_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.marketplaceProviderVerificationRequest.upsert({ where: { id }, create: data, update });
  }
}
