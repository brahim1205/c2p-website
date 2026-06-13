import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  createEspaceLessonComment,
  fetchEspaceCourseContext,
  fetchEspaceLessonComments,
  fetchEspaceVirtualClass,
  updateEspaceLessonProgress,
} from '@/lib/espaceNumeriqueApi';
import type { Course, EspaceLessonRow, Lesson, LessonComment, LessonProgressRecord, Module, VirtualClass } from './classeVirtuelleTypes';

export function useClasseVirtuelleSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [vclass, setVclass] = useState<VirtualClass | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Array<{ id: string | number; title: string }>>([]);
  const [lessons, setLessons] = useState<EspaceLessonRow[]>([]);
  const [lessonProgressRecords, setLessonProgressRecords] = useState<LessonProgressRecord[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string | number; progress?: number; status?: string } | null>(null);
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string>('1');

  const progressByLesson = useMemo(() => {
    const map = new Map<string, { id: string | number; progress: number; completed: boolean }>();
    lessonProgressRecords.forEach((entry) => {
      map.set(String(entry.lesson_id), {
        id: entry.id,
        progress: Number(entry.progress || 0),
        completed: Boolean(entry.completed) || Number(entry.progress || 0) >= 100,
      });
    });
    return map;
  }, [lessonProgressRecords]);

  const courseModules = useMemo<Module[]>(() => {
    if (!course) {
      return [];
    }

    if (sections.length > 0) {
      return sections.map((section, sectionIndex) => ({
        id: String(section.id),
        title: section.title || `Module ${sectionIndex + 1}`,
        lessons: lessons
          .filter((lesson) => String(lesson.section_id) === String(section.id))
          .map((lesson) => ({
            id: String(lesson.id),
            sectionId: String(section.id),
            title: lesson.title,
            duration: lesson.duration || 'À définir',
            type: lesson.type === 'assignment' ? 'exercise' : lesson.type,
            completed: Boolean(progressByLesson.get(String(lesson.id))?.completed),
            locked: false,
            progress: Number(progressByLesson.get(String(lesson.id))?.progress ?? 0),
          })),
      }));
    }

    return buildFallbackModules(course);
  }, [course, lessons, progressByLesson, sections]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError('ID de classe manquant');
        setLoading(false);
        return;
      }
      try {
        const snapshot = await fetchEspaceVirtualClass(id, Boolean(user?.id));
        const vData = snapshot.virtualClass;
        setVclass(vData as VirtualClass);

        if (vData.course_id) {
          const context = user?.id
            ? await fetchEspaceCourseContext(vData.course_id).catch(() => ({ enrollment: null, lessonProgress: [] }))
            : { enrollment: null, lessonProgress: [] };
          setCourse(snapshot.course as Course | null);
          setSections((snapshot.sections || []) as Array<{ id: string | number; title: string }>);
          setLessons((snapshot.lessons || []) as EspaceLessonRow[]);
          setLessonProgressRecords((context.lessonProgress || []) as LessonProgressRecord[]);
          setEnrollment((context.enrollment as { id: string | number; progress?: number; status?: string } | null) || null);
        }
      } catch (err) {
        setError('Erreur de chargement');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [id, user?.id]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!currentLesson?.id || !user?.id) {
        setComments([]);
        return;
      }
      setLoadingComments(true);
      try {
        const data = await fetchEspaceLessonComments(currentLesson.id);
        setComments((data || []) as LessonComment[]);
      } catch (err) {
        console.error(err);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    void fetchComments();
  }, [currentLesson?.id, user?.id]);

  useEffect(() => {
    if (courseModules.length === 0) return;
    const firstUncompleted = courseModules[0]?.lessons.find((lesson) => !lesson.completed && !lesson.locked);
    const fallbackLesson = firstUncompleted || courseModules[0]?.lessons[0] || null;
    setCurrentLesson((prev) => prev ?? fallbackLesson);
  }, [courseModules]);

  const totalLessons = courseModules.reduce((acc, module) => acc + module.lessons.length, 0);
  const completedLessons = courseModules.reduce((acc, module) => acc + module.lessons.filter((lesson) => lesson.completed).length, 0);
  const progress = totalLessons > 0
    ? Math.round(courseModules.flatMap((module) => module.lessons).reduce((sum, lesson) => sum + Number(lesson.progress ?? 0), 0) / totalLessons)
    : 0;
  const canTrackProgress = Boolean(user?.id && (user.role === 'admin' || user.role === 'apprenant') && (user.role === 'admin' || enrollment));

  const handleMarkLessonComplete = async () => {
    if (!currentLesson || !course?.id) return;
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour suivre votre progression.');
      return;
    }
    if (!canTrackProgress) {
      info('Inscription requise', 'Inscrivez-vous à la formation pour enregistrer votre progression.');
      return;
    }

    setProgressSaving(true);
    try {
      const existingProgress = progressByLesson.get(String(currentLesson.id));
      const saved = await updateEspaceLessonProgress(course.id, currentLesson.id, {
        section_id: currentLesson.sectionId,
        progress: 100,
        completed: true,
      });
      if (existingProgress) {
        const updated = saved as LessonProgressRecord;
        setLessonProgressRecords((current) => current.map((entry) => (String(entry.id) === String(updated.id) ? updated : entry)));
      } else {
        const created = saved as LessonProgressRecord;
        setLessonProgressRecords((current) => [created, ...current]);
      }

      success('Progression mise à jour', `La leçon "${currentLesson.title}" est marquée comme terminée.`);
    } catch (err) {
      console.error(err);
      toastError('Erreur', "Impossible d'enregistrer votre progression pour cette leçon.");
    } finally {
      setProgressSaving(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentLesson?.id) return;
    const content = commentInput.trim();
    if (!content) return;
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour poser une question sur cette leçon.');
      return;
    }
    if (user.role === 'apprenant' && !enrollment) {
      info('Inscription requise', 'Inscrivez-vous au parcours pour participer aux échanges.');
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await createEspaceLessonComment(currentLesson.id, content) as LessonComment;
      setComments((current) => [created, ...current]);
      setCommentInput('');
      success('Question envoyée', 'Votre message est maintenant visible sur cette leçon.');
    } catch (err) {
      console.error(err);
      toastError('Erreur', "Impossible d'envoyer cette question pour le moment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const isLive = vclass?.status === 'live';
  const isEnded = vclass?.status === 'ended';
  const isScheduled = vclass?.status === 'scheduled';
  const isReplayProcessing = isEnded && !vclass?.recording_url && vclass?.recording_status === 'processing';

  return {
    canTrackProgress,
    commentInput,
    commentSubmitting,
    comments,
    completedLessons,
    course,
    courseModules,
    currentLesson,
    error,
    expandedModule,
    handleMarkLessonComplete,
    handleSubmitComment,
    isEnded,
    isLive,
    isReplayProcessing,
    isScheduled,
    loading,
    loadingComments,
    notes,
    progress,
    progressSaving,
    setCommentInput,
    setCurrentLesson,
    setExpandedModule,
    setNotes,
    setShowNotes,
    showNotes,
    totalLessons,
    user,
    vclass,
  };
}

function buildFallbackModules(course: Course): Module[] {
  return [
    {
      id: '1',
      title: `Module 1: Introduction ${course.title}`,
      lessons: [
        { id: '1-1', title: 'Introduction à la formation', duration: '45 min', type: 'video', completed: true, locked: false },
        { id: '1-2', title: 'Concepts fondamentaux', duration: '1h 20min', type: 'video', completed: true, locked: false },
        { id: '1-3', title: 'Pratique guidée', duration: '1h 30min', type: 'video', completed: true, locked: false },
        { id: '1-4', title: 'Récapitulatif', duration: '1h 15min', type: 'video', completed: false, locked: false },
        { id: '1-5', title: 'Quiz Module 1', duration: '20 min', type: 'quiz', completed: false, locked: true },
      ],
    },
    {
      id: '2',
      title: 'Module 2: Approfondissement',
      lessons: [
        { id: '2-1', title: 'Techniques avancées', duration: '50 min', type: 'video', completed: false, locked: true },
        { id: '2-2', title: 'Études de cas', duration: '1h 10min', type: 'video', completed: false, locked: true },
        { id: '2-3', title: 'Exercices pratiques', duration: '1h 25min', type: 'exercise', completed: false, locked: true },
        { id: '2-4', title: 'Quiz Module 2', duration: '30 min', type: 'quiz', completed: false, locked: true },
      ],
    },
    {
      id: '3',
      title: 'Module 3: Expertise',
      lessons: [
        { id: '3-1', title: 'Maîtrise avancée', duration: '1h', type: 'video', completed: false, locked: true },
        { id: '3-2', title: 'Projet final', duration: '2h', type: 'exercise', completed: false, locked: true },
        { id: '3-3', title: 'Évaluation finale', duration: '1h', type: 'quiz', completed: false, locked: true },
      ],
    },
  ];
}
