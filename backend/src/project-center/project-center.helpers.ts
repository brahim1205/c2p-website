import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import {
  appendAppRows,
  clone,
  compareValues,
  mergeRowsToPersist,
  store,
  withId,
} from '../data/data-app-store.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import {
  ensureConstraints,
  prepareInsert,
} from '../data/data-runtime.js';
import { sanitizeRowsForActor } from '../data/data-response-sanitizers.js';
import type { Row } from '../data/mock-store.js';
import type { ProjectSubmissionPayload } from './project-center.payloads.js';

export type PublicProjectQuery = {
  category?: string;
  status?: string;
  search?: string;
  sort?: string;
  limit?: string;
};

export const PROJECT_SUBMISSION_ALLOWED_ROLES = new Set(['porteur', 'admin', 'superadmin']);
export const PROJECT_PARTNER_ALLOWED_ROLES = new Set(['partenaire', 'admin', 'superadmin']);
export const PROJECT_ADMIN_ALLOWED_ROLES = new Set(['admin', 'superadmin']);
export const MAX_PUBLIC_PROJECTS_LIMIT = 100;

export function publicRows(table: string, rows: Row[]) {
  return sanitizeRowsForActor(table, hydrateRows(table, rows), null);
}

export function rowsForProject(table: string, projectId: string) {
  return clone(store[table] ?? []).filter((row) => String(row.project_id) === String(projectId));
}

export function normalizeFilter(value?: string) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || null;
}

export function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function getFundingProgress(project: Row) {
  const funding = Number(project.funding ?? 0);
  const goal = Number(project.funding_goal ?? 0);
  if (!Number.isFinite(funding) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }
  return funding / goal;
}

export function applyProjectFilters(rows: Row[], query: PublicProjectQuery) {
  const category = normalizeFilter(query.category);
  const status = normalizeFilter(query.status);
  const search = normalizeText(query.search);

  return rows.filter((project) => {
    if (category && category !== 'all' && String(project.category ?? '') !== category) {
      return false;
    }

    if (status && status !== 'all' && !String(project.status ?? '').toLowerCase().includes(status)) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      project.title,
      project.porteur_name,
      project.description,
      project.category,
      project.sector,
    ].some((value) => normalizeText(value).includes(search));
  });
}

export function applyProjectSorting(rows: Row[], sort?: string) {
  const nextRows = [...rows];
  if (sort === 'funding') {
    return nextRows.sort((left, right) => compareValues(right.funding, left.funding));
  }
  if (sort === 'progress') {
    return nextRows.sort((left, right) => getFundingProgress(right) - getFundingProgress(left));
  }
  return nextRows.sort((left, right) => compareValues(right.created_at, left.created_at));
}

export function resolvePublicProjectsLimit(rawLimit?: string) {
  if (!rawLimit) {
    return MAX_PUBLIC_PROJECTS_LIMIT;
  }

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return MAX_PUBLIC_PROJECTS_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_PUBLIC_PROJECTS_LIMIT);
}

export function appendRows(table: string, rawRows: Row[], rowsToPersist: Record<string, Row[]>) {
  ensureConstraints(table, rawRows);
  const rows = rawRows.map((row) => withId(prepareInsert(table, row)));
  const response = appendAppRows(table, rows);
  mergeRowsToPersist(rowsToPersist, table, rows);
  return response;
}

export function requireProjectOwnerUser(user: AuthUser | null) {
  if (!user) {
    throw new UnauthorizedException('Connexion requise.');
  }
  if (!PROJECT_SUBMISSION_ALLOWED_ROLES.has(user.role)) {
    throw new ForbiddenException('Acces projet refuse.');
  }
  return user;
}

export function requireProjectPartnerUser(user: AuthUser | null) {
  if (!user) {
    throw new UnauthorizedException('Connexion requise.');
  }
  if (!PROJECT_PARTNER_ALLOWED_ROLES.has(user.role)) {
    throw new ForbiddenException('Acces partenaire refuse.');
  }
  return user;
}

export function requireProjectAdminUser(user: AuthUser | null) {
  if (!user) {
    throw new UnauthorizedException('Connexion requise.');
  }
  if (!PROJECT_ADMIN_ALLOWED_ROLES.has(user.role)) {
    throw new ForbiddenException('Acces admin projet refuse.');
  }
  return user;
}

export function getOwnerProjects(ownerId: string) {
  return clone(store.projects ?? [])
    .filter((project) => String(project.owner_id) === String(ownerId))
    .sort((left, right) => compareValues(right.created_at, left.created_at));
}

