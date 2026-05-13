import { backendClient } from '@/lib/backendClient';
import { notifyApprenantGradePublished } from '@/hooks/useCreateNotification';
import {
  fetchFinanceSnapshot,
  fetchPayoutAccounts,
  fetchPayoutRequests,
  type FinanceSnapshot,
  type PayoutAccount,
  type PayoutRequest,
} from '@/lib/saasApi';

type FormateurCourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
type FormateurCourseDeliveryMode = 'online' | 'onsite' | 'hybrid';

export interface FormateurDashboardUser {
  id: string;
  role: string;
}

export interface FormateurCourse {
  id: number | string;
  title: string;
  category: string | null;
  description: string | null;
  status: string;
  students_count: number;
  completion_rate: number;
  revenue: number;
  modules: number;
  lessons_count?: number;
  assets_count?: number;
  preview_lessons_count?: number;
  published_lessons_count?: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price?: number | null;
  current_price?: number | null;
  views?: number;
  instructor_id?: string;
}

export interface FormateurEnrollment {
  id: number | string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  progress: number;
  last_active: string;
  course_id: number | string;
  course_name?: string | null;
  attention_level?: 'on_track' | 'watch' | 'at_risk' | 'completed' | string;
  pending_grading_count?: number;
  certificate_status?: string;
  days_since_active?: number;
  status?: string;
  enrolled_at?: string;
}

export interface FormateurExam {
  id: number | string;
  title: string;
  type: string;
  course_id: number | string;
  course_name?: string | null;
  status: string;
  max_grade: number;
  submitted?: number;
  avg_grade?: number | null;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
  exam_date?: string;
}

export interface FormateurSubmission {
  id: number | string;
  exam_id: number | string;
  student_id: string;
  student_name?: string | null;
  status: string;
  submitted_at: string | null;
  grade: number | null;
}

export interface FormateurCertificate {
  id: number;
  student_name: string;
  student_avatar: string | null;
  course_id: number | null;
  course_name: string | null;
  completion_date: string | null;
  final_grade: number | null;
  status: string;
  certificate_id: string | null;
  issued_at: string | null;
  created_at: string;
}

export interface FormateurDashboardSnapshot {
  courses: FormateurCourse[];
  students: FormateurEnrollment[];
  exams: FormateurExam[];
  submissions: FormateurSubmission[];
  finance: FinanceSnapshot | null;
}

export interface FormateurRevenueSnapshot {
  courses: FormateurCourse[];
  accounts: PayoutAccount[];
  requests: PayoutRequest[];
}

export interface FormateurCourseRelation {
  id: number | string;
  title: string;
  category: string | null;
  modules: number | null;
  duration: string | null;
  status: string;
}

export interface FormateurCourseSection {
  id: string | number;
  course_id: string | number;
  title: string;
  description: string | null;
  position: number;
  status: 'draft' | 'published';
  lessons_count?: number;
}

export interface FormateurCourseLesson {
  id: string | number;
  course_id: string | number;
  section_id: string | number;
  title: string;
  description: string | null;
  type: 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
  duration: string | null;
  content?: string | null;
  code_language?: string | null;
  code_sample?: string | null;
  exercise_instructions?: string | null;
  position: number;
  is_preview: boolean;
  status: 'draft' | 'published';
}

export interface FormateurLessonAsset {
  id: string | number;
  lesson_id: string | number;
  section_id: string | number;
  course_id: string | number;
  title: string;
  asset_type: 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  status: 'processing' | 'ready';
}

export interface FormateurCourseProgramSnapshot {
  course: FormateurCourse | null;
  sections: FormateurCourseSection[];
  lessons: FormateurCourseLesson[];
  assets: FormateurLessonAsset[];
}

export interface FormateurLearnerEnrollment extends FormateurEnrollment {
  grade: number | null;
  student_avatar: string | null;
  enrolled_at: string;
  course_name?: string | null;
  course_category?: string | null;
  course_sections_count?: number;
  course_lessons_count?: number;
  completed_sections_estimate?: number;
  remaining_sections_estimate?: number;
  completed_lessons_estimate?: number;
  remaining_lessons_estimate?: number;
  submissions_count?: number;
  graded_submissions_count?: number;
  avg_submission_grade?: number | null;
  latest_submission_at?: string | null;
  certificate_status?: 'issued' | 'ready' | 'pending' | string;
  certificate_issued_at?: string | null;
  certificate_number?: string | null;
  courses?: FormateurCourseRelation | null;
}

export interface FormateurLearnerCertificate {
  id: number;
  course_id: number;
  course_name: string | null;
  status: string;
  issued_at: string | null;
  final_grade: number | null;
  certificate_number: string | null;
}

export interface FormateurLearnerDetail {
  enrollments: FormateurLearnerEnrollment[];
  submissions: Array<FormateurSubmission & { exam?: FormateurExam | null }>;
  certificates: FormateurLearnerCertificate[];
}

export interface FormateurQuizQuestion {
  id: number | string;
  exam_id: number | string;
  prompt: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'open';
  points: number;
  explanation: string;
  required: boolean;
  position: number;
  choices_count?: number;
  correct_choices_count?: number;
}

export interface FormateurQuizChoice {
  id: number | string;
  question_id: number | string;
  exam_id: number | string;
  label: string;
  value: string;
  is_correct: boolean;
  position: number;
}

export interface FormateurSubmissionAnswer {
  question_id: number | string;
  question_prompt: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'open';
  answer_text: string | null;
  selected_choice_ids: string[];
}

