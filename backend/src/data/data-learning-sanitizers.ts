import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import {
  clone,
  compareValues,
  findRow,
  store,
} from './data-app-store.js';
import { getInstructorCourseIds, getStudentCourseIds } from './data-actor-scope.js';
import {
  resolveInstructorCourse,
  resolveInstructorExam,
  resolveInstructorLesson,
  resolveQuizQuestion,
} from './data-instructor-resolvers.js';
import {
  buildJitsiRoomUrl,
  ensureFutureDateString,
  ensureFutureDateTime,
  isValidAbsoluteUrl,
  normalizeLiveProvider,
  normalizeMeetingSlug,
  parseBoolean,
  requireIdentifier,
  requireInteger,
  requireNumberInRange,
  requireNumberOrFallback,
  requireText,
  toNumber,
  trimText,
} from './data-normalizers.js';

export function sanitizeLessonCommentRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('lesson_comments', normalized.id) : null;
  const parsedLessonId = requireIdentifier(normalized.lesson_id ?? existing?.lesson_id, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);
  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }
  const parsedSectionId = requireIdentifier(lesson.section_id, 'La section associee est invalide.');
  const section = findRow('course_sections', parsedSectionId);
  if (!section) {
    throw new BadRequestException('La section associee est introuvable.');
  }
  const parsedCourseId = requireIdentifier(lesson.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const isModerator = isAdminRole(user) || (user.role === 'formateur' && String(course.instructor_id) === user.id);
  const isStudentOnCourse = user.role === 'apprenant' && getStudentCourseIds(user.id).includes(String(parsedCourseId));
  if (!isModerator && !isStudentOnCourse && !(existing && String(existing.user_id) === user.id)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  if (existing) {
    const isOwner = String(existing.user_id) === user.id;
    if (!isOwner && !isModerator) {
      throw new UnauthorizedException('Acces refuse.');
    }
  }

  normalized.course_id = parsedCourseId;
  normalized.section_id = parsedSectionId;
  normalized.lesson_id = parsedLessonId;
  normalized.course_name = String(course.title);
  normalized.lesson_title = String(lesson.title);
  normalized.user_id = existing?.user_id ?? user.id;
  normalized.user_name = existing?.user_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.user_role = existing?.user_role ?? user.role;
  normalized.content = requireText(normalized.content, 'Le commentaire est obligatoire.');
  normalized.parent_id = trimText(normalized.parent_id);
  if (normalized.parent_id) {
    const parent = findRow('lesson_comments', normalized.parent_id);
    if (!parent || String(parent.lesson_id) !== String(parsedLessonId)) {
      throw new BadRequestException('Le commentaire parent est invalide.');
    }
  }

  normalized.status = trimText(normalized.status) ?? existing?.status ?? 'visible';
  if (!new Set(['visible', 'hidden']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut du commentaire est invalide.');
  }
  if (!isModerator) {
    normalized.status = existing?.status ?? 'visible';
    normalized.pinned = existing?.pinned ?? false;
  } else {
    normalized.pinned = parseBoolean(normalized.pinned, Boolean(existing?.pinned));
  }
  normalized.likes = toNumber(existing?.likes) ?? 0;
  return normalized;
}

export function sanitizeLessonProgressRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('lesson_progress', normalized.id) : null;
  const parsedLessonId = requireIdentifier(normalized.lesson_id ?? existing?.lesson_id, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);
  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }
  const parsedSectionId = requireIdentifier(lesson.section_id, 'La section associee est invalide.');
  const parsedCourseId = requireIdentifier(lesson.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const targetStudentId = requireIdentifier(normalized.student_id ?? existing?.student_id ?? user.id, 'L apprenant associe est invalide.');
  if (!isAdminRole(user)) {
    if (user.role !== 'apprenant') {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (targetStudentId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (!getStudentCourseIds(user.id).includes(parsedCourseId)) {
      throw new UnauthorizedException('Inscription requise.');
    }
  }

  const requestedProgress = toNumber(normalized.progress);
  if (requestedProgress !== null && (requestedProgress < 0 || requestedProgress > 100)) {
    throw new BadRequestException('La progression de la lecon est invalide.');
  }

  const completed = parseBoolean(
    normalized.completed,
    parseBoolean(existing?.completed, false) || (requestedProgress ?? requireNumberOrFallback(existing?.progress, 0)) >= 100,
  );
  const progress = completed
    ? 100
    : Math.round(Math.max(0, Math.min(100, requestedProgress ?? requireNumberOrFallback(existing?.progress, 0))));

  normalized.course_id = parsedCourseId;
  normalized.section_id = parsedSectionId;
  normalized.lesson_id = parsedLessonId;
  normalized.course_name = String(course.title);
  normalized.lesson_title = String(lesson.title);
  normalized.student_id = targetStudentId;
  normalized.student_name = existing?.student_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.progress = progress;
  normalized.completed = completed;
  normalized.status = completed ? 'completed' : (progress > 0 ? 'in_progress' : 'not_started');
  normalized.first_viewed_at = trimText(existing?.first_viewed_at) ?? new Date().toISOString();
  normalized.last_viewed_at = new Date().toISOString();
  normalized.completed_at = completed ? trimText(existing?.completed_at) ?? new Date().toISOString() : null;
  return normalized;
}

export function sanitizeCourseReviewRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('course_reviews', normalized.id) : null;
  const parsedCourseId = requireIdentifier(normalized.course_id ?? existing?.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const targetStudentId = requireIdentifier(normalized.student_id ?? existing?.student_id ?? user.id, 'L apprenant associe est invalide.');
  if (!isAdminRole(user)) {
    if (user.role !== 'apprenant') {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (targetStudentId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (existing && String(existing.student_id) !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const enrollment = (store.course_enrollments ?? []).find(
      (entry) =>
        String(entry.student_id) === user.id &&
        String(entry.course_id) === parsedCourseId,
    );
    if (!enrollment) {
      throw new UnauthorizedException('Inscription requise.');
    }
    const progress = toNumber(enrollment.progress) ?? 0;
    if (progress <= 0 && String(enrollment.status) !== 'completed') {
      throw new BadRequestException('Suivez au moins une lecon avant de publier un avis.');
    }
  }

  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.student_id = targetStudentId;
  normalized.student_name = existing?.student_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.student_avatar = trimText(existing?.student_avatar) ?? trimText(user.avatar);
  normalized.rating = requireInteger(normalized.rating ?? existing?.rating, 1, 5, 'La note doit etre comprise entre 1 et 5.');
  normalized.comment = requireText(normalized.comment ?? existing?.comment, 'Le commentaire de l avis est obligatoire.');
  normalized.status = trimText(normalized.status) ?? trimText(existing?.status) ?? 'published';
  if (!new Set(['published', 'hidden']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut de l avis est invalide.');
  }
  if (!isAdminRole(user)) {
    normalized.status = 'published';
  }
  return normalized;
}

export function sanitizeCourseFaqRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.instructor_id = course.instructor_id;
  normalized.question = requireText(normalized.question, 'La question FAQ est obligatoire.');
  normalized.answer = requireText(normalized.answer, 'La reponse FAQ est obligatoire.');
  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_faq_items ?? []).filter((item) => String(item.course_id) === parsedCourseId).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position FAQ est invalide.');
  }
  normalized.status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published', 'archived']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut FAQ est invalide.');
  }
  return normalized;
}

export function sanitizeLessonAssetRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { lesson, section, course, parsedLessonId, parsedSectionId, parsedCourseId } = resolveInstructorLesson(normalized.lesson_id, user);
  normalized.lesson_id = parsedLessonId;
  normalized.section_id = parsedSectionId;
  normalized.course_id = parsedCourseId;
  normalized.lesson_title = String(lesson.title);
  normalized.section_title = String(section.title);
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre du contenu est obligatoire.');

  const assetType = trimText(normalized.asset_type) ?? 'link';
  if (!new Set(['video', 'pdf', 'audio', 'archive', 'slides', 'link', 'code']).has(assetType)) {
    throw new BadRequestException('Le type de contenu est invalide.');
  }
  normalized.asset_type = assetType;

  const url = requireText(normalized.url, 'L URL du contenu est obligatoire.');
  if (!isValidAbsoluteUrl(url)) {
    throw new BadRequestException('L URL du contenu doit etre valide.');
  }
  normalized.url = url;

  const thumbnailUrl = trimText(normalized.thumbnail_url);
  if (thumbnailUrl && !isValidAbsoluteUrl(thumbnailUrl)) {
    throw new BadRequestException('La miniature doit etre une URL valide.');
  }
  normalized.thumbnail_url = thumbnailUrl;
  normalized.mime_type = trimText(normalized.mime_type);

  if (normalized.size_bytes !== undefined && normalized.size_bytes !== null && normalized.size_bytes !== '') {
    normalized.size_bytes = requireInteger(normalized.size_bytes, 0, Number.MAX_SAFE_INTEGER, 'La taille du contenu est invalide.');
  } else {
    normalized.size_bytes = null;
  }

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.lesson_assets ?? []).filter((asset) => String(asset.lesson_id) === String(parsedLessonId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 999, 'La position du contenu est invalide.');
  }

  const status = trimText(normalized.status) ?? 'ready';
  if (!new Set(['processing', 'ready']).has(status)) {
    throw new BadRequestException('Le statut du contenu est invalide.');
  }
  normalized.status = status;
  return normalized;
}

