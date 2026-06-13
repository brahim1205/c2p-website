import { ForbiddenException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import { store } from './data-app-store.js';

export function getUserActiveSubscription(userId: string) {
  return (store.user_subscriptions ?? []).find(
    (entry) => String(entry.user_id) === String(userId) && String(entry.status) === 'active',
  ) ?? null;
}

const SUBSCRIPTION_REQUIRED_WRITE_TABLES: Record<string, ReadonlySet<string>> = {
  prestataire: new Set(['provider_services']),
  formateur: new Set([
    'courses',
    'course_sections',
    'course_lessons',
    'lesson_assets',
    'virtual_classes',
    'exams',
    'quiz_questions',
    'quiz_choices',
    'course_faq_items',
  ]),
};

export function assertSubscriptionRequiredForWrite(
  table: string,
  user: AuthUser,
  getDefaultPlanForRole: (role: string) => Row | null,
) {
  if (isAdminRole(user)) {
    return;
  }

  if (user.role === 'formateur' && (table === 'lesson_comments' || table === 'submissions')) {
    if (getUserActiveSubscription(user.id)) {
      return;
    }

    throw new ForbiddenException(
      'Un abonnement formateur actif est requis pour gérer la communauté et corriger les évaluations.',
    );
  }

  const restrictedTables = SUBSCRIPTION_REQUIRED_WRITE_TABLES[user.role];
  if (!restrictedTables || !restrictedTables.has(table)) {
    return;
  }

  if (getUserActiveSubscription(user.id)) {
    return;
  }

  const defaultPlan = getDefaultPlanForRole(user.role);
  const actionLabel = user.role === 'prestataire'
    ? 'publier ou gérer vos services'
    : user.role === 'formateur'
      ? 'gérer vos formations et classes'
      : 'gérer vos activités';

  throw new ForbiddenException(
    defaultPlan
      ? `Un abonnement actif est requis pour ${actionLabel}. Activez au moins le plan ${String(defaultPlan.name ?? 'de base')}.`
      : `Un abonnement actif est requis pour ${actionLabel}.`,
  );
}
