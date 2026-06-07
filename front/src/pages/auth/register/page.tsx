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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
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
    <main className="relative min-h-screen overflow-hidden bg-c2p-bg px-3 py-8 text-c2p-text sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="absolute inset-0">
        <img src="/images/home/venture.jpg" alt="" className="h-full w-full object-cover object-center opacity-14" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,241,232,0.96)_0%,rgba(246,241,232,0.92)_48%,rgba(246,241,232,0.78)_100%)]"></div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-7 text-center sm:mb-10">
          <h1 className="text-3xl font-semibold text-[#172033] sm:text-5xl">Creer votre compte</h1>
          <p className="mt-3 text-sm leading-7 text-[#5b6778]">Choisissez votre role et accedez a l ecosysteme C2P.</p>
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

        <div className="mt-7 text-center">
          <Link to="/" className="text-sm text-[#7c8698] transition-colors hover:text-[#172033]">
            <i className="ri-arrow-left-line mr-1"></i>
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
