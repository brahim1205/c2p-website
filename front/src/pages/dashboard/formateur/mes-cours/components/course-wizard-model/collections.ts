import type { SectionDraft } from '../courseWizardTypes';

export function normalizeSections(sections: SectionDraft[]) {
  return sections.map((section, sectionIndex) => ({
    ...section,
    position: sectionIndex + 1,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      position: lessonIndex + 1,
    })),
  }));
}

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
