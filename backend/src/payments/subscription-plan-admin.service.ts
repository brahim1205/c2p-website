import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, SubscriptionPlan } from '@prisma/client';
import { AuditLogService } from '../database/audit-log.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../auth/auth.store.js';
import { mapSubscriptionPlan } from './finance-read.mappers.js';

type PlanPayload = {
  role?: string;
  name?: string;
  slug?: string;
  price_monthly?: number;
  currency?: string;
  commission_rate?: number;
  duration_value?: number;
  duration_unit?: string;
  promotional?: boolean;
  description?: string;
  features?: string[];
  verified_badge?: boolean;
  active?: boolean;
};

const ALLOWED_ROLES = new Set(['prestataire', 'formateur', 'partenaire']);
const ALLOWED_DURATION_UNITS = new Set(['jour', 'mois', 'an', 'ponctuel']);

const DEFAULT_PARTNER_PLANS: PlanPayload[] = [
  {
    role: 'partenaire',
    name: 'Partenaire Pro',
    slug: 'partenaire-pro',
    price_monthly: 5000,
    duration_value: 1,
    duration_unit: 'mois',
    promotional: true,
    description: 'Partenaire vérifié en partenariat avec C2P et éligible à rémunération.',
    features: ['Badge partenaire vérifié', 'Partenariat formalisé avec C2P', 'Éligibilité à rémunération'],
    verified_badge: true,
    active: true,
  },
  {
    role: 'partenaire',
    name: 'Nianthio',
    slug: 'partenaire-nianthio',
    price_monthly: 2500,
    duration_value: 1,
    duration_unit: 'ponctuel',
    description: 'Appui libre permettant de contribuer à tout projet.',
    features: ['Accréditation financement solidaire', 'Contribution libre aux projets', 'Caution solidaire'],
    active: true,
  },
  {
    role: 'partenaire',
    name: 'Djambars',
    slug: 'partenaire-djambars',
    price_monthly: 5000,
    duration_value: 1,
    duration_unit: 'ponctuel',
    description: 'Appui de niveau 2 avec davantage de suivi et de convention.',
    features: ['Suivi renforcé', 'Convention de contribution', 'Dividendes selon le niveau de placement'],
    active: true,
  },
  {
    role: 'partenaire',
    name: 'Ndanane',
    slug: 'partenaire-ndanane',
    price_monthly: 10000,
    duration_value: 1,
    duration_unit: 'ponctuel',
    description: 'Niveau 3 avec avantages et taux de dividendes renforcés.',
    features: ['Niveau partenaire supérieur', 'Suivi prioritaire', 'Taux de dividendes renforcé'],
    active: true,
  },
];

