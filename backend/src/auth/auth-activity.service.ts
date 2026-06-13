import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditLogService } from '../database/audit-log.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { isAdminRole, publicUser, type AuthUser, type Role, type StoredUser } from './auth.store.js';
import { authRowKey, createAuthId, normalizeStoredUser, toPrismaJson } from './auth.service-helpers.js';
import { RbacService } from './rbac.service.js';

const ACTIVITY_ROLES = new Set<Role>([
  'client',
  'prestataire',
  'formateur',
  'apprenant',
  'porteur',
  'partenaire',
]);

const INCOMPATIBLE_ACTIVITIES: ReadonlyArray<ReadonlySet<Role>> = [
  new Set<Role>(['client', 'prestataire']),
  new Set<Role>(['apprenant', 'formateur']),
  new Set<Role>(['porteur', 'partenaire']),
];

export async function enrichUserWithEffectiveRoles(rbacService: RbacService, user: AuthUser) {
  const effectiveRoles = await rbacService.getEffectiveRoleIds(user);
  return {
    ...user,
    roles: effectiveRoles.filter(
      (role): role is Role => ACTIVITY_ROLES.has(role as Role) || role === 'admin' || role === 'superadmin',
    ),
  };
}

@Injectable()
export class AuthActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async switchActivity(request: AuthenticatedRequest, role?: Role) {
    const actor = request.auth?.user;
    if (!actor) throw new UnauthorizedException('Connexion requise.');
    if (!role || !ACTIVITY_ROLES.has(role)) throw new BadRequestException('Activite invalide.');
    if (isAdminRole(actor)) {
      throw new BadRequestException('Les comptes administrateurs ne changent pas d activite depuis cet ecran.');
    }
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('La base de donnees est indisponible.');
    }

    const userRow = await this.prisma.appRow.findUnique({
      where: { key: authRowKey('auth_users', actor.id) },
    });
    if (!userRow) throw new BadRequestException('Utilisateur introuvable.');

    const user = normalizeStoredUser(userRow.data as unknown as StoredUser);
    const effectiveRoles = await this.rbacService.getEffectiveRoleIds(user);
    const incompatibleRoles = new Set<Role>();
    for (const pair of INCOMPATIBLE_ACTIVITIES) {
      if (!pair.has(role)) continue;
      for (const candidate of pair) {
        if (candidate !== role) incompatibleRoles.add(candidate);
      }
    }

    user.role = role;
    await this.prisma.$transaction(async (tx) => {
      await tx.rbacUserRole.deleteMany({
        where: { userId: user.id, roleId: { in: [...incompatibleRoles] } },
      });
      const compatibleRoles = new Set(
        [...effectiveRoles, actor.role, role].filter(
          (candidate): candidate is Role => ACTIVITY_ROLES.has(candidate as Role)
            && !incompatibleRoles.has(candidate as Role),
        ),
      );
      for (const assignedRole of compatibleRoles) {
        await tx.rbacUserRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: assignedRole } },
          update: { source: 'self_service', assignedBy: user.id },
          create: {
            id: createAuthId('rbac-user-role'),
            userId: user.id,
            roleId: assignedRole,
            assignedBy: user.id,
            source: 'self_service',
          },
        });
      }
      await tx.appRow.update({
        where: { key: userRow.key },
        data: { data: toPrismaJson(user) },
      });
    });

    await this.auditLogService.record({
      scope: 'auth.activity',
      action: 'switch',
      userId: user.id,
      targetType: 'auth_user',
      targetId: user.id,
      before: { role: actor.role },
      after: { role },
    });
    return enrichUserWithEffectiveRoles(this.rbacService, publicUser(user));
  }
}
