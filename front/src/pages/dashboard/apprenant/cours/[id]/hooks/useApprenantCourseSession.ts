import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  fetchApprenantCourseDetail,
  submitApprenantCourseQuizAttempt,
  updateApprenantCourseActivity,
  updateApprenantEnrollmentProgress,
  updateApprenantLessonProgress,
} from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { XP_REWARDS } from '../storage';
import type { EntityId, Lesson } from '../types';
import {
  findResumeLesson,
  getBookmarkedLessonIds,
  getCompletedLessonIds,
  getCourseLessons,
  getCourseProgress,
  getInitialVideoTime,
  getLessonCompletionReward,
  getLessonNotes,
} from './courseSessionHelpers';
import { useCourseNotesControls } from './useCourseNotesControls';
import { useCourseSessionTimer } from './useCourseSessionTimer';

export function useApprenantCourseSession(courseIdParam?: string) {
  const [searchParams] = useSearchParams();
  const { success, info } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<EntityId>>(new Set());
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<EntityId>>(new Set());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showXpToast, setShowXpToast] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const videoPositionSyncRef = useRef<Record<string, number>>({});

  const courseQueryKey = queryKeys.apprenant.courseDetail(user?.id, courseIdParam);
  const apprenantQueryKey = queryKeys.apprenant.root(user?.id);

  const { data: course = null, isLoading: loading } = useQuery({
    queryKey: courseQueryKey,
    queryFn: () => fetchApprenantCourseDetail(user?.id ?? '', courseIdParam ?? ''),
    enabled: Boolean(courseIdParam && user?.id),
  });

  const enrollmentProgressMutation = useMutation({
    mutationFn: (input: { progress: number; completedLessons: number; completedLessonIds?: EntityId[] }) => {
      if (!user?.id || !course?.id) throw new Error('Contexte apprenant incomplet.');
      return updateApprenantEnrollmentProgress(user.id, course.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apprenantQueryKey });
      void queryClient.invalidateQueries({ queryKey: courseQueryKey });
    },
  });

  const lessonProgressMutation = useMutation({
    mutationFn: (input: {
      lessonId: EntityId;
      progress?: number;
      completed?: boolean;
      bookmarked?: boolean;
      note?: string | null;
      videoPositionSeconds?: number;
    }) => {
      if (!user?.id || !course?.id) throw new Error('Contexte apprenant incomplet.');
      const { lessonId, ...payload } = input;
      return updateApprenantLessonProgress(user.id, course.id, lessonId, payload);
    },
  });

  const activityMutation = useMutation({
    mutationFn: (input: { learningTimeSecondsDelta: number }) => {
      if (!user?.id || !course?.id) throw new Error('Contexte apprenant incomplet.');
      return updateApprenantCourseActivity(user.id, course.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apprenantQueryKey });
    },
  });

  const quizAttemptMutation = useMutation({
    mutationFn: (input: { answers: Record<number, number> | Record<string, number> }) => {
      if (!user?.id || !course?.id) throw new Error('Contexte apprenant incomplet.');
      return submitApprenantCourseQuizAttempt(user.id, course.id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKey });
      void queryClient.invalidateQueries({ queryKey: apprenantQueryKey });
    },
  });

  const courseId = course?.id ?? null;
  const resumeRequested = searchParams.get('resume') === '1';

  const {
    handleCloseNotes,
    handleOpenNotes,
    handleSaveNote,
    notes,
    notesModalOpen,
    notesTargetLesson,
    setNotes,
  } = useCourseNotesControls({
    saveLessonNote: (lessonId, note) => {
      lessonProgressMutation.mutate({
        lessonId,
        note,
      });
    },
    success,
  });

  const syncLearningActivity = useCallback((learningTimeSecondsDelta: number, onError: (error: unknown) => void) => {
    activityMutation.mutate({ learningTimeSecondsDelta }, { onError });
  }, [activityMutation]);

  const { sessionTimer, showSessionTimer } = useCourseSessionTimer({
    enabled: Boolean(courseId && user?.id),
    syncLearningActivity,
  });

  const syncEnrollmentProgress = useCallback((completedLessonIds: Set<EntityId>) => {
    if (!user?.id || !course) return;
    const totalLessons = Math.max(0, course.totalLessons);
    const completedCount = Math.min(completedLessonIds.size, totalLessons);
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    enrollmentProgressMutation.mutate({
      progress,
      completedLessons: completedCount,
      completedLessonIds: Array.from(completedLessonIds),
    });
  }, [course, enrollmentProgressMutation, user?.id]);

  useEffect(() => {
    if (!course) return;
    const defaultCompleted = getCompletedLessonIds(course);
    setCompletedLessons(defaultCompleted);
    setBookmarkedLessons(getBookmarkedLessonIds(course));
    setNotes(getLessonNotes(course));

    const resumeLesson = findResumeLesson(course, defaultCompleted);
    if (resumeLesson) {
      setActiveLesson(resumeLesson);
    }
  }, [course, resumeRequested, setNotes]);

  const handleCompleteLesson = (lessonId: EntityId) => {
    if (!course) return;
    const next = new Set(completedLessons);
    const wasCompleted = next.has(lessonId);

    if (wasCompleted) {
      next.delete(lessonId);
    } else {
      next.add(lessonId);
      const lesson = getCourseLessons(course).find((item) => item.id === lessonId);
      const xp = getLessonCompletionReward(lesson);

      setXpGained(xp);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 2500);

      success(`+${xp} XP — Leçon complétée`, 'Votre progression a été enregistrée.');
    }

    if (wasCompleted) {
      info('Leçon marquée non complétée', '');
    }

    lessonProgressMutation.mutate({
      lessonId,
      progress: wasCompleted ? 0 : 100,
      completed: !wasCompleted,
    });
    syncEnrollmentProgress(next);
    setCompletedLessons(next);
  };

  const toggleBookmark = (lessonId: EntityId) => {
    const next = new Set(bookmarkedLessons);
    if (next.has(lessonId)) {
      next.delete(lessonId);
      info('Favori retiré', '');
    } else {
      next.add(lessonId);
      success('Ajouté aux favoris', 'Cette leçon est maintenant dans vos marque-pages.');
    }
    lessonProgressMutation.mutate({
      lessonId,
      bookmarked: next.has(lessonId),
    });
    setBookmarkedLessons(next);
  };

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    lessonProgressMutation.mutate({ lessonId: lesson.id });
  };

  const getInitialLessonVideoTime = (lessonId: EntityId) => getInitialVideoTime(course, lessonId);

  const handleVideoProgress = (lessonId: EntityId, seconds: number) => {
    const normalized = Math.max(0, Math.floor(seconds));
    const previous = videoPositionSyncRef.current[lessonId] ?? getInitialLessonVideoTime(lessonId);
    if (Math.abs(normalized - previous) < 10) return;
    videoPositionSyncRef.current[lessonId] = normalized;
    lessonProgressMutation.mutate({
      lessonId,
      videoPositionSeconds: normalized,
    });
  };

  const handleResetProgress = () => {
    if (!course) return;
    syncEnrollmentProgress(new Set());
    videoPositionSyncRef.current = {};
    void Promise.all(getCourseLessons(course).map((lesson) =>
      lessonProgressMutation.mutateAsync({
        lessonId: lesson.id,
        progress: 0,
        completed: false,
        bookmarked: false,
        note: null,
        videoPositionSeconds: 0,
      }).catch((error: unknown) => {
        console.warn('Unable to reset lesson state', error);
      }),
    ));
    setCompletedLessons(new Set());
    setBookmarkedLessons(new Set());
    setNotes({});
    setActiveLesson(null);
    setShowResetConfirm(false);
    info('Progression réinitialisée', 'Toutes vos données de progression pour ce cours ont été remises à zéro.');
  };

  const handleQuizComplete = (score: number, total: number, answers: Record<number, number>) => {
    const xp = score === total ? XP_REWARDS.quizPerfect : XP_REWARDS.quizComplete;
    setXpGained(xp);
    setShowXpToast(true);
    setTimeout(() => setShowXpToast(false), 2500);
    quizAttemptMutation.mutate({ answers });

    if (activeLesson?.type === 'quiz' && !completedLessons.has(activeLesson.id)) {
      const next = new Set(completedLessons);
      next.add(activeLesson.id);
      lessonProgressMutation.mutate({
        lessonId: activeLesson.id,
        progress: 100,
        completed: true,
      });
      syncEnrollmentProgress(next);
      setCompletedLessons(next);
    }
  };

  const currentProgress = getCourseProgress(course, completedLessons);

  return {
    course,
    loading,
    activeLesson,
    completedLessons,
    bookmarkedLessons,
    notes,
    notesModalOpen,
    notesTargetLesson,
    showResetConfirm,
    xpGained,
    showXpToast,
    showMobileSidebar,
    sessionTimer,
    showSessionTimer,
    currentProgress,
    setShowResetConfirm,
    setShowMobileSidebar,
    handleOpenNotes,
    handleCloseNotes,
    handleSaveNote,
    handleCompleteLesson,
    handleQuizComplete,
    handleBadgesUnlocked: () => undefined,
    handleResetProgress,
    toggleBookmark,
    selectLesson,
    getInitialVideoTime: getInitialLessonVideoTime,
    handleVideoProgress,
  };
}
