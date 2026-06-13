import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthOAuthService } from './auth-oauth.service.js';
import { AuthSecurityDeliveryService } from './auth-security-delivery.service.js';
import { AuthService } from './auth.service.js';
import { EmailModule } from '../communications/email.module.js';
import { SmsModule } from '../communications/sms.module.js';
import { PermissionGuard } from './permission.guard.js';
import { RbacService } from './rbac.service.js';
import { AuthActivityService } from './auth-activity.service.js';

@Module({
  imports: [DatabaseModule, SmsModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthActivityService, AuthOAuthService, AuthSecurityDeliveryService, RbacService, PermissionGuard],
  exports: [AuthService, RbacService, PermissionGuard],
})
export class AuthModule {}
