import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
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

const inputClass = 'c2p-input block px-4 py-3 text-sm';

export default function RegisterPage() {
  const { success, error } = useToast();
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const userTypes = [
    { id: 'client', title: 'Client / Prestateur', description: 'Rechercher des prestations, publier un besoin et suivre vos demandes', icon: 'ri-user-line' },
    { id: 'prestataire', title: 'Prestataire', description: 'Proposer vos services professionnels', icon: 'ri-briefcase-line' },
    { id: 'formateur', title: 'Formateur', description: 'Creer et dispenser des formations', icon: 'ri-presentation-line' },
    { id: 'apprenant', title: 'Apprenant', description: 'Suivre des formations et developper vos competences', icon: 'ri-graduation-cap-line' },
    { id: 'parent', title: 'Parent', description: 'Suivre les parcours rattaches a votre famille avec C2P', icon: 'ri-parent-line' },
    { id: 'porteur', title: 'Porteur de projet', description: 'Soumettre et developper votre projet', icon: 'ri-lightbulb-line' },
    { id: 'partenaire', title: 'Partenaire', description: 'Intervenir comme partenaire financier ou technique', icon: 'ri-hand-heart-line' },
  ];
  const requestedRole = searchParams.get('role');
  const requestedPlanId = searchParams.get('plan');
  const requestedPlanName = searchParams.get('planName');
  const initialRole = userTypes.some((type) => type.id === requestedRole) ? requestedRole : null;
  const [userType, setUserType] = useState<string | null>(initialRole);
  const [subscriptionPlans, setSubscriptionPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [formData, setFormData] = useState({
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

    const shouldRedirectToPlanActivation = isMonetizedRole(userType) && requestedPlanId && selectedRolePlanSummary?.selectedPlan?.id === requestedPlanId;
    const target = shouldRedirectToPlanActivation
      ? `/dashboard/paiements?plan=${encodeURIComponent(requestedPlanId)}&planName=${encodeURIComponent(selectedRolePlanSummary?.selectedPlan?.name ?? requestedPlanName ?? '')}&planRole=${encodeURIComponent(userType)}`
      : getDashboardPathForRole(userType);
    setTimeout(() => navigate(target), 1200);
  };

  const handleNext = () => {
    if (step === 1 && !userType) {
      error('Type requis', 'Veuillez selectionner un type de compte.');
      return;
    }
    if (step === 1 && userType) {
      setStep(2);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-c2p-bg px-4 py-24 text-c2p-text sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/venture.jpg" alt="" className="h-full w-full object-cover object-center opacity-14" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,241,232,0.96)_0%,rgba(246,241,232,0.92)_48%,rgba(246,241,232,0.78)_100%)]"></div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <BrandLogo
            to="/"
            className="inline-flex items-center justify-center"
            imageClassName="mx-auto h-12 w-auto object-contain"
          />
          <h1 className="mt-5 text-4xl font-semibold text-[#172033] sm:text-5xl">Creer votre compte</h1>
          <p className="mt-3 text-sm leading-7 text-[#5b6778]">Choisissez votre role et accedez a l ecosysteme C2P.</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="flex items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 1 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#7c8698] border border-[#eadfce]'}`}>1</div>
            <span className="ml-2 hidden text-sm font-medium text-[#5b6778] sm:inline">Type de compte</span>
          </div>
            <div className={`h-px w-16 ${step >= 2 ? 'bg-[#d5b46f]' : 'bg-[#d8c8af]'}`}></div>
          <div className="flex items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 2 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#7c8698] border border-[#eadfce]'}`}>2</div>
            <span className="ml-2 hidden text-sm font-medium text-[#5b6778] sm:inline">Informations</span>
          </div>
        </div>

        {step === 1 && (
          <section className="c2p-card rounded-[30px] bg-white/92 p-6 shadow-c2p-lg backdrop-blur sm:p-8">
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Votre acces</p>
              <h2 className="text-2xl font-semibold text-[#172033]">Choisissez votre type de compte</h2>
              <p className="mt-3 text-sm leading-7 text-[#5b6778]">
                Vous pouvez creer le compte sans payer. Les plans publics concernent surtout les prestataires,
                formateurs et porteurs de projet quand ils veulent activer leurs fonctions premium.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setUserType(type.id)}
                  disabled={isLoading}
                  className={`group rounded-[22px] border p-6 text-left transition-all hover:-translate-y-1 ${
                    userType === type.id
                      ? 'border-[#d5b46f] bg-[#d5b46f]/12 shadow-[0_22px_60px_rgba(213,180,111,0.14)]'
                      : 'border-[#eadfce] bg-[#fbf7f1] hover:border-[#d5b46f]/45'
                  }`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${userType === type.id ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#d5b46f] border border-[#eadfce]'} transition-all`}>
                    <i className={`${type.icon} text-xl`}></i>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[#172033]">{type.title}</h3>
                  <p className="text-sm leading-6 text-[#5b6778]">{type.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-[#eadfce] bg-[#fbf7f1] px-5 py-5">
              {selectedRolePlanSummary ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
                        Abonnement requis plus tard
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[#172033]">
                        {selectedRolePlanSummary.content.shortLabel}
                      </h3>
                    </div>
                    <span className="rounded-full border border-[#d5b46f]/30 bg-[#d5b46f]/10 px-3 py-1 text-xs font-semibold text-[#d5b46f]">
                      {selectedRolePlanSummary.priceRange ?? (isLoadingPlans ? 'Chargement des tarifs...' : 'Voir les plans')}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[#5b6778]">
                    {selectedRolePlanSummary.content.gateLabel}
                  </p>
                  {selectedRolePlanSummary.selectedPlan ? (
                    <div className="rounded-2xl border border-[#d5b46f]/30 bg-white px-4 py-4 text-sm text-[#5b6778]">
                      <p className="font-semibold text-[#172033]">{selectedRolePlanSummary.selectedPlan.name}</p>
                      <p className="mt-1">
                        {selectedRolePlanSummary.selectedPlan.price_monthly.toLocaleString('fr-SN')} {selectedRolePlanSummary.selectedPlan.currency === 'XAF' ? 'FCFA' : selectedRolePlanSummary.selectedPlan.currency} / mois
                      </p>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 text-sm leading-6 text-[#5b6778] sm:flex-row sm:items-center sm:justify-between">
                    <span>{selectedRolePlanSummary.content.purpose}</span>
                    <Link to="/tarifs" className="c2p-link font-medium">
                      Voir les plans complets
                    </Link>
                  </div>
                </div>
              ) : userType ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
                    Aucun abonnement mensuel requis
                  </p>
                  <p className="text-sm leading-7 text-[#5b6778]">
                    Ce role peut entrer sur la plateforme sans plan mensuel public. Si vous voulez comparer les
                    abonnements monetises disponibles, consultez la page tarifs.
                  </p>
                  <Link to="/tarifs" className="c2p-link text-sm font-medium">
                    Voir les tarifs C2P
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
                    Besoin de comparer avant de choisir
                  </p>
                  <p className="text-sm leading-7 text-[#5b6778]">
                    La page tarifs explique quels roles ont un abonnement, combien il coute, et a quoi il sert.
                  </p>
                  <Link to="/tarifs" className="c2p-link text-sm font-medium">
                    Consulter les abonnements
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={handleNext} disabled={!userType || isLoading} className="c2p-btn-accent px-9 py-3.5">
                {isLoading ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line mr-2 animate-spin"></i>
                    Traitement...
                  </span>
                ) : (
                  'Continuer'
                )}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="c2p-card mx-auto max-w-3xl rounded-[30px] bg-white/92 p-6 shadow-c2p-lg backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button onClick={() => setStep(1)} disabled={isLoading} className="text-sm text-[#5b6778] transition-colors hover:text-[#b68b3f] disabled:opacity-50">
                <i className="ri-arrow-left-line mr-1"></i>
                Retour
              </button>
              <span className="rounded-full border border-[#d5b46f]/30 bg-[#d5b46f]/10 px-3 py-1 text-xs font-semibold text-[#d5b46f]">
                {userTypes.find((type) => type.id === userType)?.title}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-[#475569]">Prenom</label>
                  <input id="firstName" type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} placeholder="Votre prenom" disabled={isLoading} />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-[#475569]">Nom</label>
                  <input id="lastName" type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} placeholder="Votre nom" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#475569]">Adresse email</label>
                <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="votre@email.com" disabled={isLoading} />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#475569]">Telephone</label>
                <input id="phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+221 7X XXX XX XX" disabled={isLoading} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#475569]">Mot de passe</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#b68b3f]">
                      <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#7c8698]">Minimum 10 caracteres avec majuscule, minuscule, chiffre et caractere special.</p>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#475569]">Confirmer</label>
                  <div className="relative">
                    <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#b68b3f]">
                      <i className={showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-start">
                <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })} className="mt-1 h-4 w-4 cursor-pointer rounded border-[#d8c8af] bg-white text-[#d5b46f] focus:ring-[#d5b46f]" disabled={isLoading} />
                <span className="ml-2 text-sm leading-6 text-[#5b6778]">
                  J&apos;accepte les <Link to="/cgu" className="c2p-link font-medium">conditions d&apos;utilisation</Link> et la <Link to="/confidentialite" className="c2p-link font-medium">politique de confidentialite</Link>
                </span>
              </label>

              <button type="submit" disabled={!formData.acceptTerms || isLoading} className="c2p-btn-accent w-full px-6 py-3.5">
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <i className="ri-loader-4-line mr-2 animate-spin"></i>
                    Creation du compte...
                  </span>
                ) : (
                  'Creer mon compte'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5b6778]">
              Vous avez deja un compte ?{' '}
              <Link to="/auth/login" className="c2p-link font-medium">
                Se connecter
              </Link>
            </p>
          </section>
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
