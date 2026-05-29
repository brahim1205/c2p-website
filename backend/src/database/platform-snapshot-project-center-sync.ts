import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { persistProjectCenterProjection, type ProjectCenterRowsByTable } from './platform-project-center-projection.js';

export type ProjectCenterSnapshotSyncSummary = {
  projectCenterProjects: number;
  projectCenterMilestones: number;
  projectCenterDocuments: number;
  projectCenterHistoryEntries: number;
};

export function buildProjectCenterRows(groupedRows: Partial<Record<string, Row[]>>): ProjectCenterRowsByTable {
  return {
    projects: groupedRows.projects ?? [],
    project_milestones: groupedRows.project_milestones ?? [],
    project_documents: groupedRows.project_documents ?? [],
    project_history: groupedRows.project_history ?? [],
  };
}

export async function syncProjectCenterSnapshot(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await tx.projectCenterDocument.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterHistoryEntry.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterMilestone.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterProject.deleteMany({ where: { source: 'app_row' } });
  await persistProjectCenterProjection(tx, rowsByTable);
}

export function summarizeProjectCenterRows(rowsByTable: ProjectCenterRowsByTable): ProjectCenterSnapshotSyncSummary {
  return {
    projectCenterProjects: rowsByTable.projects.length,
    projectCenterMilestones: rowsByTable.project_milestones.length,
    projectCenterDocuments: rowsByTable.project_documents.length,
    projectCenterHistoryEntries: rowsByTable.project_history.length,
  };
}

export function buildEmptyProjectCenterSummary(): ProjectCenterSnapshotSyncSummary {
  return {
    projectCenterProjects: 0,
    projectCenterMilestones: 0,
    projectCenterDocuments: 0,
    projectCenterHistoryEntries: 0,
  };
}
