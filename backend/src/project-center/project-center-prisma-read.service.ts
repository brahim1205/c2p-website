import { Injectable } from '@nestjs/common';
import { compareValues, normalizeText, projectCenterReadsFromPrisma } from '../data/data-app-store.js';
import { deriveProjectCenterRows, type ProjectCenterTables } from '../data/data-derived-data.js';
import { toNumber } from '../data/data-normalizers.js';
import { isMissingProjectionError, readProjectCenterProjection } from '../database/platform-project-center-projection.js';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Reads the Project Center tables from the normalized Prisma projection instead of `AppRow`.
 *
 * The projection keeps the original row in `metadata`, and the non-stored fields (counters,
 * progress, copied titles) are recomputed with the same `deriveProjectCenterRows` used by the
 * AppRow store, so payloads are identical.
 * Returns `null` when Prisma or the projection is unavailable: callers then fall back to AppRow.
 */
@Injectable()
export class ProjectCenterPrismaReadService {
  constructor(private readonly prisma: PrismaService) {}

  async loadTables(): Promise<ProjectCenterTables | null> {
    if (!this.prisma.isConnected || !projectCenterReadsFromPrisma()) return null;
    try {
      const tables = await readProjectCenterProjection(this.prisma);
      deriveProjectCenterRows(tables, { compareValues, normalizeText, toNumber });
      return tables;
    } catch (error) {
      if (isMissingProjectionError(error)) return null;
      throw error;
    }
  }
}