export interface FormateurEvaluationSubmission extends FormateurSubmission {
  student_avatar: string | null;
  feedback: string | null;
  file_name: string | null;
  file_url: string | null;
  answers?: FormateurSubmissionAnswer[] | null;
}

export interface FormateurEvaluationSnapshot {
  exams: FormateurExam[];
  submissions: FormateurEvaluationSubmission[];
  courses: Array<{ id: string | number; title: string }>;
}

export interface FormateurVirtualClass {
  id: string | number;
  course_id: string | number | null;
  title: string;
  course_name: string | null;
  class_date: string;
  class_time: string;
  duration: string | null;
  students_count: number;
  max_students: number;
  status: string;
  provider?: 'jitsi' | 'custom';
  meeting_slug?: string | null;
  recording_enabled?: boolean;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  recording_url: string | null;
  room_link: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  instructor_notes?: string | null;
  allow_chat?: boolean;
  created_at: string;
  instructor_id?: string | null;
}

export interface FormateurVirtualClassesSnapshot {
  classes: FormateurVirtualClass[];
  courses: Array<{ id: string | number; title: string }>;
}

export interface FormateurCommunityCourse {
  id: string | number;
  title: string;
}

export interface FormateurCommunityComment {
  id: string;
  course_id: string | number;
  lesson_id: string | number;
  section_id?: string | number | null;
  lesson_title?: string | null;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  status: 'visible' | 'hidden';
  likes: number;
  pinned: boolean;
  parent_id?: string | null;
  created_at: string;
}

export interface FormateurCommunityFaq {
  id: string;
  course_id: string | number;
  course_name?: string | null;
  question: string;
  answer: string;
  status: 'draft' | 'published' | 'archived';
  position: number;
  instructor_id?: string | null;
}

export interface FormateurCommunitySnapshot {
  courses: FormateurCommunityCourse[];
  comments: FormateurCommunityComment[];
  faqs: FormateurCommunityFaq[];
}

export interface FormateurCourseBundleLessonInput {
  id: string;
  title: string;
  type: FormateurCourseLesson['type'];
  duration: string;
  description: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: FormateurCourseLesson['status'];
  position: number;
}

export interface FormateurCourseBundleSectionInput {
  id: string;
  title: string;
  description: string;
  status: FormateurCourseSection['status'];
  position: number;
  lessons: FormateurCourseBundleLessonInput[];
}

export interface FormateurCourseBundleAssetInput {
  lessonId: string;
  lessonTitle: string;
  asset_type: FormateurLessonAsset['asset_type'];
  title: string;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: number | null;
}

export interface FormateurCourseBundleChoiceInput {
  label: string;
  value: string;
  is_correct: boolean;
}

export interface FormateurCourseBundleQuestionInput {
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
  choices: FormateurCourseBundleChoiceInput[];
}

export interface FormateurCourseBundleExamInput {
  title: string;
  type: FormateurExam['type'];
  exam_date: string;
  participants: number;
  max_grade: number;
  questions: FormateurCourseBundleQuestionInput[];
}

export interface FormateurCourseBundleInput {
  course: {
    title: string;
    category: string;
    description: string;
    level: FormateurCourseLevel;
    delivery_mode: FormateurCourseDeliveryMode;
    duration: string;
    is_free: boolean;
    price: number;
    promotion_percentage: number;
    trailer_url: string;
    thumbnail: string;
  };
  sections: FormateurCourseBundleSectionInput[];
  assets: FormateurCourseBundleAssetInput[];
  exams: FormateurCourseBundleExamInput[];
}

function throwApiError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message || 'Backend request failed.');
  }
}

function getInsertedRecord<T>(data: T | T[] | null | undefined) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

async function fetchInstructorCourses(userId: string) {
  const { data, error } = await backendClient
    .from<FormateurCourse>('courses')
    .select('*')
    .eq('instructor_id', userId)
    .order('updated_at', { ascending: false });
  throwApiError(error);
  return data || [];
}

async function requireInstructorCourse(userId: string, courseId: string | number) {
  const { data, error } = await backendClient
    .from<FormateurCourse>('courses')
    .select('*')
    .eq('id', courseId)
    .eq('instructor_id', userId)
    .single();
  if (error) {
    if ('code' in error && String(error.code) === 'PGRST116') {
      return null;
    }
    throw new Error(error.message || 'Backend request failed.');
  }
  return data;
}

async function fetchInstructorCourseOptions(userId: string) {
  const courses = await fetchInstructorCourses(userId);
  return courses.map((course) => ({ id: course.id, title: course.title }));
}

async function requireInstructorExam(userId: string, examId: string | number) {
  const courseIds = getEntityIds((await fetchInstructorCourses(userId)).map((course) => course.id));
  if (courseIds.length === 0) return null;
  const { data, error } = await backendClient
    .from<FormateurExam>('exams')
    .select('*')
    .eq('id', examId)
    .in('course_id', courseIds)
    .single();
  if (error) {
    if ('code' in error && String(error.code) === 'PGRST116') {
      return null;
    }
    throw new Error(error.message || 'Backend request failed.');
  }
  return data;
}

async function requireInstructorVirtualClass(userId: string, classId: string | number) {
  const courseIds = getEntityIds((await fetchInstructorCourses(userId)).map((course) => course.id));
  if (courseIds.length === 0) return null;
  const { data, error } = await backendClient
    .from<FormateurVirtualClass>('virtual_classes')
    .select('*')
    .eq('id', classId)
    .in('course_id', courseIds)
    .single();
  if (error) {
    if ('code' in error && String(error.code) === 'PGRST116') {
      return null;
    }
    throw new Error(error.message || 'Backend request failed.');
  }
  return data;
}

