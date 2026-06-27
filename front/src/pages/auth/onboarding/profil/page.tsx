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
  if (joined.includes('financier') && joined.includes('technique')) return 'technique_financier';
  if (joined.includes('financier')) return 'financier';
  if (joined.includes('technique')) return 'technique';
  return '';
}

function inferPartnerBadge(skills: string[] = []) {
  const joined = skills.join(' ').toLowerCase();
  return ['nianthio', 'djambars', 'ndanane'].find((badge) => joined.includes(badge)) ?? '';
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
    partnerBadge: user.role === 'partenaire' ? inferPartnerBadge(user.skills) : '',
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
    const partnerTypeSkills = roleProfile.partnerType === 'technique_financier'
      ? ['Partenaire technique', 'Partenaire financier']
      : roleProfile.partnerType
        ? [`Partenaire ${roleProfile.partnerType}`]
        : [];
    const skills = user.role === 'partenaire'
      ? [
          ...partnerTypeSkills,
          ...(roleProfile.partnerBadge ? [`Badge partenaire ${roleProfile.partnerBadge}`] : []),
          ...roleSkills,
        ]
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
    <main className="min-h-dvh bg-[#e8f5d8] px-4 py-6 text-[#0f1c35] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col justify-center">
        <div className="mb-5 text-center">
          <span className="inline-flex rounded-lg bg-white/85 px-4 py-2 text-lg font-semibold text-[#0f1c35] shadow-sm">
            Question d&apos;intégration - {selectedUserTypeTitle}
          </span>
        </div>

        <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_28px_90px_rgba(15,28,53,0.10)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <section className="min-w-0 p-4 sm:p-7 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:p-9 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <div className="mb-7">
              <img src="/images/brand/c2p-admin-logo.png" alt="C2P" className="h-10 w-auto" />
              <div className="mt-7 flex gap-2" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <span key={item} className={`h-1.5 flex-1 rounded-full ${item < 4 ? 'bg-[#4d7f16]' : 'bg-[#e2e8f0]'}`} />
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-[#64748b]">Profil {selectedUserTypeTitle?.toLowerCase()} personnalisé</p>
            </div>

            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1a9a96]">Bienvenue sur C2P</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Complétez les informations utiles à votre rôle
              </h1>
              <p className="mt-4 text-sm leading-7 text-[#64748b]">
                Ces données préparent votre espace {selectedUserTypeTitle?.toLowerCase()} et votre visibilité selon le parcours choisi.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
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
                className="mt-7 w-full rounded-xl bg-[#4d7f16] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(77,127,22,0.22)] hover:bg-[#3f6812] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : 'Continuer vers mon espace'}
              </button>
            </form>
          </section>

          <aside className="relative hidden bg-[#f7faf4] p-8 lg:flex lg:items-center lg:justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(77,127,22,0.12),transparent_28%),radial-gradient(circle_at_78%_72%,rgba(249,200,70,0.22),transparent_30%)]"></div>
            <div className="relative max-w-md text-center">
              <img src="/images/home/pesta.png" alt="Parcours C2P" className="mx-auto h-80 w-full object-contain drop-shadow-[0_24px_45px_rgba(15,28,53,0.14)]" />
              <h2 className="mt-8 text-3xl font-semibold text-[#0f1c35]">Un parcours adapté à chaque utilisateur</h2>
              <p className="mt-4 text-sm leading-7 text-[#64748b]">
                Les informations demandées changent selon le rôle : prestation, formation, apprentissage, projet ou partenariat.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
