import type { Dispatch, SetStateAction } from 'react';
import {
  makeLessonDraft,
  makeSectionDraft,
  normalizeSections,
  reorderItems,
  type LessonDraft,
  type SectionDraft,
  type WizardDraftState,
} from './courseWizardModel';

interface UseCourseWizardProgramArgs {
  selectedLesson: LessonDraft | null;
  setStepMessage: (message: string | null) => void;
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
}

export function useCourseWizardProgram({
  selectedLesson,
  setStepMessage,
  setWizard,
}: UseCourseWizardProgramArgs) {
  const updateSections = (updater: (sections: SectionDraft[]) => SectionDraft[]) => {
    setWizard((current) => {
      const nextSections = normalizeSections(updater(current.sections));
      const nextLessonOptions = nextSections.flatMap((section) => section.lessons);
      const nextSelectedLessonId = nextLessonOptions.some((lesson) => lesson.id === current.selectedLessonId)
        ? current.selectedLessonId
        : nextLessonOptions[0]?.id ?? '';

      const validLessonIds = new Set(nextLessonOptions.map((lesson) => lesson.id));
      const nextAssets = current.assets.filter((asset) => validLessonIds.has(asset.lessonId)).map((asset) => {
        const lesson = nextLessonOptions.find((entry) => entry.id === asset.lessonId);
        return {
          ...asset,
          lessonTitle: lesson?.title ?? asset.lessonTitle,
        };
      });

      return {
        ...current,
        sections: nextSections,
        selectedLessonId: nextSelectedLessonId,
        assets: nextAssets,
      };
    });
    setStepMessage(null);
  };

  const addSection = () => {
    updateSections((sections) => [
      ...sections,
      makeSectionDraft(sections.length + 1),
    ]);
  };

  const updateSectionField = (sectionId: string, field: keyof Omit<SectionDraft, 'id' | 'position' | 'lessons'>, value: string) => {
    updateSections((sections) => sections.map((section) => (
      section.id === sectionId ? { ...section, [field]: value } : section
    )));
  };

  const removeSection = (sectionId: string) => {
    updateSections((sections) => sections.filter((section) => section.id !== sectionId));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    updateSections((sections) => {
      const currentIndex = sections.findIndex((section) => section.id === sectionId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return sections;
      return reorderItems(sections, currentIndex, targetIndex);
    });
  };

  const addLesson = (sectionId: string) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        lessons: [
          ...section.lessons,
          makeLessonDraft(section.lessons.length + 1),
        ],
      };
    }));
  };

  const updateLessonField = <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => {
    updateSections((sections) => sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => (
        lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
      )),
    })));
  };

  const removeLesson = (sectionId: string, lessonId: string) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        lessons: section.lessons.filter((lesson) => lesson.id !== lessonId),
      };
    }));
  };

  const moveLesson = (sectionId: string, lessonId: string, direction: -1 | 1) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      const currentIndex = section.lessons.findIndex((lesson) => lesson.id === lessonId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= section.lessons.length) return section;
      return {
        ...section,
        lessons: reorderItems(section.lessons, currentIndex, targetIndex),
      };
    }));
  };

  const appendLessonSnippet = (snippet: string) => {
    if (!selectedLesson) return;
    const nextContent = selectedLesson.content.trim()
      ? `${selectedLesson.content.trim()}\n\n${snippet}`
      : snippet;
    updateLessonField(selectedLesson.id, 'content', nextContent);
  };

  return {
    addLesson,
    addSection,
    appendLessonSnippet,
    moveLesson,
    moveSection,
    removeLesson,
    removeSection,
    updateLessonField,
    updateSectionField,
    updateSections,
  };
}
