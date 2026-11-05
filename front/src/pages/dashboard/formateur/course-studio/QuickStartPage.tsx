import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { createFormateurCourseDraft } from '@/lib/formateurDashboardApi';
import type { FormateurCourseDeliveryMode } from '@/lib/formateurDashboardTypes';
import { queryKeys } from '@/lib/queryKeys';
import { ChoiceCard } from './StudioFields';
import { STUDIO_CATEGORIES, STUDIO_DELIVERY_MODES, TITLE_MAX, readErrorMessage, studioPath } from './studioModel';

const STEPS = [
  { title: 'Quel type de cours allez-vous créer ?', hint: 'Vous pourrez changer ce choix plus tard.' },
  { title: 'Quel est le titre provisoire de votre cours ?', hint: 'Pas d’inquiétude si vous n’avez pas encore le titre parfait : vous pourrez le modifier.' },
  { title: 'Quelle catégorie correspond le mieux au sujet de votre cours ?', hint: 'Elle détermine où les apprenants trouveront votre cours dans le catalogue.' },
];

export default function QuickStartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { gateFor } = useSubscriptionAccess(user);
  const gate = gateFor('trainer_courses_manage');
  const [step, setStep] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<FormateurCourseDeliveryMode | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Créer une formation · C2P';
  }, []);

  const canContinue = step === 0 ? Boolean(deliveryMode) : step === 1 ? title.trim().length >= 3 : Boolean(category);
  const isLast = step === STEPS.length - 1;

  const create = async () => {
    if (!deliveryMode || !category || !gate.allowed) return;
    setCreating(true);
    setFailure(null);
    try {
      const course = await createFormateurCourseDraft({ title, category, delivery_mode: deliveryMode });
      await queryClient.invalidateQueries({ queryKey: queryKeys.formateur.root(user?.id) });
      navigate(studioPath(course.id, 'objectifs'), { replace: true });
    } catch (reason) {
      setFailure(readErrorMessage(reason, 'Impossible de créer la formation. Réessayez.'));
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-c2p-bg">
      <header className="border-b border-c2p-border bg-c2p-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm font-bold text-c2p-text">Étape {step + 1} sur {STEPS.length}</p>
          <Link to="/dashboard/formateur/mes-cours" className="text-sm font-semibold text-c2p-muted hover:text-c2p-text">Quitter</Link>
        </div>
        <div className="h-1 bg-c2p-surface-muted">
          <div className="h-full bg-c2p-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <SubscriptionRequiredBanner gate={gate} />
        <h1 className="text-center text-2xl font-bold text-c2p-text sm:text-3xl">{STEPS[step].title}</h1>
        <p className="mt-3 text-center text-sm text-c2p-muted">{STEPS[step].hint}</p>

        <div className="mt-10">
          {step === 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {STUDIO_DELIVERY_MODES.map((mode) => (
                <ChoiceCard key={mode.id} selected={deliveryMode === mode.id} icon={mode.icon} title={mode.label} description={mode.description}
                  onSelect={() => setDeliveryMode(mode.id)} />
              ))}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="relative">
              <input
                autoFocus
                value={title}
                maxLength={TITLE_MAX}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && canContinue) setStep(2); }}
                placeholder="Exemple : Excel pour gérer son commerce"
                aria-label="Titre provisoire du cours"
                className="c2p-input h-14 pl-5 pr-16 text-base"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm tabular-nums text-c2p-soft">{TITLE_MAX - title.length}</span>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STUDIO_CATEGORIES.map((entry) => (
                <ChoiceCard key={entry.id} selected={category === entry.id} icon={entry.icon} title={entry.name} onSelect={() => setCategory(entry.id)} />
              ))}
            </div>
          ) : null}
          {failure ? <p className="mt-6 text-center text-sm font-medium text-c2p-danger" role="alert">{failure}</p> : null}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-c2p-border bg-c2p-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Button variant="secondary" disabled={step === 0 || creating} onClick={() => setStep((current) => current - 1)}>Précédent</Button>
          {isLast ? (
            <Button loading={creating} disabled={!canContinue || !gate.allowed} onClick={() => void create()}>Créer le cours</Button>
          ) : (
            <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuer</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
