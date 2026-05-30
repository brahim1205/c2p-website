import { Injectable } from '@nestjs/common';
import { toNumber, trimText } from '../data/data-normalizers.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import { store } from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';

@Injectable()
export class LearningPublicFallbackService {
  getPublicCourses() {
    return hydrateRows('courses', store.courses ?? [])
      .filter((course) => String(course.status ?? '').toLowerCase() === 'published')
      .sort((left, right) => {
        const studentDelta = (toNumber(right.students_count) ?? 0) - (toNumber(left.students_count) ?? 0);
        return studentDelta !== 0
          ? studentDelta
          : compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at);
      });
  }

  getPublicInstructorCourses(instructorId: string) {
    return hydrateRows('courses', store.courses ?? [])
      .filter((course) => String(course.instructor_id) === String(instructorId) && String(course.status ?? '').toLowerCase() === 'published')
      .sort((left, right) => compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
  }

  findPublishedCourse(courseId: string) {
    return hydrateRows('courses', store.courses ?? [])
      .find((row) => String(row.id) === String(courseId) && (trimText(row.status) ?? '').toLowerCase() === 'published');
  }

  findVisibleVirtualClass(classId: string) {
    return hydrateRows('virtual_classes', store.virtual_classes ?? [])
      .find((row) => String(row.id) === String(classId) && (trimText(row.status) ?? 'scheduled') !== 'archived');
  }

  findCourse(courseId: string) {
    return hydrateRows('courses', store.courses ?? []).find((row) => String(row.id) === String(courseId)) ?? null;
  }

  getCourseSections(courseId: string) {
    return hydrateRows('course_sections', store.course_sections ?? [])
      .filter((section) =>
        String(section.course_id) === String(courseId)
        && String(section.status ?? 'published') !== 'archived'
      )
      .sort((left, right) => position(left) - position(right));
  }

  getCourseLessons(courseId: string) {
    return hydrateRows('course_lessons', store.course_lessons ?? [])
      .filter((lesson) =>
        String(lesson.course_id) === String(courseId)
        && String(lesson.status ?? 'published') !== 'archived'
      )
      .sort((left, right) => position(left) - position(right));
  }

  getCourseReviews(courseId: string) {
    return hydrateRows('course_reviews', store.course_reviews ?? [])
      .filter((review) =>
        String(review.course_id) === String(courseId)
        && String(review.status ?? 'published') === 'published'
      )
      .sort((left, right) => compareDatesDesc(left.created_at, right.created_at));
  }

  getCourseVirtualClasses(courseId: string) {
    return hydrateRows('virtual_classes', store.virtual_classes ?? [])
      .filter((virtualClass) =>
        String(virtualClass.course_id) === String(courseId)
        && String(virtualClass.status ?? 'scheduled') !== 'archived'
      )
      .sort((left, right) => compareDatesDesc(left.class_date ?? left.created_at, right.class_date ?? right.created_at));
  }
}

function position(row: Row) {
  return toNumber(row.position) ?? 0;
}

function compareDatesDesc(left: unknown, right: unknown) {
  const leftDate = Date.parse(String(left ?? ''));
  const rightDate = Date.parse(String(right ?? ''));
  const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
  const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
  return normalizedRight - normalizedLeft;
}