async function requireInstructorComment(userId: string, commentId: string) {
  const courseIds = getEntityIds((await fetchInstructorCourses(userId)).map((course) => course.id));
  if (courseIds.length === 0) return null;
  const { data, error } = await backendClient
    .from<FormateurCommunityComment>('lesson_comments')
    .select('*')
    .eq('id', commentId)
    .in('course_id', courseIds)
    .single();
  if (error) {
    if ('code' in error && String(error.code) === 'PGRST116') {
      return null;
    }
    throw new Error(error.message || 'Backend request failed.');
  }
  return data;
}

async function requireInstructorFaq(userId: string, faqId: string) {
  const courseIds = getEntityIds((await fetchInstructorCourses(userId)).map((course) => course.id));
  if (courseIds.length === 0) return null;
  const { data, error } = await backendClient
    .from<FormateurCommunityFaq>('course_faq_items')
    .select('*')
    .eq('id', faqId)
    .in('course_id', courseIds)
    .single();
  if (error) {
    if ('code' in error && String(error.code) === 'PGRST116') {
      return null;
    }
    throw new Error(error.message || 'Backend request failed.');
  }
  return data;
}

function getEntityIds(values: Array<string | number | null | undefined>) {
  return values.filter((value): value is string | number => value !== null && value !== undefined && value !== '');
}

async function fetchEnrollmentsForCourseIds(courseIds: Array<string | number>) {
  if (courseIds.length === 0) return [] as FormateurEnrollment[];
  const { data, error } = await backendClient
    .from<FormateurEnrollment>('course_enrollments')
    .select('*')
    .in('course_id', courseIds)
    .order('last_active', { ascending: false });
  throwApiError(error);
  return data || [];
}

async function fetchExamsForCourseIds(courseIds: Array<string | number>) {
  if (courseIds.length === 0) return [] as FormateurExam[];
  const { data, error } = await backendClient
    .from<FormateurExam>('exams')
    .select('*')
    .in('course_id', courseIds)
    .order('exam_date', { ascending: false });
  throwApiError(error);
  return data || [];
}

async function fetchSubmissionsForExamIds(examIds: Array<string | number>) {
  if (examIds.length === 0) return [] as FormateurSubmission[];
  const { data, error } = await backendClient
    .from<FormateurSubmission>('submissions')
    .select('*')
    .in('exam_id', examIds)
    .order('submitted_at', { ascending: false });
  throwApiError(error);
  return data || [];
}

export async function fetchFormateurDashboardSnapshot(user: FormateurDashboardUser): Promise<FormateurDashboardSnapshot> {
  const [courses, finance] = await Promise.all([
    fetchInstructorCourses(user.id),
    fetchFinanceSnapshot(user.id, user.role),
  ]);

  const courseIds = getEntityIds(courses.map((course) => course.id));
  const [students, exams] = await Promise.all([
    fetchEnrollmentsForCourseIds(courseIds),
    fetchExamsForCourseIds(courseIds),
  ]);
  const submissions = await fetchSubmissionsForExamIds(getEntityIds(exams.map((exam) => exam.id)));

  return { courses, students, exams, submissions, finance };
}

