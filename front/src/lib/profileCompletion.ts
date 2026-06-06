import type { AuthUser, UserRole } from './roles';

export const PROFILE_ONBOARDING_ROLES: UserRole[] = ['prestataire', 'formateur', 'partenaire'];

export function requiresProfileOnboarding(role?: string | null): role is 'prestataire' | 'formateur' | 'partenaire' {
  return role === 'prestataire' || role === 'formateur' || role === 'partenaire';
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasSkill(user: AuthUser, expected?: string) {
  const skills = user.skills ?? [];
  if (!expected) return skills.some((skill) => skill.trim().length > 0);
  return skills.some((skill) => skill.toLowerCase().includes(expected.toLowerCase()));
}

export function isProfileOnboardingComplete(user: AuthUser | null | undefined) {
  if (!user || !requiresProfileOnboarding(user.role)) return true;

  if (user.role === 'prestataire') {
    return hasText(user.publicTitle) && hasText(user.location) && hasSkill(user);
  }

  if (user.role === 'formateur') {
    return hasText(user.publicTitle) && hasSkill(user);
  }

  return hasText(user.publicTitle) && hasSkill(user) && (hasSkill(user, 'Partenaire technique') || hasSkill(user, 'Partenaire financier'));
}

export function getProfileOnboardingPath(nextPath: string) {
  const params = new URLSearchParams();
  params.set('next', nextPath || '/dashboard');
  return `/auth/onboarding/profil?${params.toString()}`;
}
