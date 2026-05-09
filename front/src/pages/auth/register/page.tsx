import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';

const inputClass =
  'block w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#d5b46f] focus:ring-2 focus:ring-[#d5b46f]/20 disabled:opacity-60';

export default function RegisterPage() {
  const { success, error } = useToast();
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<string | null>(null);
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

  const userTypes = [
    { id: 'client', title: 'Client', description: 'Rechercher des prestations et formations', icon: 'ri-user-line' },
    { id: 'prestataire', title: 'Prestataire', description: 'Proposer vos services professionnels', icon: 'ri-briefcase-line' },
    { id: 'formateur', title: 'Formateur', description: 'Creer et dispenser des formations', icon: 'ri-presentation-line' },
    { id: 'apprenant', title: 'Apprenant', description: 'Suivre des formations et developper vos competences', icon: 'ri-graduation-cap-line' },
    { id: 'porteur', title: 'Porteur de projet', description: 'Soumettre et developper votre projet', icon: 'ri-lightbulb-line' },
    { id: 'partenaire', title: 'Partenaire', description: 'Financer ou accompagner des projets', icon: 'ri-hand-heart-line' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      error('Mots de passe differents', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 6) {
      error('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caracteres.');
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

    const target = getDashboardPathForRole(userType);
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
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0b] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/venture.jpg" alt="" className="h-full w-full object-cover object-center opacity-24" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.96)_0%,rgba(7,7,7,0.88)_48%,rgba(7,7,7,0.74)_100%)]"></div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <BrandLogo
            to="/"
            className="inline-flex items-center justify-center"
            imageClassName="mx-auto h-12 w-auto object-contain"
          />
          <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">Creer votre compte</h1>
          <p className="mt-3 text-sm leading-7 text-white/58">Choisissez votre role et accedez a l ecosysteme C2P.</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="flex items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 1 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white/10 text-white/45'}`}>1</div>
            <span className="ml-2 hidden text-sm font-medium text-white/62 sm:inline">Type de compte</span>
          </div>
          <div className={`h-px w-16 ${step >= 2 ? 'bg-[#d5b46f]' : 'bg-white/15'}`}></div>
          <div className="flex items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 2 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white/10 text-white/45'}`}>2</div>
            <span className="ml-2 hidden text-sm font-medium text-white/62 sm:inline">Informations</span>
          </div>
        </div>

        {step === 1 && (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Votre acces</p>
              <h2 className="text-2xl font-semibold text-white">Choisissez votre type de compte</h2>
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
                      : 'border-white/10 bg-black/20 hover:border-[#d5b46f]/45'
                  }`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${userType === type.id ? 'bg-[#d5b46f] text-[#111]' : 'bg-white/[0.06] text-[#d5b46f]'} transition-all`}>
                    <i className={`${type.icon} text-xl`}></i>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{type.title}</h3>
                  <p className="text-sm leading-6 text-white/55">{type.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={handleNext} disabled={!userType || isLoading} className="rounded-full bg-[#d5b46f] px-9 py-3.5 text-sm font-semibold text-[#111] transition-all hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45">
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
          <section className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button onClick={() => setStep(1)} disabled={isLoading} className="text-sm text-white/55 transition-colors hover:text-[#d5b46f] disabled:opacity-50">
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
                  <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-white/72">Prenom</label>
                  <input id="firstName" type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} placeholder="Votre prenom" disabled={isLoading} />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-white/72">Nom</label>
                  <input id="lastName" type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} placeholder="Votre nom" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/72">Adresse email</label>
                <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="votre@email.com" disabled={isLoading} />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-white/72">Telephone</label>
                <input id="phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+221 7X XXX XX XX" disabled={isLoading} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/72">Mot de passe</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/38 transition-colors hover:text-[#d5b46f]">
                      <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-white/72">Confirmer</label>
                  <div className="relative">
                    <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/38 transition-colors hover:text-[#d5b46f]">
                      <i className={showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-start">
                <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })} className="mt-1 h-4 w-4 cursor-pointer rounded border-white/20 bg-black text-[#d5b46f] focus:ring-[#d5b46f]" disabled={isLoading} />
                <span className="ml-2 text-sm leading-6 text-white/62">
                  J&apos;accepte les <Link to="/legal/terms" className="font-medium text-[#d5b46f] hover:text-white">conditions d&apos;utilisation</Link> et la <Link to="/legal/privacy" className="font-medium text-[#d5b46f] hover:text-white">politique de confidentialite</Link>
                </span>
              </label>

              <button type="submit" disabled={!formData.acceptTerms || isLoading} className="w-full rounded-full bg-[#d5b46f] px-6 py-3.5 text-sm font-semibold text-[#111] transition-all hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45">
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

            <p className="mt-6 text-center text-sm text-white/58">
              Vous avez deja un compte ?{' '}
              <Link to="/auth/login" className="font-medium text-[#d5b46f] hover:text-white">
                Se connecter
              </Link>
            </p>
          </section>
        )}

        <div className="mt-7 text-center">
          <Link to="/" className="text-sm text-white/45 transition-colors hover:text-[#d5b46f]">
            <i className="ri-arrow-left-line mr-1"></i>
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
