import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { isMonetizedRole, monetizedRoleContent } from '@/lib/publicSubscriptions';
import { markMonetizedClausesAccepted } from '@/lib/onboardingClauses';

export default function OnboardingClausesPage() {
  const { user, isLoading, updateUser } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const role = user?.role;
  const content = isMonetizedRole(role) ? monetizedRoleContent[role] : null;
  const next = searchParams.get('next') || (role ? `/dashboard/${role}` : '/dashboard');

  const clauses = useMemo(() => [
    'Vos donnees de compte, de profil public, d activite, de paiement et d abonnement sont traitees pour fournir les services C2P.',
    'Les actions premium sont conditionnees par un abonnement actif ou par un essai gratuit limite.',
    'Pendant l essai gratuit, certaines fonctions avancees restent limitees : analytics, financement avance, communaute premium et options de visibilite payantes.',
    'Les paiements, factures, commissions et historiques peuvent etre conserves pour les obligations legales, de securite et de support.',
    'Vous pouvez modifier votre profil, gerer vos preferences et demander la suppression de votre compte depuis vos parametres.',
  ], []);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!content) return <Navigate to={next} replace />;

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      const updatedUser = await markMonetizedClausesAccepted();
      updateUser(updatedUser);
      const targetParams = new URLSearchParams(searchParams);
      targetParams.set('next', next);
      navigate(`/auth/onboarding/abonnement?${targetParams.toString()}`);
    } catch {
      error('Validation impossible', 'Les clauses n ont pas pu etre enregistrees. Reessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#e8f5d8] px-3 py-3 text-[#0f1c35] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[900px] items-center justify-center">
        <section className="w-full rounded-[18px] border border-[#d6dbe1] bg-white px-6 py-5 shadow-[0_24px_70px_rgba(15,28,53,0.10)] sm:px-8 sm:py-6">
          <div className="mb-6">
            <div className="flex max-w-[270px] gap-1.5" aria-hidden="true">
              {Array.from({ length: 4 }, (_, item) => (
                <span key={item} className={`h-1.5 flex-1 rounded-full ${item < 3 ? 'bg-[#4d7f16]' : 'bg-[#e2e8f0]'}`} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#64748b]">
              <span className="rounded-full bg-[#e8f5d8] px-2.5 py-1 text-[#4d7f16]">Étape 3/4</span>
              <span>Clauses {content.shortLabel.toLowerCase()}</span>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1a9a96]">Avant l abonnement</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-[34px]">Clauses de confidentialité et d usage</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748b]">
            Votre compte {content.shortLabel.toLowerCase()} utilise des fonctions professionnelles. Lisez et acceptez ces clauses avant de choisir un plan ou un essai gratuit.
          </p>

          <div className="mt-5 rounded-2xl border border-[#d6dbe1] bg-[#f7f8fc] p-5">
            <h2 className="text-lg font-bold">Ce que vous acceptez</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-6 text-[#475569]">
              {clauses.map((clause) => (
                <li key={clause} className="flex gap-3">
                  <i className="ri-check-line mt-0.5 text-[#1a9a96]" />
                  <span>{clause}</span>
                </li>
              ))}
            </ul>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d6dbe1] bg-white p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#d6dbe1] text-[#1a9a96] focus:ring-[#1a9a96]"
            />
            <span className="text-sm leading-6 text-[#475569]">
              J accepte les clauses de confidentialité, les conditions d utilisation et les limites de l essai gratuit applicables à mon rôle.
            </span>
          </label>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link to="/confidentialite" className="rounded-xl border border-[#d6dbe1] px-5 py-3 text-center text-sm font-medium text-[#475569] hover:bg-[#f7f8fc]">
              Lire la politique complète
            </Link>
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!accepted || submitting}
              className="rounded-xl bg-[#0f1c35] px-6 py-3 text-sm font-semibold text-white hover:bg-[#17233f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Validation...' : 'Continuer vers les abonnements'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
