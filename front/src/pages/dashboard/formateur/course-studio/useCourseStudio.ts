import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  applyFormateurCurriculumOrder,
  deleteFormateurCourseLesson,
  deleteFormateurCourseSection,
  deleteFormateurLessonAsset,
  fetchFormateurCourseProgram,
  fetchFormateurVirtualClasses,
  saveFormateurCourseLesson,
  saveFormateurCourseSection,
  saveFormateurLessonAsset,
  updateFormateurCourse,
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildSubmissionChecklist,
  formatClock,
  formatDuration,
  readErrorMessage,
  totalProgramSeconds,
  type EntityId,
  type StudioAsset,
  type StudioCourse,
  type StudioLesson,
  type StudioLessonType,
  type StudioProgram,
} from './studioModel';
import { assetTypeForFile, readVideoDurationSeconds, uploadCourseFile } from './studioUploads';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type CurriculumOrder = Array<{ id: string; lesson_ids: string[] }>;

function lessonPayload(lesson: StudioLesson, patch: Partial<StudioLesson> = {}) {
  const next = { ...lesson, ...patch };
  return {
    id: next.id,
    section_id: String(next.section_id),
    title: next.title,
    description: next.description ?? '',
    type: next.type,
    duration: next.duration ?? '',
    content: next.content ?? '',
    code_language: next.code_language ?? '',
    code_sample: next.code_sample ?? '',
    exercise_instructions: next.exercise_instructions ?? '',
    is_preview: Boolean(next.is_preview),
    status: 'published' as const,
    position: next.position,
  };
}