export async function fetchFormateurAnalytics(userId: string) {
  const courses = await fetchInstructorCourses(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  const [enrollments, exams] = await Promise.all([
    fetchEnrollmentsForCourseIds(courseIds),
    fetchExamsForCourseIds(courseIds),
  ]);
  const submissions = await fetchSubmissionsForExamIds(getEntityIds(exams.map((exam) => exam.id)));
  return { courses, enrollments, submissions };
}

export async function fetchFormateurRevenueSnapshot(userId: string): Promise<FormateurRevenueSnapshot> {
  const [courses, accounts, requests] = await Promise.all([
    fetchInstructorCourses(userId),
    fetchPayoutAccounts(userId),
    fetchPayoutRequests(userId),
  ]);

  return {
    courses,
    accounts: accounts || [],
    requests: requests || [],
  };
}

export async function fetchFormateurCourses(userId: string) {
  const courses = await fetchInstructorCourses(userId);
  return courses.map((course) => ({
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
  }));
}

export async function createFormateurCourseBundle(userId: string, payload: FormateurCourseBundleInput) {
  let createdCourseId: string | number | null = null;

  try {
    const now = new Date().toISOString();
    const courseInsert = await backendClient.from<{ id: string | number }>('courses').insert({
      instructor_id: userId,
      title: payload.course.title.trim(),
      category: payload.course.category.trim(),
      level: payload.course.level,
      delivery_mode: payload.course.delivery_mode,
      description: payload.course.description.trim(),
      status: 'draft',
      modules: payload.sections.length || 1,
      duration: payload.course.duration.trim(),
      price: payload.course.is_free ? 0 : payload.course.price,
      access_type: payload.course.is_free ? 'free' : 'paid',
      is_free: payload.course.is_free,
      promotion_percentage: payload.course.promotion_percentage,
      trailer_url: payload.course.trailer_url.trim() || null,
      thumbnail: payload.course.thumbnail.trim() || null,
      created_at: now,
      updated_at: now,
    });
    throwApiError(courseInsert.error);

    const createdCourse = getInsertedRecord(courseInsert.data);
    if (!createdCourse?.id) {
      throw new Error('Création du cours impossible.');
    }

    createdCourseId = createdCourse.id;
    const sectionIdMap = new Map<string, string | number>();
    const lessonIdMap = new Map<string, string | number>();
    const lessonSectionMap = new Map<string, string>();

    for (const section of payload.sections) {
      const sectionInsert = await backendClient.from<{ id: string | number }>('course_sections').insert({
        course_id: createdCourseId,
        title: section.title.trim(),
        description: section.description.trim(),
        status: section.status,
        position: section.position,
      });
      throwApiError(sectionInsert.error);

      const createdSection = getInsertedRecord(sectionInsert.data);
      if (!createdSection?.id) {
        throw new Error(`Création du chapitre "${section.title}" impossible.`);
      }

      sectionIdMap.set(section.id, createdSection.id);

      for (const lesson of section.lessons) {
        const lessonInsert = await backendClient.from<{ id: string | number }>('course_lessons').insert({
          course_id: createdCourseId,
          section_id: createdSection.id,
          title: lesson.title.trim(),
          description: lesson.description.trim(),
          type: lesson.type,
          duration: lesson.duration.trim() || null,
          content: lesson.content.trim() || null,
          code_language: lesson.code_language.trim() || 'markdown',
          code_sample: lesson.code_sample.trim() || null,
          exercise_instructions: lesson.exercise_instructions.trim() || null,
          is_preview: lesson.is_preview,
          status: lesson.status,
          position: lesson.position,
        });
        throwApiError(lessonInsert.error);

        const createdLesson = getInsertedRecord(lessonInsert.data);
        if (!createdLesson?.id) {
          throw new Error(`Création de la leçon "${lesson.title}" impossible.`);
        }

        lessonIdMap.set(lesson.id, createdLesson.id);
        lessonSectionMap.set(lesson.id, section.id);
      }
    }

    for (const asset of payload.assets.filter((entry) => entry.url.trim())) {
      const lessonId = lessonIdMap.get(asset.lessonId);
      const sectionDraftId = lessonSectionMap.get(asset.lessonId);
      const sectionId = sectionDraftId ? sectionIdMap.get(sectionDraftId) : null;
      if (!lessonId || !sectionId) continue;

      const assetInsert = await backendClient.from('lesson_assets').insert({
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: createdCourseId,
        title: asset.title.trim() || asset.lessonTitle,
        asset_type: asset.asset_type,
        url: asset.url.trim(),
        thumbnail_url: asset.thumbnail_url.trim() || null,
        mime_type: asset.mime_type.trim() || null,
        size_bytes: asset.size_bytes,
        status: asset.asset_type === 'video' ? 'processing' : 'ready',
      });
      throwApiError(assetInsert.error);
    }

    for (const exam of payload.exams) {
      const examInsert = await backendClient.from<{ id: string | number }>('exams').insert({
        instructor_id: userId,
        course_id: createdCourseId,
        title: exam.title.trim(),
        type: exam.type,
        exam_date: exam.exam_date,
        participants: exam.participants,
        submitted: 0,
        avg_grade: null,
        status: 'upcoming',
        max_grade: exam.max_grade,
      });
      throwApiError(examInsert.error);

      const createdExam = getInsertedRecord(examInsert.data);
      if (!createdExam?.id) {
        throw new Error(`Création de l évaluation "${exam.title}" impossible.`);
      }

      for (let questionIndex = 0; questionIndex < exam.questions.length; questionIndex += 1) {
        const question = exam.questions[questionIndex];
        const questionInsert = await backendClient.from<{ id: string | number }>('quiz_questions').insert({
          exam_id: createdExam.id,
          prompt: question.prompt.trim(),
          type: question.type,
          points: question.points,
          explanation: question.explanation.trim(),
          required: question.required,
          position: questionIndex + 1,
        });
        throwApiError(questionInsert.error);

        const createdQuestion = getInsertedRecord(questionInsert.data);
        if (!createdQuestion?.id) {
          throw new Error(`Création de la question "${question.prompt}" impossible.`);
        }

        for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex += 1) {
          const choice = question.choices[choiceIndex];
          if (!choice.label.trim()) continue;

          const choiceInsert = await backendClient.from('quiz_choices').insert({
            question_id: createdQuestion.id,
            label: choice.label.trim(),
            value: choice.value.trim() || choice.label.trim(),
            is_correct: choice.is_correct,
            position: choiceIndex + 1,
          });
          throwApiError(choiceInsert.error);
        }
      }
    }

    return {
      id: createdCourseId,
      title: payload.course.title.trim(),
      category: payload.course.category.trim(),
      description: payload.course.description.trim(),
      level: payload.course.level,
      delivery_mode: payload.course.delivery_mode,
      duration: payload.course.duration.trim(),
      is_free: payload.course.is_free,
      price: payload.course.is_free ? 0 : payload.course.price,
      promotion_percentage: payload.course.promotion_percentage,
      trailer_url: payload.course.trailer_url.trim() || null,
      thumbnail: payload.course.thumbnail.trim() || null,
      modules: payload.sections.length || 1,
    } as const;
  } catch (reason: unknown) {
    const detail = reason && typeof reason === 'object' && 'message' in reason
      ? String(reason.message)
      : 'Impossible de finaliser la création de la formation.';
    throw new Error(
      createdCourseId
        ? `${detail} Le cours a été créé partiellement. Reprenez-le ensuite depuis la liste.`
        : detail,
    );
  }
}

export async function updateFormateurCourse(userId: string, courseId: string | number, payload: Record<string, unknown>) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient
    .from('courses')
    .update(payload)
    .eq('id', courseId);
  throwApiError(error);
}

