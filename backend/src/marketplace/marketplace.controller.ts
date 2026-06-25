import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { MarketplaceService } from './marketplace.service.js';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('providers/public')
  listPublicProviders() {
    return this.marketplaceService.listPublicProviders();
  }

  @Get('providers/public/:id/reviews')
  listPublicProviderReviews(@Param('id') id: string) {
    return this.marketplaceService.listPublicProviderReviews(id);
  }

  @Get('providers/public/:id')
  getPublicProvider(@Param('id') id: string) {
    return this.marketplaceService.getPublicProvider(id);
  }

  @Get('providers/by-user/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.read')
  getProviderByUserId(@Param('userId') userId: string) {
    return this.marketplaceService.getProviderByUserId(userId);
  }

  @Get('client/dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  getClientDashboard(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.getClientDashboard(request.auth?.user ?? null);
  }

  @Get('client/orders')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  listClientOrders(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listClientOrders(request.auth?.user ?? null);
  }

  @Patch('client/orders/:orderId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  updateClientOrderStatus(@Req() request: AuthenticatedRequest, @Param('orderId') orderId: string, @Body() payload: unknown) {
    return this.marketplaceService.updateClientOrderStatus(orderId, payload, request.auth?.user ?? null);
  }

  @Post('client/reports')
  @UseGuards(PermissionGuard)
  @RequirePermission('support.request')
  submitClientReport(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.submitClientReport(payload, request.auth?.user ?? null);
  }

  @Get('client/bookings')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  listClientBookings(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listClientBookings(request.auth?.user ?? null);
  }

  @Patch('client/bookings/:bookingId/cancel')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  cancelClientBooking(@Req() request: AuthenticatedRequest, @Param('bookingId') bookingId: string) {
    return this.marketplaceService.cancelClientBooking(bookingId, request.auth?.user ?? null);
  }

  @Post('client/reviews')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.reviews.write')
  publishClientReview(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.publishClientReview(payload, request.auth?.user ?? null);
  }

  @Post('client/providers/:providerId/reviews')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.reviews.write')
  publishClientProviderReview(@Req() request: AuthenticatedRequest, @Param('providerId') providerId: string, @Body() payload: unknown) {
    return this.marketplaceService.publishClientProviderReview(providerId, payload, request.auth?.user ?? null);
  }

  @Get('client/providers')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.read')
  listClientProviders(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listClientProviders(request.auth?.user ?? null);
  }

  @Post('client/favorites')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  addClientFavorite(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.addClientFavorite(payload, request.auth?.user ?? null);
  }

  @Delete('client/favorites/:favoriteId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  removeClientFavorite(@Req() request: AuthenticatedRequest, @Param('favoriteId') favoriteId: string) {
    return this.marketplaceService.removeClientFavorite(favoriteId, request.auth?.user ?? null);
  }

  @Post('client/bookings')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  createClientBooking(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.createClientBooking(payload, request.auth?.user ?? null);
  }

  @Get('prestataire/dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  getPrestataireDashboard(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.getPrestataireDashboard(request.auth?.user ?? null);
  }

  @Post('prestataire/verification-requests')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.write')
  requestPrestataireVerification(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.requestPrestataireVerification(payload, request.auth?.user ?? null);
  }

  @Get('prestataire/bookings')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  listPrestataireBookings(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listPrestataireBookings(request.auth?.user ?? null);
  }

  @Get('prestataire/availability-blocks')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.read')
  listPrestataireAvailabilityBlocks(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listPrestataireAvailabilityBlocks(request.auth?.user ?? null);
  }

  @Post('prestataire/availability-blocks')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  createPrestataireAvailabilityBlock(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.createPrestataireAvailabilityBlock(payload, request.auth?.user ?? null);
  }

  @Delete('prestataire/availability-blocks/:blockId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  deletePrestataireAvailabilityBlock(@Req() request: AuthenticatedRequest, @Param('blockId') blockId: string) {
    return this.marketplaceService.deletePrestataireAvailabilityBlock(blockId, request.auth?.user ?? null);
  }

  @Patch('prestataire/bookings/:bookingId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.marketplace.write')
  updatePrestataireBookingStatus(@Req() request: AuthenticatedRequest, @Param('bookingId') bookingId: string, @Body() payload: unknown) {
    return this.marketplaceService.updatePrestataireBookingStatus(bookingId, payload, request.auth?.user ?? null);
  }

  @Get('prestataire/reviews')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.reviews.read')
  listPrestataireReviews(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listPrestataireReviews(request.auth?.user ?? null);
  }

  @Patch('prestataire/reviews/:reviewId/reply')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.reviews.write')
  replyPrestataireReview(@Req() request: AuthenticatedRequest, @Param('reviewId') reviewId: string, @Body() payload: unknown) {
    return this.marketplaceService.replyPrestataireReview(reviewId, payload, request.auth?.user ?? null);
  }

  @Patch('prestataire/reviews/:reviewId/helpful')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.reviews.write')
  updatePrestataireReviewHelpful(@Req() request: AuthenticatedRequest, @Param('reviewId') reviewId: string, @Body() payload: unknown) {
    return this.marketplaceService.updatePrestataireReviewHelpful(reviewId, payload, request.auth?.user ?? null);
  }

  @Get('prestataire/services')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.read')
  listPrestataireServices(@Req() request: AuthenticatedRequest) {
    return this.marketplaceService.listPrestataireServices(request.auth?.user ?? null);
  }

  @Post('prestataire/services')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.write')
  createPrestataireService(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.marketplaceService.createPrestataireService(payload, request.auth?.user ?? null);
  }

  @Patch('prestataire/services/:serviceId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.write')
  updatePrestataireService(@Req() request: AuthenticatedRequest, @Param('serviceId') serviceId: string, @Body() payload: unknown) {
    return this.marketplaceService.updatePrestataireService(serviceId, payload, request.auth?.user ?? null);
  }

  @Patch('prestataire/services/:serviceId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.write')
  updatePrestataireServiceStatus(@Req() request: AuthenticatedRequest, @Param('serviceId') serviceId: string, @Body() payload: unknown) {
    return this.marketplaceService.updatePrestataireServiceStatus(serviceId, payload, request.auth?.user ?? null);
  }

  @Delete('prestataire/services/:serviceId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.provider_catalog.write')
  deletePrestataireService(@Req() request: AuthenticatedRequest, @Param('serviceId') serviceId: string) {
    return this.marketplaceService.deletePrestataireService(serviceId, request.auth?.user ?? null);
  }
}
