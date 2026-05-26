import type { Role } from './auth.store.js';

export interface RbacRoleDefinition {
  id: string;
  label: string;
  description: string;
}

export interface RbacPermissionDefinition {
  id: string;
  label: string;
  description: string;
}

export const RBAC_ROLE_DEFINITIONS: readonly RbacRoleDefinition[] = [
  { id: 'superadmin', label: 'Super administrateur', description: 'Acces exclusif aux actions sensibles, securite, logs, provider et gouvernance.' },
  { id: 'admin', label: 'Administrateur', description: 'Controle total de la plateforme C2P.' },
  { id: 'client', label: 'Client / Prestateur', description: 'Soumet des besoins de prestation, suit les missions et passe par C2P pour la mise en relation.' },
  { id: 'prestataire', label: 'Prestataire', description: 'Recoit des missions attribuees et gere ses flux financiers.' },
  { id: 'formateur', label: 'Formateur', description: 'Publie et vend des formations supervisees par C2P.' },
  { id: 'apprenant', label: 'Apprenant', description: 'Suit des formations et interagit avec les contenus.' },
  { id: 'parent', label: 'Parent', description: 'Suit la progression des apprenants rattaches et echange avec C2P.' },
  { id: 'porteur', label: 'Porteur de projet', description: 'Structure et suit des projets avec accompagnement C2P.' },
  { id: 'partenaire', label: 'Partenaire', description: 'Suit des projets et collaborations valides par C2P.' },
  { id: 'operator', label: 'Operateur', description: 'Role futur pour operations internes C2P.' },
  { id: 'finance_admin', label: 'Finance admin', description: 'Role futur pour supervision financiere avancee.' },
  { id: 'mentor', label: 'Mentor', description: 'Role futur pour accompagnement projet ou formation.' },
] as const;

export const RBAC_PERMISSION_DEFINITIONS: readonly RbacPermissionDefinition[] = [
  { id: 'users.read', label: 'Lire les utilisateurs', description: 'Consulter la liste des utilisateurs et annuaires internes.' },
  { id: 'users.manage', label: 'Gerer les utilisateurs', description: 'Modifier les profils, statuts et roles utilisateur.' },
  { id: 'communications.manage', label: 'Gerer les communications', description: 'Superviser les campagnes email et SMS de C2P.' },
  { id: 'support.request', label: 'Soumettre un signalement', description: 'Ouvrir une demande ou un signalement vers C2P.' },
  { id: 'support.manage', label: 'Gerer le support', description: 'Traiter les signalements, tickets et formulaires de contact.' },
  { id: 'payments.dexpay.read', label: 'Lire DexPay', description: 'Consulter l etat des integrations DexPay.' },
  { id: 'payments.dexpay.write', label: 'Utiliser DexPay', description: 'Creer ou synchroniser des ordres DexPay.' },
  { id: 'payments.admin.read', label: 'Lire l administration finance', description: 'Consulter les vues et journaux de supervision finance reserves a l administration.' },
  { id: 'payments.admin.write', label: 'Administrer la finance', description: 'Executer les actions d administration finance et provider reservees a l administration.' },
  { id: 'superadmin.sensitive.read', label: 'Lire les surfaces superadmin', description: 'Consulter logs, securite, provider, outbox et autres surfaces sensibles.' },
  { id: 'superadmin.sensitive.write', label: 'Executer les actions superadmin', description: 'Executer les actions sensibles de supervision et de reprise.' },
  { id: 'finance.self_service', label: 'Utiliser les commandes finance', description: 'Executer les commandes self-service de wallet, retrait et comptes de retrait.' },
  { id: 'subscription.self_service', label: 'Utiliser les commandes abonnement', description: 'Activer ou renouveler son abonnement SaaS via les commandes metier.' },
  { id: 'data.admin.read', label: 'Lire les donnees admin', description: 'Consulter les tables et modules reserves a l administration.' },
  { id: 'data.admin.write', label: 'Modifier les donnees admin', description: 'Modifier les tables et modules reserves a l administration.' },
  { id: 'data.provider_catalog.read', label: 'Lire le catalogue prestataire', description: 'Consulter prestataires et services publics.' },
  { id: 'data.provider_catalog.write', label: 'Modifier le catalogue prestataire', description: 'Creer ou modifier les prestations et profils prestataires.' },
  { id: 'data.reviews.read', label: 'Lire les avis', description: 'Consulter les avis et notations prestataires.' },
  { id: 'data.reviews.write', label: 'Modifier les avis', description: 'Publier ou modifier des avis et retours.' },
  { id: 'data.marketplace.read', label: 'Lire les missions', description: 'Consulter demandes, commandes et reservations C2P.' },
  { id: 'data.marketplace.write', label: 'Modifier les missions', description: 'Creer ou mettre a jour les flux marketplace C2P.' },
  { id: 'data.finance.read', label: 'Lire la finance', description: 'Consulter wallets, escrows, retraits et factures.' },
  { id: 'data.finance.write', label: 'Modifier la finance', description: 'Declencher ou mettre a jour les flux financiers internes.' },
  { id: 'data.subscriptions.read', label: 'Lire les abonnements', description: 'Consulter plans et souscriptions SaaS.' },
  { id: 'data.subscriptions.write', label: 'Modifier les abonnements', description: 'Creer ou mettre a jour les souscriptions SaaS.' },
  { id: 'data.learning.read', label: 'Lire les donnees learning', description: 'Consulter cours, lecons, lives, quiz et certifications.' },
  { id: 'data.learning.write', label: 'Modifier les donnees learning', description: 'Creer ou mettre a jour cours, lecons, lives, quiz et certifications.' },
  { id: 'data.messaging.read', label: 'Lire la messagerie', description: 'Consulter conversations et messages.' },
  { id: 'data.messaging.write', label: 'Modifier la messagerie', description: 'Creer ou envoyer des messages et conversations.' },
  { id: 'data.notifications.read', label: 'Lire les notifications', description: 'Consulter les notifications in-app.' },
  { id: 'data.notifications.write', label: 'Modifier les notifications', description: 'Emettre ou mettre a jour les notifications in-app.' },
  { id: 'data.projects.read', label: 'Lire les projets', description: 'Consulter projets, financements et collaborations.' },
  { id: 'data.projects.write', label: 'Modifier les projets', description: 'Creer ou mettre a jour projets, financements et collaborations.' },
] as const;

