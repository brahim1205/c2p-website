import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/api';
import { ROLE_LABELS, type AuthUser } from '@/lib/roles';
import { isProfileOnboardingComplete, requiresProfileOnboarding } from '@/lib/profileCompletion';
import {
  emptyRoleProfile,
  roleProfileFields,
  splitCommaList,
  type RoleProfileData,
} from '../../register/registerModel';
import { RoleProfileFields } from '../../register/RoleProfileFields';

function inferPartnerType(skills: string[] = []) {
  const joined = skills.join(' ').toLowerCase();
  if (joined.includes('financier')) return 'financier';
  if (joined.includes('technique')) return 'technique';
  return '';
}

function buildInitialProfile(user: AuthUser): RoleProfileData {
  return {
    ...emptyRoleProfile,
    publicTitle: user.publicTitle ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
    skills: (user.skills ?? [])
      .filter((skill) => !skill.toLowerCase().startsWith('partenaire '))
      .join(', '),
    website: user.website ?? '',
    preferredLanguage: user.preferredLanguage ?? '',
    partnerType: user.role === 'partenaire' ? inferPartnerType(user.skills) : '',
  };
}

export default function OnboardingProfilePage() {
  const { user, isLoading, updateUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || (user?.role ? `/dashboard/${user.role}` : '/dashboard');
  const [submitting, setSubmitting] = useState(false);
  const [roleProfile, setRoleProfile] = useState<RoleProfileData>(() => (user ? buildInitialProfile(user) : emptyRoleProfile));

  useEffect(() => {
    if (user) setRoleProfile(buildInitialProfile(user));
  }, [user]);

  const selectedRoleFields = user?.role && requiresProfileOnboarding(user.role) ? roleProfileFields[user.role] : null;
  const selectedUserTypeTitle = user?.role ? ROLE_LABELS[user.role] : undefined;

  const missingRequiredField = useMemo(() => (
    selectedRoleFields?.fields.find((field) => field.required && !roleProfile[field.key].trim()) ?? null
  ), [roleProfile, selectedRoleFields]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!requiresProfileOnboarding(user.role)) return <Navigate to={next} replace />;
  if (isProfileOnboardingComplete(user)) return <Navigate to={next} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (missingRequiredField) {
      error('Information requise', `Veuillez renseigner : ${missingRequiredField.label}.`);
      return;
    }

    const roleSkills = splitCommaList(roleProfile.skills);
    const skills = user.role === 'partenaire' && roleProfile.partnerType
      ? [`Partenaire ${roleProfile.partnerType === 'financier' ? 'financier' : 'technique'}`, ...roleSkills]
      : roleSkills;

    setSubmitting(true);
    try {
      const updatedUser = await apiRequest<AuthUser>(`/auth/profile/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          publicTitle: roleProfile.publicTitle.trim() || undefined,
          location: roleProfile.location.trim() || undefined,
          bio: roleProfile.bio.trim() || undefined,
          website: roleProfile.website.trim() || undefined,
          preferredLanguage: roleProfile.preferredLanguage.trim() || undefined,
          skills,
          publicProfileEnabled: true,
        }),
      });
      updateUser(updatedUser);
      success('Profil complété', 'Votre espace est prêt.');
      navigate(next, { replace: true });
    } catch {
      error('Enregistrement impossible', 'Votre profil n a pas pu être enregistré. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 text-[#0f1c35] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1a9a96]">Bienvenue sur C2P</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Complétez votre profil professionnel</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#64748b]">
            Ces informations sont obligatoires pour ouvrir votre espace {selectedUserTypeTitle?.toLowerCase()} et préparer votre visibilité publique.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#d6dbe1] bg-white p-5 shadow-[0_24px_70px_rgba(15,28,53,0.08)] sm:p-8">
          {selectedRoleFields ? (
            <RoleProfileFields
              roleProfile={roleProfile}
              selectedRoleFields={selectedRoleFields}
              selectedUserTypeTitle={selectedUserTypeTitle}
              userType={user.role}
              isLoading={submitting}
              onRoleProfileChange={setRoleProfile}
            />
          ) : null}

          <button
            type="submit"
            disabled={submitting || Boolean(missingRequiredField)}
            className="mt-7 w-full rounded-xl bg-[#0f1c35] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#17233f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Continuer vers mon espace'}
          </button>
        </form>
      </div>
    </main>
  );
}
