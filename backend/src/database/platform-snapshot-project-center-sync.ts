import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { persistProjectCenterProjection, type ProjectCenterRowsByTable } from './platform-project-center-projection.js';

export type ProjectCenterSnapshotSyncSummary = {
  projectCenterProjects: number;
  projectCenterMilestones: number;
  projectCenterDocuments: number;
  projectCenterHistoryEntries: number;
  projectCenterFundingRounds: number;
  projectCenterFundingInvestors: number;
  projectCenterPartnerships: number;
  projectCenterTrackingEntries: number;
  projectCenterCollaborations: number;
};

export function buildProjectCenterRows(groupedRows: Partial<Record<string, Row[]>>): ProjectCenterRowsByTable {
  return {
    projects: groupedRows.projects ?? [],
    project_milestones: groupedRows.project_milestones ?? [],
    project_documents: groupedRows.project_documents ?? [],
    project_history: groupedRows.project_history ?? [],
    project_funding_rounds: groupedRows.project_funding_rounds ?? [],
    funding_investors: groupedRows.funding_investors ?? [],
    project_partnerships: groupedRows.project_partnerships ?? [],
    project_tracking: groupedRows.project_tracking ?? [],
    project_collaborations: groupedRows.project_collaborations ?? [],
  };
}

export async function syncProjectCenterSnapshot(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await tx.projectCenterDocument.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterHistoryEntry.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterFundingInvestor.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterFundingRound.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterCollaboration.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterTracking.deleteMany({ where: { source: 'app_row' } });
  await tx.projectCenterPartnership.deleteMany({ where: { source: 'app_row' } });
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
    projectCenterFundingRounds: rowsByTable.project_funding_rounds.length,
    projectCenterFundingInvestors: rowsByTable.funding_investors.length,
    projectCenterPartnerships: rowsByTable.project_partnerships.length,
    projectCenterTrackingEntries: rowsByTable.project_tracking.length,
    projectCenterCollaborations: rowsByTable.project_collaborations.length,
  };
}

export function buildEmptyProjectCenterSummary(): ProjectCenterSnapshotSyncSummary {
  return {
    projectCenterProjects: 0,
    projectCenterMilestones: 0,
    projectCenterDocuments: 0,
    projectCenterHistoryEntries: 0,
    projectCenterFundingRounds: 0,
    projectCenterFundingInvestors: 0,
    projectCenterPartnerships: 0,
    projectCenterTrackingEntries: 0,
    projectCenterCollaborations: 0,
  };
}
