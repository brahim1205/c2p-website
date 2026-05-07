import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRole } from '@/hooks/useAuth';

const inputClass =
  'block w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#d5b46f] focus:ring-2 focus:ring-[#d5b46f]/20 disabled:opacity-60';

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    if (password.length < 6) {
      error('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    const result = await login(email, password);

    if (!result.success) {
      error('Erreur de connexion', result.message || 'Une erreur est survenue.');
      return;
    }

    if (result.requires2FA) {
      success('Code 2FA requis', 'Veuillez saisir le code de verification.');
      navigate('/auth/two-factor', { state: { from: location.state?.from } });
      return;
    }

    success('Connexion reussie', 'Vous etes connecte. Redirection en cours...');
    const target = location.state?.from || getDashboardPathForRole(result.user?.role || 'client');
    setTimeout(() => navigate(target), 800);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0b] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/hero.jpg" alt="" className="h-full w-full object-cover object-center opacity-25" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.96)_0%,rgba(7,7,7,0.86)_48%,rgba(7,7,7,0.72)_100%)]"></div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1fr_460px]">
        <section className="hidden max-w-2xl lg:block">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">Acces securise</p>
          <h1 className="text-5xl font-semibold leading-[0.98] text-white xl:text-7xl">
            Retrouvez votre espace professionnel C2P
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/62">
            Connectez-vous pour gerer vos formations, prestations, projets, demandes et tableaux de bord selon votre role.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12">
            {[
              ['7', 'roles'],
              ['Backend', 'C2P'],
              ['2FA', 'pret'],
            ].map(([value, label]) => (
              <div key={label} className="bg-black/30 p-5 text-center">
                <div className="text-2xl font-semibold text-[#d5b46f]">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <div className="mb-8">
            <Link to="/" className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d5b46f]">
              Centre C2P
            </Link>
            <h2 className="mt-5 text-3xl font-semibold text-white">Connexion</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">Accedez a votre espace personnel.</p>
          </div>

          <div className="mb-6 rounded-2xl border border-[#d5b46f]/20 bg-[#d5b46f]/10 p-4">
            <p className="mb-3 text-xs text-[#f1d58c]">
              <i className="ri-information-line mr-1"></i>
              Comptes de demo - mot de passe : <strong>password123</strong>
            </p>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-white/62">
              <span>admin@c2p.sn</span>
              <span>prestataire@c2p.sn</span>
              <span>formateur@c2p.sn</span>
              <span>apprenant@c2p.sn</span>
              <span>porteur@c2p.sn</span>
              <span>partenaire@c2p.sn</span>
              <span className="col-span-2 text-center">client@c2p.sn</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/72">Adresse email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-white/38"></i>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="votre@email.com" disabled={isLoading} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/72">Mot de passe</label>
              <div className="relative">
                <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-white/38"></i>
                <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/38 transition-colors hover:text-[#d5b46f]">
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black text-[#d5b46f] focus:ring-[#d5b46f]" disabled={isLoading} />
                <span className="ml-2 text-sm text-white/62">Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-[#d5b46f] hover:text-white">
                Mot de passe oublie ?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="w-full rounded-full bg-[#d5b46f] px-6 py-3.5 text-sm font-semibold text-[#111] transition-all hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45">
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

          <p className="mt-6 text-center text-sm text-white/58">
            Vous n&apos;avez pas de compte ?{' '}
            <Link to="/auth/register" className="font-medium text-[#d5b46f] hover:text-white">
              Creer un compte
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-white/45 transition-colors hover:text-[#d5b46f]">
              <i className="ri-arrow-left-line mr-1"></i>
              Retour a l&apos;accueil
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
