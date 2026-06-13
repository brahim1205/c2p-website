export type MonetizedRole = 'prestataire' | 'formateur';

export interface PublicSubscriptionPlan {
  id: string;
  role: MonetizedRole;
  name: string;
  slug: string;
  price_monthly: number;
  currency: string;
  commission_rate: number;
  priority_matching: string | null;
  analytics_level: string | null;
  support_level: string | null;
  verified_badge: boolean;
  features: string[];
  active: boolean;
}

export const monetizedRoleContent: Record<
  MonetizedRole,
  {
    label: string;
    shortLabel: string;
    summary: string;
    purpose: string;
    unlocks: string[];
    gateLabel: string;
  }
> = {
  prestataire: {
    label: 'Prestataires',
    shortLabel: 'Prestataire',
    summary: 'Publier vos prestations SenPresta, activer les alertes et gagner en visibilité sous pilotage C2P.',
    purpose: 'L’abonnement sert à débloquer la publication de services, les alertes, la visibilité et le niveau de vérification.',
    unlocks: ['Publication des services', 'Alertes et matching C2P', 'Visibilité renforcée et badge selon plan'],
    gateLabel: 'Un plan actif est requis pour publier, recevoir les alertes premium et activer la visibilité SenPresta.',
  },
  formateur: {
    label: 'Formateurs',
    shortLabel: 'Formateur',
    summary: 'Lancer des cours, des classes virtuelles et des evaluations dans l espace numerique.',
    purpose: 'L abonnement sert a gerer votre offre pedagogique et vos outils de suivi avances.',
    unlocks: ['Publication des cours', 'Classes virtuelles', 'Evaluations et analytics'],
    gateLabel: 'Un plan actif est requis pour publier vos formations et piloter vos cohortes.',
  },
};

export const publicAccessRoles = [
  {
    role: 'client',
    label: 'Clients',
    description: 'Aucun abonnement plateforme requis pour chercher un service, publier un besoin, reserver ou payer une prestation.',
  },
  {
    role: 'apprenant',
    label: 'Apprenants',
    description: 'Pas d abonnement C2P requis : vous achetez les cours ou services utiles a la demande.',
  },
  {
    role: 'parent',
    label: 'Parents',
    description: 'Pas de plan public dedie pour l instant. Le suivi parent se rattache au dossier apprenant pilote par C2P.',
  },
  {
    role: 'porteur',
    label: 'Porteurs de projet',
    description: 'La soumission et le classement d’un projet dans Project’Center sont gratuits.',
  },
] as const;

export function isMonetizedRole(role: string | null | undefined): role is MonetizedRole {
  return role === 'prestataire' || role === 'formateur';
}

export function getPlanPeriod(plan: Pick<PublicSubscriptionPlan, 'slug'>) {
  return plan.slug.includes('premium')
    ? { suffix: '/an', label: 'Validité : 1 an' }
    : { suffix: '/mois', label: 'Validité : 1 mois' };
}

export function formatPlanPrice(amount: number, currency = 'XAF', suffix = '/mois') {
  const formattedAmount = new Intl.NumberFormat('fr-SN').format(amount);
  const currencyLabel = currency === 'XAF' ? 'FCFA' : currency;
  return `${formattedAmount} ${currencyLabel}${suffix}`;
}

export function groupPlansByRole(plans: PublicSubscriptionPlan[]) {
  return plans.reduce<Record<MonetizedRole, PublicSubscriptionPlan[]>>(
    (accumulator, plan) => {
      if (plan.role in accumulator) accumulator[plan.role].push(plan);
      return accumulator;
    },
    {
      prestataire: [],
      formateur: [],
    },
  );
}

export function getPriceRangeLabel(plans: PublicSubscriptionPlan[], role: MonetizedRole) {
  const rolePlans = plans.filter((plan) => plan.role === role).sort((left, right) => left.price_monthly - right.price_monthly);
  if (rolePlans.length === 0) {
    return null;
  }

  const lowest = rolePlans[0];
  const highest = rolePlans[rolePlans.length - 1];
  if (lowest.price_monthly === highest.price_monthly) {
    return formatPlanPrice(lowest.price_monthly, lowest.currency);
  }

  return `De ${formatPlanPrice(lowest.price_monthly, lowest.currency)} a ${formatPlanPrice(highest.price_monthly, highest.currency)}`;
}
