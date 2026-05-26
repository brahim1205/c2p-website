import type { DEFAULT_CLASS_FORM, VirtualClass } from './virtualClassModel';

export type VirtualClassFilter = 'all' | 'scheduled' | 'live' | 'ended';

export interface InstructorCourseOption {
  id: string | number;
  title: string;
}

export interface VirtualClassesSnapshot {
  classes: VirtualClass[];
  courses: InstructorCourseOption[];
}

type ClassForm = typeof DEFAULT_CLASS_FORM;

export function buildAvailableCourseIds(courses: InstructorCourseOption[]) {
  return new Set(courses.map((course) => String(course.id)));
}

export function findInstructorCourse(courses: InstructorCourseOption[], courseId: string | number | null | undefined) {
  return courses.find((course) => String(course.id) === String(courseId ?? ''));
}

export function filterVirtualClasses(classes: VirtualClass[], filter: VirtualClassFilter) {
  return filter === 'all' ? classes : classes.filter((cls) => cls.status === filter);
}

export function getVirtualClassStats(classes: VirtualClass[]) {
  return {
    scheduled: classes.filter((cls) => cls.status === 'scheduled').length,
    live: classes.filter((cls) => cls.status === 'live').length,
    ended: classes.filter((cls) => cls.status === 'ended').length,
  };
}

export function buildCreateVirtualClassPayload(form: ClassForm, course: InstructorCourseOption) {
  return {
    course_id: form.course_id,
    title: form.title,
    course_name: course.title,
    class_date: form.class_date,
    class_time: form.class_time,
    duration: form.duration,
    max_students: form.max_students || 30,
    provider: form.provider,
    meeting_slug: form.meeting_slug,
    room_link: form.room_link,
    recording_enabled: form.recording_enabled,
    recording_url: form.recording_url,
    instructor_notes: form.instructor_notes,
    allow_chat: form.allow_chat,
  };
}

export function buildUpdateVirtualClassPayload(form: Partial<VirtualClass>, course: InstructorCourseOption) {
  return {
    title: form.title,
    course_id: form.course_id,
    course_name: course.title,
    class_date: form.class_date,
    class_time: form.class_time,
    duration: form.duration || null,
    max_students: form.max_students,
    provider: form.provider,
    meeting_slug: form.meeting_slug || null,
    room_link: form.room_link || null,
    recording_enabled: form.recording_enabled,
    recording_url: form.recording_url || null,
    instructor_notes: form.instructor_notes || null,
    allow_chat: form.allow_chat,
  };
}
