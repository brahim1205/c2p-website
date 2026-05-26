import type { Dispatch, SetStateAction } from 'react';
import {
  LESSON_TYPE_LABELS,
  reorderItems,
  type LessonDraft,
  type LessonType,
  type SectionDraft,
  type WizardDraftState,
} from './courseWizardModel';
import CourseCreationTableOfContents from './CourseCreationTableOfContents';
import { getFieldClass } from './courseCreationFields';

interface CourseCreationProgramStepProps {
  wizard: WizardDraftState;
  dragSectionId: string | null;
  dragLessonPayload: { sectionId: string; lessonId: string } | null;
  setDragSectionId: Dispatch<SetStateAction<string | null>>;
  setDragLessonPayload: Dispatch<SetStateAction<{ sectionId: string; lessonId: string } | null>>;
  updateSections: (updater: (sections: SectionDraft[]) => SectionDraft[]) => void;
  addSection: () => void;
  updateSectionField: (
    sectionId: string,
    field: keyof Omit<SectionDraft, 'id' | 'position' | 'lessons'>,
    value: string,
  ) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  addLesson: (sectionId: string) => void;
  updateLessonField: <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => void;
  removeLesson: (sectionId: string, lessonId: string) => void;
  moveLesson: (sectionId: string, lessonId: string, direction: -1 | 1) => void;
  openLessonContent: (lessonId: string) => void;
}

export default function CourseCreationProgramStep({
  wizard,
  dragSectionId,
  dragLessonPayload,
  setDragSectionId,
  setDragLessonPayload,
  updateSections,
  addSection,
  updateSectionField,
  removeSection,
  moveSection,
  addLesson,
  updateLessonField,
  removeLesson,
  moveLesson,
  openLessonContent,
}: CourseCreationProgramStepProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Programme</p>
            <h3 className="text-lg font-semibold text-slate-900">Structure du programme</h3>
            <p className="text-sm text-slate-600">Organisez le cours en parties, puis ajoutez les leçons à suivre.</p>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            <i className="ri-add-line text-base"></i>
            Ajouter une partie
          </button>
        </div>

        <div className="space-y-4">
          {wizard.sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => setDragSectionId(section.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragSectionId || dragSectionId === section.id) return;
                updateSections((sections) => {
                  const fromIndex = sections.findIndex((entry) => entry.id === dragSectionId);
                  const toIndex = sections.findIndex((entry) => entry.id === section.id);
                  if (fromIndex < 0 || toIndex < 0) return sections;
                  return reorderItems(sections, fromIndex, toIndex);
                });
                setDragSectionId(null);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-teal-700 shadow-sm">
                        {sectionIndex + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Partie {sectionIndex + 1}</p>
                        <p className="text-xs text-slate-500">{section.lessons.length} leçon(s)</p>
                      </div>
                    </div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Titre de la partie</label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) => updateSectionField(section.id, 'title', event.target.value)}
                      placeholder="Titre de la partie"
                      className={getFieldClass(false)}
                    />
                    <label className="mb-1.5 mt-3 block text-xs font-medium text-slate-600">Objectif de la partie</label>
                    <textarea
                      rows={2}
                      value={section.description}
                      onChange={(event) => updateSectionField(section.id, 'description', event.target.value)}
                      placeholder="Objectif de cette partie"
                      className={`${getFieldClass(false)} mt-2 resize-none`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, -1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
                      aria-label="Monter la partie"
                    >
                      <i className="ri-arrow-up-line"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
                      aria-label="Descendre la partie"
                    >
                      <i className="ri-arrow-down-line"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(section.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    >
                      <i className="ri-add-line"></i>
                      Leçon
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label="Supprimer la partie"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {section.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => setDragLessonPayload({ sectionId: section.id, lessonId: lesson.id })}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!dragLessonPayload || dragLessonPayload.sectionId !== section.id || dragLessonPayload.lessonId === lesson.id) return;
                      updateSections((sections) => sections.map((entry) => {
                        if (entry.id !== section.id) return entry;
                        const fromIndex = entry.lessons.findIndex((candidate) => candidate.id === dragLessonPayload.lessonId);
                        const toIndex = entry.lessons.findIndex((candidate) => candidate.id === lesson.id);
                        if (fromIndex < 0 || toIndex < 0) return entry;
                        return {
                          ...entry,
                          lessons: reorderItems(entry.lessons, fromIndex, toIndex),
                        };
                      }));
                      setDragLessonPayload(null);
                    }}
                    className={`rounded-xl border p-3 transition-colors ${
                      wizard.selectedLessonId === lesson.id ? 'border-teal-300 bg-white shadow-sm' : 'border-slate-200 bg-white/90'
                    }`}
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Leçon {lessonIndex + 1}</p>
                        <p className="text-xs text-slate-500">{LESSON_TYPE_LABELS[lesson.type]}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveLesson(section.id, lesson.id, -1)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Monter la leçon"
                        >
                          <i className="ri-arrow-up-line"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLesson(section.id, lesson.id, 1)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Descendre la leçon"
                        >
                          <i className="ri-arrow-down-line"></i>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_180px_120px]">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Titre de la leçon</label>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(event) => updateLessonField(lesson.id, 'title', event.target.value)}
                          placeholder="Titre de la leçon"
                          className={getFieldClass(false)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Type</label>
                        <select
                          value={lesson.type}
                          onChange={(event) => updateLessonField(lesson.id, 'type', event.target.value as LessonType)}
                          className={getFieldClass(false)}
                        >
                          {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Durée</label>
                        <input
                          type="text"
                          value={lesson.duration}
                          onChange={(event) => updateLessonField(lesson.id, 'duration', event.target.value)}
                          placeholder="12 min"
                          className={getFieldClass(false)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={lesson.is_preview}
                          onChange={(event) => updateLessonField(lesson.id, 'is_preview', event.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Aperçu gratuit
                      </label>
                      <button
                        type="button"
                        onClick={() => openLessonContent(lesson.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
                      >
                        <i className="ri-edit-line"></i>
                        Contenu
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLesson(section.id, lesson.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <i className="ri-delete-bin-line"></i>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Aperçu</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Table des matières</h3>
          <p className="mt-1 text-sm text-slate-600">Elle se construit automatiquement avec vos parties, leçons et quiz.</p>
        </div>
        <CourseCreationTableOfContents sections={wizard.sections} exams={wizard.exams} />
      </section>
    </div>
  );
}