export const RBAC_ALL_PERMISSION_IDS = RBAC_PERMISSION_DEFINITIONS.map((definition) => definition.id);
const RBAC_ADMIN_PERMISSION_IDS = RBAC_ALL_PERMISSION_IDS.filter((permission) => !permission.startsWith('superadmin.'));

export const RBAC_DEFAULT_ROLE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  superadmin: RBAC_ALL_PERMISSION_IDS,
  admin: RBAC_ADMIN_PERMISSION_IDS,
  client: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'support.request',
    'data.provider_catalog.read',
    'data.reviews.read',
    'data.reviews.write',
    'data.marketplace.read',
    'data.marketplace.write',
    'data.finance.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  prestataire: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'subscription.self_service',
    'data.provider_catalog.read',
    'data.provider_catalog.write',
    'data.reviews.read',
    'data.reviews.write',
    'data.marketplace.read',
    'data.marketplace.write',
    'data.finance.read',
    'data.subscriptions.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  formateur: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'subscription.self_service',
    'data.learning.read',
    'data.learning.write',
    'data.finance.read',
    'data.subscriptions.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  apprenant: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'data.learning.read',
    'data.learning.write',
    'data.finance.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  parent: [
    'support.request',
    'data.learning.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  porteur: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'subscription.self_service',
    'data.projects.read',
    'data.projects.write',
    'data.finance.read',
    'data.subscriptions.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  partenaire: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'finance.self_service',
    'subscription.self_service',
    'data.projects.read',
    'data.projects.write',
    'data.finance.read',
    'data.subscriptions.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
    'data.notifications.write',
  ],
  operator: [
    'support.manage',
    'communications.manage',
    'data.marketplace.read',
    'data.marketplace.write',
    'data.admin.read',
  ],
  finance_admin: [
    'payments.dexpay.read',
    'payments.dexpay.write',
    'payments.admin.read',
    'payments.admin.write',
    'support.manage',
    'data.finance.read',
    'data.finance.write',
    'data.subscriptions.read',
    'data.subscriptions.write',
    'data.admin.read',
  ],
  mentor: [
    'data.projects.read',
    'data.learning.read',
    'data.messaging.read',
    'data.messaging.write',
    'data.notifications.read',
  ],
} as const;

export function getDefaultPermissionsForRole(role: string): readonly string[] {
  return RBAC_DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

export function getDefaultPermissionsForRoles(roles: Iterable<string>) {
  const effective = new Set<string>();
  for (const role of roles) {
    for (const permission of getDefaultPermissionsForRole(role)) {
      effective.add(permission);
    }
  }
  return effective;
}

export function isKnownApplicationRole(role: string): role is Role {
  return ['superadmin', 'admin', 'apprenant', 'formateur', 'prestataire', 'parent', 'porteur', 'partenaire', 'client'].includes(role);
}
