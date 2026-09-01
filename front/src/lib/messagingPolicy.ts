import type { DirectoryUser } from './accountApi';
import { isUserRole, type UserRole } from './roles';

const DIRECT_MESSAGE_ROLE_PAIRS = new Set([
  'apprenant:formateur',
  'parent:formateur',
  'partenaire:porteur',
]);

function pairKey(actorRole: UserRole, targetRole: UserRole) {
  return [actorRole, targetRole].sort().join(':');
}

export function canMessageRole(actorRole: UserRole, targetRole: UserRole) {
  if (
    actorRole === 'admin'
    || actorRole === 'superadmin'
    || targetRole === 'admin'
    || targetRole === 'superadmin'
  ) {
    return true;
  }

  return DIRECT_MESSAGE_ROLE_PAIRS.has(pairKey(actorRole, targetRole));
}

export function canMessageDirectoryUser(actorRole: UserRole, user: Pick<DirectoryUser, 'role'>) {
  return isUserRole(user.role) ? canMessageRole(actorRole, user.role) : false;
}

export function getMessagingAudienceHint(role: UserRole) {
  switch (role) {
    case 'admin':
    case 'superadmin':
      return 'Vous pouvez echanger avec tous les comptes de la plateforme.';
    default:
      return 'Vous pouvez echanger avec les contacts autorises par C2P selon le contexte support, formation ou projet.';
  }
}
