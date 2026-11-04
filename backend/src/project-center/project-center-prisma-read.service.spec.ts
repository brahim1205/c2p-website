import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectCenterPrismaReadService } from './project-center-prisma-read.service.js';
import { deriveProjectCenterRows, type ProjectCenterTables } from '../data/data-derived-data.js';
import { compareValues, normalizeText } from '../data/data-app-store.js';
import { toNumber } from '../data/data-normalizers.js';
import type { PrismaService } from '../database/prisma.service.js';

function emptyTables(): ProjectCenterTables {
  return {
    projects: [],
    project_milestones: [],
    project_documents: [],
    project_history: [],
    project_funding_rounds: [],
    funding_investors: [],
    project_partnerships: [],
    project_tracking: [],
    project_collaborations: [],
  };
}

describe('deriveProjectCenterRows', () => {
  it('computes the non-stored counters and copies parent titles', () => {
    const tables = emptyTables();
    tables.projects.push({ id: 1, title: 'AgroLink', category: 'agri', funding: 500, funding_goal: 1000, progress: 10 });
    tables.project_documents.push(
      { id: 'd1', project_id: 1, category: 'report' },
      { id: 'd2', project_id: '1', category: 'pitch' },
      { id: 'd3', project_id: 2, category: 'report' },
    );
    tables.project_partnerships.push({ id: 'p1', project_id: 1 });
    tables.project_milestones.push(
      { id: 'm1', project_id: 1, title: 'Done', status: 'completed', due_date: '2026-01-01' },
      { id: 'm2', project_id: 1, title: 'Next', status: 'pending', due_date: '2026-03-01' },
    );
    tables.project_funding_rounds.push({ id: 'r1', project_id: 1, target_amount: 200, raised_amount: 50 });
    tables.funding_investors.push({ id: 'i1', funding_round_id: 'r1' }, { id: 'i2', funding_round_id: 'r1' });
    tables.project_tracking.push({ id: 't1', project_id: 1, partner_id: 'u1' });
    tables.project_collaborations.push({ id: 'c1', project_id: 1, partner_id: 'u1' });

    deriveProjectCenterRows(tables, { compareValues, normalizeText, toNumber });

    const [project] = tables.projects;
    assert.equal(project.documents_count, 2);
    assert.equal(project.reports_count, 1);
    assert.equal(project.partnerships_count, 1);
    assert.equal(project.progress, 50);
    assert.equal(project.sector, 'agri');
    assert.equal(project.next_milestone, 'Next');

    const [round] = tables.project_funding_rounds;
    assert.equal(round.project_title, 'AgroLink');
    assert.equal(round.investors, 2);
    assert.equal(round.progress_percent, 25);

    assert.equal(tables.project_tracking[0].title, 'AgroLink');
    assert.equal(tables.project_tracking[0].documents, 2);
    assert.equal(tables.project_collaborations[0].project_title, 'AgroLink');
  });

  it('keeps explicit values over derived ones', () => {
    const tables = emptyTables();
    tables.projects.push({ id: 1, title: 'AgroLink', progress: 80, funding: 0, funding_goal: 1000, next_milestone: 'Manual' });
    tables.project_funding_rounds.push({ id: 'r1', project_id: 1, project_title: 'Custom', target_amount: 0 });
    deriveProjectCenterRows(tables, { compareValues, normalizeText, toNumber });
    assert.equal(tables.projects[0].progress, 80);
    assert.equal(tables.projects[0].next_milestone, 'Manual');
    assert.equal(tables.project_funding_rounds[0].project_title, 'Custom');
    assert.equal(tables.project_funding_rounds[0].progress_percent, 0);
  });
});

function fakePrisma(records: Partial<Record<string, Array<{ id: string; metadata: unknown }>>>, options: { connected?: boolean; error?: unknown } = {}) {
  const delegate = (name: string) => ({
    findMany: async () => {
      if (options.error) throw options.error;
      return records[name] ?? [];
    },
  });
  return {
    isConnected: options.connected ?? true,
    projectCenterProject: delegate('projects'),
    projectCenterMilestone: delegate('milestones'),
    projectCenterDocument: delegate('documents'),
    projectCenterHistoryEntry: delegate('history'),
    projectCenterFundingRound: delegate('rounds'),
    projectCenterFundingInvestor: delegate('investors'),
    projectCenterPartnership: delegate('partnerships'),
    projectCenterTracking: delegate('tracking'),
    projectCenterCollaboration: delegate('collaborations'),
  } as unknown as PrismaService;
}

describe('ProjectCenterPrismaReadService', () => {
  it('rebuilds the original rows from metadata and derives counters', async () => {
    const service = new ProjectCenterPrismaReadService(fakePrisma({
      projects: [{ id: '4001', metadata: { id: 4001, title: 'AgroLink', owner_id: 'usr-porteur' } }],
      documents: [{ id: 'd1', metadata: { id: 'd1', project_id: 4001 } }],
    }));
    const tables = await service.loadTables();
    assert.ok(tables);
    assert.equal(tables.projects[0].id, 4001, 'keeps the original id type');
    assert.equal(tables.projects[0].owner_id, 'usr-porteur');
    assert.equal(tables.projects[0].documents_count, 1);
  });

  it('falls back to the record id when metadata is missing', async () => {
    const service = new ProjectCenterPrismaReadService(fakePrisma({ projects: [{ id: 'p1', metadata: null }] }));
    const tables = await service.loadTables();
    assert.equal(tables?.projects[0].id, 'p1');
  });

  it('returns null when Prisma is disconnected or the projection is missing', async () => {
    assert.equal(await new ProjectCenterPrismaReadService(fakePrisma({}, { connected: false })).loadTables(), null);
    assert.equal(await new ProjectCenterPrismaReadService(fakePrisma({}, { error: { code: 'P2021' } })).loadTables(), null);
  });

  it('is disabled by the PROJECT_CENTER_READ_SOURCE=app_row rollback lever', async () => {
    const previous = process.env.PROJECT_CENTER_READ_SOURCE;
    process.env.PROJECT_CENTER_READ_SOURCE = 'app_row';
    try {
      const service = new ProjectCenterPrismaReadService(fakePrisma({ projects: [{ id: 'p1', metadata: { id: 'p1' } }] }));
      assert.equal(await service.loadTables(), null);
    } finally {
      if (previous === undefined) delete process.env.PROJECT_CENTER_READ_SOURCE;
      else process.env.PROJECT_CENTER_READ_SOURCE = previous;
    }
  });

  it('propagates unexpected database errors', async () => {
    const service = new ProjectCenterPrismaReadService(fakePrisma({}, { error: new Error('boom') }));
    await assert.rejects(service.loadTables(), /boom/);
  });
});
