import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { AuthService } from './auth.service.js';
import { RBAC_PERMISSION_METADATA_KEY } from './require-permission.decorator.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<string[] | undefined>(RBAC_PERMISSION_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissions || permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.authService.requirePermission(request, permissions);
    return true;
  }
}
