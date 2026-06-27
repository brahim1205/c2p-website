import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';
import { fetchPublicSubscriptionPlans } from '@/lib/publicApi';
import {
  getPriceRangeLabel,
  isMonetizedRole,
  monetizedRoleContent,
  type PublicSubscriptionPlan,
} from '@/lib/publicSubscriptions';
import { userTypes } from './registerModel';
import RegisterAccountTypeStep from './RegisterAccountTypeStep';
import RegisterDetailsStep, { type RegisterFormData } from './RegisterDetailsStep';
import RegisterStepIndicator from './RegisterStepIndicator';
import { getProfileOnboardingPath, requiresProfileOnboarding } from '@/lib/profileCompletion';

export default function RegisterPage() {
  const { success, error } = useToast();
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const requestedPlanId = searchParams.get('plan');
  const requestedPlanName = searchParams.get('planName');
  const initialRole = userTypes.some((type) => type.id === requestedRole) ? requestedRole : null;
  const [step, setStep] = useState(initialRole ? 2 : 1);
  const [userType, setUserType] = useState<string | null>(initialRole);
  const [subscriptionPlans, setSubscriptionPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const selectedUserType = userTypes.find((type) => type.id === userType);

  useEffect(() => {
    let isMounted = true;

    void fetchPublicSubscriptionPlans()
      .then((plans) => {
        if (!isMounted) return;
        setSubscriptionPlans(plans);
      })
      .catch(() => {
        if (!isMounted) return;
        setSubscriptionPlans([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedRolePlanSummary = useMemo(() => {
    if (!isMonetizedRole(userType)) {
      return null;
    }
    const selectedPlan = subscriptionPlans.find((plan) => plan.id === requestedPlanId && plan.role === userType) ?? null;
    return {
      content: monetizedRoleContent[userType],
      priceRange: getPriceRangeLabel(subscriptionPlans, userType),
      selectedPlan,
    };
  }, [requestedPlanId, subscriptionPlans, userType]);

  const postProfileTarget = useMemo(() => {
    if (!userType) return '/dashboard';
    const dashboardTarget = getDashboardPathForRole(userType);
    const shouldRedirectToPlanActivation = isMonetizedRole(userType) && requestedPlanId && selectedRolePlanSummary?.selectedPlan?.id === requestedPlanId;
    if (!isMonetizedRole(userType)) return dashboardTarget;
    return shouldRedirectToPlanActivation
      ? `/auth/onboarding/abonnement?next=${encodeURIComponent(dashboardTarget)}&plan=${encodeURIComponent(requestedPlanId)}&planName=${encodeURIComponent(selectedRolePlanSummary?.selectedPlan?.name ?? requestedPlanName ?? '')}&planRole=${encodeURIComponent(userType)}`
      : `/auth/onboarding/clauses?next=${encodeURIComponent(dashboardTarget)}`;
  }, [requestedPlanId, requestedPlanName, selectedRolePlanSummary?.selectedPlan?.id, selectedRolePlanSummary?.selectedPlan?.name, userType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      error('Mots de passe differents', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 10) {
      error('Mot de passe trop court', 'Le mot de passe doit contenir au moins 10 caracteres.');
      return;
    }

    if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
      error('Mot de passe insuffisant', 'Ajoutez au moins une minuscule, une majuscule, un chiffre et un caractere special.');
      return;
    }

    if (!formData.acceptTerms) {
      error('Conditions requises', 'Veuillez accepter les conditions d utilisation.');
      return;
    }

    if (!userType) {
      error('Type requis', 'Veuillez selectionner un type de compte.');
      return;
    }

    const result = await register({
      email: formData.email,
      password: formData.password,
      role: userType,
    });

    if (!result.success) {
      error('Erreur d inscription', result.message || 'Une erreur est survenue.');
      return;
    }

    success('Compte cree', 'Votre compte a ete cree avec succes. Redirection...');

    const target = requiresProfileOnboarding(userType) ? getProfileOnboardingPath(postProfileTarget) : postProfileTarget;
    setTimeout(() => navigate(target), 1200);
  };

  const handleSelectUserType = (selectedType: string) => {
    setUserType(selectedType);
    setStep(2);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  return (
    <main className="min-h-dvh bg-[#e8f5d8] px-4 py-6 text-c2p-text sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col justify-center">
        <div className="mb-5 text-center">
          <span className="inline-flex rounded-lg bg-white/85 px-4 py-2 text-lg font-semibold text-[#0f1c35] shadow-sm">
            S&apos;inscrire
          </span>
        </div>

        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-[0_28px_90px_rgba(15,28,53,0.10)]">
          <section className="min-w-0 p-4 sm:p-7 lg:p-9">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e]">
                <img src="/images/brand/c2p-admin-logo.png" alt="C2P" className="h-9 w-auto" />
              </Link>
              <Link to="/auth/login" className="rounded-full border border-[#dbe7ca] px-4 py-2 text-sm font-semibold text-[#0f1c35] hover:bg-[#f7fbef]">
                Connexion
              </Link>
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-semibold leading-tight text-[#0f1c35] sm:text-4xl">Créer un compte C2P</h1>
              <p className="mt-3 text-sm leading-7 text-[#64748b]">
                Choisissez votre rôle. C2P adapte ensuite les informations demandées selon votre parcours.
              </p>
            </div>

            <RegisterStepIndicator step={step} />

            {step === 1 && (
              <RegisterAccountTypeStep
                isLoading={isLoading}
                isLoadingPlans={isLoadingPlans}
                selectedRolePlanSummary={selectedRolePlanSummary}
                userType={userType}
                onSelectUserType={handleSelectUserType}
              />
            )}

            {step === 2 && (
              <RegisterDetailsStep
                formData={formData}
                isLoading={isLoading}
                selectedUserTypeTitle={selectedUserType?.title}
                selectedUserTypeId={userType}
                socialReturnTo={postProfileTarget}
                showConfirmPassword={showConfirmPassword}
                showPassword={showPassword}
                onBack={() => setStep(1)}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
                onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
