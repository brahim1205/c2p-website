import type { AuthUser, CertificationItem, PaymentSettings, PortfolioItem, SocialLinks } from '@/lib/roles';

export type ProfileFormState = Pick<
  AuthUser,
  'avatar' | 'bio' | 'publicTitle' | 'website' | 'preferredLanguage' | 'languages' | 'skills' | 'introVideo' | 'publicProfileEnabled'
> & {
  socialLinks: SocialLinks;
  certifications: CertificationItem[];
  portfolioItems: PortfolioItem[];
  paymentSettings: PaymentSettings;
};

export interface PublicProfileSnapshot {
  profile: AuthUser;
  courses: Array<{
    students_count?: number;
    revenue?: number;
    completion_rate?: number;
  }>;
}

export function emptyCertification(): CertificationItem {
  return {
    id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    issuer: '',
    year: '',
    credentialUrl: '',
  };
}

export function emptyPortfolioItem(): PortfolioItem {
  return {
    id: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    summary: '',
    image: '',
    url: '',
  };
}

export function buildInitialForm(user?: AuthUser | null): ProfileFormState {
  return {
    avatar: user?.avatar ?? '',
    bio: user?.bio ?? '',
    publicTitle: user?.publicTitle ?? '',
    website: user?.website ?? '',
    preferredLanguage: user?.preferredLanguage ?? 'Francais',
    languages: user?.languages ?? [],
    skills: user?.skills ?? [],
    introVideo: user?.introVideo ?? '',
    publicProfileEnabled: Boolean(user?.publicProfileEnabled),
    socialLinks: user?.socialLinks ?? {},
    certifications: user?.certifications ?? [],
    portfolioItems: user?.portfolioItems ?? [],
    paymentSettings: user?.paymentSettings ?? {},
  };
}

export function getFieldClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
}

export function computePublicProfileStats(courses: PublicProfileSnapshot['courses']) {
  return {
    courses: courses.length,
    students: courses.reduce((sum, course) => sum + Number(course.students_count || 0), 0),
    revenue: courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0),
    completionRate: courses.length
      ? Math.round(courses.reduce((sum, course) => sum + Number(course.completion_rate || 0), 0) / courses.length)
      : 0,
  };
}
