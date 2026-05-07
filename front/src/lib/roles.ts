export type UserRole = 'admin' | 'client' | 'prestataire' | 'formateur' | 'apprenant' | 'porteur' | 'partenaire';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  is2FAEnabled?: boolean;
  createdAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  client: 'Client',
  prestataire: 'Prestataire',
  formateur: 'Formateur',
  apprenant: 'Apprenant',
  porteur: 'Porteur de projet',
  partenaire: 'Partenaire',
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  client: '/dashboard/client',
  prestataire: '/dashboard/prestataire',
  formateur: '/dashboard/formateur',
  apprenant: '/dashboard/apprenant',
  porteur: '/dashboard/porteur',
  partenaire: '/dashboard/partenaire',
};

export function isUserRole(role: string): role is UserRole {
  return role in ROLE_DASHBOARD_PATHS;
}
