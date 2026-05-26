import { clone, findRow } from './data-app-store.js';
import type { Row } from './mock-store.js';

export function hydrateProjectRow(table: string, hydrated: Row) {
  if (table === 'projects') {
    hydrated.sector = hydrated.sector ?? hydrated.category ?? null;
    hydrated.documents_count = hydrated.documents_count ?? 0;
    hydrated.reports_count = hydrated.reports_count ?? 0;
    hydrated.progress = hydrated.progress ?? 0;
    return hydrated;
  }

  if (table === 'project_milestones') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_documents') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_history') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_partnerships') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_funding_rounds') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    hydrated.project_name = hydrated.project_name ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'funding_investors') {
    const round = findRow('project_funding_rounds', hydrated.funding_round_id);
    hydrated.round = round ? clone(round) : null;
    return hydrated;
  }

  if (table === 'project_tracking') {
    const project = findRow('projects', hydrated.project_id);
    if (project) {
      hydrated.project = clone(project);
      hydrated.title = hydrated.title ?? project.title ?? null;
      hydrated.description = hydrated.description ?? project.description ?? null;
      hydrated.sector = hydrated.sector ?? project.sector ?? project.category ?? null;
      hydrated.progress = hydrated.progress ?? project.progress ?? 0;
      hydrated.documents = hydrated.documents ?? project.documents_count ?? 0;
      hydrated.reports = hydrated.reports ?? project.reports_count ?? 0;
      hydrated.location = hydrated.location ?? project.location ?? null;
      hydrated.impact = hydrated.impact ?? project.impact ?? null;
      hydrated.team_size = hydrated.team_size ?? project.team_size ?? null;
      hydrated.revenue = hydrated.revenue ?? project.revenue ?? 0;
      hydrated.valuation = hydrated.valuation ?? project.valuation ?? 0;
    }
    return hydrated;
  }

  if (table === 'project_collaborations') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    hydrated.project = project ? clone(project) : null;
    return hydrated;
  }

  return null;
}
