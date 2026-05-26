import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchFormateurCourseProgram } from '@/lib/formateurDashboardApi';
import type {
  Course,
  CourseLesson,
  CourseSection,
  LessonAsset,
} from './programmeModel';

export interface CourseProgramSnapshot {
  course: Course | null;
  sections: CourseSection[];
  lessons: CourseLesson[];
  assets: LessonAsset[];
}

export function useCourseProgramData(userId?: string, courseId?: string) {
  const courseProgramQueryKey = useMemo(
    () => queryKeys.formateur.courseProgram(userId, courseId),
    [courseId, userId],
  );

  const courseProgramQuery = useQuery({
    queryKey: courseProgramQueryKey,
    queryFn: async () => fetchFormateurCourseProgram(userId ?? '', courseId ?? '') as Promise<CourseProgramSnapshot>,
    enabled: Boolean(courseId && userId),
  });

  return { courseProgramQuery, courseProgramQueryKey };
}
