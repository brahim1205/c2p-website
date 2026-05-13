import type { SubscriptionPlan, UserSubscription } from './saasApi';
import type { UserRole } from './roles';

export type SubscriptionGuardAction =
  | 'provider_services_manage'
  | 'trainer_courses_manage'
  | 'trainer_live_classes_manage'
  | 'trainer_assessments_manage'
  | 'trainer_analytics_view'
  | 'trainer_community_manage'
  | 'project_submit'
  | 'project_manage'
  | 'project_funding_manage';

export interface SubscriptionGateDecision {
  required: boolean;
  allowed: boolean;
  role: UserRole | null;
  action: SubscriptionGuardAction;
  reason: 'not_applicable' | 'active_subscription' | 'missing_subscription' | 'renewal_required' | 'unsupported_role';
  title: string;
  message: string;
  ctaLabel: string;
  recommendedPlanId: string | null;
  recommendedPlanName: string | null;
}

const SUPPORTED_SUBSCRIPTION_ROLES = new Set<UserRole>(['prestataire', 'formateur', 'porteur']);

function getRecommendedPlan(plans: SubscriptionPlan[]) {
  if (plans.length === 0) {
    return null;
  }
  return [...plans].sort((left, right) => Number(left.price_monthly || 0) - Number(right.price_monthly || 0))[0] ?? null;
}

export function getActiveSubscription(subscriptions: UserSubscription[]) {
  return subscriptions.find((entry) => entry.status === 'active') ?? null;
}

export function isSubscriptionManagedRole(role: UserRole | null | undefined) {
  return role ? SUPPORTED_SUBSCRIPTION_ROLES.has(role) : false;
}

function getCopy(role: UserRole, action: SubscriptionGuardAction, recommendedPlanName: string | null) {
  const actionCopy: Record<SubscriptionGuardAction, { title: string; message: string }> = {
    provider_services_manage: {
      title: 'Abonnement prestataire requis',
      message: 'Activez un plan prestataire pour publier, modifier ou réactiver vos services sur C2P.',
    },
    trainer_courses_manage: {
      title: 'Abonnement formateur requis',
      message: 'Activez un plan formateur pour créer, modifier ou publier vos formations.',
    },
    trainer_live_classes_manage: {
      title: 'Plan formateur requis',
      message: 'Les classes virtuelles sont réservées aux formateurs avec un abonnement actif.',
    },
    trainer_assessments_manage: {
      title: 'Plan formateur requis',
      message: 'Les évaluations et quiz nécessitent un abonnement formateur actif.',
    },
    trainer_analytics_view: {
      title: 'Plan formateur requis',
      message: 'Les analytics pédagogiques sont disponibles avec un abonnement formateur actif.',
    },
    trainer_community_manage: {
      title: 'Plan formateur requis',
      message: 'La gestion de communauté et des FAQ de cours nécessite un abonnement formateur actif.',
    },
    project_submit: {
      title: 'Abonnement porteur requis',
      message: 'Activez un plan porteur pour soumettre un projet à l’incubation C2P.',
    },
    project_manage: {
      title: 'Abonnement porteur requis',
      message: 'La gestion avancée des projets incubés nécessite un abonnement porteur actif.',
    },
    project_funding_manage: {
      title: 'Plan porteur requis',
      message: 'Les levées de fonds et leur suivi sont réservés aux porteurs avec un abonnement actif.',
    },
  };

  const ctaLabel = recommendedPlanName
    ? `Activer ${recommendedPlanName}`
    : role === 'prestataire'
      ? 'Choisir un plan prestataire'
      : role === 'formateur'
        ? 'Choisir un plan formateur'
        : 'Choisir un plan porteur';

  return {
    ...actionCopy[action],
    ctaLabel,
  };
}

export function resolveSubscriptionGate(input: {
  role: UserRole | null | undefined;
  action: SubscriptionGuardAction;
  subscriptions: UserSubscription[];
  plans: SubscriptionPlan[];
}) : SubscriptionGateDecision {
  const role = input.role ?? null;
  const activeSubscription = getActiveSubscription(input.subscriptions);
  const latestSubscription = input.subscriptions[0] ?? null;
  const recommendedPlan = getRecommendedPlan(input.plans);

  if (!role || !SUPPORTED_SUBSCRIPTION_ROLES.has(role)) {
    return {
      required: false,
      allowed: true,
      role,
      action: input.action,
      reason: role === 'partenaire' ? 'unsupported_role' : 'not_applicable',
      title: role === 'partenaire' ? 'Abonnements partenaire indisponibles' : 'Accès autorisé',
      message: role === 'partenaire'
        ? 'Les abonnements partenaire ne sont pas encore ouverts dans cette version.'
        : 'Cette action ne nécessite pas d’abonnement SaaS.',
      ctaLabel: 'Voir les paiements',
      recommendedPlanId: null,
      recommendedPlanName: null,
    };
  }

  if (activeSubscription) {
    return {
      required: true,
      allowed: true,
      role,
      action: input.action,
      reason: 'active_subscription',
      title: 'Accès autorisé',
      message: `Votre plan ${activeSubscription.plan_name} est actif.`,
      ctaLabel: 'Gérer mon abonnement',
      recommendedPlanId: activeSubscription.plan_id ?? null,
      recommendedPlanName: activeSubscription.plan_name ?? null,
    };
  }

  const expiredLike = latestSubscription && ['past_due', 'expired'].includes(String(latestSubscription.status));
  const copy = getCopy(role, input.action, recommendedPlan?.name ?? null);

  return {
    required: true,
    allowed: false,
    role,
    action: input.action,
    reason: expiredLike ? 'renewal_required' : 'missing_subscription',
    title: copy.title,
    message: expiredLike
      ? `${copy.message} Votre dernier abonnement doit être renouvelé avant de continuer.`
      : copy.message,
    ctaLabel: copy.ctaLabel,
    recommendedPlanId: recommendedPlan?.id ?? null,
    recommendedPlanName: recommendedPlan?.name ?? null,
  };
}
