import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  findRow,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRow, hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { MarketplacePrismaReadService } from './marketplace-prisma-read.service.js';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly marketplacePrismaReadService: MarketplacePrismaReadService,
  ) {}

  async listPublicProviders() {
    await syncAppStoreFromDatabase(this.prisma);
    const prismaProviders = await this.marketplacePrismaReadService.listPublicProviders();
    if (prismaProviders) return prismaProviders;
    return hydrateRows('providers', store.providers ?? [])
      .sort((left, right) => this.compareNumbersDesc(left.rating, right.rating));
  }

  async getPublicProvider(id: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const prismaProvider = await this.marketplacePrismaReadService.getPublicProvider(id);
    if (prismaProvider) return prismaProvider;
    const provider = findRow('providers', id);
    return provider ? hydrateRow('providers', provider) : null;
  }

  async listPublicProviderReviews(id: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const prismaReviews = await this.marketplacePrismaReadService.listProviderReviews(id);
    if (prismaReviews) return prismaReviews;
    const provider = findRow('providers', id);
    return provider ? this.providerRows('provider_reviews', provider) : [];
  }

  async getProviderByUserId(userId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const prismaProvider = await this.marketplacePrismaReadService.getProviderByUserId(userId);
    if (prismaProvider) return prismaProvider;
    const provider = (store.providers ?? []).find((row) => String(row.user_id) === String(userId));
    return provider ? hydrateRow('providers', provider) : null;
  }

  async getClientDashboard(user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    return {
      bookings: this.clientRows('bookings', actor).slice(0, 8),
      orders: this.clientRows('client_orders', actor).slice(0, 8),
      favorites: this.clientRows('client_favorites', actor).slice(0, 4),
    };
  }

  async listClientOrders(user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    return this.clientRows('client_orders', actor);
  }

  async updateClientOrderStatus(orderId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Statut commande invalide.');
    const status = this.requireString(input.status, 'Le statut est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const order = this.findOwnedRow('client_orders', orderId, actor, 'Commande introuvable.');
    const previous = clone(order);
    const updated = patchAppRows('client_orders', (row) => String(row.id) === String(order.id), { status });
    await this.persist('client_orders', updated, actor, 'marketplace:client:order-status:update', [previous]);
    return this.persistedMarketplaceRow('client_orders', updated[0] ?? { ...order, status });
  }

  async submitClientReport(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Signalement invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const report = this.insertRow('admin_reports', {
      reported: this.readString(input.reported ?? input.targetLabel) ?? 'Signalement client',
      target_id: this.readString(input.target_id ?? input.targetId) ?? null,
      target_table: this.readString(input.target_table ?? input.targetTable) ?? null,
      type: this.readString(input.type) ?? 'client_report',
      reason: this.readString(input.reason) ?? '',
      description: this.readString(input.description) ?? '',
      priority: this.readString(input.priority) ?? 'medium',
      reporter_id: actor.id,
      reporter_role: actor.role,
    });
    await this.persist('admin_reports', [report], actor, 'marketplace:client:report:create');
    return report;
  }

  async listClientBookings(user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    const bookings = this.clientRows('bookings', actor);
    return {
      bookings,
      providers: this.providerMapForBookings(bookings),
    };
  }

  async cancelClientBooking(bookingId: string, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    const booking = this.findOwnedRow('bookings', bookingId, actor, 'Reservation introuvable.');
    const previous = clone(booking);
    const updated = patchAppRows('bookings', (row) => String(row.id) === String(booking.id), {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });
    await this.persist('bookings', updated, actor, 'marketplace:client:booking:cancel', [previous]);
    return updated[0] ?? { ...booking, status: 'cancelled' };
  }

  async publishClientReview(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Avis invalide.');
    const bookingId = this.requireIdentifier(input.booking_id ?? input.bookingId, 'La reservation est obligatoire.');
    const rating = this.requireNumber(input.rating, 'La note est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const booking = this.findOwnedRow('bookings', bookingId, actor, 'Reservation introuvable.');
    const review = this.insertRow('provider_reviews', {
      provider_id: booking.provider_id,
      client_id: actor.id,
      client_name: this.readString(input.client_name ?? input.clientName) ?? `${actor.firstName} ${actor.lastName}`.trim(),
      client_avatar: this.readString(input.client_avatar ?? input.clientAvatar) ?? null,
      rating,
      comment: this.readString(input.comment) ?? '',
      service: this.readString(input.service) ?? booking.service,
      created_at: new Date().toISOString(),
    });
    await this.persist('provider_reviews', [review], actor, 'marketplace:client:review:create');
    return this.persistedMarketplaceRow('provider_reviews', review);
  }

  async publishClientProviderReview(providerId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Avis invalide.');
    const rating = this.requireNumber(input.rating, 'La note est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = findRow('providers', providerId);
    if (!provider) {
      throw new NotFoundException('Prestataire introuvable.');
    }
    const providerServices = Array.isArray(provider.services) ? provider.services : [];
    const review = this.insertRow('provider_reviews', {
      provider_id: Number.isFinite(Number(providerId)) ? Number(providerId) : providerId,
      client_id: actor.id,
      client_name: this.readString(input.client_name ?? input.clientName) ?? `${actor.firstName} ${actor.lastName}`.trim(),
      client_avatar: this.readString(input.client_avatar ?? input.clientAvatar) ?? actor.avatar ?? null,
      rating,
      comment: this.readString(input.comment) ?? '',
      service: this.readString(input.service) ?? providerServices[0] ?? provider.title ?? 'Service general',
      helpful: 0,
      created_at: new Date().toISOString(),
    });
    await this.persist('provider_reviews', [review], actor, 'marketplace:client:provider-review:create');
    return this.persistedMarketplaceRow('provider_reviews', review);
  }

  async listClientProviders(user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    const [prismaProviders, prismaFavorites] = await Promise.all([
      this.marketplacePrismaReadService.listPublicProviders(),
      this.marketplacePrismaReadService.listClientFavorites(actor.id),
    ]);
    if (prismaProviders && prismaFavorites) {
      return { providers: prismaProviders, favorites: prismaFavorites };
    }
    return {
      providers: hydrateRows('providers', store.providers ?? [])
        .sort((left, right) => this.compareNumbersDesc(left.rating, right.rating)),
      favorites: this.clientRows('client_favorites', actor),
    };
  }

  async addClientFavorite(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Favori invalide.');
    const providerId = this.requireIdentifier(input.provider_id ?? input.providerId, 'Le prestataire est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    if (!findRow('providers', providerId)) {
      throw new NotFoundException('Prestataire introuvable.');
    }
    const favorite = this.insertRow('client_favorites', {
      client_id: actor.id,
      provider_id: Number.isFinite(Number(providerId)) ? Number(providerId) : providerId,
      added_at: new Date().toISOString(),
    }, { ensureUnique: true });
    await this.persist('client_favorites', [favorite], actor, 'marketplace:client:favorite:create');
    return this.persistedMarketplaceRow('client_favorites', favorite);
  }

  async removeClientFavorite(favoriteId: string, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    await syncAppStoreFromDatabase(this.prisma);
    const favorite = this.findOwnedRow('client_favorites', favoriteId, actor, 'Favori introuvable.');
    store.client_favorites = (store.client_favorites ?? []).filter((row) => String(row.id) !== String(favorite.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ client_favorites: [String(favorite.id)] }, {
      actorId: actor.id,
      reason: 'marketplace:client:favorite:delete',
      beforeRowsByTable: { client_favorites: [favorite] },
    });
    return favorite;
  }

  async createClientBooking(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'client');
    const input = this.requireObject(payload, 'Demande invalide.');
    const service = this.requireString(input.service, 'Le service est obligatoire.');
    const bookingDate = this.requireString(input.booking_date ?? input.bookingDate, 'La date est obligatoire.');
    const bookingTime = this.readString(input.booking_time ?? input.bookingTime) ?? '09:00';
    await syncAppStoreFromDatabase(this.prisma);
    const requestedProviderId = this.numberOrNull(input.requested_provider_id ?? input.requestedProviderId);
    if (requestedProviderId !== null && this.isProviderSlotBlocked(String(requestedProviderId), bookingDate, bookingTime)) {
      throw new BadRequestException('Ce créneau est indisponible pour ce prestataire.');
    }
    const booking = this.insertRow('bookings', {
      client_id: actor.id,
      client_name: this.readString(input.client_name ?? input.clientName) ?? `${actor.firstName} ${actor.lastName}`.trim(),
      client_email: this.readString(input.client_email ?? input.clientEmail) ?? actor.email,
      requested_provider_id: requestedProviderId,
      provider_id: null,
      service,
      description: this.readString(input.description) ?? '',
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: 'pending',
      request_type: this.readString(input.request_type ?? input.requestType) ?? 'booking',
      price: this.numberOrNull(input.price),
      payment_method: this.readString(input.payment_method ?? input.paymentMethod) ?? 'wallet',
      address: this.readString(input.address) ?? '',
      request_channel: 'c2p_managed',
      wallet_flow: 'escrow',
      created_at: new Date().toISOString(),
    });
    await this.persist('bookings', [booking], actor, 'marketplace:client:booking:create');
    return booking;
  }

  async getPrestataireDashboard(user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.providerForUser(actor.id);
    if (!provider) {
      return { provider: null, bookings: [], reviews: [], visibilityPass: null, verificationRequest: null };
    }
    const [prismaProvider, prismaReviews, prismaVerificationRequest] = await Promise.all([
      this.marketplacePrismaReadService.getProviderByUserId(actor.id),
      this.marketplacePrismaReadService.listProviderReviews(String(provider.id)),
      this.marketplacePrismaReadService.latestVerificationRequestForUser(actor.id),
    ]);
    return {
      provider: prismaProvider ?? hydrateRow('providers', provider),
      bookings: this.providerRows('bookings', provider).slice(0, 4),
      reviews: (prismaReviews ?? this.providerRows('provider_reviews', provider)).slice(0, 3),
      visibilityPass: this.latestUserRow('provider_visibility_passes', actor.id, 'issued_at'),
      verificationRequest: prismaVerificationRequest ?? this.latestUserRow('provider_verification_requests', actor.id, 'requested_at'),
    };
  }

  async requestPrestataireVerification(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Demande de verification invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const providerId = this.requireIdentifier(input.provider_id ?? input.providerId, 'Le prestataire est obligatoire.');
    const provider = this.providerForUser(actor.id);
    if (!provider || String(provider.id) !== String(providerId)) {
      throw new ForbiddenException('Prestataire non autorise.');
    }
    const request = this.insertRow('provider_verification_requests', {
      provider_id: provider.id,
      user_id: actor.id,
      note: this.readString(input.note) ?? '',
      requested_level: 'verified',
      status: 'pending',
      requested_at: new Date().toISOString(),
    }, { ensureUnique: true });
    await this.persist('provider_verification_requests', [request], actor, 'marketplace:prestataire:verification-request:create');
    return this.persistedMarketplaceRow('provider_verification_requests', request);
  }

  async listPrestataireBookings(user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.providerForUser(actor.id);
    return {
      providerId: provider?.id ?? null,
      bookings: provider ? this.providerRows('bookings', provider) : [],
    };
  }

  async listPrestataireAvailabilityBlocks(user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.providerForUser(actor.id);
    return {
      providerId: provider?.id ?? null,
      blocks: provider ? this.providerRows('provider_availability_blocks', provider) : [],
    };
  }

  async createPrestataireAvailabilityBlock(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Créneau invalide.');
    const startsAt = this.requireString(input.starts_at ?? input.startsAt, 'Le début du créneau est obligatoire.');
    const endsAt = this.requireString(input.ends_at ?? input.endsAt, 'La fin du créneau est obligatoire.');
    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      throw new BadRequestException('Le créneau indisponible est invalide.');
    }

    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const block = this.insertRow('provider_availability_blocks', {
      provider_id: provider.id,
      user_id: actor.id,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      reason: this.readString(input.reason) ?? 'Créneau bloqué',
      status: 'blocked',
      created_at: new Date().toISOString(),
    });
    await this.persist('provider_availability_blocks', [block], actor, 'marketplace:prestataire:availability-block:create');
    return block;
  }

  async deletePrestataireAvailabilityBlock(blockId: string, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const block = this.findProviderRow('provider_availability_blocks', blockId, provider, 'Créneau introuvable.');
    store.provider_availability_blocks = (store.provider_availability_blocks ?? []).filter((row) => String(row.id) !== String(block.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ provider_availability_blocks: [String(block.id)] }, {
      actorId: actor.id,
      reason: 'marketplace:prestataire:availability-block:delete',
      beforeRowsByTable: { provider_availability_blocks: [block] },
    });
    return block;
  }

  async updatePrestataireBookingStatus(bookingId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Statut reservation invalide.');
    const status = this.requireString(input.status, 'Le statut est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const booking = this.findProviderRow('bookings', bookingId, provider, 'Reservation introuvable.');
    const previous = clone(booking);
    const updated = patchAppRows('bookings', (row) => String(row.id) === String(booking.id), {
      status,
      updated_at: new Date().toISOString(),
    });
    await this.persist('bookings', updated, actor, 'marketplace:prestataire:booking-status:update', [previous]);
    return updated[0] ?? { ...booking, status };
  }

  async listPrestataireReviews(user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.providerForUser(actor.id);
    const prismaReviews = provider ? await this.marketplacePrismaReadService.listProviderReviews(String(provider.id)) : null;
    if (prismaReviews) return prismaReviews;
    return provider ? this.providerRows('provider_reviews', provider) : [];
  }

  async replyPrestataireReview(reviewId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Reponse invalide.');
    const response = this.requireString(input.response ?? input.replyText, 'La reponse est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const review = this.findProviderRow('provider_reviews', reviewId, provider, 'Avis introuvable.');
    const previous = clone(review);
    const updated = patchAppRows('provider_reviews', (row) => String(row.id) === String(review.id), { response });
    await this.persist('provider_reviews', updated, actor, 'marketplace:prestataire:review:reply', [previous]);
    return this.persistedMarketplaceRow('provider_reviews', updated[0] ?? { ...review, response });
  }

  async updatePrestataireReviewHelpful(reviewId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Compteur avis invalide.');
    const helpful = this.requireNumber(input.helpful, 'Le compteur est obligatoire.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const review = this.findProviderRow('provider_reviews', reviewId, provider, 'Avis introuvable.');
    const previous = clone(review);
    const updated = patchAppRows('provider_reviews', (row) => String(row.id) === String(review.id), { helpful });
    await this.persist('provider_reviews', updated, actor, 'marketplace:prestataire:review:helpful', [previous]);
    return this.persistedMarketplaceRow('provider_reviews', updated[0] ?? { ...review, helpful });
  }

  async listPrestataireServices(user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.providerForUser(actor.id);
    const prismaServices = provider ? await this.marketplacePrismaReadService.listProviderServices(String(provider.id)) : null;
    return {
      providerId: provider?.id ?? null,
      services: prismaServices ?? (provider ? this.providerRows('provider_services', provider) : []),
    };
  }

  async createPrestataireService(payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Service invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const service = this.insertRow('provider_services', {
      provider_id: provider.id,
      title: this.requireString(input.title, 'Le titre est obligatoire.'),
      category: this.readString(input.category) ?? 'General',
      description: this.readString(input.description) ?? '',
      price: this.readString(input.price) ?? '',
      price_type: this.readString(input.price_type ?? input.priceType) ?? 'fixed',
      status: this.readString(input.status) ?? 'active',
      image: this.readString(input.image) ?? '',
      location: this.readString(input.location) ?? provider.location ?? provider.city ?? '',
      bookings: 0,
      rating: 0,
      created_at: new Date().toISOString(),
    });
    await this.persist('provider_services', [service], actor, 'marketplace:prestataire:service:create');
    return this.persistedMarketplaceRow('provider_services', service);
  }

  async updatePrestataireService(serviceId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Service invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const service = this.findProviderRow('provider_services', serviceId, provider, 'Service introuvable.');
    const previous = clone(service);
    const patch = this.cleanPatch(input, ['title', 'description', 'price', 'location', 'image', 'category', 'price_type', 'status']);
    const updated = patchAppRows('provider_services', (row) => String(row.id) === String(service.id), patch);
    await this.persist('provider_services', updated, actor, 'marketplace:prestataire:service:update', [previous]);
    return this.persistedMarketplaceRow('provider_services', updated[0] ?? { ...service, ...patch });
  }

  async updatePrestataireServiceStatus(serviceId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    const input = this.requireObject(payload, 'Statut service invalide.');
    const status = this.requireString(input.status, 'Le statut est obligatoire.');
    return this.updatePrestataireService(serviceId, { status }, actor);
  }

  async deletePrestataireService(serviceId: string, user: AuthUser | null) {
    const actor = this.requireRole(user, 'prestataire');
    await syncAppStoreFromDatabase(this.prisma);
    const provider = this.requireProviderForActor(actor);
    const service = this.findProviderRow('provider_services', serviceId, provider, 'Service introuvable.');
    store.provider_services = (store.provider_services ?? []).filter((row) => String(row.id) !== String(service.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ provider_services: [String(service.id)] }, {
      actorId: actor.id,
      reason: 'marketplace:prestataire:service:delete',
      beforeRowsByTable: { provider_services: [service] },
    });
    return service;
  }

  private clientRows(table: string, actor: AuthUser) {
    return hydrateRows(table, this.accessibleRows(table, actor))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.date ?? left.added_at, right.created_at ?? right.date ?? right.added_at));
  }

  private providerRows(table: string, provider: Row) {
    return hydrateRows(table, store[table] ?? [])
      .filter((row) => String(row.provider_id) === String(provider.id))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.booking_date, right.created_at ?? right.booking_date));
  }

  private providerMapForBookings(bookings: Row[]) {
    const providerIds = new Set(bookings.flatMap((booking) => [booking.provider_id, booking.requested_provider_id]).filter(Boolean).map(String));
    return Object.fromEntries(
      hydrateRows('providers', store.providers ?? [])
        .filter((provider) => providerIds.has(String(provider.id)))
        .map((provider) => [String(provider.id), {
          id: provider.id,
          name: provider.name,
          image: provider.image ?? null,
          user_id: provider.user_id,
        }]),
    );
  }

  private isProviderSlotBlocked(providerId: string, bookingDate: string, bookingTime: string) {
    const slot = this.parseBookingSlot(bookingDate, bookingTime);
    if (!slot) return false;
    return (store.provider_availability_blocks ?? []).some((block) => {
      if (String(block.provider_id) !== String(providerId) || String(block.status ?? 'blocked') !== 'blocked') return false;
      const startsAt = Date.parse(String(block.starts_at ?? ''));
      const endsAt = Date.parse(String(block.ends_at ?? ''));
      if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
      return slot >= startsAt && slot < endsAt;
    });
  }

  private parseBookingSlot(bookingDate: string, bookingTime: string) {
    const normalizedTime = bookingTime.match(/^\d{2}:\d{2}/) ? bookingTime.slice(0, 5) : '09:00';
    const parsed = Date.parse(`${bookingDate}T${normalizedTime}:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private findOwnedRow(table: string, rowId: string, actor: AuthUser, notFoundMessage: string) {
    const row = this.accessibleRows(table, actor).find((entry) => String(entry.id) === String(rowId));
    if (!row) throw new NotFoundException(notFoundMessage);
    return row;
  }

  private findProviderRow(table: string, rowId: string, provider: Row, notFoundMessage: string) {
    const row = (store[table] ?? []).find((entry) => String(entry.id) === String(rowId) && String(entry.provider_id) === String(provider.id));
    if (!row) throw new NotFoundException(notFoundMessage);
    return row;
  }

  private providerForUser(userId: string) {
    return (store.providers ?? []).find((provider) => String(provider.user_id) === String(userId)) ?? null;
  }

  private requireProviderForActor(actor: AuthUser) {
    const provider = this.providerForUser(actor.id);
    if (!provider) {
      throw new NotFoundException('Profil prestataire introuvable.');
    }
    return provider;
  }

  private latestUserRow(table: string, userId: string, dateField: string) {
    return hydrateRows(table, this.accessibleRows(table, { id: userId, role: 'prestataire' } as AuthUser))
      .sort((left, right) => this.compareDatesDesc(left[dateField], right[dateField]))[0] ?? null;
  }

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private insertRow(table: string, payload: Row, options: { ensureUnique?: boolean } = {}) {
    const row = withId(prepareInsert(table, payload));
    if (options.ensureUnique) {
      ensureConstraints(table, [row]);
    }
    appendAppRows(table, [row]);
    return hydrateRow(table, row);
  }

  private async persist(table: string, rows: Row[], actor: AuthUser, reason: string, beforeRows: Row[] = []) {
    await this.platformPersistenceService.persistRows({ [table]: rows }, {
      actorId: actor.id,
      reason,
      beforeRowsByTable: beforeRows.length ? { [table]: beforeRows } : undefined,
      afterRowsByTable: { [table]: rows },
    });
  }

  private async persistedMarketplaceRow(table: string, row: Row) {
    const id = String(row.id);
    const prismaRow = await this.readPersistedMarketplaceRow(table, id);
    return prismaRow ?? row;
  }

  private readPersistedMarketplaceRow(table: string, id: string) {
    switch (table) {
      case 'client_orders':
        return this.marketplacePrismaReadService.getClientOrder(id);
      case 'provider_reviews':
        return this.marketplacePrismaReadService.getProviderReview(id);
      case 'client_favorites':
        return this.marketplacePrismaReadService.getClientFavorite(id);
      case 'provider_services':
        return this.marketplacePrismaReadService.getProviderService(id);
      case 'provider_verification_requests':
        return this.marketplacePrismaReadService.getVerificationRequest(id);
      default:
        return Promise.resolve(null);
    }
  }

  private requireRole(user: AuthUser | null, role: string) {
    if (!user) throw new ForbiddenException('Authentification requise.');
    if (user.role !== role && !isAdminRole(user)) {
      throw new ForbiddenException('Role non autorise.');
    }
    return user;
  }

  private requireObject(value: unknown, message: string): Row {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(message);
    }
    return value as Row;
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private requireString(value: unknown, message: string) {
    const text = this.readString(value);
    if (!text) throw new BadRequestException(message);
    return text;
  }

  private requireIdentifier(value: unknown, message: string) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return this.requireString(value, message);
  }

  private requireNumber(value: unknown, message: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new BadRequestException(message);
    return parsed;
  }

  private numberOrNull(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private cleanPatch(input: Row, allowedFields: string[]) {
    const patch: Row = {};
    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        patch[field] = input[field];
      }
    }
    return patch;
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    return this.toTimestamp(right) - this.toTimestamp(left);
  }

  private compareNumbersDesc(left: unknown, right: unknown) {
    return Number(right ?? 0) - Number(left ?? 0);
  }

  private toTimestamp(value: unknown) {
    if (typeof value !== 'string') return 0;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
