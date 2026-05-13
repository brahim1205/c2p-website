import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SmsModule } from '../communications/sms.module.js';
import { PermissionGuard } from './permission.guard.js';
import { RbacService } from './rbac.service.js';

@Module({
  imports: [DatabaseModule, SmsModule],
  controllers: [AuthController],
  providers: [AuthService, RbacService, PermissionGuard],
  exports: [AuthService, RbacService, PermissionGuard],
})
export class AuthModule {}
