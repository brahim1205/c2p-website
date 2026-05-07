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
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthUser, Role } from './auth.store.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';

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
    },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.register(payload, request, response);
  }

  @Post('forgot-password')
  forgotPassword(@Body() payload: { email?: string }) {
    return this.authService.forgotPassword(payload);
  }

  @Get('users')
  getUsers(@Req() request: AuthenticatedRequest) {
    return this.authService.getUsers(request);
  }

  @Get('directory')
  getUserDirectory(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserDirectory(request);
  }

  @Patch('users/:id')
  patchUser(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    payload: Partial<
      Pick<
        AuthUser,
        'firstName' | 'lastName' | 'email' | 'phone' | 'avatar' | 'bio' | 'location' | 'role' | 'status' | 'is2FAEnabled'
      >
    >,
  ) {
    return this.authService.patchUser(request, id, payload);
  }

  @Get('profile/:id')
  getProfile(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.authService.getProfile(request, id);
  }

  @Patch('profile/:id')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() payload: Partial<Pick<AuthUser, 'firstName' | 'lastName' | 'email' | 'phone' | 'avatar' | 'bio' | 'location'>>,
  ) {
    return this.authService.updateProfile(request, id, payload);
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
