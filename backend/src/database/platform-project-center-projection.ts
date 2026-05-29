import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

export type ProjectCenterRowsByTable = {
  projects: Row[];
  project_milestones: Row[];
  project_documents: Row[];
  project_history: Row[];
};

export type ProjectCenterRowsByTableRemovals = {
  projects: string[];
  project_milestones: string[];
  project_documents: string[];
  project_history: string[];
};

export async function persistProjectCenterProjection(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await persistProjects(tx, rowsByTable.projects);
  await persistMilestones(tx, rowsByTable.project_milestones);
  await persistDocuments(tx, rowsByTable.project_documents);
  await persistHistory(tx, rowsByTable.project_history);
}

export async function deleteProjectCenterProjection(
  tx: Prisma.TransactionClient,
  removalsByTable: ProjectCenterRowsByTableRemovals,
) {
  if (removalsByTable.project_documents.length) {
    await tx.projectCenterDocument.deleteMany({ where: { id: { in: removalsByTable.project_documents } } });
  }
  if (removalsByTable.project_history.length) {
    await tx.projectCenterHistoryEntry.deleteMany({ where: { id: { in: removalsByTable.project_history } } });
  }
  if (removalsByTable.project_milestones.length) {
    await tx.projectCenterMilestone.deleteMany({ where: { id: { in: removalsByTable.project_milestones } } });
  }
  if (removalsByTable.projects.length) {
    await tx.projectCenterProject.deleteMany({ where: { id: { in: removalsByTable.projects } } });
  }
}

async function persistProjects(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterProjectCreateInput = {
      id: toString(row.id),
      ownerId: toNullableString(row.owner_id),
      title: toString(row.title, 'Projet'),
      description: toNullableString(row.description),
      category: toNullableString(row.category),
      sector: toNullableString(row.sector),
      status: toString(row.status, 'draft'),
      phase: toNullableString(row.phase),
      porteurName: toNullableString(row.porteur_name),
      funding: toInt(row.funding),
      fundingGoal: toInt(row.funding_goal),
      teamSize: toInt(row.team_size),
      progress: toFloat(row.progress),
      location: toNullableString(row.location),
      impact: toNullableString(row.impact),
      image: toNullableString(row.image),
      lookingFor: row.looking_for === undefined ? undefined : toJson(row.looking_for),
      nextMilestone: toNullableString(row.next_milestone),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at ?? row.last_update) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.last_update ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterProject.upsert({ where: { id }, create: data, update });
  }
}

async function persistMilestones(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterMilestoneCreateInput = {
      id: toString(row.id),
      projectId: toString(row.project_id),
      title: toString(row.title, 'Jalon'),
      description: toNullableString(row.description),
      dueDate: toNullableString(row.due_date),
      status: toString(row.status, 'pending'),
      progress: toFloat(row.progress),
      tasks: row.tasks === undefined ? undefined : toJson(row.tasks),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterMilestone.upsert({ where: { id }, create: data, update });
  }
}

async function persistDocuments(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterDocumentCreateInput = {
      id: toString(row.id),
      projectId: toString(row.project_id),
      name: toString(row.name, 'Document'),
      docType: toNullableString(row.type),
      size: toNullableString(row.size),
      docDate: toNullableString(row.date),
      category: toNullableString(row.category),
      url: toNullableString(row.url),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterDocument.upsert({ where: { id }, create: data, update });
  }
}

async function persistHistory(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterHistoryEntryCreateInput = {
      id: toString(row.id),
      projectId: toString(row.project_id),
      eventDate: toNullableString(row.date),
      actorName: toNullableString(row.user),
      action: toString(row.action, 'Evenement projet'),
      eventType: toNullableString(row.type),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterHistoryEntry.upsert({ where: { id }, create: data, update });
  }
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function toString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  return fallback;
}

function toNullableString(value: unknown) {
  const normalized = toString(value).trim();
  return normalized || undefined;
}

function toInt(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
}

function toFloat(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(toString(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