export function useCourseStudio(courseId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const subscriptionGate = gateFor('trainer_courses_manage');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const pending = useRef(0);
  const queryKey = useMemo(() => queryKeys.formateur.courseProgram(userId, courseId), [courseId, userId]);

  const programQuery = useQuery({
    queryKey,
    queryFn: async () => fetchFormateurCourseProgram(userId, courseId ?? '') as unknown as Promise<StudioProgram>,
    enabled: Boolean(courseId && userId),
  });
  const program = programQuery.data ?? null;
  const liveQuery = useQuery({
    queryKey: queryKeys.formateur.virtualClasses(userId),
    queryFn: () => fetchFormateurVirtualClasses(userId),
    enabled: Boolean(userId),
  });
  const liveSessions = useMemo(
    () => (liveQuery.data?.classes ?? []).filter((session) => String(session.course_id) === String(courseId)),
    [courseId, liveQuery.data?.classes],
  );

  const setProgram = useCallback(
    (updater: (current: StudioProgram) => StudioProgram) =>
      queryClient.setQueryData<StudioProgram>(queryKey, (current) => (current ? updater(current) : current)),
    [queryClient, queryKey],
  );

  /** Runs one server write, tracking the global "Enregistrement..." indicator. */
  const run = useCallback(async <T,>(task: () => Promise<T>, failure: string, options: { refetch?: boolean } = {}) => {
    pending.current += 1;
    setSaveState('saving');
    try {
      const result = await task();
      if (options.refetch !== false) await queryClient.invalidateQueries({ queryKey });
      setSavedAt(new Date());
      setSaveState(pending.current > 1 ? 'saving' : 'saved');
      return result;
    } catch (reason) {
      setSaveState('error');
      error('Enregistrement impossible', readErrorMessage(reason, failure));
      await queryClient.invalidateQueries({ queryKey });
      return null;
    } finally {
      pending.current -= 1;
    }
  }, [error, queryClient, queryKey]);

  const patchCourse = useCallback(async (fields: Partial<StudioCourse> & Record<string, unknown>) => {
    if (!courseId) return null;
    setProgram((current) => ({ ...current, course: { ...current.course, ...fields } }));
    const updated = await run(
      () => updateFormateurCourse(userId, courseId, fields) as unknown as Promise<StudioCourse>,
      'Impossible d’enregistrer la formation.',
      { refetch: false },
    );
    if (updated) setProgram((current) => ({ ...current, course: { ...current.course, ...updated } }));
    return updated;
  }, [courseId, run, setProgram, userId]);

  // Udemy-style total length: kept in sync with the lecture durations unless the trainer typed one.
  const computedDuration = useMemo(() => formatDuration(totalProgramSeconds(program?.lessons ?? [])), [program?.lessons]);
  const autoDuration = program ? (program.course as unknown as Record<string, unknown>).duration_auto !== false : false;
  const lastAutoDuration = useRef<string | null>(null);
  useEffect(() => {
    if (!program || !autoDuration || !computedDuration || program.course.duration === computedDuration) return;
    if (lastAutoDuration.current === computedDuration) return; // one attempt per value: no retry loop on error
    lastAutoDuration.current = computedDuration;
    void patchCourse({ duration: computedDuration, duration_auto: true });
  }, [autoDuration, computedDuration, patchCourse, program]);

  const addSection = (title: string) => run(
    () => saveFormateurCourseSection(userId, courseId ?? '', {
      title,
      description: '',
      status: 'published',
      position: (program?.sections.length ?? 0) + 1,
    }),
    'Impossible d’ajouter la section.',
  );

  const updateSection = (sectionId: EntityId, fields: { title: string; description: string }) => run(
    () => saveFormateurCourseSection(userId, courseId ?? '', { id: sectionId, ...fields, status: 'published' }),
    'Impossible de modifier la section.',
  );

  const removeSection = (sectionId: EntityId) => run(
    () => deleteFormateurCourseSection(userId, courseId ?? '', sectionId),
    'Impossible de supprimer la section.',
  );

  const addLesson = (sectionId: EntityId, type: StudioLessonType, title: string) => {
    const siblings = (program?.lessons ?? []).filter((lesson) => String(lesson.section_id) === String(sectionId));
    return run(
      () => saveFormateurCourseLesson(userId, courseId ?? '', {
        ...lessonPayload({
          id: '', course_id: courseId ?? '', section_id: sectionId, title, description: '', type,
          duration: '', position: siblings.length + 1, is_preview: false, status: 'published',
        }),
        id: undefined,
      }) as unknown as Promise<StudioLesson>,
      'Impossible d’ajouter la leçon.',
    );
  };

  const updateLesson = (lesson: StudioLesson, patch: Partial<StudioLesson>) => {
    setProgram((current) => ({
      ...current,
      lessons: current.lessons.map((entry) => (String(entry.id) === String(lesson.id) ? { ...entry, ...patch } : entry)),
    }));
    return run(
      () => saveFormateurCourseLesson(userId, courseId ?? '', lessonPayload(lesson, patch)),
      'Impossible d’enregistrer la leçon.',
    );
  };

  const removeLesson = (lessonId: EntityId) => run(
    () => deleteFormateurCourseLesson(userId, courseId ?? '', lessonId),
    'Impossible de supprimer la leçon.',
  );

  const saveAsset = (lesson: StudioLesson, asset: Omit<StudioAsset, 'id' | 'section_id' | 'course_id' | 'position' | 'lesson_id'> & { id?: EntityId }) =>
    saveFormateurLessonAsset(userId, courseId ?? '', {
      id: asset.id,
      lesson_id: String(lesson.id),
      title: asset.title,
      asset_type: asset.asset_type,
      url: asset.url,
      thumbnail_url: asset.thumbnail_url ?? '',
      mime_type: asset.mime_type ?? '',
      size_bytes: asset.size_bytes ? String(asset.size_bytes) : '',
      status: asset.status,
    });

  /** Uploads the lecture video (replacing the previous one) and fills in its duration. */
  const uploadLessonVideo = async (lesson: StudioLesson, file: File, onProgress: (value: number) => void) => {
    if (!courseId) return null;
    const seconds = await readVideoDurationSeconds(file);
    return run(async () => {
      const uploaded = await uploadCourseFile(file, { courseId, lessonId: lesson.id, kind: 'lesson' }, onProgress);
      const previous = (program?.assets ?? []).filter((asset) => String(asset.lesson_id) === String(lesson.id) && asset.asset_type === 'video');
      await saveAsset(lesson, {
        id: previous[0]?.id, title: file.name, asset_type: 'video', url: uploaded.url,
        thumbnail_url: null, mime_type: file.type, size_bytes: file.size, status: 'ready',
      });
      await Promise.all(previous.slice(1).map((asset) => deleteFormateurLessonAsset(userId, courseId, asset.id)));
      if (seconds) await saveFormateurCourseLesson(userId, courseId, lessonPayload(lesson, { duration: formatClock(seconds) }));
      return uploaded;
    }, 'L’envoi de la vidéo a échoué.');
  };

  const addResourceFile = async (lesson: StudioLesson, file: File, onProgress: (value: number) => void) => {
    if (!courseId) return null;
    return run(async () => {
      const uploaded = await uploadCourseFile(file, { courseId, lessonId: lesson.id, kind: 'lesson' }, onProgress);
      const assetType = assetTypeForFile(file);
      return saveAsset(lesson, {
        title: file.name, asset_type: assetType === 'video' ? 'archive' : assetType, url: uploaded.url,
        thumbnail_url: null, mime_type: file.type, size_bytes: file.size, status: 'ready',
      });
    }, 'L’envoi de la ressource a échoué.');
  };

  const addResourceLink = (lesson: StudioLesson, title: string, url: string) => run(
    () => saveAsset(lesson, { title, asset_type: 'link', url, thumbnail_url: null, mime_type: null, size_bytes: null, status: 'ready' }),
    'Impossible d’ajouter le lien.',
  );

  const removeAsset = (assetId: EntityId) => run(
    () => deleteFormateurLessonAsset(userId, courseId ?? '', assetId),
    'Impossible de supprimer la ressource.',
  );

  /** Drag & drop: optimistic reorder, then the server applies the same full order. */
  const applyOrder = (order: CurriculumOrder) => {
    setProgram((current) => {
      const sectionPosition = new Map(order.map((entry, index) => [entry.id, index + 1]));
      const lessonPlacement = new Map(order.flatMap((entry) => entry.lesson_ids.map((id, index) => [id, { section_id: entry.id, position: index + 1 }] as const)));
      return {
        ...current,
        sections: current.sections.map((section) => ({ ...section, position: sectionPosition.get(String(section.id)) ?? section.position })),
        lessons: current.lessons.map((lesson) => ({ ...lesson, ...(lessonPlacement.get(String(lesson.id)) ?? {}) })),
      };
    });
    return run(() => applyFormateurCurriculumOrder(courseId ?? '', order), 'Impossible d’enregistrer le nouvel ordre.');
  };

  const changeStatus = async (status: 'review' | 'draft', message: string) => {
    const updated = await run(() => updateFormateurCourseWorkflow(userId, courseId ?? '', status), 'Changement de statut impossible.');
    if (updated) {
      success(status === 'review' ? 'Formation soumise' : 'Formation repassée en brouillon', message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.formateur.root(userId) });
    }
    return updated;
  };

  const plannedLive = liveSessions.filter((session) => session.status !== 'cancelled').length;
  const checklist = useMemo(() => (program ? buildSubmissionChecklist(program, plannedLive) : []), [plannedLive, program]);

  return {
    addLesson,
    addResourceFile,
    addResourceLink,
    addSection,
    applyOrder,
    autoDuration,
    changeStatus,
    checklist,
    computedDuration,
    liveLoading: liveQuery.isLoading,
    liveSessions,
    patchCourse,
    program,
    programQuery,
    removeAsset,
    removeLesson,
    removeSection,
    saveState,
    savedAt,
    subscriptionGate,
    updateLesson,
    updateSection,
    uploadLessonVideo,
    user,
  };
}

export type CourseStudio = ReturnType<typeof useCourseStudio>;
