import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';
import { isBasicEmail } from '@/lib/emailValidation';

const inputClass = 'c2p-input block py-3 pl-10 pr-3 text-sm';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      error('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }

    if (!isBasicEmail(email)) {
      error('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    if (password.length < 6) {
      error('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const result = await login(email, password);

    if (!result.success) {
      error('Erreur de connexion', result.message || 'Une erreur est survenue.');
      return;
    }

    success('Connexion réussie', 'Vous êtes connecté.');
    const target = location.state?.from || getDashboardPathForRole(result.user?.role || 'client');
    setTimeout(() => navigate(target), 800);
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-c2p-bg px-3 pb-3 pt-20 text-c2p-text sm:px-6 sm:pb-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/hero.jpg" alt="" className="h-full w-full object-cover object-center opacity-16" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.96)_0%,rgba(247,248,252,0.90)_48%,rgba(247,248,252,0.78)_100%)]"></div>

      <div className="relative z-10 mx-auto grid h-full max-w-7xl items-center gap-8 lg:grid-cols-[1fr_460px] lg:gap-10">
        <section className="hidden max-w-2xl lg:block">
          <p className="c2p-eyebrow mb-5">Accès sécurisé</p>
          <h1 className="text-5xl font-semibold leading-[0.98] text-[#06053a] xl:text-7xl">
            Retrouvez votre espace de gestion C2P
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#27346b]">
            Connectez-vous pour suivre vos abonnements, missions, formations, projets, paiements et validations dans l&apos;écosystème C2P.
          </p>
          <div className="mt-6">
            <Link
              to="/tarifs"
              className="c2p-link inline-flex items-center gap-2 text-sm font-medium"
            >
              <span>Voir les abonnements publics et leurs tarifs</span>
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#80bfdf] bg-[#80bfdf]">
            {[
              ['7', 'roles'],
              ['Hub', 'C2P'],
              ['RBAC', 'actif'],
            ].map(([value, label]) => (
              <div key={label} className="bg-white p-5 text-center">
                <div className="text-2xl font-semibold text-[#27346b]">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="c2p-panel rounded-[22px] p-4 sm:rounded-[30px] sm:p-7 lg:p-8">
          <div className="mb-4 sm:mb-6">
            <BrandLogo
              to="/"
              className="inline-flex items-center"
              imageClassName="h-9 w-auto object-contain sm:h-12"
            />
            <h2 className="mt-3 text-2xl font-semibold text-[#06053a] sm:mt-5 sm:text-3xl">Connexion</h2>
            <p className="mt-2 hidden text-sm leading-6 text-[#27346b] sm:block">
              Accédez à votre espace C2P selon votre rôle et vos droits. Les tarifs des plans publics restent consultables avant connexion.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#27346b]">Adresse email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"></i>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="votre@email.com" disabled={isLoading} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#27346b]">Mot de passe</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"></i>
                <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                <button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#0c0e3a]">
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <label className="flex cursor-pointer items-center">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-[#5fa6f3] bg-white text-[#27346b] focus:ring-[#27346b]" disabled={isLoading} />
                <span className="ml-2 text-sm text-[#27346b]">Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="c2p-link text-sm font-medium">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="c2p-btn-accent w-full px-6 py-3.5">
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="ri-loader-4-line mr-2 animate-spin"></i>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#27346b] sm:mt-6">
            Vous n&apos;avez pas de compte ?{' '}
            <Link to="/auth/register" className="c2p-link font-medium">
              Créer un compte
            </Link>
          </p>

          <p className="mt-3 hidden text-center text-sm text-[#5fa6f3] sm:block">
            Besoin de comparer les plans avant d&apos;entrer ?{' '}
            <Link to="/tarifs" className="c2p-link font-medium">
              Voir les abonnements
            </Link>
          </p>

          <div className="mt-4 text-center sm:mt-6">
            <Link to="/" className="text-sm text-[#5fa6f3] transition-colors hover:text-[#06053a]">
              <i className="ri-arrow-left-line mr-1"></i>
              Retour à l&apos;accueil
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