export function requireOwnerProject(ownerId: string, projectId: string) {
  const project = getOwnerProjects(ownerId).find((row) => String(row.id) === String(projectId)) ?? null;
  if (!project) {
    throw new BadRequestException('PROJECT_NOT_FOUND');
  }
  return project;
}

export function getRowsForProjectIds(table: string, projectIds: Set<string>) {
  return clone(store[table] ?? []).filter((row) => projectIds.has(String(row.project_id)));
}

export function buildOwnerProjectDetail(project: Row) {
  return {
    project,
    milestones: rowsForProject('project_milestones', String(project.id))
      .sort((left, right) => compareValues(left.due_date, right.due_date)),
    documents: rowsForProject('project_documents', String(project.id))
      .sort((left, right) => compareValues(right.date, left.date)),
    history: rowsForProject('project_history', String(project.id))
      .sort((left, right) => compareValues(right.date, left.date)),
    partnerships: rowsForProject('project_partnerships', String(project.id))
      .sort((left, right) => compareValues(left.id, right.id)),
    rounds: rowsForProject('project_funding_rounds', String(project.id))
      .sort((left, right) => compareValues(right.deadline, left.deadline)),
  };
}

export function getPartnerTrackedProjects(partnerId: string) {
  return hydrateRows(
    'project_tracking',
    clone(store.project_tracking ?? []).filter((row) => String(row.partner_id) === String(partnerId)),
  ).sort((left, right) => compareValues(right.last_update, left.last_update));
}

export function getPartnerCollaborations(partnerId: string) {
  return hydrateRows(
    'project_collaborations',
    clone(store.project_collaborations ?? []).filter((row) => String(row.partner_id) === String(partnerId)),
  ).sort((left, right) => compareValues(right.start_date, left.start_date));
}

export function getOpenProjectsForPartners() {
  return publicRows('projects', clone(store.projects ?? []))
    .filter((project) => String(project.status ?? '').toLowerCase() !== 'termine')
    .sort((left, right) => compareValues(right.created_at, left.created_at));
}

export function buildProjectDetailForAuthenticatedProject(projectId: string) {
  const project = hydrateRows(
    'projects',
    clone(store.projects ?? []).filter((row) => String(row.id) === String(projectId)),
  )[0] ?? null;
  if (!project) {
    throw new BadRequestException('PROJECT_NOT_FOUND');
  }
  return {
    project,
    milestones: hydrateRows('project_milestones', rowsForProject('project_milestones', projectId))
      .sort((left, right) => compareValues(left.due_date, right.due_date)),
    documents: hydrateRows('project_documents', rowsForProject('project_documents', projectId))
      .sort((left, right) => compareValues(right.date, left.date)),
    history: hydrateRows('project_history', rowsForProject('project_history', projectId))
      .sort((left, right) => compareValues(right.date, left.date)),
    partnerships: hydrateRows('project_partnerships', rowsForProject('project_partnerships', projectId))
      .sort((left, right) => compareValues(left.id, right.id)),
    rounds: hydrateRows('project_funding_rounds', rowsForProject('project_funding_rounds', projectId))
      .sort((left, right) => compareValues(right.deadline, left.deadline)),
  };
}

export function normalizeCategory(category: string) {
  return category.trim().toLowerCase() || 'autre';
}

export function parseTeamSize(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function buildPartnerNeeds(partnerNeeds: string[] = [], fundingType: string) {
  return [
    ...partnerNeeds,
    ...(fundingType ? [`Financement ${fundingType}`] : []),
  ];
}

export function mapFundingType(fundingType: string) {
  if (fundingType === 'equity') return 'amorcage';
  if (fundingType === 'don') return 'subvention';
  return 'mixte';
}

export function addDaysIso(base: Date, days: number) {
  const nextDate = new Date(base);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

export function buildProjectDocuments(
  submission: ProjectSubmissionPayload,
  projectId: unknown,
  projectTitle: string,
  nowIso: string,
) {
  return [
    submission.businessPlan ? { name: submission.businessPlan, type: 'pdf', category: 'strategie' } : null,
    submission.pitchDeck ? { name: submission.pitchDeck, type: 'ppt', category: 'pitch' } : null,
    submission.financialProjections ? { name: submission.financialProjections, type: 'excel', category: 'finance' } : null,
  ]
    .filter((document): document is { name: string; type: string; category: string } => Boolean(document))
    .map<Row>((document) => ({
      project_id: projectId,
      project_title: projectTitle,
      name: document.name,
      type: document.type,
      size: 'A televerser',
      date: nowIso.slice(0, 10),
      category: document.category,
    }));
}
