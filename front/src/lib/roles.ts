export type UserRole = 'superadmin' | 'admin' | 'client' | 'prestataire' | 'formateur' | 'apprenant' | 'parent' | 'porteur' | 'partenaire';

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  credentialUrl?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  summary: string;
  image?: string;
  url?: string;
}

export interface PaymentSettings {
  beneficiaryName?: string;
  iban?: string;
  paypal?: string;
  orangeMoney?: string;
  wave?: string;
  freeMoney?: string;
  mtnMoney?: string;
}

export interface UserPreferences {
  language?: string;
  emailNotifications?: boolean;
  productUpdates?: boolean;
  compactMode?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roles?: UserRole[];
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  publicTitle?: string;
  website?: string;
  preferredLanguage?: string;
  languages?: string[];
  skills?: string[];
  socialLinks?: SocialLinks;
  certifications?: CertificationItem[];
  portfolioItems?: PortfolioItem[];
  introVideo?: string;
  publicProfileEnabled?: boolean;
  expertVerified?: boolean;
  onboardingClausesAcceptedAt?: string | null;
  onboardingClausesVersion?: string | null;
  paymentSettings?: PaymentSettings;
  userPreferences?: UserPreferences;
  is2FAEnabled?: boolean;
  createdAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super administrateur',
  admin: 'Administrateur',
  client: 'Client',
  prestataire: 'Prestataire',
  formateur: 'Formateur',
  apprenant: 'Apprenant',
  parent: 'Parent',
  porteur: 'Porteur de projet',
  partenaire: 'Partenaire',
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  superadmin: '/superadmin/dashboard',
  admin: '/admin/dashboard',
  client: '/dashboard/client',
  prestataire: '/dashboard/prestataire',
  formateur: '/dashboard/formateur',
  apprenant: '/dashboard/apprenant',
  parent: '/dashboard/parent',
  porteur: '/dashboard/porteur',
  partenaire: '/dashboard/partenaire',
};

export function isUserRole(role: string): role is UserRole {
  return role in ROLE_DASHBOARD_PATHS;
}
