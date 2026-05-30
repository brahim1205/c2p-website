import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

export type ProjectCenterRowsByTable = {
  projects: Row[];
  project_milestones: Row[];
  project_documents: Row[];
  project_history: Row[];
  project_funding_rounds: Row[];
  funding_investors: Row[];
  project_partnerships: Row[];
  project_tracking: Row[];
  project_collaborations: Row[];
};

export type ProjectCenterRowsByTableRemovals = {
  projects: string[];
  project_milestones: string[];
  project_documents: string[];
  project_history: string[];
  project_funding_rounds: string[];
  funding_investors: string[];
  project_partnerships: string[];
  project_tracking: string[];
  project_collaborations: string[];
};

export async function persistProjectCenterProjection(
  tx: Prisma.TransactionClient,
  rowsByTable: ProjectCenterRowsByTable,
) {
  await persistProjects(tx, rowsByTable.projects);
  await persistMilestones(tx, rowsByTable.project_milestones);
  await persistDocuments(tx, rowsByTable.project_documents);
  await persistHistory(tx, rowsByTable.project_history);
  await persistFundingRounds(tx, rowsByTable.project_funding_rounds);
  await persistFundingInvestors(tx, rowsByTable.funding_investors);
  await persistPartnerships(tx, rowsByTable.project_partnerships);
  await persistTracking(tx, rowsByTable.project_tracking);
  await persistCollaborations(tx, rowsByTable.project_collaborations);
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
  if (removalsByTable.funding_investors.length) {
    await tx.projectCenterFundingInvestor.deleteMany({ where: { id: { in: removalsByTable.funding_investors } } });
  }
  if (removalsByTable.project_funding_rounds.length) {
    await tx.projectCenterFundingRound.deleteMany({ where: { id: { in: removalsByTable.project_funding_rounds } } });
  }
  if (removalsByTable.project_collaborations.length) {
    await tx.projectCenterCollaboration.deleteMany({ where: { id: { in: removalsByTable.project_collaborations } } });
  }
  if (removalsByTable.project_tracking.length) {
    await tx.projectCenterTracking.deleteMany({ where: { id: { in: removalsByTable.project_tracking } } });
  }
  if (removalsByTable.project_partnerships.length) {
    await tx.projectCenterPartnership.deleteMany({ where: { id: { in: removalsByTable.project_partnerships } } });
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

async function persistFundingRounds(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterFundingRoundCreateInput = {
      id: toString(row.id),
      projectId: toString(row.project_id),
      roundType: toNullableString(row.type),
      targetAmount: toInt(row.target_amount),
      raisedAmount: toInt(row.raised_amount),
      deadline: toNullableString(row.deadline),
      startDate: toNullableString(row.start_date),
      status: toString(row.status, 'draft'),
      description: toNullableString(row.description),
      pitchDeck: toBoolean(row.pitch_deck),
      businessPlan: toBoolean(row.business_plan),
      valuation: toInt(row.valuation),
      revenue: toInt(row.revenue),
      burnRate: toInt(row.burn_rate),
      runway: toNullableString(row.runway),
      nextMilestone: toNullableString(row.next_milestone),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.start_date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.deadline ?? row.start_date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterFundingRound.upsert({ where: { id }, create: data, update });
  }
}

async function persistFundingInvestors(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterFundingInvestorCreateInput = {
      id: toString(row.id),
      fundingRoundId: toString(row.funding_round_id),
      name: toString(row.name, 'Investisseur'),
      avatar: toNullableString(row.avatar),
      investorType: toNullableString(row.type),
      amount: toInt(row.amount),
      investorDate: toNullableString(row.date),
      equity: toNullableString(row.equity),
      status: toString(row.status, 'pending'),
      notes: toNullableString(row.notes),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterFundingInvestor.upsert({ where: { id }, create: data, update });
  }
}

async function persistPartnerships(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterPartnershipCreateInput = {
      id: toString(row.id),
      projectId: toString(row.project_id),
      counterpartUserId: toNullableString(row.counterpart_user_id),
      name: toString(row.name, 'Partenaire'),
      role: toNullableString(row.role),
      partnershipType: toNullableString(row.type),
      avatar: toNullableString(row.avatar),
      expertise: row.expertise === undefined ? undefined : toJson(row.expertise),
      status: toString(row.status, 'pending'),
      lastActivity: toNullableString(row.last_activity),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterPartnership.upsert({ where: { id }, create: data, update });
  }
}

async function persistTracking(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterTrackingCreateInput = {
      id: toString(row.id),
      partnerId: toString(row.partner_id),
      projectId: toString(row.project_id),
      partnerType: toNullableString(row.partner_type),
      investedAmount: toInt(row.invested_amount),
      roi: toFloat(row.roi),
      status: toString(row.status, 'pending'),
      lastUpdate: toDate(row.last_update),
      nextMilestone: toNullableString(row.next_milestone),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.last_update) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.last_update ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterTracking.upsert({ where: { id }, create: data, update });
  }
}

async function persistCollaborations(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.ProjectCenterCollaborationCreateInput = {
      id: toString(row.id),
      partnerId: toString(row.partner_id),
      projectId: toString(row.project_id),
      partnerType: toNullableString(row.partner_type),
      counterpartName: toNullableString(row.counterpart_name),
      counterpartRole: toNullableString(row.counterpart_role),
      collaborationType: toNullableString(row.type),
      status: toString(row.status, 'pending'),
      startDate: toNullableString(row.start_date),
      endDate: toNullableString(row.end_date),
      value: toInt(row.value),
      deliverables: row.deliverables === undefined ? undefined : toJson(row.deliverables),
      meetings: toInt(row.meetings),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.start_date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.end_date ?? row.start_date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.projectCenterCollaboration.upsert({ where: { id }, create: data, update });
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = toString(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
  if (['false', '0', 'no', 'non'].includes(normalized)) return false;
  return fallback;
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(toString(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
