import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  createFormateurVirtualClass,
  fetchFormateurVirtualClasses,
  updateFormateurVirtualClass,
} from '@/lib/formateurDashboardApi';
import {
  DEFAULT_CLASS_FORM,
  validateVirtualClassForm,
  type ClassFormErrors,
  type VirtualClass,
} from './virtualClassModel';
import {
  buildAvailableCourseIds,
  buildCreateVirtualClassPayload,
  buildUpdateVirtualClassPayload,
  filterVirtualClasses,
  findInstructorCourse,
  getVirtualClassStats,
  type VirtualClassFilter,
  type VirtualClassesSnapshot,
} from './virtualClassesSessionHelpers';
import { useVirtualClassLifecycleActions } from './useVirtualClassLifecycleActions';
import { useVirtualClassReplayUpload } from './useVirtualClassReplayUpload';

export function useVirtualClassesPageSession() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const { gateFor } = useSubscriptionAccess(user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<VirtualClassFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState(DEFAULT_CLASS_FORM);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<VirtualClass | null>(null);
  const [editForm, setEditForm] = useState<Partial<VirtualClass>>();
  const [createErrors, setCreateErrors] = useState<ClassFormErrors>({});
  const [editErrors, setEditErrors] = useState<ClassFormErrors>({});
  const [createFormMessage, setCreateFormMessage] = useState<string | null>(null);
  const [editFormMessage, setEditFormMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_live_classes_manage');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const virtualClassesQueryKey = useMemo(() => queryKeys.formateur.virtualClasses(user?.id), [user?.id]);
  const {
    data: virtualClassesSnapshot,
    isLoading: loading,
    isError,
    error: virtualClassesError,
  } = useQuery({
    queryKey: virtualClassesQueryKey,
    queryFn: async () => fetchFormateurVirtualClasses(user?.id ?? '') as Promise<VirtualClassesSnapshot>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger les classes virtuelles.');
      console.error(virtualClassesError);
    }
  }, [error, isError, virtualClassesError]);

  const classes = useMemo(() => virtualClassesSnapshot?.classes || [], [virtualClassesSnapshot?.classes]);
  const instructorCourses = useMemo(() => virtualClassesSnapshot?.courses || [], [virtualClassesSnapshot?.courses]);
  const availableCourseIds = useMemo(() => buildAvailableCourseIds(instructorCourses), [instructorCourses]);

  const refreshClasses = async () => {
    await queryClient.invalidateQueries({ queryKey: virtualClassesQueryKey });
  };

  const updateNewClass = <K extends keyof typeof DEFAULT_CLASS_FORM>(field: K, value: (typeof DEFAULT_CLASS_FORM)[K]) => {
    setNewClass((current) => ({ ...current, [field]: value }));
    setCreateErrors((current) => ({ ...current, [field]: undefined }));
    setCreateFormMessage(null);
  };

  const updateEditForm = <K extends keyof VirtualClass>(field: K, value: VirtualClass[K] | undefined) => {
    setEditForm((current) => ({ ...(current || {}), [field]: value }));
    setEditErrors((current) => ({ ...current, [field]: undefined }));
    setEditFormMessage(null);
  };

  const {
    handleReplayFileChange,
    isReplayUploading,
    replayUploadProgress,
    resetReplayUpload,
  } = useVirtualClassReplayUpload({
    classId: selectedClass?.id,
    onError: error,
    onFormMessageChange: setEditFormMessage,
    onRecordingUrlChange: (url) => updateEditForm('recording_url', url),
    onSuccess: success,
  });

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewClass(DEFAULT_CLASS_FORM);
    setCreateErrors({});
    setCreateFormMessage(null);
  };

  const closeEditModal = () => {
    setShowDetailModal(false);
    setSelectedClass(null);
    setEditForm({});
    setEditErrors({});
    setEditFormMessage(null);
    resetReplayUpload();
  };

  const selectCreateCourse = (courseId: string) => {
    const selected = findInstructorCourse(instructorCourses, courseId);
    setNewClass((current) => ({
      ...current,
      course_id: courseId,
      course_name: selected?.title || '',
    }));
    setCreateErrors((current) => ({ ...current, course_id: undefined }));
    setCreateFormMessage(null);
  };

  const selectEditCourse = (courseId: string) => {
    const selected = findInstructorCourse(instructorCourses, courseId);
    setEditForm((current) => ({
      ...(current || {}),
      course_id: courseId ? courseId : null,
      course_name: selected?.title || '',
    }));
    setEditErrors((current) => ({ ...current, course_id: undefined }));
    setEditFormMessage(null);
  };

  const filteredClasses = useMemo(() => filterVirtualClasses(classes, filter), [classes, filter]);
  const classStats = useMemo(() => getVirtualClassStats(classes), [classes]);
  const canCreateClass = subscriptionGate.allowed && instructorCourses.length > 0;
  const {
    handleJoin,
    handleCopyRoomLink,
    handleStartLive,
    handleEndClass,
    handleDeleteClass,
  } = useVirtualClassLifecycleActions({
    subscriptionGate,
    userId: user?.id,
    isMountedRef,
    refreshClasses,
    success,
    error,
  });

  const openCreateModal = () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (instructorCourses.length === 0) {
      error('Formation requise', 'Créez ou publiez au moins une formation avant de programmer une classe virtuelle.');
      return;
    }
    navigate('/dashboard/formateur/classes-virtuelles/nouvelle');
  };

  const handleCreateClass = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return false;
    }
    if (!user?.id) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return false;
    }
    const nextErrors = validateVirtualClassForm(newClass, availableCourseIds);
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateFormMessage('Corrigez les champs signalés avant de programmer la classe.');
      return false;
    }
    const selectedCourse = findInstructorCourse(instructorCourses, newClass.course_id);
    if (!selectedCourse) {
      setCreateErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setCreateFormMessage('Corrigez les champs signalés avant de programmer la classe.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return false;
    }
    setIsCreating(true);
    try {
      await createFormateurVirtualClass(user.id, buildCreateVirtualClassPayload(newClass, selectedCourse));
      if (!isMountedRef.current) return;
      success('Classe créée', 'La classe virtuelle a été programmée avec succès.');
      closeCreateModal();
      void refreshClasses();
      return true;
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setCreateFormMessage('Impossible de créer la classe virtuelle.');
      error('Erreur', 'Impossible de créer la classe.');
      console.error(err);
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsCreating(false);
      }
    }
  };

  const handleEditClick = (cls: VirtualClass) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedClass(cls);
    setEditForm({ ...cls });
    setEditErrors({});
    setEditFormMessage(null);
    setShowDetailModal(true);
  };

  const confirmEdit = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedClass || !user?.id) return;
    const nextErrors = validateVirtualClassForm(editForm, availableCourseIds);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      return;
    }
    const selectedCourse = findInstructorCourse(instructorCourses, editForm.course_id);
    if (!selectedCourse) {
      setEditErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return;
    }
    setIsUpdating(true);
    try {
      await updateFormateurVirtualClass(user.id, selectedClass.id, buildUpdateVirtualClassPayload(editForm, selectedCourse));
      if (!isMountedRef.current) return;
      success('Mise à jour', `"${editForm.title}" a été modifiée.`);
      closeEditModal();
      void refreshClasses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setEditFormMessage('Impossible de modifier la classe.');
      error('Erreur', 'Impossible de modifier la classe.');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  return {
    filter, loading, filteredClasses, classStats, canCreateClass, instructorCourses, subscriptionGate,
    showCreateModal, newClass, createErrors, createFormMessage, isCreating,
    showDetailModal, selectedClass, editForm, editErrors, editFormMessage, isUpdating,
    isReplayUploading, replayUploadProgress, setFilter, openCreateModal,
    handleJoin, handleEndClass, handleStartLive, handleCopyRoomLink, handleEditClick, handleDeleteClass,
    closeCreateModal, handleCreateClass, updateNewClass, selectCreateCourse,
    closeEditModal, confirmEdit, updateEditForm, selectEditCourse, handleReplayFileChange,
  };
}