export function sanitizeVirtualClassRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la classe est obligatoire.');
  const classDate = requireText(normalized.class_date, 'La date de la classe est obligatoire.');
  const classTime = requireText(normalized.class_time, 'L heure de la classe est obligatoire.');
  normalized.class_date = classDate;
  normalized.class_time = classTime;
  normalized.duration = trimText(normalized.duration);
  normalized.provider = normalizeLiveProvider(normalized.provider);
  normalized.meeting_slug = normalizeMeetingSlug(normalized.meeting_slug, [course.title, normalized.title, classDate, classTime]);
  normalized.max_students = requireInteger(normalized.max_students ?? 30, 1, 500, 'Le nombre maximal de participants doit etre compris entre 1 et 500.');
  normalized.students_count = requireInteger(normalized.students_count ?? 0, 0, 500, 'Le nombre de participants est invalide.');
  let roomLink = trimText(normalized.room_link);
  const recordingUrl = trimText(normalized.recording_url);
  normalized.room_link = roomLink;
  normalized.recording_url = recordingUrl;
  normalized.recording_enabled = parseBoolean(normalized.recording_enabled, true);
  normalized.allow_chat = parseBoolean(normalized.allow_chat, true);
  normalized.instructor_notes = trimText(normalized.instructor_notes);
  normalized.started_at = trimText(normalized.started_at);
  normalized.ended_at = trimText(normalized.ended_at);

  if (normalized.instructor_notes && String(normalized.instructor_notes).length > 1200) {
    throw new BadRequestException('Les notes formateur sont trop longues.');
  }

  if (normalized.provider === 'jitsi') {
    roomLink = buildJitsiRoomUrl(String(normalized.meeting_slug));
    normalized.room_link = roomLink;
  }

  if (roomLink && !isValidAbsoluteUrl(roomLink)) {
    throw new BadRequestException('Le lien de la salle doit etre une URL valide.');
  }
  if (recordingUrl && !isValidAbsoluteUrl(recordingUrl)) {
    throw new BadRequestException('Le lien d enregistrement doit etre une URL valide.');
  }

  const status = trimText(normalized.status) ?? 'scheduled';
  if (!new Set(['scheduled', 'live', 'ended', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut de la classe virtuelle est invalide.');
  }
  normalized.status = status;

  if (!roomLink && normalized.provider === 'custom' && status !== 'cancelled') {
    throw new BadRequestException('Le lien de la salle est obligatoire pour un live personnalise.');
  }

  const recordingStatus = trimText(normalized.recording_status);
  if (recordingStatus && !new Set(['none', 'pending', 'processing', 'ready']).has(recordingStatus)) {
    throw new BadRequestException('Le statut de replay est invalide.');
  }

  if (status === 'scheduled') {
    ensureFutureDateTime(classDate, classTime, 'La classe doit etre programmee sur un horaire futur.');
    normalized.started_at = null;
    normalized.ended_at = null;
  }

  if (status === 'live') {
    normalized.started_at = normalized.started_at ?? new Date().toISOString();
    normalized.ended_at = null;
  }

  if (status === 'ended') {
    normalized.started_at = normalized.started_at ?? new Date(`${classDate}T${classTime}:00`).toISOString();
    normalized.ended_at = normalized.ended_at ?? new Date().toISOString();
  }

  if (status === 'cancelled') {
    normalized.recording_url = null;
    normalized.recording_status = 'none';
    return normalized;
  }

  normalized.recording_status = recordingUrl
    ? 'ready'
    : normalized.recording_enabled
      ? (status === 'ended' ? 'processing' : 'pending')
      : 'none';

  return normalized;
}

export function sanitizeExamRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de l examen est obligatoire.');
  const examDate = requireText(normalized.exam_date, 'La date de l examen est obligatoire.');
  const participants = requireInteger(normalized.participants ?? 0, 0, 10000, 'Le nombre de participants est invalide.');
  const submitted = requireInteger(normalized.submitted ?? 0, 0, 10000, 'Le nombre de soumissions est invalide.');
  normalized.exam_date = examDate;
  normalized.participants = participants;
  normalized.submitted = submitted;
  normalized.max_grade = requireNumberInRange(normalized.max_grade ?? 20, 1, 100, 'La note maximale doit etre comprise entre 1 et 100.');
  normalized.instructions = trimText(normalized.instructions);
  if (normalized.instructions && String(normalized.instructions).length > 1500) {
    throw new BadRequestException('La consigne ne peut pas depasser 1500 caracteres.');
  }
  const attachments = Array.isArray(normalized.attachments) ? normalized.attachments : [];
  if (attachments.length > 8) {
    throw new BadRequestException('Un examen ne peut pas avoir plus de 8 fichiers joints.');
  }
  normalized.attachments = attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object') {
      throw new BadRequestException('Le fichier joint est invalide.');
    }
    const record = attachment as Record<string, unknown>;
    const name = requireText(record.name, 'Le nom du fichier joint est obligatoire.');
    const url = requireText(record.url, 'L url du fichier joint est obligatoire.');
    const mimeType = trimText(record.mimeType) ?? 'application/octet-stream';
    const resourceType = trimText(record.resourceType) ?? 'raw';
    if (!['image', 'video', 'raw'].includes(resourceType)) {
      throw new BadRequestException('Le type du fichier joint est invalide.');
    }
    return {
      name: name.slice(0, 180),
      url,
      size: requireInteger(record.size ?? 0, 0, 5 * 1024 * 1024 * 1024, 'La taille du fichier joint est invalide.'),
      mimeType,
      resourceType,
    };
  });

  const type = trimText(normalized.type) ?? 'quiz';
  if (!new Set(['quiz', 'assignment', 'project']).has(type)) {
    throw new BadRequestException('Le type d examen est invalide.');
  }
  normalized.type = type;

  const courseDeliveryMode = String(course.delivery_mode ?? 'online');
  if (new Set(['assignment', 'project']).has(type) && !new Set(['hybrid', 'onsite']).has(courseDeliveryMode)) {
    throw new BadRequestException('Les devoirs et projets sont reserves aux formations hybrides ou presentielles.');
  }

  const status = trimText(normalized.status) ?? 'upcoming';
  if (!new Set(['upcoming', 'ongoing', 'graded', 'closed']).has(status)) {
    throw new BadRequestException('Le statut de l examen est invalide.');
  }
  normalized.status = status;

  if (submitted > participants) {
    normalized.participants = submitted;
  }

  if (status === 'upcoming') {
    ensureFutureDateString(examDate, 'Un examen a venir doit avoir une date valide et non depassee.');
  }

  return normalized;
}

