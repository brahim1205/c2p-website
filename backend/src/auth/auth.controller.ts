import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthUser, CertificationItem, PaymentSettings, PortfolioItem, Role, SocialLinks } from './auth.store.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PermissionGuard } from './permission.guard.js';
import { RequirePermission } from './require-permission.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() payload: { email?: string; password?: string },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(payload, request, response);
  }

  @Post('verify-2fa')
  verifyTwoFactor(
    @Body() payload: { challengeId?: string; userId?: string; code?: string },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.verifyTwoFactor(payload, request, response);
  }

  @Post('resend-2fa')
  resendTwoFactor(
    @Body() payload: { challengeId?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.resendTwoFactor(payload, request);
  }

  @Post('refresh')
  refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh(request, response);
  }

  @Post('logout')
  logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(request, response);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request);
  }

  @Post('register')
  register(
    @Body()
    payload: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role?: Role;
      bio?: string;
      location?: string;
      publicTitle?: string;
      website?: string;
      preferredLanguage?: string;
      skills?: string[];
      publicProfileEnabled?: boolean;
    },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.register(payload, request, response);
  }

  @Post('forgot-password')
  forgotPassword(@Body() payload: { email?: string }, @Req() request: AuthenticatedRequest) {
    return this.authService.forgotPassword(payload, request);
  }

  @Post('onboarding/monetized-clauses/accept')
  acceptMonetizedClauses(@Req() request: AuthenticatedRequest) {
    return this.authService.acceptMonetizedClauses(request);
  }

  @Post('reset-password')
  resetPassword(
    @Body() payload: { email?: string; code?: string; newPassword?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.resetPassword(payload, request);
  }

  @Get('users')
  @UseGuards(PermissionGuard)
  @RequirePermission('users.read')
  getUsers(@Req() request: AuthenticatedRequest) {
    return this.authService.getUsers(request);
  }

  @Get('directory')
  getUserDirectory(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserDirectory(request);
  }

  @Patch('users/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('users.manage')
  patchUser(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    payload: Partial<
      Pick<
        AuthUser,
        | 'firstName'
        | 'lastName'
        | 'email'
        | 'phone'
        | 'avatar'
        | 'bio'
        | 'location'
        | 'publicTitle'
        | 'website'
        | 'preferredLanguage'
        | 'languages'
        | 'skills'
        | 'socialLinks'
        | 'certifications'
        | 'portfolioItems'
        | 'introVideo'
        | 'publicProfileEnabled'
        | 'expertVerified'
        | 'role'
        | 'status'
        | 'is2FAEnabled'
      >
    >,
  ) {
    return this.authService.patchUser(request, id, payload);
  }

  @Get('public-profile/:id')
  getPublicProfile(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.authService.getPublicInstructorProfile(request, id);
  }

  @Get('profile/:id/export')
  exportProfileData(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.authService.exportPersonalData(request, id);
  }

  @Get('profile/:id')
  getProfile(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.authService.getProfile(request, id);
  }

  @Patch('profile/:id')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    payload: Partial<Pick<
      AuthUser,
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'phone'
      | 'avatar'
      | 'bio'
      | 'location'
      | 'publicTitle'
      | 'website'
      | 'preferredLanguage'
      | 'languages'
      | 'skills'
      | 'introVideo'
      | 'publicProfileEnabled'
      | 'expertVerified'
    >> & {
      socialLinks?: SocialLinks;
      certifications?: CertificationItem[];
      portfolioItems?: PortfolioItem[];
      paymentSettings?: PaymentSettings;
      userPreferences?: {
        language?: string;
        emailNotifications?: boolean;
        productUpdates?: boolean;
        compactMode?: boolean;
      };
    },
  ) {
    return this.authService.updateProfile(request, id, payload);
  }

  @Delete('profile/:id')
  deleteProfile(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.deleteProfile(request, id, response);
  }

  @Post('change-password')
  updatePassword(
    @Req() request: AuthenticatedRequest,
    @Body()
    payload: {
      userId?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.updatePassword(request, payload);
  }

  @Get('security/:userId')
  getSecurity(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.authService.getSecurity(request, userId);
  }

  @Post('security/2fa/enable')
  activateTwoFactor(@Req() request: AuthenticatedRequest, @Body() payload: { userId?: string }) {
    return this.authService.activateTwoFactor(request, payload);
  }

  @Post('security/2fa/disable')
  deactivateTwoFactor(@Req() request: AuthenticatedRequest, @Body() payload: { userId?: string }) {
    return this.authService.deactivateTwoFactor(request, payload);
  }

  @Delete('security/sessions/:sessionId')
  deleteSession(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Query('userId') userId?: string,
  ) {
    return this.authService.deleteSession(request, sessionId, userId);
  }

  @Delete('security/sessions')
  deleteOtherSessions(@Req() request: AuthenticatedRequest, @Query('userId') userId?: string) {
    return this.authService.deleteOtherSessions(request, userId);
  }
}
