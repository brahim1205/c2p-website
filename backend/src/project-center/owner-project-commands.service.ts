import { ForbiddenException, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import {
  clone,
  compareValues,
  store,
  syncAppStoreFromDatabase,
} from '../data/data-app-store.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import { recomputeDerivedData } from '../data/data-runtime.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';

const PROJECT_SUBMISSION_ALLOWED_ROLES = new Set(['porteur', 'admin', 'superadmin']);

@Injectable()
export class OwnerProjectCommandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async deleteOwnerProject(projectId: string, user: AuthUser | null) {
    const owner = this.requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const project = this.getOwnerProjects(owner.id).find((row) => String(row.id) === String(projectId)) ?? null;
    if (!project) {
      throw new BadRequestException('PROJECT_NOT_FOUND');
    }

    store.projects = (store.projects ?? []).filter((row) => String(row.id) !== String(project.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('projects', [project]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: owner.id,
      reason: 'project-center:owner-project:delete',
      beforeRowsByTable: { projects: [project] },
    });
    return project;
  }

  private requireProjectOwnerUser(user: AuthUser | null) {
    if (!user) {
      throw new UnauthorizedException('Connexion requise.');
    }
    if (!PROJECT_SUBMISSION_ALLOWED_ROLES.has(user.role)) {
      throw new ForbiddenException('Acces projet refuse.');
    }
    return user;
  }

  private getOwnerProjects(ownerId: string) {
    return clone(store.projects ?? [])
      .filter((project) => String(project.owner_id) === String(ownerId))
      .sort((left, right) => compareValues(right.created_at, left.created_at));
  }
}
