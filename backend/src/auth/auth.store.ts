import { randomUUID } from 'node:crypto';

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

function buildSafeUserPayload(user: StoredUser, includePaymentSettings: boolean): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    phone: user.phone,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    publicTitle: user.publicTitle,
    website: user.website,
    preferredLanguage: user.preferredLanguage,
    languages: user.languages ?? [],
    skills: user.skills ?? [],
    socialLinks: user.socialLinks ?? {},
    certifications: user.certifications ?? [],
    portfolioItems: user.portfolioItems ?? [],
    introVideo: user.introVideo,
    publicProfileEnabled: Boolean(user.publicProfileEnabled),
    expertVerified: Boolean(user.expertVerified),
    onboardingClausesAcceptedAt: user.onboardingClausesAcceptedAt ?? null,
    onboardingClausesVersion: user.onboardingClausesVersion ?? null,
    userPreferences: user.userPreferences ?? {},
    is2FAEnabled: Boolean(user.is2FAEnabled),
    createdAt: user.createdAt,
    ...(includePaymentSettings ? { paymentSettings: user.paymentSettings ?? {} } : {}),
  };
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

export function isAdminRole(actor: Pick<AuthUser, 'role'> | { role?: string } | null | undefined) {
  return actor?.role === 'admin' || actor?.role === 'superadmin';
}

const LOCAL_AVATAR_POOL = [
  '/images/brand/image1.jpeg',
  '/images/brand/image2.jpeg',
  '/images/brand/image3.jpeg',
  '/images/brand/image5.jpeg',
  '/images/brand/image6.jpeg',
  '/images/brand/image7.jpeg',
  '/images/brand/image8.jpeg',
  '/images/brand/images9.jpeg',
];

function pickSeededImage(seed: string, pool: string[]) {
  const hash = Array.from(seed).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return pool[hash % pool.length];
}

const avatar = (seed: string) => pickSeededImage(seed, LOCAL_AVATAR_POOL);

const DEFAULT_TEST_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Ib10W7lbOfDuhU5wr72pzw$/dnOjZh0+kI0S2UG5hFu3ygmxjKLo6DDmBQqq0ri84o';

const SEEDED_SUPERADMIN_EMAIL = process.env.C2P_SUPERADMIN_EMAIL?.trim().toLowerCase() || 'superadmin@c2p.sn';
const SEEDED_SUPERADMIN_PASSWORD_HASH = process.env.C2P_SUPERADMIN_PASSWORD_HASH?.trim() || DEFAULT_TEST_PASSWORD_HASH;

