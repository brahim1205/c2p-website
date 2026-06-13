import { Injectable } from '@nestjs/common';
import { parseBoolean, toNumber, trimText } from '../data/data-normalizers.js';
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
    const row = hydrateRows('virtual_classes', store.virtual_classes ?? [])
      .find((candidate) => String(candidate.id) === String(classId) && (trimText(candidate.status) ?? 'scheduled') !== 'archived');
    if (!row || !this.findPublishedCourse(String(row.course_id ?? ''))) return null;
    return this.toPublicVirtualClass(row);
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
        && parseBoolean(lesson.is_preview, false)
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
      .map((row) => this.toPublicVirtualClass(row))
      .sort((left, right) => compareDatesDesc(left.class_date ?? left.created_at, right.class_date ?? right.created_at));
  }

  getVisibleCourseSections(courseId: string, lessons: Row[]) {
    const sectionIds = new Set(lessons.map((lesson) => String(lesson.section_id ?? '')));
    return this.getCourseSections(courseId).filter((section) => sectionIds.has(String(section.id)));
  }

  private toPublicVirtualClass(row: Row) {
    const sanitized = { ...row };
    delete sanitized.meeting_slug;
    delete sanitized.room_link;
    delete sanitized.recording_url;
    return sanitized;
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
