import { type ReactNode } from 'react';
import {
  COURSE_DELIVERY_LABELS,
  COURSE_LEVEL_LABELS,
  type WizardDraftState,
} from './courseWizardModel';

interface CourseCreationWizardReviewProps {
  wizard: WizardDraftState;
  tableOfContents: ReactNode;
}

export default function CourseCreationWizardReview({
  wizard,
  tableOfContents,
}: CourseCreationWizardReviewProps) {
  const lessonsCount = wizard.sections.reduce((sum, section) => sum + section.lessons.length, 0);
  const readyAssets = wizard.assets.filter((asset) => asset.queueStatus === 'ready').length;
  const coursePrice = wizard.course.is_free ? 'Gratuit' : `${wizard.course.price.toLocaleString('fr-FR')} FCFA`;
  const objectives = wizard.course.objectives.map((item) => item.trim()).filter(Boolean);
  const prerequisites = wizard.course.prerequisites.map((item) => item.trim()).filter(Boolean);
  const tools = wizard.course.tools.map((item) => item.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 5</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Validation avant création</h3>
          <p className="mt-1 text-sm text-slate-600">
            Vérifiez la fiche, le programme et les contenus avant d envoyer la formation en brouillon.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fiche cours</p>
            <h4 className="mt-2 text-base font-semibold text-slate-900">{wizard.course.title || 'Titre non renseigné'}</h4>
            <p className="mt-1 text-sm text-slate-600">{wizard.course.category || 'Catégorie non renseignée'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white px-2.5 py-1">{COURSE_LEVEL_LABELS[wizard.course.level]}</span>
              <span className="rounded-full bg-white px-2.5 py-1">{COURSE_DELIVERY_LABELS[wizard.course.delivery_mode]}</span>
              <span className="rounded-full bg-white px-2.5 py-1">{coursePrice}</span>
            </div>
          </div>

          <SummaryTile label="Programme" leftValue={wizard.sections.length} leftCaption="partie(s)" rightValue={lessonsCount} rightCaption="leçon(s)" />
          <SummaryTile label="Contenus" leftValue={readyAssets} leftCaption="prêt(s)" rightValue={wizard.exams.length} rightCaption="évaluation(s)" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            ['Objectifs pédagogiques', objectives],
            ['Prérequis', prerequisites],
            ['Outils', tools],
          ].map(([label, items]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{String(label)}</p>
              {Array.isArray(items) && items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-600">
                      <i className="ri-check-line mt-0.5 text-teal-600"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Non renseigné.</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-900">Table des matières</h4>
          <div className="mt-4">{tableOfContents}</div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          La formation sera créée en brouillon. Elle pourra ensuite être soumise à validation admin avant publication.
        </div>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  leftValue,
  leftCaption,
  rightValue,
  rightCaption,
}: {
  label: string;
  leftValue: number;
  leftCaption: string;
  rightValue: number;
  rightCaption: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3">
          <p className="text-2xl font-semibold text-slate-900">{leftValue}</p>
          <p className="text-xs text-slate-500">{leftCaption}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-2xl font-semibold text-slate-900">{rightValue}</p>
          <p className="text-xs text-slate-500">{rightCaption}</p>
        </div>
      </div>
    </div>
  );
}
