import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { getInstructorWorkflowAction, type CourseWorkflowStatus } from '@/lib/courseWorkflow';
import { type CourseDeliveryMode } from '@/lib/courseDelivery';
import {
  deleteFormateurCourse,
  deleteFormateurCourseWizardDraft,
  fetchFormateurCourses,
  updateFormateurCourse,
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { clearWizardDraft } from './components/wizardStorage';
import {
  getWorkflowSuccessMessage,
  validateCourseForm,
  type Course,
  type CourseFormErrors,
} from './courseManagementModel';

export function useFormateurCoursesSession() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { gateFor } = useSubscriptionAccess(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [workflowCourse, setWorkflowCourse] = useState<Course | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Course>>();
  const [editErrors, setEditErrors] = useState<CourseFormErrors>({});
  const [editFormMessage, setEditFormMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_courses_manage');
  const coursesQueryKey = useMemo(() => queryKeys.formateur.courses(user?.id), [user?.id]);
  const formateurRootQueryKey = useMemo(() => queryKeys.formateur.root(user?.id), [user?.id]);

  const {
    data: courses = [],
    isError: coursesError,
    isLoading: loading,
  } = useQuery<Course[]>({
    queryKey: coursesQueryKey,
    queryFn: async () => fetchFormateurCourses(user?.id ?? '') as Promise<Course[]>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (coursesError) {
      error('Erreur', 'Impossible de charger les formations.');
    }
  }, [coursesError, error]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshCourses = async () => {
    await queryClient.invalidateQueries({ queryKey: formateurRootQueryKey });
  };

  const updateEditForm = <K extends keyof Course>(field: K, value: Course[K] | undefined) => {
    setEditForm((current) => {
      const next = { ...(current || {}), [field]: value };
      if (field === 'is_free') {
        const isFree = value === true;
        next.is_free = isFree;
        next.access_type = isFree ? 'free' : 'paid';
        if (isFree) {
          next.price = 0;
        }
      }
      if (field === 'price' && Number(value ?? 0) > 0) {
        next.is_free = false;
        next.access_type = 'paid';
      }
      return next;
    });
    setEditErrors((current) => ({ ...current, [field]: undefined }));
    setEditFormMessage(null);
  };

  const openCreateModal = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (user?.id) {
      clearWizardDraft(user.id);
      await deleteFormateurCourseWizardDraft(user.id).catch((reason: unknown) => {
        console.warn('Unable to clear remote course wizard draft before creation', reason);
      });
    }
    setShowCreateWizard(true);
  };

  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      course.title.toLowerCase().includes(query) ||
      (course.category || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleWorkflowAction = (course: Course) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setWorkflowCourse(course);
    setShowWorkflowModal(true);
  };

  const closeWorkflowModal = () => {
    setShowWorkflowModal(false);
    setWorkflowCourse(null);
  };

  const confirmWorkflowAction = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!workflowCourse || !user?.id) return;
    const action = getInstructorWorkflowAction(workflowCourse.status);
    if (!action) return;
    try {
      await updateFormateurCourseWorkflow(user.id, workflowCourse.id, action.nextStatus);
      if (!isMountedRef.current) return;
      success('Workflow mis à jour', getWorkflowSuccessMessage(action.nextStatus, workflowCourse.title));
      closeWorkflowModal();
      void refreshCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de mettre à jour le statut de la formation.';
      error('Transition impossible', message);
      console.error(err);
    }
  };

  const handleEdit = (course: Course) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedCourse(course);
    setEditForm({ ...course });
    setEditErrors({});
    setEditFormMessage(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCourse(null);
    setEditForm({});
    setEditErrors({});
    setEditFormMessage(null);
  };

  const confirmEdit = async () => {
    if (!selectedCourse || !user?.id || !editForm) return;
    const nextErrors = validateCourseForm(editForm || {});
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      return;
    }
    setIsUpdating(true);
    try {
      await updateFormateurCourse(user.id, selectedCourse.id, {
        title: editForm.title,
        category: editForm.category,
        level: editForm.level,
        delivery_mode: editForm.delivery_mode,
        status: editForm.status,
        description: editForm.description,
        duration: editForm.duration,
        modules: editForm.modules,
        price: editForm.price,
        access_type: editForm.is_free ? 'free' : 'paid',
        is_free: Boolean(editForm.is_free),
        promotion_percentage: editForm.promotion_percentage ?? 0,
        trailer_url: editForm.trailer_url || null,
        thumbnail: editForm.thumbnail || selectedCourse.thumbnail,
        updated_at: new Date().toISOString(),
      });
      if (!isMountedRef.current) return;
      success('Formation mise à jour', `"${editForm.title}" a été modifiée avec succès.`);
      closeEditModal();
      void refreshCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de modifier la formation.';
      setEditFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  const handleDelete = async (course: Course) => {
    if (!user?.id) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer "${course.title}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await deleteFormateurCourse(user.id, course.id);
      if (!isMountedRef.current) return;
      success('Formation supprimée', `"${course.title}" a été supprimée.`);
      void refreshCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de supprimer la formation.';
      error('Erreur', message);
      console.error(err);
    }
  };

  return {
    closeEditModal,
    closeWorkflowModal,
    confirmEdit,
    confirmWorkflowAction,
    editErrors,
    editForm,
    editFormMessage,
    filteredCourses,
    handleDelete,
    handleEdit,
    handleWorkflowAction,
    isUpdating,
    loading,
    openCreateModal,
    refreshCourses,
    searchQuery,
    selectedCourse,
    setSearchQuery,
    setShowCreateWizard,
    setStatusFilter,
    showCreateWizard,
    showEditModal,
    showWorkflowModal,
    statusFilter,
    subscriptionGate,
    updateEditForm,
    user,
    workflowCourse,
  };
}
