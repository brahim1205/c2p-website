import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  compareValues,
  mergeRowsToPersist,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import { prepareInsert } from '../data/data-runtime.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import type { ProjectCenterTables } from '../data/data-derived-data.js';
import { ProjectCenterPrismaReadService } from './project-center-prisma-read.service.js';
import {
  parseOwnerFundingRoundCreatePayload,
  parseOwnerProjectUpdatePayload,
  parsePartnerCollaborationPatchPayload,
  parsePartnerInterestPayload,
  parsePartnerSupportConversationPayload,
  parseProjectSubmissionPayload,
  toNonNegativeNumber,
} from './project-center.payloads.js';
import {
  addDaysIso,
  appendRows,
  applyProjectFilters,
  applyProjectSorting,
  buildPartnerNeeds,
  buildProjectDocuments,
  getOwnerProjects,
  getPartnerTrackedProjects,
  mapFundingType,
  normalizeCategory,
  parseTeamSize,
  resolveProjectTier,
  PROJECT_SUBMISSION_ALLOWED_ROLES,
  publicRows,
  requireOwnerProject,
  requireProjectAdminUser,
  requireProjectOwnerUser,
  requireProjectPartnerUser,
  resolvePublicProjectsLimit,
  rowsForProject,
  type PublicProjectQuery,
} from './project-center.helpers.js';
const C2P_SUPPORT_USER_ID = 'usr-admin';

function isPublicProjectNoise(row: Row) {
  const title = String(row.title ?? '').trim().toLowerCase();
  const description = String(row.description ?? '').trim().toLowerCase();
  const haystack = `${title} ${description}`;
  return (
    /^v+$/.test(title)
    || title.includes('smoke projectcenter')
    || haystack.includes('projet smoke')
    || haystack.includes('smoke projectcenter debug')
    || haystack.includes('verifier le flux de soumission')
  );
}

type ProjectChildTable =
  | 'project_milestones'
  | 'project_documents'
  | 'project_history'
  | 'project_partnerships'
  | 'project_funding_rounds';

function rowsForProjectIn(tables: ProjectCenterTables, table: ProjectChildTable, projectId: string) {
  return tables[table].filter((row) => String(row.project_id) === String(projectId));
}

function rowsForProjectsIn(tables: ProjectCenterTables, table: ProjectChildTable, projectIds: Set<string>) {
  return tables[table].filter((row) => projectIds.has(String(row.project_id)));
}

function ownerProjectsIn(tables: ProjectCenterTables, ownerId: string) {
  return tables.projects
    .filter((project) => String(project.owner_id) === String(ownerId))
    .sort((left, right) => compareValues(right.created_at, left.created_at));
}

function requireOwnedProjectIn(tables: ProjectCenterTables, ownerId: string, projectId: string) {
  const project = ownerProjectsIn(tables, ownerId).find((row) => String(row.id) === String(projectId)) ?? null;
  if (!project) {
    throw new BadRequestException('PROJECT_NOT_FOUND');
  }
  return project;
}

function partnerTrackingIn(tables: ProjectCenterTables, partnerId: string) {
  return hydrateRows('project_tracking', tables.project_tracking.filter((row) => String(row.partner_id) === String(partnerId)))
    .sort((left, right) => compareValues(right.last_update, left.last_update));
}

function partnerCollaborationsIn(tables: ProjectCenterTables, partnerId: string) {
  return hydrateRows('project_collaborations', tables.project_collaborations.filter((row) => String(row.partner_id) === String(partnerId)))
    .sort((left, right) => compareValues(right.start_date, left.start_date));
}

function openProjectsIn(tables: ProjectCenterTables) {
  return publicRows('projects', tables.projects)
    .filter((project) => String(project.status ?? '').toLowerCase() !== 'termine')
    .sort((left, right) => compareValues(right.created_at, left.created_at));
}

