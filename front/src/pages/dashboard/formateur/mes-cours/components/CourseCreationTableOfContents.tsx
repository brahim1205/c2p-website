import {
  EXAM_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  type ExamDraft,
  type SectionDraft,
} from './courseWizardModel';

interface CourseCreationTableOfContentsProps {
  sections: SectionDraft[];
  exams: ExamDraft[];
}

export default function CourseCreationTableOfContents({
  sections,
  exams,
}: CourseCreationTableOfContentsProps) {
  const hasProgramme = sections.some((section) => section.title.trim() || section.lessons.length > 0);

  if (!hasProgramme) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">La table des matières se remplira avec vos parties et leçons.</p>
        <p className="mt-1 text-xs text-slate-500">Ajoutez une partie, puis détaillez les leçons dans l'ordre d'apprentissage.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="border-b border-slate-100 last:border-b-0">
          <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Partie {sectionIndex + 1}</p>
              <h4 className="mt-1 text-base font-semibold text-slate-900">{section.title || `Partie ${sectionIndex + 1}`}</h4>
              {section.description.trim() ? (
                <p className="mt-1 text-sm text-slate-600">{section.description}</p>
              ) : null}
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {section.lessons.length} leçon{section.lessons.length > 1 ? 's' : ''}
            </span>
          </div>

          <ol className="divide-y divide-slate-100 px-4 pb-4">
            {section.lessons.map((lesson, lessonIndex) => (
              <li key={lesson.id} className="flex gap-3 py-3 text-sm text-slate-700 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {lessonIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {lesson.type === 'quiz' ? `Quiz : ${lesson.title || `Leçon ${lessonIndex + 1}`}` : lesson.title || `Leçon ${lessonIndex + 1}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {LESSON_TYPE_LABELS[lesson.type]}{lesson.duration ? ` · ${lesson.duration}` : ''}
                  </p>
                </div>
                {lesson.type === 'quiz' ? (
                  <span className="h-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Quiz</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {exams.length > 0 ? (
        <div className="bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Évaluations finales</p>
          <div className="mt-3 space-y-2">
            {exams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-slate-800">{EXAM_TYPE_LABELS[exam.type]} : {exam.title || 'Évaluation sans titre'}</p>
                <span className="text-xs text-slate-500">{exam.questions.length} question{exam.questions.length > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
