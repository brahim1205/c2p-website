import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { useToast } from '@/hooks/useToast';
import { apiRequest, toApiError } from '@/lib/api';

const inputClass =
  'block w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#d5b46f] focus:ring-2 focus:ring-[#d5b46f]/20 disabled:opacity-60';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      error('Email requis', 'Veuillez renseigner votre adresse email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      error('Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      success('Code envoye', 'Si un compte existe, un code de verification a ete envoye.');
      navigate('/auth/two-factor', {
        state: {
          mode: 'password-reset',
          email: normalizedEmail,
        },
      });
    } catch (requestError) {
      const apiError = toApiError(requestError);
      error('Demande impossible', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0b] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img src="/images/home/trust.jpg" alt="" className="h-full w-full object-cover object-center opacity-24" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.97)_0%,rgba(7,7,7,0.88)_48%,rgba(7,7,7,0.72)_100%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(213,180,111,0.18),transparent_28%),radial-gradient(circle_at_82%_62%,rgba(255,255,255,0.08),transparent_28%)]"></div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1fr_460px]">
        <section className="hidden max-w-2xl lg:block">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">Recuperation securisee</p>
          <h1 className="text-5xl font-semibold leading-[0.98] text-white xl:text-7xl">
            Reprenez l&apos;acces a votre espace C2P.
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/62">
            Un code SMS protege maintenant la reinitialisation du mot de passe avant le retour a vos prestations, formations ou projets.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12">
            {[
              ['SMS', 'verification'],
              ['Code', 'securise'],
              ['Acces', 'restaure'],
            ].map(([value, label]) => (
              <div key={label} className="bg-black/30 p-5 text-center">
                <div className="text-xl font-semibold text-[#d5b46f]">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <div className="mb-8">
            <BrandLogo
              to="/"
              className="inline-flex items-center"
              imageClassName="h-12 w-auto object-contain"
            />
            <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d5b46f]/25 bg-[#d5b46f]/10 text-[#d5b46f]">
              <i className="ri-lock-password-line text-2xl"></i>
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-white">Mot de passe oublie</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Saisissez l&apos;email associe a votre compte. Si le profil existe, un code SMS sera envoye sur le numero lie au compte.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/72">Adresse email</label>
              <div className="relative">
                <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-white/38"></i>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="votre@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#d5b46f] px-6 py-3.5 text-sm font-semibold text-[#111] transition-all hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="ri-loader-4-line mr-2 animate-spin"></i>
                  Envoi en cours...
                </span>
              ) : (
                'Recevoir le code'
              )}
            </button>
          </form>

          <div className="mt-7 grid gap-3 text-center text-sm">
            <Link to="/auth/login" className="font-medium text-[#d5b46f] transition-colors hover:text-white">
              Retour a la connexion
            </Link>
            <Link to="/auth/register" className="text-white/45 transition-colors hover:text-[#d5b46f]">
              Creer un compte
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
