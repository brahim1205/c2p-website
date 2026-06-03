import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const renewsAt = '2027-12-31T23:59:59.000Z';

const plans = [
  {
    id: 'plan-prestataire-premium',
    role: 'prestataire',
    name: 'Prestataire Premium',
    slug: 'prestataire-premium',
    price_monthly: 15000,
    currency: 'XAF',
    commission_rate: 12,
    priority_matching: 'high',
    analytics_level: 'premium',
    support_level: 'vip',
    verified_badge: true,
    features: ['Badge verifie C2P', 'Billet de visibilite premium', 'Priorite matching et support VIP'],
    active: true,
  },
  {
    id: 'plan-formateur-premium',
    role: 'formateur',
    name: 'Formateur Premium',
    slug: 'formateur-premium',
    price_monthly: 20000,
    currency: 'XAF',
    commission_rate: 10,
    priority_matching: 'n/a',
    analytics_level: 'premium',
    support_level: 'vip',
    verified_badge: true,
    features: ['Badge formateur certifie', 'Rapports avances', 'Support lancement cohortes'],
    active: true,
  },
  {
    id: 'plan-porteur-growth',
    role: 'porteur',
    name: 'Porteur Growth',
    slug: 'porteur-growth',
    price_monthly: 25000,
    currency: 'XAF',
    commission_rate: 0,
    priority_matching: 'n/a',
    analytics_level: 'premium',
    support_level: 'vip',
    verified_badge: true,
    features: ['Incubation prioritaire', 'Mentorat renforce', 'Preparation levee de fonds'],
    active: true,
  },
];

const subscriptions = [
  {
    id: 'sub-1001',
    user_id: 'usr-prestataire',
    role: 'prestataire',
    plan_id: 'plan-prestataire-premium',
    plan_name: 'Prestataire Premium',
    status: 'active',
    amount: 15000,
    currency: 'XAF',
    commission_rate: 12,
    auto_renew: true,
    started_at: '2026-04-28T08:10:00.000Z',
    renews_at: renewsAt,
    last_billed_at: '2026-04-28T08:10:00.000Z',
  },
  {
    id: 'sub-1002',
    user_id: 'usr-formateur',
    role: 'formateur',
    plan_id: 'plan-formateur-premium',
    plan_name: 'Formateur Premium',
    status: 'active',
    amount: 20000,
    currency: 'XAF',
    commission_rate: 10,
    auto_renew: true,
    started_at: '2026-04-29T07:20:00.000Z',
    renews_at: renewsAt,
    last_billed_at: '2026-04-29T07:20:00.000Z',
  },
  {
    id: 'sub-1003',
    user_id: 'usr-porteur',
    role: 'porteur',
    plan_id: 'plan-porteur-growth',
    plan_name: 'Porteur Growth',
    status: 'active',
    amount: 25000,
    currency: 'XAF',
    commission_rate: 0,
    auto_renew: false,
    started_at: '2026-04-26T09:55:00.000Z',
    renews_at: renewsAt,
    last_billed_at: '2026-04-26T09:55:00.000Z',
  },
];

function appRowKey(table, rowId) {
  return `${table}::${rowId}`;
}

function toDate(value) {
  return value ? new Date(value) : null;
}

async function upsertAppRow(table, row) {
  const rowId = String(row.id);
  await prisma.appRow.upsert({
    where: { key: appRowKey(table, rowId) },
    create: {
      key: appRowKey(table, rowId),
      table,
      rowId,
      data: row,
    },
    update: {
      data: row,
    },
  });
}

async function upsertPlan(plan) {
  await upsertAppRow('subscription_plans', plan);
  await prisma.subscriptionPlan.upsert({
    where: { id: plan.id },
    create: {
      id: plan.id,
      role: plan.role,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.price_monthly,
      currency: plan.currency,
      commissionRate: plan.commission_rate,
      priorityMatching: plan.priority_matching === 'high',
      analyticsLevel: plan.analytics_level,
      supportLevel: plan.support_level,
      verifiedBadge: plan.verified_badge,
      features: plan.features,
      active: plan.active,
      source: 'app_row',
    },
    update: {
      role: plan.role,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.price_monthly,
      currency: plan.currency,
      commissionRate: plan.commission_rate,
      priorityMatching: plan.priority_matching === 'high',
      analyticsLevel: plan.analytics_level,
      supportLevel: plan.support_level,
      verifiedBadge: plan.verified_badge,
      features: plan.features,
      active: plan.active,
      source: 'app_row',
    },
  });
}

async function upsertSubscription(subscription) {
  await upsertAppRow('user_subscriptions', subscription);
  await prisma.userSubscription.upsert({
    where: { id: subscription.id },
    create: {
      id: subscription.id,
      userId: subscription.user_id,
      role: subscription.role,
      planId: subscription.plan_id,
      planName: subscription.plan_name,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      commissionRate: subscription.commission_rate,
      autoRenew: subscription.auto_renew,
      startedAt: toDate(subscription.started_at),
      renewsAt: toDate(subscription.renews_at),
      lastBilledAt: toDate(subscription.last_billed_at),
      source: 'app_row',
    },
    update: {
      userId: subscription.user_id,
      role: subscription.role,
      planId: subscription.plan_id,
      planName: subscription.plan_name,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      commissionRate: subscription.commission_rate,
      autoRenew: subscription.auto_renew,
      startedAt: toDate(subscription.started_at),
      renewsAt: toDate(subscription.renews_at),
      lastBilledAt: toDate(subscription.last_billed_at),
      endedAt: null,
      source: 'app_row',
    },
  });
}

async function main() {
  for (const plan of plans) {
    await upsertPlan(plan);
  }

  for (const subscription of subscriptions) {
    await upsertSubscription(subscription);
  }

  console.log(JSON.stringify({
    ok: true,
    renewsAt,
    accounts: [
      { email: 'prestataire@c2p.sn', role: 'prestataire', plan: 'Prestataire Premium' },
      { email: 'formateur@c2p.sn', role: 'formateur', plan: 'Formateur Premium' },
      { email: 'porteur@c2p.sn', role: 'porteur', plan: 'Porteur Growth' },
    ],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