export function sanitizeQuizQuestionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { exam, course, parsedExamId, parsedCourseId } = resolveInstructorExam(normalized.exam_id, user);

  if (String(exam.type) !== 'quiz') {
    throw new BadRequestException('Les questions structurees sont reservees aux examens de type quiz.');
  }

  normalized.exam_id = parsedExamId;
  normalized.exam_title = String(exam.title);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.prompt = requireText(normalized.prompt, 'L intitule de la question est obligatoire.');
  normalized.explanation = trimText(normalized.explanation) ?? '';
  normalized.points = requireInteger(normalized.points ?? 1, 1, 100, 'Le nombre de points de la question est invalide.');
  normalized.required = parseBoolean(normalized.required, true);

  const type = trimText(normalized.type) ?? 'single_choice';
  if (!new Set(['single_choice', 'multiple_choice', 'true_false', 'open']).has(type)) {
    throw new BadRequestException('Le type de question est invalide.');
  }
  normalized.type = type;

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.quiz_questions ?? []).filter((question) => String(question.exam_id) === String(parsedExamId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position de la question est invalide.');
  }

  return normalized;
}

export function sanitizeQuizChoiceRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { question, exam, course, parsedQuestionId, parsedExamId, parsedCourseId } = resolveQuizQuestion(normalized.question_id, user);

  if (String(question.type) === 'open') {
    throw new BadRequestException('Une question ouverte ne peut pas contenir de choix.');
  }

  normalized.question_id = parsedQuestionId;
  normalized.question_prompt = String(question.prompt);
  normalized.question_type = String(question.type);
  normalized.exam_id = parsedExamId;
  normalized.exam_title = String(exam.title);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.label = requireText(normalized.label, 'Le libelle du choix est obligatoire.');
  normalized.value = trimText(normalized.value) ?? normalized.label;
  normalized.is_correct = parseBoolean(normalized.is_correct, false);

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(parsedQuestionId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position du choix est invalide.');
  }

  const siblingChoices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(parsedQuestionId));
  const otherCorrectChoices = siblingChoices.filter(
    (choice) => String(choice.id) !== String(normalized.id) && Boolean(choice.is_correct),
  );

  if (normalized.is_correct && new Set(['single_choice', 'true_false']).has(String(question.type)) && otherCorrectChoices.length > 0) {
    throw new BadRequestException('Une seule bonne reponse est autorisee pour cette question.');
  }

  if (String(question.type) === 'true_false' && siblingChoices.filter((choice) => String(choice.id) !== String(normalized.id)).length >= 2) {
    throw new BadRequestException('Une question vrai/faux ne peut contenir que deux choix.');
  }

  return normalized;
}

