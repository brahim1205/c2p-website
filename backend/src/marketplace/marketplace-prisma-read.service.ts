import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { hydrateRow, hydrateRows } from '../data/data-row-hydration.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class MarketplacePrismaReadService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProviders() {
    return this.readOrNull(async () => {
      const providers = await this.prisma.marketplaceProvider.findMany({
        where: { active: true },
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      });
      return hydrateRows('providers', providers.map((provider) => this.providerToRow(provider)));
    });
  }

  async getPublicProvider(id: string) {
    return this.readOrNull(async () => {
      const provider = await this.prisma.marketplaceProvider.findUnique({ where: { id } });
      return provider ? hydrateRow('providers', this.providerToRow(provider)) : null;
    });
  }

  async getProviderByUserId(userId: string) {
    return this.readOrNull(async () => {
      const provider = await this.prisma.marketplaceProvider.findFirst({ where: { userId } });
      return provider ? hydrateRow('providers', this.providerToRow(provider)) : null;
    });
  }

  async listProviderReviews(providerId: string) {
    return this.readOrNull(async () => {
      const reviews = await this.prisma.marketplaceProviderReview.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
      });
      return reviews.map((review) => this.reviewToRow(review));
    });
  }

  async getProviderReview(id: string) {
    return this.readOrNull(async () => {
      const review = await this.prisma.marketplaceProviderReview.findUnique({ where: { id } });
      return review ? this.reviewToRow(review) : null;
    });
  }

  async listClientFavorites(clientId: string) {
    return this.readOrNull(async () => {
      const favorites = await this.prisma.marketplaceClientFavorite.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      });
      const providers = await this.providerMap(favorites.map((favorite) => favorite.providerId));
      return favorites.map((favorite) => this.favoriteToRow(favorite, providers.get(favorite.providerId)));
    });
  }

  async getClientFavorite(id: string) {
    return this.readOrNull(async () => {
      const favorite = await this.prisma.marketplaceClientFavorite.findUnique({ where: { id } });
      if (!favorite) return null;
      const provider = await this.prisma.marketplaceProvider.findUnique({ where: { id: favorite.providerId } });
      return this.favoriteToRow(favorite, provider ? hydrateRow('providers', this.providerToRow(provider)) : undefined);
    });
  }

  async getClientOrder(id: string) {
    return this.readOrNull(async () => {
      const order = await this.prisma.marketplaceClientOrder.findUnique({ where: { id } });
      return order ? this.clientOrderToRow(order) : null;
    });
  }

  async listProviderServices(providerId: string) {
    return this.readOrNull(async () => {
      const services = await this.prisma.marketplaceProviderService.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
      });
      return services.map((service) => this.serviceToRow(service));
    });
  }

  async getProviderService(id: string) {
    return this.readOrNull(async () => {
      const service = await this.prisma.marketplaceProviderService.findUnique({ where: { id } });
      return service ? this.serviceToRow(service) : null;
    });
  }

  async latestVerificationRequestForUser(userId: string) {
    return this.readOrNull(async () => {
      const request = await this.prisma.marketplaceProviderVerificationRequest.findFirst({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
      });
      return request ? hydrateRow('provider_verification_requests', this.verificationRequestToRow(request)) : null;
    });
  }

  async getVerificationRequest(id: string) {
    return this.readOrNull(async () => {
      const request = await this.prisma.marketplaceProviderVerificationRequest.findUnique({ where: { id } });
      return request ? hydrateRow('provider_verification_requests', this.verificationRequestToRow(request)) : null;
    });
  }

  private async providerMap(providerIds: string[]) {
    const ids = Array.from(new Set(providerIds));
    if (ids.length === 0) return new Map<string, Row>();
    const providers = await this.prisma.marketplaceProvider.findMany({ where: { id: { in: ids } } });
    return new Map(providers.map((provider) => [provider.id, hydrateRow('providers', this.providerToRow(provider))]));
  }

  private async readOrNull<T>(read: () => Promise<T>) {
    if (!this.prisma.isConnected) return null;
    try {
      return await read();
    } catch (error) {
      if (this.isMissingProjection(error)) return null;
      throw error;
    }
  }

  private isMissingProjection(error: unknown) {
    return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2021');
  }

  private providerToRow(provider: Prisma.MarketplaceProviderGetPayload<object>): Row {
    const row = this.metadataRow(provider.metadata);
    return {
      ...row,
      id: row.id ?? provider.id,
      user_id: row.user_id ?? provider.userId ?? null,
      name: provider.name,
      title: provider.title ?? row.title ?? null,
      category: provider.category ?? row.category ?? null,
      location: provider.location ?? row.location ?? null,
      avatar: provider.avatar ?? row.avatar ?? null,
      image: row.image ?? provider.avatar ?? null,
      cover_image: provider.coverImage ?? row.cover_image ?? null,
      rating: provider.rating,
      reviews: provider.reviewCount,
      reviews_count: provider.reviewCount,
      verified: provider.verified,
      status: provider.active ? 'active' : 'inactive',
      services: provider.services ?? row.services,
      created_at: this.iso(provider.createdAt),
      updated_at: this.iso(provider.updatedAt),
    };
  }

  private reviewToRow(review: Prisma.MarketplaceProviderReviewGetPayload<object>): Row {
    const row = this.metadataRow(review.metadata);
    return hydrateRow('provider_reviews', {
      ...row,
      id: row.id ?? review.id,
      provider_id: row.provider_id ?? review.providerId,
      client_id: row.client_id ?? review.clientId ?? null,
      client_name: review.clientName ?? row.client_name ?? null,
      rating: review.rating,
      comment: review.comment ?? row.comment ?? '',
      service: review.service ?? row.service ?? null,
      response: review.response ?? row.response ?? null,
      helpful: review.helpful,
      created_at: this.iso(review.createdAt),
      updated_at: this.iso(review.updatedAt),
      date: row.date ?? this.iso(review.createdAt),
    });
  }

  private serviceToRow(service: Prisma.MarketplaceProviderServiceGetPayload<object>): Row {
    const row = this.metadataRow(service.metadata);
    return hydrateRow('provider_services', {
      ...row,
      id: row.id ?? service.id,
      provider_id: row.provider_id ?? service.providerId,
      provider_user_id: row.provider_user_id ?? service.providerUserId ?? null,
      title: service.title,
      description: service.description ?? row.description ?? '',
      category: service.category ?? row.category ?? 'General',
      location: service.location ?? row.location ?? '',
      price: service.priceLabel ?? row.price ?? (service.price === null ? '' : String(service.price)),
      price_type: service.priceType ?? row.price_type ?? 'fixed',
      status: service.status,
      image: service.image ?? row.image ?? '',
      created_at: this.iso(service.createdAt),
      updated_at: this.iso(service.updatedAt),
    });
  }

  private clientOrderToRow(order: Prisma.MarketplaceClientOrderGetPayload<object>): Row {
    const row = this.metadataRow(order.metadata);
    return hydrateRow('client_orders', {
      ...row,
      id: row.id ?? order.id,
      client_id: row.client_id ?? order.clientId,
      provider_id: row.provider_id ?? order.providerId ?? null,
      service: order.service ?? row.service ?? null,
      status: order.status,
      amount: order.amount ?? row.amount ?? null,
      currency: order.currency ?? row.currency ?? 'FCFA',
      scheduled_at: order.scheduledAt ? this.iso(order.scheduledAt) : row.scheduled_at ?? null,
      created_at: this.iso(order.createdAt),
      updated_at: this.iso(order.updatedAt),
    });
  }

  private favoriteToRow(favorite: Prisma.MarketplaceClientFavoriteGetPayload<object>, provider?: Row): Row {
    const row = this.metadataRow(favorite.metadata);
    return hydrateRow('client_favorites', {
      ...row,
      id: row.id ?? favorite.id,
      client_id: row.client_id ?? favorite.clientId,
      provider_id: row.provider_id ?? favorite.providerId,
      provider: provider ?? row.provider ?? null,
      added_at: row.added_at ?? this.iso(favorite.createdAt),
      created_at: row.created_at ?? this.iso(favorite.createdAt),
      updated_at: this.iso(favorite.updatedAt),
    });
  }

  private verificationRequestToRow(request: Prisma.MarketplaceProviderVerificationRequestGetPayload<object>): Row {
    const row = this.metadataRow(request.metadata);
    return {
      ...row,
      id: row.id ?? request.id,
      provider_id: row.provider_id ?? request.providerId,
      user_id: row.user_id ?? request.userId,
      requested_level: row.requested_level ?? request.requestedLevel ?? 'verified',
      status: request.status,
      note: request.note ?? row.note ?? '',
      reviewed_by: request.reviewedBy ?? row.reviewed_by ?? null,
      requested_at: request.requestedAt ? this.iso(request.requestedAt) : row.requested_at ?? null,
      reviewed_at: request.reviewedAt ? this.iso(request.reviewedAt) : row.reviewed_at ?? null,
      created_at: this.iso(request.createdAt),
      updated_at: this.iso(request.updatedAt),
    };
  }

  private metadataRow(metadata: Prisma.JsonValue | null): Row {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...(metadata as Row) } : {};
  }

  private iso(date: Date) {
    return date.toISOString();
  }
}
