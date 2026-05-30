import { type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { STEP_LABELS, type WizardDraftState } from './courseWizardModel';

function formatTime(value: Date) {
  return value.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CourseCreationWizardFrameProps {
  embedded: boolean;
  wizard: WizardDraftState;
  savingDraftAt: Date | null;
  stepMessage: string | null;
  isSubmitting: boolean;
  pendingUploadsCount: number;
  children: ReactNode;
  onClose: () => void;
  onReset: () => void;
  onAutosaveCheck: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
  setStepMessage: Dispatch<SetStateAction<string | null>>;
  validateCurrentStep: (step: number) => boolean;
}

export default function CourseCreationWizardFrame({
  embedded,
  wizard,
  savingDraftAt,
  stepMessage,
  isSubmitting,
  pendingUploadsCount,
  children,
  onClose,
  onReset,
  onAutosaveCheck,
  onPrevious,
  onNext,
  onSubmit,
  setWizard,
  setStepMessage,
  validateCurrentStep,
}: CourseCreationWizardFrameProps) {
  return (
    <div className={`${embedded ? 'flex min-h-[760px]' : 'flex min-h-screen sm:min-h-0'} w-full flex-col bg-slate-50 ${embedded ? 'rounded-3xl border border-slate-200 shadow-sm' : 'sm:max-w-6xl sm:rounded-[28px] sm:border sm:border-slate-200 sm:bg-white sm:shadow-2xl'}`}>
      <div className={`${embedded ? '' : 'sticky top-0'} z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur ${embedded ? 'rounded-t-3xl sm:px-6' : 'sm:rounded-t-[28px] sm:px-6'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Création guidée</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Nouvelle formation en 5 étapes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Créez la fiche, organisez le programme, ajoutez les contenus, préparez les quiz puis validez.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Fermer l assistant"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const active = wizard.step === step;
            const completed = wizard.step > step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (step <= wizard.step || validateCurrentStep(wizard.step)) {
                    setStepMessage(null);
                    setWizard((current) => ({ ...current, step }));
                  }
                }}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? 'border-teal-300 bg-teal-50'
                    : completed
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-teal-600 text-white'
                      : completed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {completed ? '✓' : step}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{savingDraftAt ? `Brouillon enregistré à ${formatTime(savingDraftAt)}` : 'Brouillon en attente'}</span>
          <span>{wizard.sections.length} parties · {wizard.sections.reduce((sum, section) => sum + section.lessons.length, 0)} leçons · {wizard.assets.length} contenus · {wizard.exams.length} évaluations</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 sm:px-6">
        {stepMessage ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {stepMessage}
          </div>
        ) : null}

        {children}
      </div>

      <div className={`${embedded ? '' : 'sticky bottom-0'} z-20 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur ${embedded ? 'rounded-b-3xl sm:px-6' : 'sm:rounded-b-[28px] sm:px-6'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={onAutosaveCheck}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Vérifier l autosave
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={wizard.step === 1 ? onClose : onPrevious}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {wizard.step === 1 ? 'Fermer' : 'Précédent'}
            </button>
            {wizard.step < 5 ? (
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || pendingUploadsCount > 0}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer la formation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