export function sanitizeSubmissionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const examId = requireIdentifier(normalized.exam_id, 'L examen associe est invalide.');
  const exam = findRow('exams', examId);

  if (!exam) {
    throw new BadRequestException('L examen associe est introuvable.');
  }

  const enrolled = (store.course_enrollments ?? []).some(
    (enrollment) => String(enrollment.course_id) === String(exam.course_id) && String(enrollment.student_id) === String(user.id),
  );
  if (!enrolled) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.exam_id = examId;
  normalized.student_id = user.id;
  normalized.student_name = trimText(normalized.student_name) ?? normalized.student_name ?? user.id;
  normalized.student_avatar = trimText(normalized.student_avatar);
  normalized.feedback = trimText(normalized.feedback);
  normalized.submitted_at = normalized.submitted_at ?? new Date().toISOString();

  const status = trimText(normalized.status) ?? 'pending';
  if (!new Set(['pending', 'graded', 'late']).has(status)) {
    throw new BadRequestException('Le statut de la soumission est invalide.');
  }
  normalized.status = status;

  if (String(exam.type) === 'quiz') {
    const questions = (store.quiz_questions ?? [])
      .filter((question) => String(question.exam_id) === examId)
      .sort((left, right) => compareValues(left.position, right.position));
    const hasOpenQuestions = questions.some((question) => String(question.type) === 'open');
    let autoEarnedPoints = 0;
    let autoTotalPoints = 0;

    if (questions.length === 0) {
      throw new BadRequestException('Ce quiz n a pas encore de questions configurees.');
    }

    const rawAnswers = Array.isArray(normalized.answers) ? normalized.answers : [];
    const sanitizedAnswers = questions.map((question) => {
      const rawAnswer = rawAnswers.find((answer) => String((answer as Row).question_id) === String(question.id)) as Row | undefined;
      const questionType = String(question.type);
      const required = Boolean(question.required ?? true);

      if (questionType === 'open') {
        const answerText = trimText(rawAnswer?.answer_text);
        if (required && !answerText) {
          throw new BadRequestException('Toutes les questions obligatoires du quiz doivent etre renseignees.');
        }
        return {
          question_id: question.id,
          question_prompt: question.prompt,
          question_type: question.type,
          answer_text: answerText,
          selected_choice_ids: [],
          correct_choice_ids: [],
          is_correct: null,
          points: toNumber(question.points) ?? 0,
          earned_points: null,
        };
      }

      const questionChoices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(question.id));
      const selectedChoiceIds = Array.isArray(rawAnswer?.selected_choice_ids)
        ? Array.from(new Set((rawAnswer?.selected_choice_ids as unknown[]).map(String)))
        : rawAnswer?.selected_choice_id
          ? [String(rawAnswer.selected_choice_id)]
          : [];

      if (required && selectedChoiceIds.length === 0) {
        throw new BadRequestException('Toutes les questions obligatoires du quiz doivent etre renseignees.');
      }

      const validChoiceIds = new Set(questionChoices.map((choice) => String(choice.id)));
      if (selectedChoiceIds.some((choiceId) => !validChoiceIds.has(choiceId))) {
        throw new BadRequestException('Une reponse de quiz est invalide.');
      }

      if (new Set(['single_choice', 'true_false']).has(questionType) && selectedChoiceIds.length > 1) {
        throw new BadRequestException('Une question a choix unique ne peut recevoir qu une reponse.');
      }

      const correctChoiceIds = questionChoices
        .filter((choice) => Boolean(choice.is_correct))
        .map((choice) => String(choice.id));
      const selectedChoiceLabels = questionChoices
        .filter((choice) => selectedChoiceIds.map(String).includes(String(choice.id)))
        .map((choice) => String(choice.label ?? choice.value ?? choice.id));
      const correctChoiceLabels = questionChoices
        .filter((choice) => correctChoiceIds.includes(String(choice.id)))
        .map((choice) => String(choice.label ?? choice.value ?? choice.id));
      const questionPoints = toNumber(question.points) ?? 0;
      const selectedSet = new Set(selectedChoiceIds.map(String));
      const isCorrect = correctChoiceIds.length > 0
        && selectedSet.size === correctChoiceIds.length
        && correctChoiceIds.every((choiceId) => selectedSet.has(choiceId));

      autoTotalPoints += Math.max(0, questionPoints);
      if (isCorrect) {
        autoEarnedPoints += Math.max(0, questionPoints);
      }

      return {
        question_id: question.id,
        question_prompt: question.prompt,
        question_type: question.type,
        answer_text: null,
        selected_choice_ids: selectedChoiceIds,
        correct_choice_ids: correctChoiceIds,
        selected_choice_labels: selectedChoiceLabels,
        correct_choice_labels: correctChoiceLabels,
        is_correct: isCorrect,
        points: questionPoints,
        earned_points: isCorrect ? questionPoints : 0,
      };
    });

    normalized.answers = sanitizedAnswers;
    normalized.file_name = 'Quiz structure';
    normalized.file_url = null;
    if (!hasOpenQuestions) {
      const maxGrade = autoTotalPoints > 0 ? autoTotalPoints : requireNumberOrFallback(exam.max_grade, 20);
      normalized.grade = autoTotalPoints > 0 ? Number(((autoEarnedPoints / autoTotalPoints) * maxGrade).toFixed(2)) : 0;
      normalized.feedback = `Quiz corrige automatiquement : ${autoEarnedPoints}/${autoTotalPoints} point(s).`;
      normalized.status = 'graded';
      normalized.graded_at = normalized.submitted_at;
    } else {
      normalized.grade = null;
      normalized.status = 'pending';
    }
  } else {
    normalized.file_name = trimText(normalized.file_name) ?? 'Reponse';
    normalized.file_url = requireText(normalized.file_url, 'La reponse de la soumission est obligatoire.');
  }

  return normalized;
}

export function sanitizeSubmissionUpdateRecord(existingRow: Row, payload: Row, user: AuthUser) {
  if (user.role !== 'formateur' && !isAdminRole(user)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const exam = findRow('exams', existingRow.exam_id);
  if (!exam) {
    throw new BadRequestException('L examen associe est introuvable.');
  }

  if (!isAdminRole(user)) {
    const courseIds = getInstructorCourseIds(user.id);
    const ownsExam = String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id));
    if (!ownsExam) {
      throw new UnauthorizedException('Acces refuse.');
    }
  }

  const maxGrade = requireNumberInRange(exam.max_grade ?? 20, 1, 100, 'La note maximale est invalide.');
  const grade = requireNumberInRange(payload.grade, 0, maxGrade, `La note doit etre comprise entre 0 et ${maxGrade}.`);
  const feedback = trimText(payload.feedback) ?? '';
  if (feedback.length > 500) {
    throw new BadRequestException('Le commentaire ne peut pas depasser 500 caracteres.');
  }

  return {
    grade,
    feedback,
    status: 'graded',
    graded_at: payload.graded_at ?? new Date().toISOString(),
  };
}