const users: StoredUser[] = [
  {
    id: 'usr-superadmin',
    email: SEEDED_SUPERADMIN_EMAIL,
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    status: 'active',
    passwordHash: SEEDED_SUPERADMIN_PASSWORD_HASH,
    phone: '+221 77 100 00 01',
    avatar: avatar('superadmin-c2p'),
    bio: 'Super administrateur C2P avec accès aux fonctions sensibles.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [SEEDED_SUPERADMIN_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-admin',
    email: 'admin@c2p.sn',
    firstName: 'Jean',
    lastName: 'Mbarga',
    role: 'admin',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 100 20 30',
    avatar: avatar('admin-jean'),
    bio: 'Administrateur principal de la plateforme C2P.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-apprenant',
    email: 'apprenant@c2p.sn',
    firstName: 'Ibrahim',
    lastName: 'Toure',
    role: 'apprenant',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 210 30 40',
    avatar: avatar('learn-ibrahim'),
    bio: 'Apprenant en marketing et front-end.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-formateur',
    email: 'formateur@c2p.sn',
    firstName: 'Aminata',
    lastName: 'Diop',
    role: 'formateur',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 310 40 50',
    avatar: avatar('trainer-aminata'),
    bio: 'Formatrice en transformation digitale.',
    location: 'Dakar, Senegal',
    publicTitle: 'Experte en marketing digital et produits educatifs',
    website: 'https://c2p.sn/formateurs/aminata-diop',
    preferredLanguage: 'Francais',
    languages: ['Francais', 'Anglais', 'Wolof'],
    skills: ['Marketing digital', 'Growth', 'React', 'Pedagogie produit'],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/aminata-diop-c2p',
      twitter: 'https://x.com/aminatadiop',
      youtube: 'https://youtube.com/@aminatadiopc2p',
    },
    certifications: [
      {
        id: 'cert-google-analytics',
        title: 'Google Analytics Certification',
        issuer: 'Google',
        year: '2025',
        credentialUrl: 'https://skillshop.withgoogle.com/',
      },
      {
        id: 'cert-product-marketing',
        title: 'Product Marketing Leader',
        issuer: 'Product School',
        year: '2024',
        credentialUrl: 'https://productschool.com/',
      },
    ],
    portfolioItems: [
      {
        id: 'portfolio-c2p-growth',
        title: 'Refonte du parcours acquisition C2P',
        summary: 'Nouveau tunnel de conversion et automatisation des relances apprenants.',
        image: '/images/home/academy.jpg',
        url: 'https://c2p.sn',
      },
      {
        id: 'portfolio-react-bootcamp',
        title: 'Bootcamp React intensif',
        summary: 'Programme de 6 semaines avec projets, lives et certification finale.',
        image: '/images/home/precision.jpg',
      },
    ],
    introVideo: '',
    publicProfileEnabled: true,
    expertVerified: true,
    paymentSettings: {
      beneficiaryName: 'Aminata Diop',
      iban: 'SN1200123400567800912345678',
      paypal: 'payments@aminatadiop.sn',
      orangeMoney: '+221773104050',
      wave: '+221773104050',
      freeMoney: '+221763104050',
      mtnMoney: '+237671234567',
    },
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-prestataire',
    email: 'prestataire@c2p.sn',
    firstName: 'Moussa',
    lastName: 'Fall',
    role: 'prestataire',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 410 50 60',
    avatar: avatar('provider-moussa'),
    bio: 'Prestataire batiment et maintenance.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-parent',
    email: 'parent@c2p.sn',
    firstName: 'Khadija',
    lastName: 'Sy',
    role: 'parent',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 490 51 61',
    avatar: avatar('parent-khadija'),
    bio: 'Parent accompagne le suivi d apprentissage de son enfant sur l espace numerique C2P.',
    location: 'Dakar, Senegal',
    publicTitle: 'Parent referent',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-client',
    email: 'client@c2p.sn',
    firstName: 'Awa',
    lastName: 'Ndiaye',
    role: 'client',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 510 60 70',
    avatar: avatar('client-awa'),
    bio: 'Cliente active sur AlloPresta.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-porteur',
    email: 'porteur@c2p.sn',
    firstName: 'Cheikh',
    lastName: 'Ba',
    role: 'porteur',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 610 70 80',
    avatar: avatar('founder-cheikh'),
    bio: 'Porteur du projet AgroLink.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-partenaire',
    email: 'partenaire@c2p.sn',
    firstName: 'Marieme',
    lastName: 'Sarr',
    role: 'partenaire',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 77 710 80 90',
    avatar: avatar('partner-marieme'),
    bio: 'Partenaire investissement et croissance.',
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChangeAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr-extra-001',
    email: 'marie.kamga@email.com',
    firstName: 'Marie',
    lastName: 'Kamga',
    role: 'prestataire',
    status: 'pending',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 70 111 22 33',
    avatar: avatar('extra-marie'),
    location: 'Dakar, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: '2026-04-15',
  },
  {
    id: 'usr-extra-002',
    email: 'aminata.sow@email.com',
    firstName: 'Aminata',
    lastName: 'Sow',
    role: 'prestataire',
    status: 'suspended',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 70 222 33 44',
    avatar: avatar('extra-aminata'),
    location: 'Thies, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: '2026-03-28',
  },
  {
    id: 'usr-extra-003',
    email: 'fatima.diallo@email.com',
    firstName: 'Fatima',
    lastName: 'Diallo',
    role: 'apprenant',
    status: 'active',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 70 333 44 55',
    avatar: avatar('extra-fatima'),
    location: 'Saint-Louis, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: '2026-03-12',
  },
  {
    id: 'usr-extra-004',
    email: 'paul.essomba@email.com',
    firstName: 'Paul',
    lastName: 'Essomba',
    role: 'porteur',
    status: 'pending',
    passwordHash: DEFAULT_TEST_PASSWORD_HASH,
    phone: '+221 70 444 55 66',
    avatar: avatar('extra-paul'),
    location: 'Kaolack, Senegal',
    is2FAEnabled: false,
    backupCodes: [],
    passwordHistory: [DEFAULT_TEST_PASSWORD_HASH],
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: '2026-02-25',
  },
];

