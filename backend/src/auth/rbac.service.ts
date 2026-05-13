import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from './auth.store.js';
import {
  RBAC_ALL_PERMISSION_IDS,
  RBAC_DEFAULT_ROLE_PERMISSIONS,
  RBAC_PERMISSION_DEFINITIONS,
  RBAC_ROLE_DEFINITIONS,
  getDefaultPermissionsForRoles,
} from './permissions.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  private bootstrapPromise: Promise<void> | null = null;
  private databaseBackedAvailable: boolean | null = null;
  private defaultsEnsured = false;

  private createId(prefix: string, ...parts: string[]) {
    const suffix = parts.join('-').replace(/[^a-zA-Z0-9_.:-]/g, '-');
    return `${prefix}-${suffix}`;
  }

  private async ensureDefaults() {
    if (!this.prisma.isConnected || this.databaseBackedAvailable === false) {
      return;
    }
    if (this.defaultsEnsured) {
      return;
    }
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = (async () => {
      try {
        await Promise.all(RBAC_ROLE_DEFINITIONS.map((role) => this.prisma.rbacRole.upsert({
          where: { id: role.id },
          update: {
            label: role.label,
            description: role.description,
            system: true,
          },
          create: {
            id: role.id,
            label: role.label,
            description: role.description,
            system: true,
          },
        })));

        await Promise.all(RBAC_PERMISSION_DEFINITIONS.map((permission) => this.prisma.rbacPermission.upsert({
          where: { id: permission.id },
          update: {
            label: permission.label,
            description: permission.description,
            system: true,
          },
          create: {
            id: permission.id,
            label: permission.label,
            description: permission.description,
            system: true,
          },
        })));

        for (const [roleId, permissions] of Object.entries(RBAC_DEFAULT_ROLE_PERMISSIONS)) {
          const allowedPermissionIds = [...permissions];
          await this.prisma.rbacRolePermission.deleteMany({
            where: {
              roleId,
              permissionId: {
                notIn: allowedPermissionIds,
              },
            },
          });

          await this.prisma.rbacRolePermission.createMany({
            data: allowedPermissionIds.map((permissionId) => ({
              id: this.createId('rbac-rp', roleId, permissionId),
              roleId,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }

        const users = await this.prisma.user.findMany({
          select: { id: true, role: true },
        });
        if (users.length > 0) {
          await this.prisma.rbacUserRole.createMany({
            data: users
              .filter((user) => RBAC_ROLE_DEFINITIONS.some((role) => role.id === user.role))
              .map((user) => ({
                id: this.createId('rbac-ur', user.id, user.role),
                userId: user.id,
                roleId: user.role,
                source: 'native',
                metadata: {
                  bootstrap: true,
                },
              })),
            skipDuplicates: true,
          });
        }

        this.databaseBackedAvailable = true;
        this.defaultsEnsured = true;
      } catch (error) {
        this.databaseBackedAvailable = false;
        this.defaultsEnsured = false;
        console.warn('[RbacService] Falling back to in-memory permissions:', error);
      }
    })().finally(() => {
      this.bootstrapPromise = null;
    });

    return this.bootstrapPromise;
  }

  private getFallbackPermissions(actor: Pick<AuthUser, 'role'>) {
    return getDefaultPermissionsForRoles([actor.role]);
  }

  async getEffectiveRoleIds(actor: Pick<AuthUser, 'id' | 'role'>) {
    const roleIds = new Set<string>([actor.role]);
    if (!this.prisma.isConnected || this.databaseBackedAvailable === false) {
      return [...roleIds];
    }

    await this.ensureDefaults();
    if (this.databaseBackedAvailable !== true) {
      return [...roleIds];
    }

    const assignments = await this.prisma.rbacUserRole.findMany({
      where: { userId: actor.id },
      select: { roleId: true },
    });
    for (const assignment of assignments) {
      roleIds.add(assignment.roleId);
    }
    return [...roleIds];
  }

  async getEffectivePermissions(actor: Pick<AuthUser, 'id' | 'role'>) {
    const fallback = this.getFallbackPermissions(actor);
    if (!this.prisma.isConnected || this.databaseBackedAvailable === false) {
      return fallback;
    }

    await this.ensureDefaults();
    if (this.databaseBackedAvailable !== true) {
      return fallback;
    }

    const roleIds = await this.getEffectiveRoleIds(actor);
    const rows = await this.prisma.rbacRolePermission.findMany({
      where: {
        roleId: {
          in: roleIds,
        },
      },
      select: { permissionId: true },
    });

    if (rows.length === 0) {
      return fallback;
    }

    const permissions = new Set(rows.map((row: { permissionId: string }) => row.permissionId));
    for (const permission of fallback) {
      permissions.add(permission);
    }
    return permissions;
  }

  async hasPermission(actor: Pick<AuthUser, 'id' | 'role'>, permission: string) {
    const permissions = await this.getEffectivePermissions(actor);
    return permissions.has(permission);
  }

  async assertPermission(actor: Pick<AuthUser, 'id' | 'role'>, requiredPermissions: string | string[]) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const effective = await this.getEffectivePermissions(actor);
    const missing = permissions.filter((permission) => !effective.has(permission));
    if (missing.length > 0) {
      throw new UnauthorizedException('Acces refuse.');
    }
    return actor;
  }

  getKnownPermissionIds() {
    return new Set(RBAC_ALL_PERMISSION_IDS);
  }
}
