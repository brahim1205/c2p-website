import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/api';
import { ROLE_LABELS, type AuthUser, type UserRole } from '@/lib/roles';
import { isProfileOnboardingComplete, requiresProfileOnboarding } from '@/lib/profileCompletion';
import { isMonetizedRole } from '@/lib/publicSubscriptions';
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
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
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

function getProfileStepMeta(role: AuthUser['role'], isDetailsStep: boolean) {
  if (role === 'client') {
    return { current: 1, total: 1 };
  }
  if (isMonetizedRole(role)) {
    return { current: isDetailsStep ? 2 : 1, total: 4 };
  }
  return { current: isDetailsStep ? 2 : 1, total: 2 };
}

function getOnboardingIllustration(role: UserRole) {
  const illustrations: Partial<Record<UserRole, string>> = {
    client: '/images/home/svg/undraw_share-location_28ap.svg',
    prestataire: '/images/home/svg/undraw_work-time_1ogn.svg',
    formateur: '/images/home/svg/undraw_creative-designer_sctu.svg',
    apprenant: '/images/home/svg/undraw_thinking-mode_7czd.svg',
    porteur: '/images/home/svg/undraw_puzzle-solved_qdjq.svg',
    partenaire: '/images/home/svg/undraw_contract_ynau.svg',
  };
  return illustrations[role] ?? '/images/home/svg/undraw_user-feedback_5fp8.svg';
}

function getAfterProfilePath(role: UserRole, next: string) {
  if (!isMonetizedRole(role)) return next;
  if (next.startsWith('/auth/onboarding/clauses')) return next;

  const params = new URLSearchParams();
  if (next.startsWith('/auth/onboarding/abonnement')) {
    const subscriptionUrl = new URL(next, window.location.origin);
    subscriptionUrl.searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    params.set('next', subscriptionUrl.searchParams.get('next') || `/dashboard/${role}`);
  } else {
    params.set('next', next || `/dashboard/${role}`);
  }

  return `/auth/onboarding/clauses?${params.toString()}`;
}

