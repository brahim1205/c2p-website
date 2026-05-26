import { useState } from 'react';
import {
  deleteFormateurCourseLesson,
  reorderFormateurCourseLessons,
  saveFormateurCourseLesson,
} from '@/lib/formateurDashboardApi';
import {
  emptyLessonForm,
  validateLessonForm,
  type CourseLesson,
  type CourseProgramSection,
  type EntityId,
  type LessonFormErrors,
  type LessonFormState,
} from './programmeModel';

interface AccessGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseCourseProgramLessonEditorOptions {
  availableSectionIds: Set<string>;
  courseId?: string;
  groupedSections: CourseProgramSection[];
  subscriptionGate: AccessGate;
  userId?: string;
  onRefresh: () => Promise<void>;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : fallback;
}

export function useCourseProgramLessonEditor({
  availableSectionIds,
  courseId,
  groupedSections,
  subscriptionGate,
  userId,
  onRefresh,
  success,
  error,
  info,
}: UseCourseProgramLessonEditorOptions) {
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm());
  const [lessonErrors, setLessonErrors] = useState<LessonFormErrors>({});
  const [lessonFormMessage, setLessonFormMessage] = useState<string | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  const updateLessonForm = <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
    setLessonForm((current) => ({ ...current, [field]: value }));
    setLessonErrors((current) => ({ ...current, [field]: undefined }));
    setLessonFormMessage(null);
  };

  const openCreateLessonModal = (sectionId?: EntityId) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!groupedSections.length) {
      info('Programme requis', 'Créez d abord une section avant d ajouter une leçon.');
      return;
    }
    setEditingLesson(null);
    setLessonForm(emptyLessonForm(String(sectionId ?? groupedSections[0]?.id ?? '')));
    setLessonErrors({});
    setLessonFormMessage(null);
    setShowLessonModal(true);
  };

  const openEditLessonModal = (lesson: CourseLesson) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingLesson(lesson);
    setLessonForm({
      section_id: String(lesson.section_id),
      title: lesson.title,
      description: lesson.description ?? '',
      type: lesson.type,
      duration: lesson.duration ?? '',
      content: lesson.content ?? '',
      code_language: lesson.code_language ?? 'markdown',
      code_sample: lesson.code_sample ?? '',
      exercise_instructions: lesson.exercise_instructions ?? '',
      is_preview: Boolean(lesson.is_preview),
      status: lesson.status,
    });
    setLessonErrors({});
    setLessonFormMessage(null);
    setShowLessonModal(true);
  };

  const closeLessonModal = () => {
    setShowLessonModal(false);
    setEditingLesson(null);
    setLessonForm(emptyLessonForm(groupedSections[0] ? String(groupedSections[0].id) : ''));
    setLessonErrors({});
    setLessonFormMessage(null);
  };

  const submitLesson = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!courseId || !userId) return;
    const nextErrors = validateLessonForm(lessonForm, availableSectionIds);
    setLessonErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLessonFormMessage('Corrigez les champs signalés avant d’enregistrer la leçon.');
      return;
    }

    setIsSavingLesson(true);
    try {
      await saveFormateurCourseLesson(userId, courseId, {
        id: editingLesson?.id,
        section_id: lessonForm.section_id,
        title: lessonForm.title,
        description: lessonForm.description,
        type: lessonForm.type,
        duration: lessonForm.duration,
        content: lessonForm.content,
        code_language: lessonForm.code_language,
        code_sample: lessonForm.code_sample,
        exercise_instructions: lessonForm.exercise_instructions,
        is_preview: lessonForm.is_preview,
        status: lessonForm.status,
        position: editingLesson?.position,
      });
      success(
        editingLesson ? 'Leçon mise à jour' : 'Leçon créée',
        editingLesson ? `La leçon "${lessonForm.title}" a été mise à jour.` : `La leçon "${lessonForm.title}" a été ajoutée au programme.`,
      );
      setShowLessonModal(false);
      setEditingLesson(null);
      setLessonForm(emptyLessonForm(groupedSections[0] ? String(groupedSections[0].id) : ''));
      setLessonErrors({});
      setLessonFormMessage(null);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible d enregistrer la leçon.');
      setLessonFormMessage(message);
      error('Erreur', message);
      console.error(reason);
    } finally {
      setIsSavingLesson(false);
    }
  };

  const deleteLesson = async (lesson: CourseLesson) => {
    if (!courseId || !userId) return;
    if (!window.confirm(`Supprimer la leçon "${lesson.title}" ?`)) return;
    try {
      await deleteFormateurCourseLesson(userId, courseId, lesson.id);
      success('Leçon supprimée', `"${lesson.title}" a été retirée du programme.`);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible de supprimer la leçon.');
      error('Erreur', message);
      console.error(reason);
    }
  };

  const moveLesson = async (sectionId: EntityId, lessonId: EntityId, direction: 'up' | 'down') => {
    if (!courseId || !userId) return;
    const targetSection = groupedSections.find((section) => String(section.id) === String(sectionId));
    if (!targetSection) return;

    const orderedLessons = [...targetSection.lessons];
    const currentIndex = orderedLessons.findIndex((lesson) => String(lesson.id) === String(lessonId));
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentLesson = orderedLessons[currentIndex];
    const adjacentLesson = orderedLessons[targetIndex];

    if (!currentLesson || !adjacentLesson) return;

    try {
      await reorderFormateurCourseLessons(userId, courseId, currentLesson, adjacentLesson);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible de réordonner les leçons.');
      error('Erreur', message);
      console.error(reason);
    }
  };

  return {
    closeLessonModal,
    deleteLesson,
    editingLesson,
    isSavingLesson,
    lessonErrors,
    lessonForm,
    lessonFormMessage,
    moveLesson,
    openCreateLessonModal,
    openEditLessonModal,
    showLessonModal,
    submitLesson,
    updateLessonForm,
  };
}
