import type { DirectoryUser } from './accountApi';
import { isUserRole, type UserRole } from './roles';

const DIRECT_MESSAGING_PAIRS = new Set([
  'formateur:apprenant',
  'apprenant:formateur',
]);

export function canMessageRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === 'admin' || targetRole === 'admin') {
    return true;
  }

  return DIRECT_MESSAGING_PAIRS.has(`${actorRole}:${targetRole}`);
}

export function canMessageDirectoryUser(actorRole: UserRole, user: Pick<DirectoryUser, 'role'>) {
  return isUserRole(user.role) ? canMessageRole(actorRole, user.role) : false;
}

export function getMessagingAudienceHint(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'Vous pouvez echanger avec tous les comptes de la plateforme.';
    case 'formateur':
      return 'Vous pouvez echanger avec C2P et avec vos apprenants.';
    case 'apprenant':
      return 'Vous pouvez echanger avec C2P et avec vos formateurs.';
    default:
      return 'Vous pouvez echanger uniquement avec l equipe C2P.';
  }
}
