import type { CurriculumOrder } from '../useCourseStudio';
import type { StudioLesson, StudioProgram, StudioSection } from '../studioModel';

export interface CurriculumSectionView {
  section: StudioSection;
  lessons: StudioLesson[];
}

const byPosition = <T extends { position: number }>(left: T, right: T) => Number(left.position) - Number(right.position);

export function buildCurriculum(program: StudioProgram): CurriculumSectionView[] {
  return [...program.sections].sort(byPosition).map((section) => ({
    section,
    lessons: program.lessons.filter((lesson) => String(lesson.section_id) === String(section.id)).sort(byPosition),
  }));
}

export function toOrder(curriculum: CurriculumSectionView[]): CurriculumOrder {
  return curriculum.map(({ section, lessons }) => ({ id: String(section.id), lesson_ids: lessons.map((lesson) => String(lesson.id)) }));
}

/** Moves a section to `targetIndex` (index in the list after removal). */
export function moveSection(order: CurriculumOrder, sectionId: string, targetIndex: number): CurriculumOrder {
  const from = order.findIndex((entry) => entry.id === sectionId);
  if (from < 0) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, moved);
  return next;
}

/** Moves a lesson into `sectionId` at `targetIndex` (index after removal), possibly across sections. */
export function moveLesson(order: CurriculumOrder, lessonId: string, sectionId: string, targetIndex: number): CurriculumOrder {
  const stripped = order.map((entry) => ({ ...entry, lesson_ids: entry.lesson_ids.filter((id) => id !== lessonId) }));
  return stripped.map((entry) => {
    if (entry.id !== sectionId) return entry;
    const lessonIds = [...entry.lesson_ids];
    lessonIds.splice(Math.max(0, Math.min(targetIndex, lessonIds.length)), 0, lessonId);
    return { ...entry, lesson_ids: lessonIds };
  });
}

/** Up/down buttons: a lesson at the edge of its section jumps into the neighbouring section. */
export function stepLesson(order: CurriculumOrder, lessonId: string, direction: -1 | 1): CurriculumOrder {
  const sectionIndex = order.findIndex((entry) => entry.lesson_ids.includes(lessonId));
  if (sectionIndex < 0) return order;
  const index = order[sectionIndex].lesson_ids.indexOf(lessonId);
  const target = index + direction;
  if (target >= 0 && target < order[sectionIndex].lesson_ids.length) {
    return moveLesson(order, lessonId, order[sectionIndex].id, target);
  }
  const neighbour = order[sectionIndex + direction];
  if (!neighbour) return order;
  return moveLesson(order, lessonId, neighbour.id, direction === 1 ? 0 : neighbour.lesson_ids.length);
}

export function sameOrder(left: CurriculumOrder, right: CurriculumOrder) {
  return JSON.stringify(left) === JSON.stringify(right);
}
