import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, cx } from '@/components/ui';
import { courseStatusClasses, courseStatusLabels } from '@/lib/courseWorkflow';
import type { SaveState } from './useCourseStudio';
import {
  STUDIO_PANELS,
  panelIsComplete,
  studioPath,
  type ChecklistItem,
  type StudioCourse,
  type StudioPanel,
} from './studioModel';

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  if (state === 'saving') return <span className="flex items-center gap-1.5"><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />Enregistrement…</span>;
  if (state === 'error') return <span className="flex items-center gap-1.5 text-c2p-danger"><i className="ri-error-warning-line" />Non enregistré</span>;
  if (state === 'saved' && savedAt) {
    return <span className="flex items-center gap-1.5"><i className="ri-check-line" />Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>;
  }
  return <span className="flex items-center gap-1.5"><i className="ri-cloud-line" />Enregistrement automatique</span>;
}

export function StudioTopBar({ course, saveState, savedAt, onSubmit, onWithdraw, canSubmit }: {
  course: StudioCourse; saveState: SaveState; savedAt: Date | null; onSubmit: () => void; onWithdraw: () => void; canSubmit: boolean;
}) {
  const status = course.status;
  return (
    <header className="sticky top-0 z-30 border-b border-c2p-border bg-c2p-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/dashboard/formateur/mes-cours" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-c2p-muted hover:bg-c2p-surface-muted hover:text-c2p-text" aria-label="Retour à mes formations">
          <i className="ri-arrow-left-line text-lg" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-c2p-text sm:text-base">{course.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-c2p-muted">
            <span className={cx('rounded-full px-2 py-0.5 font-semibold', courseStatusClasses[status])}>{courseStatusLabels[status]}</span>
            <SaveIndicator state={saveState} savedAt={savedAt} />
          </div>
        </div>
        {status === 'published' ? (
          <Link to={`/espace-numerique/formation/${encodeURIComponent(String(course.id))}`} target="_blank" className="c2p-btn-secondary h-9 px-3.5 text-sm">
            <i className="ri-external-link-line" aria-hidden="true" /><span className="hidden sm:inline">Voir la page publique</span>
          </Link>
        ) : status === 'review' ? (
          <Button variant="secondary" size="sm" onClick={onWithdraw}>Retirer de la validation</Button>
        ) : (
          <Button size="sm" icon="ri-send-plane-line" onClick={onSubmit} disabled={!canSubmit} aria-label="Soumettre pour validation">
            <span className="hidden sm:inline" aria-hidden="true">Soumettre pour validation</span><span className="sm:hidden" aria-hidden="true">Soumettre</span>
          </Button>
        )}
      </div>
    </header>
  );
}

export function StudioSidebar({ courseId, active, checklist }: { courseId: StudioCourse['id']; active: StudioPanel; checklist: ChecklistItem[] }) {
  const groups = [...new Set(STUDIO_PANELS.map((panel) => panel.group))];
  return (
    <nav aria-label="Étapes du cours" className="lg:sticky lg:top-24">
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-6 lg:overflow-visible">
        {groups.map((group) => (
          <li key={group} className="contents lg:block">
            <p className="hidden px-3 pb-2 text-xs font-bold uppercase tracking-wide text-c2p-soft lg:block">{group}</p>
            <ul className="contents lg:block lg:space-y-1">
              {STUDIO_PANELS.filter((panel) => panel.group === group).map((panel) => {
                const done = panelIsComplete(panel.id, checklist);
                return (
                  <li key={panel.id} className="shrink-0">
                    <Link
                      to={studioPath(courseId, panel.id)}
                      aria-current={active === panel.id ? 'page' : undefined}
                      className={cx(
                        'relative flex items-center gap-2.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition lg:rounded-xl lg:border-0',
                        active === panel.id ? 'border-c2p-primary bg-c2p-surface text-c2p-text lg:bg-c2p-surface lg:shadow-c2p' : 'border-c2p-border text-c2p-muted hover:text-c2p-text',
                      )}
                    >
                      <i className={cx(done ? 'ri-checkbox-circle-fill text-c2p-success' : 'ri-checkbox-blank-circle-line text-c2p-soft', 'text-base')} aria-hidden="true" />
                      {panel.label}
                      <span className="sr-only">{done ? '(terminé)' : '(à compléter)'}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SubmitDialog({ courseId, checklist, submitting, onCancel, onConfirm }: {
  courseId: StudioCourse['id']; checklist: ChecklistItem[]; submitting: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const missingRequired = checklist.filter((item) => item.required && !item.done);
  const missingOptional = checklist.filter((item) => !item.required && !item.done);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="studio-submit-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-c2p-surface p-6 sm:rounded-3xl">
        <h2 id="studio-submit-title" className="text-xl font-bold text-c2p-text">
          {missingRequired.length ? 'Encore quelques étapes' : 'Prêt pour la validation'}
        </h2>
        <p className="mt-2 text-sm text-c2p-muted">
          {missingRequired.length
            ? 'Ces éléments sont obligatoires avant que l’équipe C2P puisse examiner votre cours :'
            : 'L’équipe C2P va examiner votre cours. Vous serez notifié dès qu’il est publié ou si des changements sont demandés.'}
        </p>
        <ul className="mt-4 space-y-2">
          {[...missingRequired, ...missingOptional].map((item) => (
            <li key={item.id}>
              <Link to={studioPath(courseId, item.panel)} onClick={onCancel} className="flex items-center gap-3 rounded-xl border border-c2p-border px-4 py-3 text-sm hover:border-c2p-primary">
                <i className={item.required ? 'ri-error-warning-line text-c2p-danger' : 'ri-lightbulb-line text-c2p-warning'} aria-hidden="true" />
                <span className="flex-1 font-medium text-c2p-text">{item.label}</span>
                <span className="text-xs text-c2p-muted">{item.required ? 'Obligatoire' : 'Conseillé'}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>{missingRequired.length ? 'Fermer' : 'Annuler'}</Button>
          {!missingRequired.length ? <Button loading={submitting} icon="ri-send-plane-line" onClick={onConfirm}>Soumettre le cours</Button> : null}
        </div>
      </div>
    </div>
  );
}
