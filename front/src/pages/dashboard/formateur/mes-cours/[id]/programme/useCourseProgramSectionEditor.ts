import { useState } from 'react';
import {
  deleteFormateurCourseSection,
  reorderFormateurCourseSections,
  saveFormateurCourseSection,
} from '@/lib/formateurDashboardApi';
import {
  emptySectionForm,
  validateSectionForm,
  type Course,
  type CourseProgramSection,
  type CourseSection,
  type EntityId,
  type SectionFormErrors,
  type SectionFormState,
} from './programmeModel';

interface AccessGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseCourseProgramSectionEditorOptions {
  course: Course | null;
  courseId?: string;
  groupedSections: CourseProgramSection[];
  subscriptionGate: AccessGate;
  userId?: string;
  onRefresh: () => Promise<void>;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : fallback;
}

export function useCourseProgramSectionEditor({
  course,
  courseId,
  groupedSections,
  subscriptionGate,
  userId,
  onRefresh,
  success,
  error,
}: UseCourseProgramSectionEditorOptions) {
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm());
  const [sectionErrors, setSectionErrors] = useState<SectionFormErrors>({});
  const [sectionFormMessage, setSectionFormMessage] = useState<string | null>(null);
  const [isSavingSection, setIsSavingSection] = useState(false);

  const updateSectionForm = <K extends keyof SectionFormState>(field: K, value: SectionFormState[K]) => {
    setSectionForm((current) => ({ ...current, [field]: value }));
    setSectionErrors((current) => ({ ...current, [field]: undefined }));
    setSectionFormMessage(null);
  };

  const openCreateSectionModal = () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingSection(null);
    setSectionForm(emptySectionForm());
    setSectionErrors({});
    setSectionFormMessage(null);
    setShowSectionModal(true);
  };

  const openEditSectionModal = (section: CourseSection) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      description: section.description ?? '',
      status: section.status,
    });
    setSectionErrors({});
    setSectionFormMessage(null);
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSection(null);
    setSectionForm(emptySectionForm());
    setSectionErrors({});
    setSectionFormMessage(null);
  };

  const submitSection = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!courseId || !course || !userId) return;
    const nextErrors = validateSectionForm(sectionForm);
    setSectionErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSectionFormMessage('Corrigez les champs signalés avant d’enregistrer la section.');
      return;
    }

    setIsSavingSection(true);
    try {
      await saveFormateurCourseSection(userId, courseId, {
        id: editingSection?.id,
        title: sectionForm.title,
        description: sectionForm.description,
        status: sectionForm.status,
        position: editingSection?.position,
      });
      success(
        editingSection ? 'Section mise à jour' : 'Section créée',
        editingSection ? `La section "${sectionForm.title}" a été mise à jour.` : `La section "${sectionForm.title}" a été ajoutée à ${course.title}.`,
      );
      setShowSectionModal(false);
      setEditingSection(null);
      setSectionForm(emptySectionForm());
      setSectionErrors({});
      setSectionFormMessage(null);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible d enregistrer la section.');
      setSectionFormMessage(message);
      error('Erreur', message);
      console.error(reason);
    } finally {
      setIsSavingSection(false);
    }
  };

  const deleteSection = async (section: CourseSection) => {
    if (!courseId || !userId) return;
    if (!window.confirm(`Supprimer la section "${section.title}" et toutes ses leçons ?`)) return;
    try {
      await deleteFormateurCourseSection(userId, courseId, section.id);
      success('Section supprimée', `"${section.title}" a été retirée du programme.`);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible de supprimer la section.');
      error('Erreur', message);
      console.error(reason);
    }
  };

  const moveSection = async (sectionId: EntityId, direction: 'up' | 'down') => {
    if (!courseId || !userId) return;
    const orderedSections = [...groupedSections];
    const currentIndex = orderedSections.findIndex((section) => String(section.id) === String(sectionId));
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentSection = orderedSections[currentIndex];
    const targetSection = orderedSections[targetIndex];

    if (!currentSection || !targetSection) return;

    try {
      await reorderFormateurCourseSections(userId, courseId, currentSection, targetSection);
      await onRefresh();
    } catch (reason: unknown) {
      const message = getErrorMessage(reason, 'Impossible de réordonner les sections.');
      error('Erreur', message);
      console.error(reason);
    }
  };

  return {
    closeSectionModal,
    deleteSection,
    editingSection,
    isSavingSection,
    moveSection,
    openCreateSectionModal,
    openEditSectionModal,
    sectionErrors,
    sectionForm,
    sectionFormMessage,
    showSectionModal,
    submitSection,
    updateSectionForm,
  };
}