export async function updateFormateurCourseWorkflow(userId: string, courseId: string | number, status: string) {
  await updateFormateurCourse(userId, courseId, {
    status,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteFormateurCourse(userId: string, courseId: string | number) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('courses').delete().eq('id', courseId);
  throwApiError(error);
}

export async function fetchFormateurCourseProgram(userId: string, courseId: string | number): Promise<FormateurCourseProgramSnapshot> {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) {
    return { course: null, sections: [], lessons: [], assets: [] };
  }

  const [
    { data: sectionsData, error: sectionsError },
    { data: lessonsData, error: lessonsError },
    { data: assetsData, error: assetsError },
  ] = await Promise.all([
    backendClient.from<FormateurCourseSection>('course_sections').select('*').eq('course_id', courseId).order('position', { ascending: true }),
    backendClient.from<FormateurCourseLesson>('course_lessons').select('*').eq('course_id', courseId).order('position', { ascending: true }),
    backendClient.from<FormateurLessonAsset>('lesson_assets').select('*').eq('course_id', courseId).order('position', { ascending: true }),
  ]);

  throwApiError(sectionsError);
  throwApiError(lessonsError);
  throwApiError(assetsError);

  return {
    course,
    sections: sectionsData || [],
    lessons: (lessonsData || []).map((lesson) => ({ ...lesson, is_preview: Boolean(lesson.is_preview) })),
    assets: assetsData || [],
  };
}

export async function saveFormateurCourseSection(userId: string, courseId: string | number, input: {
  id?: string | number;
  title: string;
  description: string;
  status: 'draft' | 'published';
  position?: number;
}) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const payload = {
    course_id: courseId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    position: input.position,
  };
  const response = input.id
    ? await backendClient.from('course_sections').update(payload).eq('id', input.id)
    : await backendClient.from('course_sections').insert(payload);
  throwApiError(response.error);
}

export async function saveFormateurCourseLesson(userId: string, courseId: string | number, input: {
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
}) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const payload = {
    course_id: courseId,
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
  const response = input.id
    ? await backendClient.from('course_lessons').update(payload).eq('id', input.id)
    : await backendClient.from('course_lessons').insert(payload);
  throwApiError(response.error);
}

export async function saveFormateurLessonAsset(userId: string, courseId: string | number, input: {
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
}) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
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
  const response = input.id
    ? await backendClient.from('lesson_assets').update(payload).eq('id', input.id)
    : await backendClient.from('lesson_assets').insert(payload);
  throwApiError(response.error);
}

export async function deleteFormateurCourseSection(userId: string, courseId: string | number, sectionId: string | number) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('course_sections').delete().eq('id', sectionId);
  throwApiError(error);
}

export async function deleteFormateurCourseLesson(userId: string, courseId: string | number, lessonId: string | number) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('course_lessons').delete().eq('id', lessonId);
  throwApiError(error);
}

export async function deleteFormateurLessonAsset(userId: string, courseId: string | number, assetId: string | number) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('lesson_assets').delete().eq('id', assetId);
  throwApiError(error);
}

export async function reorderFormateurCourseSections(userId: string, courseId: string | number, current: Pick<FormateurCourseSection, 'id' | 'position'>, target: Pick<FormateurCourseSection, 'id' | 'position'>) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const [updateCurrent, updateTarget] = await Promise.all([
    backendClient.from('course_sections').update({ position: target.position }).eq('id', current.id),
    backendClient.from('course_sections').update({ position: current.position }).eq('id', target.id),
  ]);
  throwApiError(updateCurrent.error);
  throwApiError(updateTarget.error);
}

export async function reorderFormateurCourseLessons(userId: string, courseId: string | number, current: Pick<FormateurCourseLesson, 'id' | 'position'>, target: Pick<FormateurCourseLesson, 'id' | 'position'>) {
  const course = await requireInstructorCourse(userId, courseId);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const [updateCurrent, updateTarget] = await Promise.all([
    backendClient.from('course_lessons').update({ position: target.position }).eq('id', current.id),
    backendClient.from('course_lessons').update({ position: current.position }).eq('id', target.id),
  ]);
  throwApiError(updateCurrent.error);
  throwApiError(updateTarget.error);
}

