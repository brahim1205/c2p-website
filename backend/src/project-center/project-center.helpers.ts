import {
  clone,
  store,
} from '../data/data-app-store.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import { sanitizeRowsForActor } from '../data/data-response-sanitizers.js';
import type { Row } from '../data/mock-store.js';
import type { ProjectSubmissionPayload } from './project-center.payloads.js';

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
