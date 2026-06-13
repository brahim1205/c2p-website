export type Role = 'superadmin' | 'admin' | 'apprenant' | 'formateur' | 'prestataire' | 'parent' | 'porteur' | 'partenaire' | 'client';
export type UserStatus = 'active' | 'pending' | 'suspended';
export type AuditStatus = 'success' | 'failed';

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
  role: Role;
  roles?: Role[];
  status: UserStatus;
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

export interface DirectoryUser {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  publicTitle?: string;
  expertVerified?: boolean;
}

export interface StoredUser extends AuthUser {
  password?: string;
  passwordHash?: string;
  passwordHistory?: string[];
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  lastPasswordChangeAt?: string | null;
  lastLoginAt?: string | null;
  backupCodes: string[];
}

export interface RefreshTokenSession {
  id: string;
  userId: string;
  tokenHash: string;
  sessionId: string;
  expiresAt: string;
  createdAt: string;
  ip: string;
  userAgent: string;
  revokedAt?: string | null;
  replacedById?: string | null;
}

export interface PendingTwoFactorChallenge {
  id: string;
  userId: string;
  codeHash: string;
  purpose?: 'login-2fa' | 'password-reset';
  createdAt: string;
  expiresAt: string;
  attempts: number;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ip: string;
  device: string;
  status: AuditStatus;
}
