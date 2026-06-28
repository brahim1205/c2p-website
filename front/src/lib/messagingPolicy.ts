import type { DirectoryUser } from './accountApi';
import { isUserRole, type UserRole } from './roles';

export function canMessageRole(actorRole: UserRole, targetRole: UserRole) {
  return actorRole !== targetRole || actorRole === 'admin';
}

export function canMessageDirectoryUser(actorRole: UserRole, user: Pick<DirectoryUser, 'role'>) {
  return isUserRole(user.role) ? canMessageRole(actorRole, user.role) : false;
}

export function getMessagingAudienceHint(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'Vous pouvez echanger avec tous les comptes de la plateforme.';
    default:
      return 'Vous pouvez echanger avec les autres acteurs C2P selon vos besoins de service, formation ou projet.';
  }
}
