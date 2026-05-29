import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

export type ProjectCenterRowsByTable = {
  projects: Row[];
};

export type ProjectCenterRowsByTableRemovals = {
  projects: string[];
};

export async function persistProjectCenterProjection(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await persistProjects(tx, rowsByTable.projects);
}

export async function deleteProjectCenterProjection(
  tx: Prisma.TransactionClient,
  removalsByTable: ProjectCenterRowsByTableRemovals,
) {
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
