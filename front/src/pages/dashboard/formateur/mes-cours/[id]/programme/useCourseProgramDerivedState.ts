import { useMemo } from 'react';
import {
  getCourseReadinessIssues,
  getInstructorWorkflowAction,
} from '@/lib/courseWorkflow';
import type { CourseProgramSnapshot } from './useCourseProgramData';

export function useCourseProgramDerivedState(courseProgram: CourseProgramSnapshot | undefined) {
  const course = courseProgram?.course ?? null;
  const sections = useMemo(() => courseProgram?.sections ?? [], [courseProgram?.sections]);
  const lessons = useMemo(() => courseProgram?.lessons ?? [], [courseProgram?.lessons]);
  const assets = useMemo(() => courseProgram?.assets ?? [], [courseProgram?.assets]);

  const groupedSections = useMemo(() => {
    return [...sections]
      .sort((left, right) => left.position - right.position)
      .map((section) => ({
        ...section,
        lessons: lessons
          .filter((lesson) => String(lesson.section_id) === String(section.id))
          .sort((left, right) => left.position - right.position),
        assets: assets
          .filter((asset) => String(asset.section_id) === String(section.id))
          .sort((left, right) => left.position - right.position),
      }));
  }, [assets, lessons, sections]);

  const availableSectionIds = useMemo(() => new Set(groupedSections.map((section) => String(section.id))), [groupedSections]);
  const availableLessonIds = useMemo(() => new Set(lessons.map((lesson) => String(lesson.id))), [lessons]);
  const courseWorkflowAction = course ? getInstructorWorkflowAction(course.status) : null;
  const readinessIssues = useMemo(
    () =>
      course
        ? getCourseReadinessIssues({
            description: course.description,
            duration: course.duration,
            thumbnail: course.thumbnail ?? null,
            sectionCount: groupedSections.length,
            lessonCount: lessons.length,
          })
        : [],
    [course, groupedSections.length, lessons.length],
  );

  return {
    assetCount: assets.length,
    assets,
    availableLessonIds,
    availableSectionIds,
    course,
    courseWorkflowAction,
    groupedSections,
    lessonCount: lessons.length,
    lessons,
    previewCount: lessons.filter((lesson) => lesson.is_preview).length,
    publishedCount: lessons.filter((lesson) => lesson.status === 'published').length,
    readinessIssues,
  };
}
