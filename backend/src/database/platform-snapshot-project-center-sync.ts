import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { persistProjectCenterProjection, type ProjectCenterRowsByTable } from './platform-project-center-projection.js';

export type ProjectCenterSnapshotSyncSummary = {
  projectCenterProjects: number;
};

export function buildProjectCenterRows(groupedRows: Partial<Record<string, Row[]>>): ProjectCenterRowsByTable {
  return {
    projects: groupedRows.projects ?? [],
  };
}

export async function syncProjectCenterSnapshot(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await tx.projectCenterProject.deleteMany({ where: { source: 'app_row' } });
  await persistProjectCenterProjection(tx, rowsByTable);
}

export function summarizeProjectCenterRows(rowsByTable: ProjectCenterRowsByTable): ProjectCenterSnapshotSyncSummary {
  return {
    projectCenterProjects: rowsByTable.projects.length,
  };
}

export function buildEmptyProjectCenterSummary(): ProjectCenterSnapshotSyncSummary {
  return {
    projectCenterProjects: 0,
  };
}
