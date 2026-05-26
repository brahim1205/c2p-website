import { apiRequest } from '@/lib/api';
import type {
  FormateurCourse,
  FormateurCourseBundleInput,
  FormateurCourseDeliveryMode,
  FormateurCourseLesson,
  FormateurCourseLevel,
  FormateurCourseProgramSnapshot,
  FormateurCourseSection,
  FormateurLessonAsset,
} from './formateurDashboardTypes';

function normalizeCourseDeliveryMode(value: unknown): FormateurCourseDeliveryMode {
  return value === 'onsite' || value === 'hybrid' || value === 'online' ? value : 'online';
}

function normalizeCourseLevel(value: unknown): FormateurCourseLevel {
  return value === 'beginner' || value === 'advanced' || value === 'all_levels' || value === 'intermediate' ? value : 'intermediate';
}

function normalizeCourseAccessType(value: unknown): 'free' | 'paid' {
  return value === 'free' ? 'free' : 'paid';
}

function normalizeFormateurCourse(course: FormateurCourse): FormateurCourse {
  const merged = {
    category: 'General',
    completion_rate: 0,
    duration: 'N/A',
    level: 'intermediate',
    delivery_mode: 'online',
    access_type: 'paid',
    is_free: false,
    promotion_percentage: 0,
    trailer_url: null,
    modules: 0,
    price: 0,
    revenue: 0,
    students_count: 0,
    thumbnail: null,
    updated_at: new Date().toISOString(),
    ...course,
  };

  return {
    ...merged,
    level: normalizeCourseLevel(merged.level),
    delivery_mode: normalizeCourseDeliveryMode(merged.delivery_mode),
    access_type: normalizeCourseAccessType(merged.access_type),
    is_free: Boolean(merged.is_free),
    promotion_percentage: Number(merged.promotion_percentage ?? 0),
    trailer_url: merged.trailer_url ?? null,
  };
}

export async function fetchFormateurCourses(userId: string) {
  void userId;
  const courses = await apiRequest<FormateurCourse[]>('/learning/formateur/courses');
  return courses.map(normalizeFormateurCourse);
}