@Injectable()
export class SubscriptionPlanAdminService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit() {
    if (!this.prisma.isConnected) return;
    const existingPlans = await this.prisma.subscriptionPlan.findMany();
    for (const plan of existingPlans) {
      const metadata = plan.metadata && typeof plan.metadata === 'object' && !Array.isArray(plan.metadata)
        ? plan.metadata as Record<string, unknown>
        : {};
      if (metadata.duration_unit && metadata.duration_value) continue;
      const isPremium = plan.slug.includes('premium');
      const patched = await this.prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          metadata: {
            ...metadata,
            duration_value: 1,
            duration_unit: isPremium ? 'an' : 'mois',
            promotional: true,
            description: String(metadata.description ?? ''),
            features: Array.isArray(metadata.features) ? metadata.features : [],
          },
        },
      });
      await this.persistAppRow(patched);
    }
    for (const plan of DEFAULT_PARTNER_PLANS) {
      const existing = await this.prisma.subscriptionPlan.findFirst({ where: { slug: String(plan.slug) } });
      if (!existing) await this.createInternal(plan, null);
    }
  }

  async listAll() {
    const rows = await this.prisma.subscriptionPlan.findMany({
      orderBy: [{ role: 'asc' }, { priceMonthly: 'asc' }],
    });
    return rows.map(mapSubscriptionPlan);
  }

  async create(payload: PlanPayload, actor: AuthUser) {
    return this.createInternal(payload, actor);
  }

  async update(id: string, payload: PlanPayload, actor: AuthUser) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan introuvable.');
    const normalized = this.normalize(payload, mapSubscriptionPlan(existing));
    const row = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: this.toPrismaData(normalized),
    });
    await this.persistAppRow(row);
    await this.audit(actor, 'update', row.id, mapSubscriptionPlan(existing), mapSubscriptionPlan(row));
    return mapSubscriptionPlan(row);
  }

  async remove(id: string, actor: AuthUser) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan introuvable.');
    const row = await this.prisma.subscriptionPlan.update({ where: { id }, data: { active: false } });
    await this.persistAppRow(row);
    await this.audit(actor, 'deactivate', row.id, mapSubscriptionPlan(existing), mapSubscriptionPlan(row));
    return mapSubscriptionPlan(row);
  }

  private async createInternal(payload: PlanPayload, actor: AuthUser | null) {
    const normalized = this.normalize(payload);
    const row = await this.prisma.subscriptionPlan.create({
      data: {
        id: `plan-${randomUUID()}`,
        ...this.toPrismaData(normalized),
        source: actor ? 'superadmin' : 'bootstrap',
      },
    });
    await this.persistAppRow(row);
    if (actor) await this.audit(actor, 'create', row.id, null, mapSubscriptionPlan(row));
    return mapSubscriptionPlan(row);
  }

  private normalize(payload: PlanPayload, fallback: Record<string, unknown> = {}) {
    const role = String(payload.role ?? fallback.role ?? '').trim();
    const name = String(payload.name ?? fallback.name ?? '').trim();
    const slug = this.slugify(String(payload.slug ?? fallback.slug ?? name));
    const price = Number(payload.price_monthly ?? fallback.price_monthly ?? 0);
    const commission = Number(payload.commission_rate ?? fallback.commission_rate ?? 0);
    const durationValue = Number(payload.duration_value ?? fallback.duration_value ?? 1);
    const durationUnit = String(payload.duration_unit ?? fallback.duration_unit ?? 'mois').trim();
    if (!ALLOWED_ROLES.has(role)) throw new BadRequestException('Role de plan invalide.');
    if (!name || !slug) throw new BadRequestException('Nom et identifiant du plan requis.');
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Prix invalide.');
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) throw new BadRequestException('Commission invalide.');
    if (!Number.isFinite(durationValue) || durationValue <= 0) throw new BadRequestException('Duree invalide.');
    if (!ALLOWED_DURATION_UNITS.has(durationUnit)) throw new BadRequestException('Unite de duree invalide.');
    return {
      role,
      name,
      slug,
      price_monthly: Math.round(price),
      currency: String(payload.currency ?? fallback.currency ?? 'XAF').trim() || 'XAF',
      commission_rate: commission,
      duration_value: Math.round(durationValue),
      duration_unit: durationUnit,
      promotional: Boolean(payload.promotional ?? fallback.promotional ?? false),
      description: String(payload.description ?? fallback.description ?? '').trim(),
      features: Array.isArray(payload.features)
        ? payload.features.map(String).map((item) => item.trim()).filter(Boolean)
        : Array.isArray(fallback.features) ? fallback.features : [],
      verified_badge: Boolean(payload.verified_badge ?? fallback.verified_badge ?? false),
      active: Boolean(payload.active ?? fallback.active ?? true),
    };
  }

  private toPrismaData(plan: ReturnType<SubscriptionPlanAdminService['normalize']>) {
    return {
      role: plan.role,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.price_monthly,
      currency: plan.currency,
      commissionRate: plan.commission_rate,
      verifiedBadge: plan.verified_badge,
      features: plan.features,
      active: plan.active,
      metadata: plan,
    };
  }

  private async persistAppRow(row: SubscriptionPlan) {
    const mapped = mapSubscriptionPlan(row);
    await this.prisma.appRow.upsert({
      where: { key: `subscription_plans::${row.id}` },
      update: { data: mapped as Prisma.InputJsonValue },
      create: {
        key: `subscription_plans::${row.id}`,
        table: 'subscription_plans',
        rowId: row.id,
        data: mapped as Prisma.InputJsonValue,
      },
    });
  }

  private audit(actor: AuthUser, action: string, id: string, before: unknown, after: unknown) {
    return this.auditLogService.record({
      scope: 'subscription_plans',
      action,
      userId: actor.id,
      targetType: 'subscription_plan',
      targetId: id,
      before: before as Record<string, unknown> | null,
      after: after as Record<string, unknown> | null,
    });
  }

  private slugify(value: string) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
