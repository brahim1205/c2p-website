import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import { isAdminRole } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';
import { getPlatformRuleNumber } from '../data/data-finance-context.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { requireProjectPartnerUser } from './project-center.helpers.js';

type FundingKind = 'donation' | 'profit_share_loan' | 'interest_loan';
type PartnerAction = 'coach' | 'mentor' | 'evaluate' | 'carry' | 'technical';

type SimulationInput = {
  projectId: string | number;
  fundingRoundId?: string | number | null;
  amount: number;
  durationMonths: number;
  fundingType: FundingKind;
};

const FUNDING_KINDS = new Set<FundingKind>(['donation', 'profit_share_loan', 'interest_loan']);
const PARTNER_ACTIONS = new Set<PartnerAction>(['coach', 'mentor', 'evaluate', 'carry', 'technical']);
const BADGES = ['nianthio', 'djambars', 'ndanane'] as const;
type PartnerBadge = typeof BADGES[number];

@Injectable()
export class ProjectFundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly persistence: PlatformPersistenceService,
  ) {}

  async listPartnerOpportunities(user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const badge = this.findBadge(partner);
    const skills = (partner.skills ?? []).join(' ').toLowerCase();
    const flags = clone(store.project_partner_flags ?? [])
      .filter((row) => String(row.partner_id) === partner.id && String(row.status ?? 'active') === 'active');
    const flagByProject = new Map(flags.map((row) => [String(row.project_id), row]));
    return clone(store.projects ?? [])
      .filter((project) => !['termine', 'archive', 'rejected'].includes(String(project.status ?? '').toLowerCase()))
      .map((project) => {
        const searchable = `${project.category ?? ''} ${project.sector ?? ''} ${(project.looking_for as string[] | undefined)?.join(' ') ?? ''}`.toLowerCase();
        const skillMatches = (partner.skills ?? []).filter((skill) => searchable.includes(skill.toLowerCase())).length;
        const flag = flagByProject.get(String(project.id));
        const score = Math.min(100, 45 + skillMatches * 15 + (flag ? 30 : 0));
        const {
          founder_email: _founderEmail,
          founder_phone: _founderPhone,
          founder_bio: _founderBio,
          ...safeProject
        } = project;
        return {
          ...safeProject,
          partner_badge: badge,
          opportunity_score: score,
          flagged_by_c2p: Boolean(flag),
          alert_reason: flag?.reason
            ?? (skillMatches > 0
              ? 'Projet correspondant à vos expertises.'
              : badge
                ? `Opportunité accessible au badge ${badge}.`
                : 'Opportunité ouverte aux partenaires techniques.'),
          suggested_roles: this.suggestRoles(searchable, skills),
        };
      })
      .sort((left, right) => Number(right.opportunity_score) - Number(left.opportunity_score));
  }

  async listCommitments(user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    this.requireFundingBadge(partner);
    return clone(store.project_funding_commitments ?? [])
      .filter((row) => String(row.partner_id) === partner.id)
      .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')));
  }

  async simulate(payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    this.requireFundingBadge(partner);
    const input = this.parseSimulation(payload);
    const project = this.requireOpenProject(input.projectId);
    return this.buildSimulation(input, partner, project);
  }

  async createCommitment(payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const row = this.requireObject(payload);
    if (row.contractAccepted !== true || row.riskAccepted !== true) {
      throw new BadRequestException('Le contrat et les risques doivent être acceptés.');
    }
    const input = this.parseSimulation(row);
    const project = this.requireOpenProject(input.projectId);
    const simulation = this.buildSimulation(input, partner, project);
    const now = new Date().toISOString();
    const commitment = withId({
      project_id: project.id,
      project_title: project.title,
      owner_id: project.owner_id,
      partner_id: partner.id,
      partner_name: `${partner.firstName} ${partner.lastName}`.trim(),
      partner_badge: simulation.partnerBadge,
      funding_round_id: input.fundingRoundId ?? null,
      funding_type: input.fundingType,
      amount: input.amount,
      duration_months: input.durationMonths,
      projected_profit: simulation.projectedProfit,
      projected_interest: simulation.projectedInterest,
      total_expected: simulation.totalExpected,
      schedule: simulation.schedule,
      guarantee: simulation.guarantee,
      status: 'pending_c2p_validation',
      contract_version: 'project-funding-v1',
      contract_accepted_at: now,
      risk_accepted_at: now,
      created_at: now,
    });
    const tracking = clone(store.project_tracking ?? []).find((item) =>
      String(item.partner_id) === partner.id && String(item.project_id) === String(project.id));
    const collaboration = clone(store.project_collaborations ?? []).find((item) =>
      String(item.partner_id) === partner.id && String(item.project_id) === String(project.id));
    const rows: Record<string, Row[]> = {
      project_funding_commitments: appendAppRows('project_funding_commitments', [commitment]),
      notifications: [],
      project_history: [],
    };
    if (!tracking) {
      rows.project_tracking = appendAppRows('project_tracking', [withId({
        partner_id: partner.id,
        project_id: project.id,
        partner_type: 'financier',
        invested_amount: 0,
        committed_amount: input.amount,
        roi: simulation.projectedReturnRate,
        status: 'souscription_en_validation',
        last_update: now,
        next_milestone: project.next_milestone,
      })]);
    }
    if (!collaboration) {
      rows.project_collaborations = appendAppRows('project_collaborations', [withId({
        partner_id: partner.id,
        project_id: project.id,
        partner_type: 'financier',
        counterpart_name: project.porteur_name,
        counterpart_role: 'Porteur de projet',
        type: 'financement',
        status: 'souscription_en_validation',
        start_date: now.slice(0, 10),
        value: input.amount,
        deliverables: ['Validation C2P', 'Signature du contrat', 'Mise à disposition des fonds'],
        meetings: 0,
      })]);
    }
    rows.notifications = appendAppRows('notifications', [
      createAppNotificationRow({
        userId: String(project.owner_id),
        title: 'Nouvelle souscription partenaire',
        message: `${commitment.partner_name} propose ${input.amount.toLocaleString('fr-FR')} FCFA pour "${project.title}". Validation C2P requise.`,
        type: 'project_funding',
        link: `/dashboard/porteur/mes-projets/${project.id}`,
        metadata: { project_id: project.id, commitment_id: commitment.id },
      }),
      createAppNotificationRow({
        userId: 'usr-admin',
        title: 'Souscription à valider',
        message: `Une souscription de ${input.amount.toLocaleString('fr-FR')} FCFA attend le contrôle contractuel C2P.`,
        type: 'project_funding',
        link: '/admin/operations',
        metadata: { project_id: project.id, commitment_id: commitment.id },
      }),
    ]);
    rows.project_history = appendAppRows('project_history', [withId({
      project_id: project.id,
      date: now,
      user: commitment.partner_name,
      action: `Souscription participative de ${input.amount.toLocaleString('fr-FR')} FCFA en attente de validation`,
      type: 'funding_commitment',
    })]);
    await this.persistence.persistRows(rows, {
      actorId: partner.id,
      reason: 'project-center:funding-commitment:create',
      afterRowsByTable: rows,
    });
    return { commitment: rows.project_funding_commitments[0], simulation };
  }

  async recordPartnerAction(projectId: string, payload: unknown, user: AuthUser | null) {
    const partner = requireProjectPartnerUser(user);
    await syncAppStoreFromDatabase(this.prisma);
    const row = this.requireObject(payload);
    const action = String(row.action ?? '') as PartnerAction;
    if (!PARTNER_ACTIONS.has(action)) throw new BadRequestException('Action partenaire invalide.');
    const project = this.requireOpenProject(projectId);
    const now = new Date().toISOString();
    const actionRow = withId({
      project_id: project.id,
      partner_id: partner.id,
      partner_name: `${partner.firstName} ${partner.lastName}`.trim(),
      action,
      score: action === 'evaluate' && row.score !== undefined ? this.clamp(Number(row.score), 1, 5) : null,
      comment: String(row.comment ?? '').trim() || null,
      status: 'pending_c2p_validation',
      created_at: now,
    });
    const rows: Record<string, Row[]> = {
      project_partner_actions: appendAppRows('project_partner_actions', [actionRow]),
      notifications: appendAppRows('notifications', [createAppNotificationRow({
        userId: String(project.owner_id),
        title: 'Nouvelle proposition partenaire',
        message: `${actionRow.partner_name} souhaite intervenir sur "${project.title}" comme ${this.actionLabel(action)}.`,
        type: 'project_partner_action',
        link: `/dashboard/porteur/mes-projets/${project.id}`,
        metadata: { project_id: project.id, action_id: actionRow.id, action },
      })]),
    };
    await this.persistence.persistRows(rows, {
      actorId: partner.id,
      reason: 'project-center:partner-action:create',
      afterRowsByTable: rows,
    });
    return actionRow;
  }

  async flagOpportunity(payload: unknown, user: AuthUser | null) {
    if (!user || !isAdminRole(user)) throw new BadRequestException('Accès administrateur requis.');
    await syncAppStoreFromDatabase(this.prisma);
    const row = this.requireObject(payload);
    const project = this.requireOpenProject(String(row.projectId ?? ''));
    const partnerId = String(row.partnerId ?? '').trim();
    if (!partnerId) throw new BadRequestException('Partenaire requis.');
    const reason = String(row.reason ?? '').trim() || 'Opportunité sélectionnée par C2P.';
    const flag = withId({ project_id: project.id, partner_id: partnerId, reason, status: 'active', created_at: new Date().toISOString() });
    const rows = {
      project_partner_flags: appendAppRows('project_partner_flags', [flag]),
      notifications: appendAppRows('notifications', [createAppNotificationRow({
        userId: partnerId,
        title: 'Opportunité C2P pour vous',
        message: `${project.title} a été sélectionné pour votre profil. ${reason}`,
        type: 'project_opportunity',
        link: '/dashboard/partenaire/opportunites',
        metadata: { project_id: project.id, flag_id: flag.id },
      })]),
    };
    await this.persistence.persistRows(rows, { actorId: user.id, reason: 'project-center:opportunity:flag', afterRowsByTable: rows });
    return flag;
  }

  private buildSimulation(input: SimulationInput, partner: AuthUser, project: Row) {
    const badge = this.requireFundingBadge(partner);
    const badgeBonus = getPlatformRuleNumber(`project_badge_bonus_${badge}`, badge === 'ndanane' ? 30 : badge === 'djambars' ? 15 : 0);
    const badgeFactor = 1 + badgeBonus / 100;
    const baseAnnualRate = input.fundingType === 'profit_share_loan'
      ? getPlatformRuleNumber('project_profit_share_annual_rate', 12) / 100
      : input.fundingType === 'interest_loan'
        ? getPlatformRuleNumber('project_interest_annual_rate', 8) / 100
        : 0;
    const projectedProfit = input.fundingType === 'profit_share_loan'
      ? Math.round(input.amount * baseAnnualRate * badgeFactor * (input.durationMonths / 12))
      : 0;
    const projectedInterest = input.fundingType === 'interest_loan'
      ? Math.round(input.amount * baseAnnualRate * (input.durationMonths / 12))
      : 0;
    const profitWeightsTotal = input.durationMonths * (input.durationMonths + 1) / 2;
    let remaining = input.amount;
    const principalMonthly = input.fundingType === 'donation' ? 0 : input.amount / input.durationMonths;
    const schedule = Array.from({ length: input.durationMonths }, (_, index) => {
      const openingBalance = Math.max(0, Math.round(remaining));
      const principal = index === input.durationMonths - 1 ? Math.round(remaining) : Math.round(principalMonthly);
      const decliningWeight = input.durationMonths - index;
      const profit = projectedProfit ? Math.round(projectedProfit * decliningWeight / profitWeightsTotal) : 0;
      const interest = projectedInterest ? Math.round(projectedInterest / input.durationMonths) : 0;
      remaining = Math.max(0, remaining - principal);
      return {
        period: index + 1,
        openingBalance,
        principal,
        profit,
        interest,
        payment: principal + profit + interest,
        partnerProfitSharePercent: projectedProfit ? Number(((decliningWeight / profitWeightsTotal) * 100).toFixed(2)) : 0,
        closingBalance: Math.max(0, Math.round(remaining)),
      };
    });
    const totalExpected = input.fundingType === 'donation' ? 0 : input.amount + projectedProfit + projectedInterest;
    return {
      projectId: project.id,
      projectTitle: project.title,
      amount: input.amount,
      durationMonths: input.durationMonths,
      fundingType: input.fundingType,
      partnerBadge: badge,
      projectedProfit,
      projectedInterest,
      projectedReturnRate: input.amount > 0 ? Number((((projectedProfit + projectedInterest) / input.amount) * 100).toFixed(2)) : 0,
      totalExpected,
      schedule,
      guarantee: input.fundingType === 'interest_loan'
        ? 'Garantie soumise à validation C2P et à la convention bancaire. Les cautions solidaires ne constituent pas une garantie automatique.'
        : 'Remboursement et bénéfices soumis au contrat final, aux performances réelles du projet et à la validation C2P.',
      disclaimer: 'Simulation indicative non contractuelle. Aucun rendement ni remboursement n’est garanti avant signature et validation réglementaire.',
    };
  }

  private parseSimulation(payload: unknown): SimulationInput {
    const row = this.requireObject(payload);
    const fundingType = String(row.fundingType ?? '') as FundingKind;
    if (!FUNDING_KINDS.has(fundingType)) throw new BadRequestException('Type de financement invalide.');
    const amount = Number(row.amount);
    const durationMonths = Math.round(Number(row.durationMonths));
    if (!Number.isFinite(amount) || amount < 1000) throw new BadRequestException('Le montant minimum est de 1 000 FCFA.');
    if (!Number.isFinite(durationMonths) || durationMonths < 1 || durationMonths > 60) {
      throw new BadRequestException('La durée doit être comprise entre 1 et 60 mois.');
    }
    return {
      projectId: String(row.projectId ?? ''),
      fundingRoundId: row.fundingRoundId ? String(row.fundingRoundId) : null,
      amount: Math.round(amount),
      durationMonths,
      fundingType,
    };
  }

  private requireOpenProject(projectId: string | number) {
    const project = clone(store.projects ?? []).find((item) => String(item.id) === String(projectId));
    if (!project || ['termine', 'archive', 'rejected'].includes(String(project.status ?? '').toLowerCase())) {
      throw new BadRequestException('Projet indisponible.');
    }
    return project;
  }

  private findBadge(partner: AuthUser): PartnerBadge | null {
    const subscriptionText = clone(store.user_subscriptions ?? [])
      .filter((subscription) => String(subscription.user_id) === partner.id && !['cancelled', 'expired'].includes(String(subscription.status ?? 'active')))
      .map((subscription) => `${subscription.plan_slug ?? ''} ${subscription.plan_name ?? ''}`)
      .join(' ');
    const profileText = `${(partner.skills ?? []).join(' ')} ${subscriptionText}`.toLowerCase();
    if (profileText.includes('ndanane')) return 'ndanane';
    if (profileText.includes('djambars')) return 'djambars';
    if (profileText.includes('nianthio')) return 'nianthio';
    return null;
  }

  private requireFundingBadge(partner: AuthUser): PartnerBadge {
    const skills = (partner.skills ?? []).join(' ').toLowerCase();
    const badge = this.findBadge(partner);
    if (!skills.includes('partenaire financier') && !badge) {
      throw new BadRequestException('Activez le statut partenaire financier avant de souscrire.');
    }
    if (!badge) {
      throw new BadRequestException('Une accréditation Nianthio, Djambars ou Ndanane est requise.');
    }
    return badge;
  }

  private suggestRoles(projectText: string, partnerText: string) {
    const roles: PartnerAction[] = ['evaluate'];
    if (/mentor|formation|strategie|coaching/.test(projectText + partnerText)) roles.push('coach', 'mentor');
    if (/technique|digital|produit|industrie|developpement/.test(projectText + partnerText)) roles.push('technical');
    roles.push('carry');
    return Array.from(new Set(roles));
  }

  private actionLabel(action: PartnerAction) {
    return {
      coach: 'coach',
      mentor: 'mentor',
      evaluate: 'évaluateur',
      carry: 'co-porteur',
      technical: 'partenaire technique',
    }[action];
  }

  private requireObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Payload invalide.');
    return value as Record<string, unknown>;
  }

  private clamp(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
  }
}
