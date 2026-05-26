import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import {
  ADMIN_ONLY_TABLES,
  COMMAND_ONLY_WRITE_TABLES,
  canReadWithoutAuth,
  getRequiredPermissionForTable,
  isKnownDataTable,
} from './data-access-policy.js';

const DEFAULT_READ_LIMIT = 200;
const MAX_READ_LIMIT = 500;
const MAX_MUTATION_ROWS = 50;

function assertKnownTable(table: string) {
  if (!isKnownDataTable(table)) {
    throw new NotFoundException('Table inconnue.');
  }
}

function assertAuthenticated(table: string, user: AuthUser | null) {
  if (!user && !canReadWithoutAuth(table)) {
    throw new UnauthorizedException('Authentification requise.');
  }
}

export async function assertTableAccess(
  table: string,
  user: AuthUser | null,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  authService: AuthService,
) {
  assertKnownTable(table);
  assertAuthenticated(table, user);
  const permissionContext = {
    targetType: 'data_table',
    targetId: table,
    httpMethod: method,
    route: `/data/${table}`,
    reason: `data:${table}:${method.toLowerCase()}`,
  } as const;
  if (table === 'admin_reports' && method === 'POST' && user?.role === 'client') {
    await authService.assertPermissionForActor(user, 'support.request', permissionContext);
    return;
  }
  if (!isAdminRole(user) && ADMIN_ONLY_TABLES.has(table)) {
    throw new UnauthorizedException('Acces refuse.');
  }
  if (!user && method !== 'GET') {
    throw new UnauthorizedException('Authentification requise.');
  }
  if (method !== 'GET' && COMMAND_ONLY_WRITE_TABLES.has(table)) {
    throw new BadRequestException(
      `La table ${table} se modifie via un endpoint metier dedie, pas via /data.`,
    );
  }
  if (!user) {
    return;
  }
  const requiredPermission = getRequiredPermissionForTable(table, method);
  if (requiredPermission) {
    await authService.assertPermissionForActor(user, requiredPermission, permissionContext);
  }
}

export function assertScopedMutationQuery(
  method: 'PATCH' | 'DELETE',
  query: Record<string, string | string[] | undefined>,
) {
  const hasScopedFilter = Object.entries(query).some(([key, value]) => {
    if (!key.startsWith('eq_') && !key.startsWith('in_')) return false;
    const firstValue = Array.isArray(value) ? value[0] : value;
    return typeof firstValue === 'string' && firstValue.trim().length > 0;
  });

  if (!hasScopedFilter) {
    throw new BadRequestException(
      `${method} sur /data exige un filtre eq_ ou in_ explicite pour eviter une mutation de masse.`,
    );
  }

  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('in_')) continue;
    const firstValue = Array.isArray(value) ? value[0] : value;
    const itemCount = typeof firstValue === 'string'
      ? firstValue.split(',').filter((item) => item.trim().length > 0).length
      : 0;
    if (itemCount > MAX_MUTATION_ROWS) {
      throw new BadRequestException(
        `${method} sur /data est limite a ${MAX_MUTATION_ROWS} identifiants par filtre in_.`,
      );
    }
  }
}

export function resolveDataReadLimit(value: string | string[] | undefined) {
  if (value === undefined) {
    return DEFAULT_READ_LIMIT;
  }

  const firstValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(firstValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('Le parametre limit doit etre un entier positif.');
  }
  return Math.min(parsed, MAX_READ_LIMIT);
}

export function assertMutationRowBudget(method: 'PATCH' | 'DELETE', count: number) {
  if (count > MAX_MUTATION_ROWS) {
    throw new BadRequestException(
      `${method} sur /data est limite a ${MAX_MUTATION_ROWS} lignes par requete.`,
    );
  }
}