const sessions: UserSession[] = [
  { id: 'sess-admin-1', userId: 'usr-admin', device: 'Chrome sur Windows', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-06T11:55:00.000Z', current: true },
  { id: 'sess-admin-2', userId: 'usr-admin', device: 'Safari sur iPhone 14', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-06T09:20:00.000Z', current: false },
  { id: 'sess-client-1', userId: 'usr-client', device: 'Chrome sur MacOS', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-05T18:10:00.000Z', current: true },
  { id: 'sess-prest-1', userId: 'usr-prestataire', device: 'Chrome sur Android', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-05T16:45:00.000Z', current: true },
  { id: 'sess-parent-1', userId: 'usr-parent', device: 'Safari sur iPhone', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-05T12:30:00.000Z', current: true },
  { id: 'sess-porteur-1', userId: 'usr-porteur', device: 'Firefox sur MacOS', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-04T12:00:00.000Z', current: true },
  { id: 'sess-porteur-2', userId: 'usr-porteur', device: 'Safari sur iPad', location: 'Thies, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-03T09:15:00.000Z', current: false },
  { id: 'sess-partner-1', userId: 'usr-partenaire', device: 'Chrome sur Windows', location: 'Dakar, Senegal', ip: 'Adresse masquee', lastActive: '2026-05-05T14:30:00.000Z', current: true },
];

const auditLogs: AuditLog[] = [
  { id: 'audit-1', userId: 'usr-admin', action: 'Connexion reussie', timestamp: '2026-05-06T11:55:00.000Z', ip: 'Adresse masquee', device: 'Chrome sur Windows', status: 'success' },
  { id: 'audit-2', userId: 'usr-admin', action: 'Modification du profil', timestamp: '2026-05-05T16:30:00.000Z', ip: 'Adresse masquee', device: 'Chrome sur Windows', status: 'success' },
  { id: 'audit-3', userId: 'usr-admin', action: 'Tentative de connexion echouee', timestamp: '2026-05-04T22:15:00.000Z', ip: 'Adresse masquee', device: 'Chrome sur Android', status: 'failed' },
  { id: 'audit-4', userId: 'usr-porteur', action: 'Connexion reussie', timestamp: '2026-05-05T14:15:00.000Z', ip: 'Adresse masquee', device: 'Firefox sur MacOS', status: 'success' },
  { id: 'audit-5', userId: 'usr-porteur', action: 'Changement de mot de passe', timestamp: '2026-05-01T08:20:00.000Z', ip: 'Adresse masquee', device: 'Firefox sur MacOS', status: 'success' },
  { id: 'audit-6', userId: 'usr-prestataire', action: 'Connexion reussie', timestamp: '2026-05-05T16:45:00.000Z', ip: 'Adresse masquee', device: 'Chrome sur Android', status: 'success' },
  { id: 'audit-7', userId: 'usr-parent', action: 'Connexion reussie', timestamp: '2026-05-05T12:30:00.000Z', ip: 'Adresse masquee', device: 'Safari sur iPhone', status: 'success' },
];

function randomCode(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function publicUser(user: StoredUser): AuthUser {
  return buildSafeUserPayload(user, false);
}

export function editableProfileUser(user: StoredUser): AuthUser {
  return buildSafeUserPayload(user, true);
}

export function directoryUser(user: StoredUser): DirectoryUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    publicTitle: user.publicTitle,
    expertVerified: Boolean(user.expertVerified),
  };
}

export function publicInstructorProfile(user: StoredUser) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    publicTitle: user.publicTitle,
    website: user.website,
    preferredLanguage: user.preferredLanguage,
    languages: user.languages ?? [],
    skills: user.skills ?? [],
    socialLinks: user.socialLinks ?? {},
    certifications: user.certifications ?? [],
    portfolioItems: user.portfolioItems ?? [],
    introVideo: user.introVideo ?? null,
    publicProfileEnabled: Boolean(user.publicProfileEnabled),
    expertVerified: Boolean(user.expertVerified),
  };
}

export function listUsers() {
  return users.map(publicUser);
}

export function findUserByEmail(email: string) {
  return users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string) {
  return users.find((candidate) => candidate.id === id);
}

export function createUser(payload: Omit<StoredUser, 'id' | 'backupCodes' | 'status' | 'createdAt' | 'avatar' | 'bio' | 'location'> & Partial<Pick<StoredUser, 'avatar' | 'bio' | 'location'>>) {
  const user: StoredUser = {
    id: `usr-${Date.now()}`,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
    backupCodes: [],
    is2FAEnabled: false,
    ...payload,
  };

  users.push(user);
  addAuditLog(user.id, 'Inscription du compte', 'success');
  return user;
}

export function updateUser(id: string, patch: Partial<Omit<StoredUser, 'id'>>) {
  const user = findUserById(id);
  if (!user) return null;
  Object.assign(user, patch);
  return user;
}

export function changePassword(id: string, newPassword: string) {
  const user = findUserById(id);
  if (!user) return null;
  user.password = newPassword;
  addAuditLog(id, 'Changement de mot de passe', 'success');
  return user;
}

export function generateBackupCodes(id: string) {
  const user = findUserById(id);
  if (!user) return [];
  user.backupCodes = Array.from({ length: 8 }, () => randomCode('C2P'));
  return [...user.backupCodes];
}

export function enableTwoFactor(id: string) {
  const user = findUserById(id);
  if (!user) return null;
  user.is2FAEnabled = true;
  if (!user.backupCodes.length) {
    generateBackupCodes(id);
  }
  addAuditLog(id, 'Activation 2FA', 'success');
  return user;
}

export function disableTwoFactor(id: string) {
  const user = findUserById(id);
  if (!user) return null;
  user.is2FAEnabled = false;
  addAuditLog(id, 'Desactivation 2FA', 'success');
  return user;
}

export function getBackupCodes(id: string) {
  return [...(findUserById(id)?.backupCodes ?? [])];
}

export function listSessions(userId: string) {
  return sessions
    .filter((session) => session.userId === userId)
    .sort((left, right) => Date.parse(right.lastActive) - Date.parse(left.lastActive));
}

export function revokeSession(userId: string, sessionId: string) {
  const index = sessions.findIndex((session) => session.userId === userId && session.id === sessionId && !session.current);
  if (index === -1) return false;
  sessions.splice(index, 1);
  addAuditLog(userId, 'Revocation de session', 'success');
  return true;
}

export function revokeOtherSessions(userId: string) {
  const kept = sessions.filter((session) => session.userId !== userId || session.current);
  const removed = sessions.length - kept.length;
  sessions.splice(0, sessions.length, ...kept);
  if (removed > 0) {
    addAuditLog(userId, 'Revocation des autres sessions', 'success');
  }
  return removed;
}

export function listAuditLogs(userId: string) {
  return auditLogs
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

export function addAuditLog(userId: string, action: string, status: AuditStatus, overrides: Partial<Omit<AuditLog, 'id' | 'userId' | 'action' | 'status'>> = {}) {
  const latestSession = listSessions(userId)[0];
  auditLogs.unshift({
    id: `audit-${Date.now()}-${randomUUID()}`,
    userId,
    action,
    status,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    ip: overrides.ip ?? latestSession?.ip ?? '127.0.0.1',
    device: overrides.device ?? latestSession?.device ?? 'Navigateur',
  });
}

export function getInitialUsers() {
  return users.map((user) => ({
    ...user,
    backupCodes: [...user.backupCodes],
  }));
}

export function getInitialSessions() {
  return sessions.map((session) => ({ ...session }));
}

export function getInitialAuditLogs() {
  return auditLogs.map((entry) => ({ ...entry }));
}

export function getInitialRefreshTokens(): RefreshTokenSession[] {
  return [];
}

export function getInitialPendingTwoFactorChallenges(): PendingTwoFactorChallenge[] {
  return [];
}