@Injectable()
export class ProjectCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly prismaReadService: ProjectCenterPrismaReadService,
  ) {}

  /**
   * Project Center tables for one request: Prisma projection first, AppRow store as fallback
   * while the migration is in progress. Callers must have run `syncAppStoreFromDatabase` before.
   */
  private async tables(): Promise<ProjectCenterTables> {
    return (await this.prismaReadService.loadTables()) ?? {
      projects: clone(store.projects ?? []),
      project_milestones: clone(store.project_milestones ?? []),
      project_documents: clone(store.project_documents ?? []),
      project_history: clone(store.project_history ?? []),
      project_funding_rounds: clone(store.project_funding_rounds ?? []),
      funding_investors: clone(store.funding_investors ?? []),
      project_partnerships: clone(store.project_partnerships ?? []),
      project_tracking: clone(store.project_tracking ?? []),
      project_collaborations: clone(store.project_collaborations ?? []),
    };
  }

  async listPublicProjects(query: PublicProjectQuery = {}) {
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();

    let rows = publicRows('projects', t.projects).filter((row) => !isPublicProjectNoise(row));
    rows = applyProjectFilters(rows, query);
    rows = applyProjectSorting(rows, query.sort);
    return rows.slice(0, resolvePublicProjectsLimit(query.limit));
  }

  async getPublicProjectDetail(projectId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();

    const projects = publicRows('projects', t.projects).filter((row) => !isPublicProjectNoise(row));
    const project = projects.find((row) => String(row.id) === String(projectId)) ?? null;
    if (!project) {
      return {
        project: null,
        milestones: [],
        documents: [],
        history: [],
        partnerships: [],
        rounds: [],
        investors: [],
        relatedProjects: [],
      };
    }

    const milestones = publicRows('project_milestones', rowsForProjectIn(t, 'project_milestones', projectId))
      .sort((left, right) => compareValues(left.due_date, right.due_date));
    const documents = publicRows('project_documents', rowsForProjectIn(t, 'project_documents', projectId));
    const history = publicRows('project_history', rowsForProjectIn(t, 'project_history', projectId))
      .sort((left, right) => compareValues(right.date, left.date));
    const partnerships = publicRows('project_partnerships', rowsForProjectIn(t, 'project_partnerships', projectId))
      .sort((left, right) => compareValues(left.id, right.id));
    const rounds = publicRows('project_funding_rounds', rowsForProjectIn(t, 'project_funding_rounds', projectId))
      .sort((left, right) => compareValues(right.deadline, left.deadline));
    const roundIds = new Set(rounds.map((round) => String(round.id)));
    const investors = publicRows('funding_investors', t.funding_investors.filter((row) => roundIds.has(String(row.funding_round_id))));
    const relatedProjects = projects
      .filter((row) => String(row.id) !== String(projectId) && String(row.category ?? '') === String(project.category ?? ''))
      .sort((left, right) => compareValues(right.created_at, left.created_at))
      .slice(0, 3);

    return {
      project,
      milestones,
      documents,
      history,
      partnerships,
      rounds,
      investors,
      relatedProjects,
    };
  }

  async listOwnerProjects(user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    return ownerProjectsIn(t, owner.id);
  }

  async getOwnerSnapshot(user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const projects = ownerProjectsIn(t, owner.id);
    const projectIds = new Set(projects.map((project) => String(project.id)));
    return {
      projects,
      partnerships: rowsForProjectsIn(t, 'project_partnerships', projectIds)
        .sort((left, right) => compareValues(left.id, right.id)),
      rounds: rowsForProjectsIn(t, 'project_funding_rounds', projectIds)
        .sort((left, right) => compareValues(right.deadline, left.deadline)),
    };
  }

  async getOwnerProjectDetail(projectId: string, user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const project = requireOwnedProjectIn(t, owner.id, projectId);
    return {
      project,
      milestones: rowsForProjectIn(t, 'project_milestones', String(project.id)).sort((left, right) => compareValues(left.due_date, right.due_date)),
      documents: rowsForProjectIn(t, 'project_documents', String(project.id)).sort((left, right) => compareValues(right.date, left.date)),
      history: rowsForProjectIn(t, 'project_history', String(project.id)).sort((left, right) => compareValues(right.date, left.date)),
      partnerships: rowsForProjectIn(t, 'project_partnerships', String(project.id)).sort((left, right) => compareValues(left.id, right.id)),
      rounds: rowsForProjectIn(t, 'project_funding_rounds', String(project.id)).sort((left, right) => compareValues(right.deadline, left.deadline)),
    };
  }

  async updateOwnerProject(projectId: string, payload: unknown, user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    const patch = parseOwnerProjectUpdatePayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const previousProject = requireOwnerProject(owner.id, projectId);
    const updatedRows = patchAppRows('projects', (row) => String(row.id) === String(previousProject.id), {
      title: patch.title,
      description: patch.description,
      status: patch.status,
      updated_at: new Date().toISOString(),
    });
    const updatedProject = updatedRows.find((row) => String(row.id) === String(previousProject.id));
    if (!updatedProject) {
      throw new BadRequestException('Projet non modifie.');
    }
    const trackingRows = clone(store.project_tracking ?? []).filter((row) => String(row.project_id) === String(updatedProject.id));
    const notifications = trackingRows.length
      ? appendAppRows('notifications', trackingRows.map((tracking) => createAppNotificationRow({
          userId: String(tracking.partner_id),
          title: 'Évolution d’un projet suivi',
          message: `Le projet "${updatedProject.title}" a été mis à jour. Statut : ${updatedProject.status}.`,
          type: 'project_update',
          link: `/dashboard/partenaire/projets-suivis/${updatedProject.id}`,
          metadata: { project_id: updatedProject.id, status: updatedProject.status },
        })))
      : [];
    const persistedRows = { projects: [updatedProject], ...(notifications.length ? { notifications } : {}) };
    await this.platformPersistenceService.persistRows(persistedRows, {
      actorId: owner.id,
      reason: 'project-center:owner-project:update',
      beforeRowsByTable: { projects: [previousProject] },
      afterRowsByTable: persistedRows,
    });
    return updatedProject;
  }

  async listOwnerFundingRounds(user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const projectIds = new Set(ownerProjectsIn(t, owner.id).map((project) => String(project.id)));
    return rowsForProjectsIn(t, 'project_funding_rounds', projectIds)
      .sort((left, right) => compareValues(right.deadline, left.deadline));
  }

  async getOwnerFundingRoundDetail(roundId: string, user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const round = t.project_funding_rounds.find((row) => String(row.id) === String(roundId)) ?? null;
    if (!round) {
      throw new BadRequestException('FUNDING_ROUND_NOT_FOUND');
    }
    requireOwnedProjectIn(t, owner.id, String(round.project_id));
    const investors = t.funding_investors
      .filter((row) => String(row.funding_round_id) === String(round.id))
      .sort((left, right) => compareValues(right.date, left.date));
    const documents = rowsForProjectIn(t, 'project_documents', String(round.project_id))
      .sort((left, right) => compareValues(right.date, left.date));
    const history = rowsForProjectIn(t, 'project_history', String(round.project_id))
      .sort((left, right) => compareValues(right.date, left.date));
    return { round, investors, documents, history };
  }

  async createOwnerFundingRound(payload: unknown, user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    const input = parseOwnerFundingRoundCreatePayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const project = requireOwnerProject(owner.id, String(input.projectId));
    const rowsToPersist: Record<string, Row[]> = {};
    const rounds = appendRows('project_funding_rounds', [{
      project_id: project.id,
      project_title: project.title,
      project_name: project.title,
      type: input.type,
      target_amount: input.targetAmount,
      raised_amount: 0,
      deadline: input.deadline,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'en_cours',
      description: input.description,
      pitch_deck: false,
      business_plan: false,
    }], rowsToPersist);
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: owner.id,
      reason: 'project-center:owner-funding-round:create',
      beforeRowsByTable: {},
      afterRowsByTable: rowsToPersist,
    });
    return rounds[0];
  }

  async listOwnerPartnerships(user: AuthUser | null) {
    const owner = requireProjectOwnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const projectIds = new Set(ownerProjectsIn(t, owner.id).map((project) => String(project.id)));
    return rowsForProjectsIn(t, 'project_partnerships', projectIds)
      .sort((left, right) => compareValues(left.id, right.id));
  }

  async listPartnerTrackedProjects(user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    return partnerTrackingIn(t, partner.id);
  }

  async getAdminDashboardSummary(user: AuthUser | null) {
    requireProjectAdminUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    return {
      projects: hydrateRows('projects', t.projects)
        .sort((left, right) => compareValues(right.created_at, left.created_at)),
      history: hydrateRows('project_history', t.project_history)
        .sort((left, right) => compareValues(right.date, left.date))
        .slice(0, 6),
    };
  }

  async getPartnerSnapshot(user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const trackedProjects = partnerTrackingIn(t, partner.id);
    const trackedProjectIds = new Set(trackedProjects.map((tracked) => String(tracked.project_id)));
    const openProjects = openProjectsIn(t);
    return {
      trackedProjects,
      collaborations: partnerCollaborationsIn(t, partner.id),
      openProjects: openProjects
        .filter((project) => !trackedProjectIds.has(String(project.id))),
    };
  }

  async getPartnerTrackedProjectDetail(projectId: string, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    const tracked = partnerTrackingIn(t, partner.id)
      .find((row) => String(row.project_id) === String(projectId)) ?? null;
    if (!tracked) {
      throw new BadRequestException('TRACKED_PROJECT_NOT_FOUND');
    }
    const project = hydrateRows('projects', t.projects.filter((row) => String(row.id) === String(projectId)))[0] ?? null;
    if (!project) {
      throw new BadRequestException('PROJECT_NOT_FOUND');
    }
    const childRows = (table: ProjectChildTable) => hydrateRows(table, rowsForProjectIn(t, table, projectId));
    return {
      tracked,
      detail: {
        project,
        milestones: childRows('project_milestones').sort((left, right) => compareValues(left.due_date, right.due_date)),
        documents: childRows('project_documents').sort((left, right) => compareValues(right.date, left.date)),
        history: childRows('project_history').sort((left, right) => compareValues(right.date, left.date)),
        partnerships: childRows('project_partnerships').sort((left, right) => compareValues(left.id, right.id)),
        rounds: childRows('project_funding_rounds').sort((left, right) => compareValues(right.deadline, left.deadline)),
      },
    };
  }

  async listPartnerCollaborations(user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    return partnerCollaborationsIn(t, partner.id);
  }

  async updatePartnerCollaboration(collaborationId: string, payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    const patch = parsePartnerCollaborationPatchPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const previousCollaboration = clone(store.project_collaborations ?? [])
      .find((row) => String(row.id) === String(collaborationId) && String(row.partner_id) === String(partner.id)) ?? null;
    if (!previousCollaboration) {
      throw new BadRequestException('COLLABORATION_NOT_FOUND');
    }

    const updatedRows = patchAppRows(
      'project_collaborations',
      (row) => String(row.id) === String(previousCollaboration.id) && String(row.partner_id) === String(partner.id),
      patch,
    );
    const updatedCollaboration = updatedRows.find((row) => String(row.id) === String(previousCollaboration.id));
    if (!updatedCollaboration) {
      throw new BadRequestException('Collaboration non modifiee.');
    }
    await this.platformPersistenceService.persistRows({ project_collaborations: [updatedCollaboration] }, {
      actorId: partner.id,
      reason: 'project-center:partner-collaboration:update',
      beforeRowsByTable: { project_collaborations: [previousCollaboration] },
      afterRowsByTable: { project_collaborations: [updatedCollaboration] },
    });
    return updatedCollaboration;
  }

  async openPartnerSupportConversation(payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    const input = parsePartnerSupportConversationPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);

    const tracked = getPartnerTrackedProjects(partner.id)
      .find((row) => String(row.project_id) === String(input.projectId)) ?? null;
    if (!tracked) {
      throw new BadRequestException('TRACKED_PROJECT_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const existingConversation = clone(store.conversations ?? []).find((conversation) =>
      Array.isArray(conversation.participants)
        && conversation.participants.map(String).includes(partner.id)
        && conversation.participants.map(String).includes(C2P_SUPPORT_USER_ID),
    ) ?? null;
    const rowsToPersist: Record<string, Row[]> = {};
    const beforeRowsByTable: Record<string, Row[]> = {};
    let conversationId = existingConversation?.id;
    let conversationCreated = false;

    if (!existingConversation) {
      const createdConversation = appendRows('conversations', [{
        name: 'Support C2P',
        role: 'Support',
        participants: [partner.id, C2P_SUPPORT_USER_ID],
        type: 'individual',
        members: 2,
        created_at: now,
        updated_at: now,
      }], rowsToPersist)[0];
      conversationId = createdConversation.id;
      conversationCreated = true;
    }

    if (conversationId === undefined || conversationId === null) {
      throw new BadRequestException('CONVERSATION_NOT_CREATED');
    }

    const content = `Bonjour C2P, je souhaite faire un point sur le projet "${input.projectTitle}" et coordonner les prochains echanges.`;
    const existingMessage = clone(store.messages ?? []).find((message) =>
      String(message.conversation_id) === String(conversationId)
      && String(message.sender_id) === String(partner.id)
      && String(message.content) === content,
    ) ?? null;

    let messageId = existingMessage?.id;
    let messageCreated = false;
    if (!existingMessage) {
      const createdMessage = appendRows('messages', [{
        conversation_id: conversationId,
        content,
        sender_id: partner.id,
        sender_name: `${partner.firstName} ${partner.lastName}`.trim(),
        sender_avatar: partner.avatar ?? null,
        read: false,
        attachments: [],
        created_at: now,
      }], rowsToPersist)[0];
      messageId = createdMessage.id;
      messageCreated = true;
    }

    if (existingConversation) {
      beforeRowsByTable.conversations = [existingConversation];
      const updatedConversations = patchAppRows(
        'conversations',
        (row) => String(row.id) === String(existingConversation.id),
        { updated_at: now },
      );
      mergeRowsToPersist(rowsToPersist, 'conversations', updatedConversations);
    }

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: partner.id,
      reason: 'project-center:partner-support-conversation:open',
      beforeRowsByTable,
      afterRowsByTable: rowsToPersist,
    });

    return {
      conversationId,
      messageId,
      conversationCreated,
      messageCreated,
    };
  }

  async listPartnerOpenProjects(user: AuthUser | null) {
    requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const t = await this.tables();
    return openProjectsIn(t);
  }

  async expressPartnerInterest(payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    const input = parsePartnerInterestPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const project = clone(store.projects ?? []).find((row) => String(row.id) === String(input.projectId)) ?? null;
    if (!project || String(project.status ?? '').toLowerCase() === 'termine') {
      throw new BadRequestException('PROJECT_NOT_AVAILABLE');
    }

    const collaborationType = input.partnerType === 'financier' ? 'financement' : 'technique';
    const existingTracked = clone(store.project_tracking ?? [])
      .find((row) => String(row.partner_id) === String(partner.id) && String(row.project_id) === String(project.id)) ?? null;
    const existingCollaboration = clone(store.project_collaborations ?? [])
      .find((row) => String(row.partner_id) === String(partner.id) && String(row.project_id) === String(project.id)) ?? null;

    const rowsToPersist: Record<string, Row[]> = {};
    const beforeRowsByTable: Record<string, Row[]> = {};
    let trackedCreated = false;
    let collaborationCreated = false;

    if (!existingTracked) {
      appendRows('project_tracking', [{
        partner_id: partner.id,
        project_id: project.id,
        partner_type: input.partnerType,
        invested_amount: 0,
        roi: 0,
        status: 'en_risque',
        last_update: new Date().toISOString(),
        next_milestone: project.next_milestone,
      }], rowsToPersist);
      trackedCreated = true;
    } else if (existingTracked.partner_type !== input.partnerType) {
      beforeRowsByTable.project_tracking = [existingTracked];
      const updatedTracked = patchAppRows(
        'project_tracking',
        (row) => String(row.id) === String(existingTracked.id),
        { partner_type: input.partnerType, last_update: new Date().toISOString() },
      );
      mergeRowsToPersist(rowsToPersist, 'project_tracking', updatedTracked);
    }

    if (!existingCollaboration) {
      appendRows('project_collaborations', [{
        partner_id: partner.id,
        project_id: project.id,
        partner_type: input.partnerType,
        counterpart_name: project.porteur_name,
        counterpart_role: 'Porteur de projet',
        type: collaborationType,
        status: 'en_negociation',
        start_date: new Date().toISOString().slice(0, 10),
        value: 0,
        deliverables: ['Prise de contact initiale'],
        meetings: 0,
      }], rowsToPersist);
      collaborationCreated = true;
    } else if (existingCollaboration.partner_type !== input.partnerType || existingCollaboration.type !== collaborationType) {
      beforeRowsByTable.project_collaborations = [existingCollaboration];
      const updatedCollaborations = patchAppRows(
        'project_collaborations',
        (row) => String(row.id) === String(existingCollaboration.id),
        { partner_type: input.partnerType, type: collaborationType },
      );
      mergeRowsToPersist(rowsToPersist, 'project_collaborations', updatedCollaborations);
    }

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: partner.id,
      reason: 'project-center:partner-interest:upsert',
      beforeRowsByTable,
      afterRowsByTable: rowsToPersist,
    });

    return {
      trackedCreated,
      collaborationCreated,
      alreadyTracked: !trackedCreated && !collaborationCreated,
    };
  }

  async submitProject(payload: unknown, user: AuthUser | null) {
    if (!user) {
      throw new UnauthorizedException('Connexion requise.');
    }
    if (!PROJECT_SUBMISSION_ALLOWED_ROLES.has(user.role)) {
      throw new ForbiddenException('La soumission de projet est reservee aux comptes porteur et admin.');
    }

    const submission = parseProjectSubmissionPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);

    const rowsToPersist: Record<string, Row[]> = {};
    const now = new Date();
    const nowIso = now.toISOString();
    const projectId = Date.now();
    const porteurName = submission.founderName
      || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      || 'Porteur de projet';
    const fundingGoal = toNonNegativeNumber(submission.fundingGoal);
    const currentFunding = toNonNegativeNumber(submission.currentFunding);
    const teamSize = parseTeamSize(submission.teamSize);
    const durationMonths = Number(submission.projectDurationMonths);
    const projectTier = resolveProjectTier(fundingGoal, durationMonths);

    const project = appendRows('projects', [{
      id: projectId,
      owner_id: user.id,
      title: submission.projectName,
      description: submission.shortDescription || submission.solution,
      category: normalizeCategory(submission.category),
      sector: submission.category || 'Autre',
      status: 'pre-incubation',
      phase: submission.stage || 'idee',
      porteur_name: porteurName,
      founder_email: submission.founderEmail,
      founder_phone: submission.founderPhone,
      founder_bio: submission.founderBio,
      problem_statement: submission.problemStatement,
      solution: submission.solution,
      target_market: submission.targetMarket,
      business_model: submission.businessModel,
      competition: submission.competition,
      funding: currentFunding,
      funding_goal: fundingGoal,
      project_tier: projectTier,
      duration_months: durationMonths,
      team_size: teamSize,
      mentors: 0,
      progress: 12,
      location: submission.location,
      impact: submission.problemStatement,
      looking_for: buildPartnerNeeds(submission.partnerNeeds, submission.fundingType),
      image: '/images/home/venture.jpg',
      last_update: nowIso,
      next_milestone: 'Etude de recevabilite',
    }], rowsToPersist)[0];

    const projectIdValue = project.id;
    const dueDate = addDaysIso(now, 7).slice(0, 10);
    appendRows('project_milestones', [{
      project_id: projectIdValue,
      project_title: project.title,
      title: 'Etude de recevabilite',
      description: 'Analyse initiale du dossier et cadrage du projet.',
      due_date: dueDate,
      status: 'pending',
      progress: 0,
      tasks: [
        { id: 1, title: 'Verification du dossier', completed: false },
        { id: 2, title: 'Evaluation de la proposition de valeur', completed: false },
      ],
    }], rowsToPersist);

    appendRows('project_history', [{
      project_id: projectIdValue,
      project_title: project.title,
      date: nowIso,
      user: porteurName,
      action: 'Projet soumis depuis ProjectCenter',
      type: 'submission',
    }], rowsToPersist);

    if (fundingGoal > 0) {
      appendRows('project_funding_rounds', [{
        project_id: projectIdValue,
        project_title: project.title,
        project_name: project.title,
        type: mapFundingType(submission.fundingType),
        target_amount: fundingGoal,
        raised_amount: currentFunding,
        deadline: addDaysIso(now, 45).slice(0, 10),
        start_date: nowIso.slice(0, 10),
        status: 'en_cours',
        description: submission.useOfFunds,
        pitch_deck: false,
        business_plan: false,
        next_milestone: 'Revue initiale du dossier',
      }], rowsToPersist);
    }

    const documents = buildProjectDocuments(submission, projectIdValue, String(project.title), nowIso);
    if (documents.length > 0) {
      appendRows('project_documents', documents, rowsToPersist);
    }

    const eligiblePartners = clone(store.auth_users ?? []).filter((candidate) => {
      if (String(candidate.role) !== 'partenaire' || String(candidate.status ?? 'active') !== 'active') return false;
      const skills = Array.isArray(candidate.skills) ? candidate.skills.join(' ').toLowerCase() : '';
      if (skills.includes('ndanane')) return fundingGoal >= 2_500_000;
      if (skills.includes('djambars')) return fundingGoal >= 1_000_000;
      return true;
    });
    if (eligiblePartners.length > 0) {
      appendRows('notifications', eligiblePartners.map((partner) => createAppNotificationRow({
        userId: String(partner.id),
        title: 'Nouveau projet correspondant à votre badge',
        message: `"${project.title}" vient d’être soumis dans ${project.sector}. Consultez l’opportunité et son porteur.`,
        type: 'project_opportunity',
        link: '/dashboard/partenaire/opportunites',
        metadata: { project_id: project.id, project_tier: projectTier, funding_goal: fundingGoal },
      })), rowsToPersist);
    }

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: user.id,
      reason: 'project-center:submission:create',
      beforeRowsByTable: {},
      afterRowsByTable: rowsToPersist,
    });

    return {
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        phase: project.phase,
        created_at: project.created_at,
      },
    };
  }

}