export async function fetchFormateurCertificates(userId: string) {
  const courses = await fetchInstructorCourses(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  if (courseIds.length === 0) return [] as FormateurCertificate[];

  const { data, error } = await backendClient
    .from<FormateurCertificate>('certificates')
    .select('*')
    .in('course_id', courseIds)
    .order('created_at', { ascending: false });
  throwApiError(error);
  return data || [];
}

export async function issueFormateurCertificate(cert: Pick<FormateurCertificate, 'id'>) {
  const newCertId = `C2P-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${String(cert.id).padStart(3, '0')}`;
  const issuedAt = new Date().toISOString();
  const { error } = await backendClient
    .from('certificates')
    .update({ status: 'issued', certificate_id: newCertId, issued_at: issuedAt })
    .eq('id', cert.id);
  throwApiError(error);
  return { certificateId: newCertId, issuedAt };
}

export async function deleteFormateurCertificate(certId: number) {
  const { error } = await backendClient.from('certificates').delete().eq('id', certId);
  throwApiError(error);
}

export async function fetchFormateurLearners(userId: string) {
  const courses = await fetchInstructorCourses(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  if (courseIds.length === 0) {
    return { courses: [] as FormateurCourse[], enrollments: [] as FormateurLearnerEnrollment[] };
  }

  const { data, error } = await backendClient
    .from<FormateurLearnerEnrollment>('course_enrollments')
    .select('*, courses(id, title, category, modules, duration, status)')
    .in('course_id', courseIds)
    .order('last_active', { ascending: false });
  throwApiError(error);

  return {
    courses,
    enrollments: data || [],
  };
}

export async function fetchFormateurLearnerDetail(userId: string, studentId: string): Promise<FormateurLearnerDetail> {
  const courses = await fetchInstructorCourses(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  if (courseIds.length === 0) {
    return { enrollments: [], submissions: [], certificates: [] };
  }

  const [enrollmentsRes, exams] = await Promise.all([
    backendClient
      .from<FormateurLearnerEnrollment>('course_enrollments')
      .select('*, courses(id, title, category, modules, duration, status)')
      .eq('student_id', studentId)
      .in('course_id', courseIds)
      .order('progress', { ascending: false }),
    fetchExamsForCourseIds(courseIds),
  ]);

  throwApiError(enrollmentsRes.error);

  const examIds = getEntityIds(exams.map((exam) => exam.id));
  const [submissionsRes, certificatesRes] = await Promise.all([
    examIds.length === 0
      ? Promise.resolve({ data: [] as FormateurSubmission[], error: null })
      : backendClient
        .from<FormateurSubmission>('submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('exam_id', examIds)
        .order('submitted_at', { ascending: false }),
    backendClient
      .from<FormateurLearnerCertificate>('certificates')
      .select('*')
      .eq('student_id', studentId)
      .in('course_id', courseIds)
      .order('issued_at', { ascending: false }),
  ]);

  throwApiError(submissionsRes.error);
  throwApiError(certificatesRes.error);

  const examsById = new Map(exams.map((exam) => [String(exam.id), exam]));
  return {
    enrollments: enrollmentsRes.data || [],
    submissions: ((submissionsRes.data || []) as FormateurSubmission[]).map((submission) => ({
      ...submission,
      exam: examsById.get(String(submission.exam_id)) || null,
    })),
    certificates: certificatesRes.data || [],
  };
}

export async function fetchFormateurEvaluations(userId: string): Promise<FormateurEvaluationSnapshot> {
  const courses = await fetchInstructorCourseOptions(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  const exams = await fetchExamsForCourseIds(courseIds);
  const examIds = getEntityIds(exams.map((exam) => exam.id));
  const { data, error } = examIds.length === 0
    ? { data: [] as FormateurEvaluationSubmission[], error: null }
    : await backendClient
      .from<FormateurEvaluationSubmission>('submissions')
      .select('*')
      .in('exam_id', examIds)
      .order('submitted_at', { ascending: false });
  throwApiError(error);
  return {
    exams,
    submissions: data || [],
    courses,
  };
}

export async function fetchFormateurQuizStructure(userId: string, examId: string | number) {
  const exam = await requireInstructorExam(userId, examId);
  if (!exam) {
    return { questions: [] as FormateurQuizQuestion[], choices: [] as FormateurQuizChoice[] };
  }
  const [questionsRes, choicesRes] = await Promise.all([
    backendClient.from<FormateurQuizQuestion>('quiz_questions').select('*').eq('exam_id', examId).order('position', { ascending: true }),
    backendClient.from<FormateurQuizChoice>('quiz_choices').select('*').eq('exam_id', examId).order('position', { ascending: true }),
  ]);
  throwApiError(questionsRes.error);
  throwApiError(choicesRes.error);
  return {
    questions: (questionsRes.data || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    choices: (choicesRes.data || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  };
}

export async function gradeFormateurSubmission(userId: string, input: {
  submissionId: string | number;
  examId: string | number;
  studentId: string;
  examTitle: string;
  grade: number;
  maxGrade: number;
  feedback: string;
}) {
  const exam = await requireInstructorExam(userId, input.examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { error } = await backendClient
    .from('submissions')
    .update({ grade: input.grade, feedback: input.feedback, status: 'graded' })
    .eq('id', input.submissionId);
  throwApiError(error);
  await notifyApprenantGradePublished(input.studentId, input.examTitle, input.grade, input.maxGrade);
}

export async function createFormateurExam(userId: string, payload: {
  course_id: string | number;
  title: string;
  course_name: string;
  type: string;
  exam_date: string | null | undefined;
  participants: number;
  submitted: number;
  status: string;
  max_grade: number;
}) {
  const course = await requireInstructorCourse(userId, payload.course_id);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('exams').insert({
    instructor_id: userId,
    course_id: payload.course_id,
    title: payload.title,
    course_name: payload.course_name,
    type: payload.type,
    exam_date: payload.exam_date,
    participants: payload.participants,
    submitted: payload.submitted,
    avg_grade: null,
    status: payload.status,
    max_grade: payload.max_grade,
  });
  throwApiError(error);
}

export async function deleteFormateurExam(userId: string, examId: string | number) {
  const exam = await requireInstructorExam(userId, examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { error } = await backendClient.from('exams').delete().eq('id', examId);
  throwApiError(error);
}

export async function createFormateurQuizQuestion(userId: string, input: {
  examId: string | number;
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
}) {
  const exam = await requireInstructorExam(userId, input.examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { data, error } = await backendClient.from<FormateurQuizQuestion>('quiz_questions').insert({
    exam_id: input.examId,
    prompt: input.prompt.trim(),
    type: input.type,
    points: input.points,
    explanation: input.explanation.trim(),
    required: input.required,
  });
  throwApiError(error);
  const created = Array.isArray(data) ? data[0] : data;
  if (created && input.type === 'true_false') {
    const { error: createChoicesErr } = await backendClient.from('quiz_choices').insert([
      { question_id: created.id, exam_id: input.examId, label: 'Vrai', value: 'true', is_correct: false },
      { question_id: created.id, exam_id: input.examId, label: 'Faux', value: 'false', is_correct: false },
    ]);
    throwApiError(createChoicesErr);
  }
}

export async function updateFormateurQuizQuestion(userId: string, question: Pick<FormateurQuizQuestion, 'id' | 'exam_id'>, draft: {
  prompt: string;
  type: FormateurQuizQuestion['type'];
  points: number;
  explanation: string;
  required: boolean;
}, existingChoicesCount: number) {
  const exam = await requireInstructorExam(userId, question.exam_id);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { error } = await backendClient.from('quiz_questions').update({
    prompt: draft.prompt.trim(),
    type: draft.type,
    points: draft.points,
    explanation: draft.explanation.trim(),
    required: draft.required,
  }).eq('id', question.id);
  throwApiError(error);

  if (draft.type === 'open' && existingChoicesCount > 0) {
    const { error: deleteErr } = await backendClient.from('quiz_choices').delete().eq('question_id', question.id);
    throwApiError(deleteErr);
  }

  if (draft.type === 'true_false' && existingChoicesCount === 0) {
    const { error: createChoicesErr } = await backendClient.from('quiz_choices').insert([
      { question_id: question.id, exam_id: question.exam_id, label: 'Vrai', value: 'true', is_correct: false },
      { question_id: question.id, exam_id: question.exam_id, label: 'Faux', value: 'false', is_correct: false },
    ]);
    throwApiError(createChoicesErr);
  }
}

export async function deleteFormateurQuizQuestion(userId: string, question: Pick<FormateurQuizQuestion, 'id' | 'exam_id'>) {
  const exam = await requireInstructorExam(userId, question.exam_id);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { error } = await backendClient.from('quiz_questions').delete().eq('id', question.id);
  throwApiError(error);
}

export async function reorderFormateurQuizQuestion(userId: string, examId: string | number, current: Pick<FormateurQuizQuestion, 'id' | 'position'>, target: Pick<FormateurQuizQuestion, 'id' | 'position'>) {
  const exam = await requireInstructorExam(userId, examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const [firstRes, secondRes] = await Promise.all([
    backendClient.from('quiz_questions').update({ position: target.position }).eq('id', current.id),
    backendClient.from('quiz_questions').update({ position: current.position }).eq('id', target.id),
  ]);
  throwApiError(firstRes.error);
  throwApiError(secondRes.error);
}

export async function createFormateurQuizChoice(userId: string, input: {
  examId: string | number;
  questionId: string | number;
  label: string;
  value: string;
  is_correct: boolean;
  resetOtherCorrectChoices?: Array<string | number>;
}) {
  const exam = await requireInstructorExam(userId, input.examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  if (input.resetOtherCorrectChoices?.length) {
    await Promise.allSettled(
      input.resetOtherCorrectChoices.map((id) => backendClient.from('quiz_choices').update({ is_correct: false }).eq('id', id)),
    );
  }
  const { error } = await backendClient.from('quiz_choices').insert({
    question_id: input.questionId,
    exam_id: input.examId,
    label: input.label.trim(),
    value: input.value.trim() || input.label.trim(),
    is_correct: input.is_correct,
  });
  throwApiError(error);
}

export async function updateFormateurQuizChoice(userId: string, input: {
  examId: string | number;
  choiceId: string | number;
  label: string;
  value: string;
  is_correct: boolean;
  resetOtherCorrectChoices?: Array<string | number>;
}) {
  const exam = await requireInstructorExam(userId, input.examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  if (input.resetOtherCorrectChoices?.length) {
    await Promise.allSettled(
      input.resetOtherCorrectChoices.map((id) => backendClient.from('quiz_choices').update({ is_correct: false }).eq('id', id)),
    );
  }
  const { error } = await backendClient.from('quiz_choices').update({
    label: input.label.trim(),
    value: input.value.trim() || input.label.trim(),
    is_correct: input.is_correct,
  }).eq('id', input.choiceId);
  throwApiError(error);
}

export async function deleteFormateurQuizChoice(userId: string, examId: string | number, choiceId: string | number) {
  const exam = await requireInstructorExam(userId, examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const { error } = await backendClient.from('quiz_choices').delete().eq('id', choiceId);
  throwApiError(error);
}

export async function reorderFormateurQuizChoice(userId: string, examId: string | number, current: Pick<FormateurQuizChoice, 'id' | 'position'>, target: Pick<FormateurQuizChoice, 'id' | 'position'>) {
  const exam = await requireInstructorExam(userId, examId);
  if (!exam) throw new Error('Évaluation introuvable ou inaccessible.');
  const [firstRes, secondRes] = await Promise.all([
    backendClient.from('quiz_choices').update({ position: target.position }).eq('id', current.id),
    backendClient.from('quiz_choices').update({ position: current.position }).eq('id', target.id),
  ]);
  throwApiError(firstRes.error);
  throwApiError(secondRes.error);
}

export async function fetchFormateurVirtualClasses(userId: string): Promise<FormateurVirtualClassesSnapshot> {
  const courses = await fetchInstructorCourseOptions(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  if (courseIds.length === 0) return { classes: [], courses };
  const { data, error } = await backendClient
    .from<FormateurVirtualClass>('virtual_classes')
    .select('*')
    .in('course_id', courseIds)
    .order('class_date', { ascending: true });
  throwApiError(error);
  return {
    classes: (data || []).map((virtualClass) => ({
      class_time: '',
      duration: null,
      max_students: 30,
      provider: 'jitsi',
      meeting_slug: null,
      recording_enabled: true,
      recording_status: 'pending',
      recording_url: null,
      room_link: null,
      started_at: null,
      ended_at: null,
      instructor_notes: null,
      allow_chat: true,
      status: 'scheduled',
      students_count: 0,
      ...virtualClass,
    })),
    courses,
  };
}

export async function updateFormateurVirtualClassStatus(userId: string, classId: string | number, status: string) {
  const virtualClass = await requireInstructorVirtualClass(userId, classId);
  if (!virtualClass) throw new Error('Classe introuvable ou inaccessible.');
  const { error } = await backendClient.from('virtual_classes').update({ status }).eq('id', classId);
  throwApiError(error);
}

export async function createFormateurVirtualClass(userId: string, payload: {
  course_id: string | number;
  title: string;
  course_name: string;
  class_date: string;
  class_time: string;
  duration: string;
  max_students: number;
  provider: 'jitsi' | 'custom';
  meeting_slug: string;
  room_link: string;
  recording_enabled: boolean;
  recording_url: string;
  instructor_notes: string;
  allow_chat: boolean;
}) {
  const course = await requireInstructorCourse(userId, payload.course_id);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('virtual_classes').insert({
    instructor_id: userId,
    course_id: payload.course_id,
    title: payload.title,
    course_name: payload.course_name,
    class_date: payload.class_date,
    class_time: payload.class_time,
    duration: payload.duration || null,
    max_students: payload.max_students || 30,
    students_count: 0,
    provider: payload.provider,
    meeting_slug: payload.meeting_slug || null,
    room_link: payload.room_link || null,
    recording_enabled: payload.recording_enabled,
    recording_url: payload.recording_url || null,
    instructor_notes: payload.instructor_notes || null,
    allow_chat: payload.allow_chat,
    status: 'scheduled',
  });
  throwApiError(error);
}

export async function updateFormateurVirtualClass(userId: string, classId: string | number, payload: Record<string, unknown>) {
  const virtualClass = await requireInstructorVirtualClass(userId, classId);
  if (!virtualClass) throw new Error('Classe introuvable ou inaccessible.');
  const { error } = await backendClient.from('virtual_classes').update(payload).eq('id', classId);
  throwApiError(error);
}

export async function deleteFormateurVirtualClass(userId: string, classId: string | number) {
  const virtualClass = await requireInstructorVirtualClass(userId, classId);
  if (!virtualClass) throw new Error('Classe introuvable ou inaccessible.');
  const { error } = await backendClient.from('virtual_classes').delete().eq('id', classId);
  throwApiError(error);
}

export async function fetchFormateurCommunity(userId: string): Promise<FormateurCommunitySnapshot> {
  const courses = await fetchInstructorCourseOptions(userId);
  const courseIds = getEntityIds(courses.map((course) => course.id));
  if (courseIds.length === 0) return { courses, comments: [], faqs: [] };
  const [commentsRes, faqsRes] = await Promise.all([
    backendClient.from<FormateurCommunityComment>('lesson_comments').select('*').in('course_id', courseIds).order('created_at', { ascending: false }),
    backendClient.from<FormateurCommunityFaq>('course_faq_items').select('*').in('course_id', courseIds).order('position', { ascending: true }),
  ]);
  throwApiError(commentsRes.error);
  throwApiError(faqsRes.error);
  return {
    courses,
    comments: commentsRes.data || [],
    faqs: faqsRes.data || [],
  };
}

export async function moderateFormateurCommunityComment(userId: string, commentId: string, patch: Partial<FormateurCommunityComment>) {
  const comment = await requireInstructorComment(userId, commentId);
  if (!comment) throw new Error('Commentaire introuvable ou inaccessible.');
  const { error } = await backendClient.from('lesson_comments').update(patch).eq('id', commentId);
  throwApiError(error);
}

export async function replyToFormateurCommunityComment(userId: string, commentId: string, content: string) {
  const comment = await requireInstructorComment(userId, commentId);
  if (!comment) throw new Error('Commentaire introuvable ou inaccessible.');
  const { error } = await backendClient.from('lesson_comments').insert({
    course_id: comment.course_id,
    lesson_id: comment.lesson_id,
    section_id: comment.section_id,
    parent_id: comment.id,
    content,
  });
  throwApiError(error);
}

export async function createFormateurFaq(userId: string, payload: {
  course_id: string | number;
  question: string;
  answer: string;
  status: FormateurCommunityFaq['status'];
}) {
  const course = await requireInstructorCourse(userId, payload.course_id);
  if (!course) throw new Error('Formation introuvable ou inaccessible.');
  const { error } = await backendClient.from('course_faq_items').insert({
    course_id: payload.course_id,
    question: payload.question,
    answer: payload.answer,
    status: payload.status,
  });
  throwApiError(error);
}

export async function updateFormateurFaqStatus(userId: string, faqId: string, status: FormateurCommunityFaq['status']) {
  const faq = await requireInstructorFaq(userId, faqId);
  if (!faq) throw new Error('FAQ introuvable ou inaccessible.');
  const { error } = await backendClient.from('course_faq_items').update({ status }).eq('id', faqId);
  throwApiError(error);
}