export default function OnboardingProfilePage() {
  const { user, isLoading, updateUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || (user?.role ? `/dashboard/${user.role}` : '/dashboard');
  const [submitting, setSubmitting] = useState(false);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showGenericDetails, setShowGenericDetails] = useState(false);
  const [roleProfile, setRoleProfile] = useState<RoleProfileData>(() => (user ? buildInitialProfile(user) : emptyRoleProfile));

  useEffect(() => {
    if (user) setRoleProfile(buildInitialProfile(user));
  }, [user]);

  const selectedRoleFields = user?.role && requiresProfileOnboarding(user.role) ? roleProfileFields[user.role] : null;
  const onboardingRoleFields = useMemo(() => {
    if (!selectedRoleFields) return null;
    if (user?.role === 'partenaire') {
      return {
        ...selectedRoleFields,
        fields: selectedRoleFields.fields.filter((field) => (
          showPartnerDetails ? field.key !== 'partnerType' : field.key === 'partnerType'
        )),
      };
    }
    return selectedRoleFields;
  }, [selectedRoleFields, showPartnerDetails, user?.role]);
  const selectedUserTypeTitle = user?.role ? ROLE_LABELS[user.role] : undefined;
  const isClientOnboarding = user?.role === 'client';
  const isProviderOnboarding = user?.role === 'prestataire';
  const isPartnerOnboarding = user?.role === 'partenaire';
  const hasGenericDetailsStep = Boolean(user?.role && !isClientOnboarding && !isProviderOnboarding && !isPartnerOnboarding);
  const isProviderBasicStep = isProviderOnboarding && !showProviderDetails;
  const isProviderDetailsStep = isProviderOnboarding && showProviderDetails;
  const isPartnerBasicStep = isPartnerOnboarding && !showPartnerDetails;
  const isPartnerDetailsStep = isPartnerOnboarding && showPartnerDetails;
  const isGenericBasicStep = hasGenericDetailsStep && !showGenericDetails;
  const isGenericDetailsStep = hasGenericDetailsStep && showGenericDetails;
  const isDetailsStep = isProviderDetailsStep || isPartnerDetailsStep || isGenericDetailsStep;
  const stepMeta = getProfileStepMeta(user.role, isDetailsStep);
  const illustrationSrc = getOnboardingIllustration(user.role);

  const missingRequiredField = useMemo(() => (
    !roleProfile.firstName.trim()
      ? { label: 'Prénom' }
      : !roleProfile.lastName.trim()
        ? { label: 'Nom' }
        : isProviderBasicStep || isGenericBasicStep
          ? null
        : onboardingRoleFields?.fields.find((field) => field.required && !roleProfile[field.key].trim()) ?? null
  ), [isProviderBasicStep, isGenericBasicStep, roleProfile, onboardingRoleFields]);

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
    if (isProviderBasicStep) {
      setShowProviderDetails(true);
      return;
    }
    if (isGenericBasicStep) {
      setShowGenericDetails(true);
      return;
    }
    if (isPartnerBasicStep) {
      setShowPartnerDetails(true);
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
          firstName: roleProfile.firstName.trim(),
          lastName: roleProfile.lastName.trim(),
          phone: roleProfile.phone.trim() || undefined,
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
      navigate(getAfterProfilePath(user.role, next), { replace: true });
    } catch {
      error('Enregistrement impossible', 'Votre profil n a pas pu être enregistré. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#e8f5d8] px-3 py-3 text-[#0f1c35] sm:px-6">
      <style>{onboardingScrollbarStyles}</style>
      <div className="mx-auto flex h-[calc(100dvh-1.5rem)] max-w-[1080px] items-center justify-center">
        <div className="grid h-full w-full overflow-hidden rounded-[10px] bg-white shadow-[0_24px_70px_rgba(15,28,53,0.10)] lg:grid-cols-2">
          <section className="onboarding-scrollbar h-full min-w-0 overflow-y-scroll overscroll-contain px-6 py-5 sm:px-10 sm:py-6 lg:px-12">
            <img src="/images/brand/c2p-admin-logo.png" alt="C2P" className="h-9 w-auto" />

            <div className="mt-8">
              <div className="flex max-w-[270px] gap-1.5" aria-hidden="true">
                {Array.from({ length: stepMeta.total }, (_, item) => (
                  <span key={item} className={`h-1.5 flex-1 rounded-full ${item < stepMeta.current ? 'bg-[#4d7f16]' : 'bg-[#e2e8f0]'}`} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#64748b]">
                <span className="rounded-full bg-[#e8f5d8] px-2.5 py-1 text-[#4d7f16]">Étape {stepMeta.current}/{stepMeta.total}</span>
                <span>Profil {selectedUserTypeTitle?.toLowerCase()}</span>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-sm font-medium text-[#64748b]">Tell us</p>
              <h1 className="mt-4 max-w-md text-3xl font-black leading-tight text-[#172033] sm:text-[34px]">
                {isClientOnboarding
                  ? 'What is your preferred location?'
                  : isProviderDetailsStep
                    ? 'Complétez votre profil prestataire'
                  : isPartnerDetailsStep
                    ? 'Complétez votre profil partenaire'
                  : isGenericDetailsStep
                    ? `Complétez votre profil ${selectedUserTypeTitle?.toLowerCase()}`
                    : `Préparez votre espace ${selectedUserTypeTitle?.toLowerCase()}`}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#64748b]">
                {isClientOnboarding
                  ? 'Cette information permet de proposer les services proches de vous.'
                  : isProviderDetailsStep
                    ? 'Ajoutez les informations visibles sur votre profil public AlloPresta.'
                  : isPartnerDetailsStep
                    ? 'Ajoutez les informations utiles à votre visibilité et à votre accompagnement des projets.'
                  : isGenericDetailsStep
                    ? 'Ajoutez les informations utiles pour personnaliser votre espace et votre visibilité.'
                    : 'Quelques informations suffisent pour personnaliser votre tableau de bord C2P.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              {!isPartnerDetailsStep && !isProviderDetailsStep && !isGenericDetailsStep ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OnboardingInput
                      id="onboarding-first-name"
                      label="Prénom *"
                      value={roleProfile.firstName}
                      placeholder="Votre prénom"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, firstName: value }))}
                    />
                    <OnboardingInput
                      id="onboarding-last-name"
                      label="Nom *"
                      value={roleProfile.lastName}
                      placeholder="Votre nom"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, lastName: value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OnboardingInput
                      id="onboarding-phone"
                      label="Téléphone"
                      value={roleProfile.phone}
                      placeholder="+221 7X XXX XX XX"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, phone: value }))}
                    />
                    {isPartnerOnboarding ? (
                      <OnboardingSelect
                        id="onboarding-partner-type"
                        label="Type de partenaire *"
                        value={roleProfile.partnerType}
                        placeholder="Choisir un type"
                        disabled={submitting}
                        options={selectedRoleFields?.fields.find((field) => field.key === 'partnerType')?.options ?? []}
                        onChange={(value) => setRoleProfile((current) => ({ ...current, partnerType: value }))}
                      />
                    ) : null}
                    {isClientOnboarding ? (
                      <OnboardingInput
                        id="onboarding-location"
                        label="Localisation *"
                        value={roleProfile.location}
                        placeholder="Ex: Dakar, Senegal"
                        disabled={submitting}
                        onChange={(value) => setRoleProfile((current) => ({ ...current, location: value }))}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {isProviderDetailsStep ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OnboardingInput
                      id="onboarding-provider-title"
                      label="Metier principal *"
                      value={roleProfile.publicTitle}
                      placeholder="Ex: Electricien batiment"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, publicTitle: value }))}
                    />
                    <OnboardingInput
                      id="onboarding-provider-location"
                      label="Zone d intervention *"
                      value={roleProfile.location}
                      placeholder="Ex: Dakar, Thies, Rufisque"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, location: value }))}
                    />
                  </div>
                  <OnboardingInput
                    id="onboarding-provider-services"
                    label="Services proposes *"
                    value={roleProfile.skills}
                    placeholder="Installation electrique, depannage, maintenance"
                    disabled={submitting}
                    onChange={(value) => setRoleProfile((current) => ({ ...current, skills: value }))}
                  />
                </div>
              ) : null}

              {isPartnerDetailsStep ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OnboardingSelect
                      id="onboarding-partner-badge"
                      label="Badge financier souhaité"
                      value={roleProfile.partnerBadge}
                      placeholder="Facultatif pour un partenaire technique"
                      disabled={submitting}
                      required={false}
                      options={selectedRoleFields?.fields.find((field) => field.key === 'partnerBadge')?.options ?? []}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, partnerBadge: value }))}
                    />
                    <OnboardingInput
                      id="onboarding-partner-title"
                      label="Organisation ou fonction *"
                      value={roleProfile.publicTitle}
                      placeholder="Ex: Mentor produit, partenaire financier"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, publicTitle: value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OnboardingInput
                      id="onboarding-partner-skills"
                      label="Expertises *"
                      value={roleProfile.skills}
                      placeholder="Financement, mentorat, technique"
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, skills: value }))}
                    />
                    <OnboardingInput
                      id="onboarding-partner-website"
                      label="Site ou page publique"
                      value={roleProfile.website}
                      placeholder="https://..."
                      disabled={submitting}
                      onChange={(value) => setRoleProfile((current) => ({ ...current, website: value }))}
                    />
                  </div>
                  <OnboardingTextarea
                    id="onboarding-partner-bio"
                    label="Type d'accompagnement"
                    value={roleProfile.bio}
                    placeholder="Expliquez comment vous pouvez accompagner les projets."
                    disabled={submitting}
                    onChange={(value) => setRoleProfile((current) => ({ ...current, bio: value }))}
                  />
                </div>
              ) : null}

              {onboardingRoleFields && isGenericDetailsStep ? (
                <RoleProfileFields
                  roleProfile={roleProfile}
                  selectedRoleFields={onboardingRoleFields}
                  selectedUserTypeTitle={selectedUserTypeTitle}
                  userType={user.role}
                  isLoading={submitting}
                  onRoleProfileChange={setRoleProfile}
                  compact
                  compactFieldMode="required"
                />
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {isDetailsStep ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setShowPartnerDetails(false);
                      setShowProviderDetails(false);
                      setShowGenericDetails(false);
                    }}
                    className="inline-flex rounded-lg border border-[#d9dee8] bg-white px-6 py-3 text-sm font-bold text-[#172033] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retour
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting || Boolean(missingRequiredField)}
                  className="inline-flex rounded-lg bg-[#62c800] px-8 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(98,200,0,0.28)] hover:bg-[#51a900] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : isDetailsStep && isMonetizedRole(user.role) ? 'Continuer vers les clauses' : isDetailsStep ? 'Terminer mon profil' : 'Continuer'}
                </button>
              </div>
            </form>
          </section>

          <aside className="hidden h-full min-h-0 items-center justify-center bg-[#f7f8fa] px-8 lg:flex">
            <img
              src={illustrationSrc}
              alt=""
              className="h-auto max-h-[72dvh] w-full max-w-[430px]"
              loading="eager"
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function OnboardingSelect({
  id,
  label,
  value,
  placeholder,
  disabled,
  options,
  required = true,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  options: { value: string; label: string }[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#334155]">{label}</label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-md border border-[#d9dee8] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#62c800] focus:ring-4 focus:ring-[#62c800]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function OnboardingTextarea({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#334155]">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block min-h-[92px] w-full resize-none rounded-md border border-[#d9dee8] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#62c800] focus:ring-4 focus:ring-[#62c800]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function OnboardingInput({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#334155]">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-md border border-[#d9dee8] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#62c800] focus:ring-4 focus:ring-[#62c800]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

const onboardingScrollbarStyles = `
  .onboarding-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #4d7f16 #edf4e4;
    scrollbar-gutter: stable;
  }
  .onboarding-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .onboarding-scrollbar::-webkit-scrollbar-track {
    background: #edf4e4;
    border-radius: 999px;
  }
  .onboarding-scrollbar::-webkit-scrollbar-thumb {
    background: #4d7f16;
    border: 2px solid #edf4e4;
    border-radius: 999px;
  }
  .onboarding-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #3f6812;
  }
`;