export async function createFormateurCourseBundle(userId: string, payload: FormateurCourseBundleInput) {
  void userId;
  return apiRequest<FormateurCourse>('/learning/formateur/courses/bundle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchFormateurCourseWizardDraft(userId: string) {
  void userId;
  return apiRequest<{ draft: unknown | null; savedAt: string | null }>('/learning/formateur/course-wizard-draft');
}

export async function saveFormateurCourseWizardDraft(userId: string, draft: unknown) {
  void userId;
  return apiRequest<{ draft: unknown; savedAt: string }>('/learning/formateur/course-wizard-draft', {
    method: 'PUT',
    body: JSON.stringify({ draft }),
  });
}

export async function deleteFormateurCourseWizardDraft(userId: string) {
  void userId;
  return apiRequest<{ cleared: boolean }>('/learning/formateur/course-wizard-draft', {
    method: 'DELETE',
  });
}

export async function updateFormateurCourse(userId: string, courseId: string | number, payload: Record<string, unknown>) {
  void userId;
  return apiRequest<FormateurCourse>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateFormateurCourseWorkflow(userId: string, courseId: string | number, status: string) {
  void userId;
  return apiRequest<FormateurCourse>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/workflow`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteFormateurCourse(userId: string, courseId: string | number) {
  void userId;
  return apiRequest<FormateurCourse>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}`, {
    method: 'DELETE',
  });
}

export async function fetchFormateurCourseProgram(userId: string, courseId: string | number): Promise<FormateurCourseProgramSnapshot> {
  void userId;
  return apiRequest<FormateurCourseProgramSnapshot>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/program`);
}

export async function saveFormateurCourseSection(
  userId: string,
  courseId: string | number,
  input: {
    id?: string | number;
    title: string;
    description: string;
    status: 'draft' | 'published';
    position?: number;
  },
) {
  void userId;
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    position: input.position,
  };
  const base = `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/sections`;
  return apiRequest<FormateurCourseSection>(input.id ? `${base}/${encodeURIComponent(String(input.id))}` : base, {
    method: input.id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveFormateurCourseLesson(
  userId: string,
  courseId: string | number,
  input: {
    id?: string | number;
    section_id: string;
    title: string;
    description: string;
    type: FormateurCourseLesson['type'];
    duration: string;
    content: string;
    code_language: string;
    code_sample: string;
    exercise_instructions: string;
    is_preview: boolean;
    status: FormateurCourseLesson['status'];
    position?: number;
  },
) {
  void userId;
  const payload = {
    section_id: input.section_id,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    duration: input.duration.trim() || null,
    content: input.content.trim() || null,
    code_language: input.code_language.trim() || 'markdown',
    code_sample: input.code_sample.trim() || null,
    exercise_instructions: input.exercise_instructions.trim() || null,
    is_preview: input.is_preview,
    status: input.status,
    position: input.position,
  };
  const base = `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/lessons`;
  return apiRequest<FormateurCourseLesson>(input.id ? `${base}/${encodeURIComponent(String(input.id))}` : base, {
    method: input.id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveFormateurLessonAsset(
  userId: string,
  courseId: string | number,
  input: {
    id?: string | number;
    lesson_id: string;
    title: string;
    asset_type: FormateurLessonAsset['asset_type'];
    url: string;
    thumbnail_url: string;
    mime_type: string;
    size_bytes: string;
    status: FormateurLessonAsset['status'];
    position?: number;
  },
) {
  void userId;
  const payload = {
    lesson_id: input.lesson_id,
    title: input.title.trim(),
    asset_type: input.asset_type,
    url: input.url.trim(),
    thumbnail_url: input.thumbnail_url.trim() || null,
    mime_type: input.mime_type.trim() || null,
    size_bytes: input.size_bytes.trim() ? Number(input.size_bytes) : null,
    status: input.status,
    position: input.position,
  };
  const base = `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/assets`;
  return apiRequest<FormateurLessonAsset>(input.id ? `${base}/${encodeURIComponent(String(input.id))}` : base, {
    method: input.id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteFormateurCourseSection(userId: string, courseId: string | number, sectionId: string | number) {
  void userId;
  return apiRequest<FormateurCourseSection>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/sections/${encodeURIComponent(String(sectionId))}`, {
    method: 'DELETE',
  });
}

export async function deleteFormateurCourseLesson(userId: string, courseId: string | number, lessonId: string | number) {
  void userId;
  return apiRequest<FormateurCourseLesson>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/lessons/${encodeURIComponent(String(lessonId))}`, {
    method: 'DELETE',
  });
}

export async function deleteFormateurLessonAsset(userId: string, courseId: string | number, assetId: string | number) {
  void userId;
  return apiRequest<FormateurLessonAsset>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/assets/${encodeURIComponent(String(assetId))}`, {
    method: 'DELETE',
  });
}

export async function reorderFormateurCourseSections(
  userId: string,
  courseId: string | number,
  current: Pick<FormateurCourseSection, 'id' | 'position'>,
  target: Pick<FormateurCourseSection, 'id' | 'position'>,
) {
  void userId;
  return apiRequest<FormateurCourseSection[]>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/sections/actions/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ current, target }),
  });
}

export async function reorderFormateurCourseLessons(
  userId: string,
  courseId: string | number,
  current: Pick<FormateurCourseLesson, 'id' | 'position'>,
  target: Pick<FormateurCourseLesson, 'id' | 'position'>,
) {
  void userId;
  return apiRequest<FormateurCourseLesson[]>(`/learning/formateur/courses/${encodeURIComponent(String(courseId))}/lessons/actions/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ current, target }),
  });
}
