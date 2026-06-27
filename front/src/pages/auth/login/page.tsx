import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';
import { isBasicEmail } from '@/lib/emailValidation';
import { startSocialAuth } from '@/lib/socialAuth';

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
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/dashboard';

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
    <main className="min-h-dvh bg-[#e8f5d8] px-4 py-6 text-c2p-text sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col justify-center">
        <div className="mb-5 text-center">
          <span className="inline-flex rounded-lg bg-white/85 px-4 py-2 text-lg font-semibold text-[#0f1c35] shadow-sm">
            Se connecter
          </span>
        </div>

        <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_28px_90px_rgba(15,28,53,0.10)] lg:min-h-[620px] lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <section className="p-4 sm:p-7 lg:p-9">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/">
              <img src="/images/brand/c2p-admin-logo.png" alt="C2P" className="h-10 w-auto" />
            </Link>
            <Link to="/auth/register" className="rounded-full border border-[#dbe7ca] px-4 py-2 text-sm font-semibold text-[#0f1c35] hover:bg-[#f7fbef]">
              S&apos;inscrire
            </Link>
          </div>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-3xl font-semibold text-[#0f1c35] sm:text-4xl">Connexion</h1>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">
              Accédez à vos services, formations, projets, messages et paiements C2P.
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

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#d6dbe1]" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">ou</span>
            <span className="h-px flex-1 bg-[#d6dbe1]" />
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => startSocialAuth('google', { returnTo })}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d6dbe1] bg-white px-4 py-3 text-sm font-semibold text-[#0f1c35] transition-colors hover:bg-[#f7f8fc]"
            >
              <i className="ri-google-fill text-lg" />
              Google
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-[#27346b] sm:mt-6">
            Vous n&apos;avez pas de compte ?{' '}
            <Link
              to="/auth/register"
              className="font-semibold text-[#06053a] underline decoration-[#f9c846] decoration-2 underline-offset-4 transition-colors hover:text-[#0f63c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f9c846]"
            >
              Créer un compte
            </Link>
          </p>
        </section>

        <aside className="relative hidden bg-[#f7faf4] p-8 lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(26,154,150,0.13),transparent_28%),radial-gradient(circle_at_80%_74%,rgba(249,200,70,0.22),transparent_30%)]"></div>
          <div className="relative max-w-md text-center">
            <img src="/images/home/numerique.png" alt="Connexion C2P" className="mx-auto h-80 w-full object-contain drop-shadow-[0_24px_45px_rgba(15,28,53,0.14)]" />
            <h2 className="mt-8 text-3xl font-semibold text-[#0f1c35]">Oser rêver et devenir autonome</h2>
            <p className="mt-4 text-sm leading-7 text-[#64748b]">
              Un seul espace pour piloter votre parcours selon votre rôle : client, prestataire, formateur, apprenant, porteur de projet ou partenaire.
            </p>
          </div>
        </aside>
        </div>
      </div>
    </main>
  );
}
