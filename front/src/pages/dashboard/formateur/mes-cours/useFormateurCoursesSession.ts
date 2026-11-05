import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import { getInstructorWorkflowAction, type CourseWorkflowStatus } from '@/lib/courseWorkflow';
import {
  deleteFormateurCourse,
  fetchFormateurCourses,
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import { getWorkflowSuccessMessage, type Course } from './courseManagementModel';

export function useFormateurCoursesSession() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { gateFor } = useSubscriptionAccess(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workflowCourse, setWorkflowCourse] = useState<Course | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
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

  /** Returns true when the trainer may create or change courses; otherwise explains why. */
  const requireSubscription = () => {
    if (subscriptionGate.allowed) return true;
    error(subscriptionGate.title, subscriptionGate.message);
    return false;
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
    if (!requireSubscription()) return;
    setWorkflowCourse(course);
    setShowWorkflowModal(true);
  };

  const closeWorkflowModal = () => {
    setShowWorkflowModal(false);
    setWorkflowCourse(null);
  };

  const confirmWorkflowAction = async () => {
    if (!requireSubscription()) return;
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
    closeWorkflowModal,
    confirmWorkflowAction,
    filteredCourses,
    handleDelete,
    handleWorkflowAction,
    hasCourses: courses.length > 0,
    loading,
    refreshCourses,
    requireSubscription,
    searchQuery,
    setSearchQuery,
    setStatusFilter,
    showWorkflowModal,
    statusFilter,
    subscriptionGate,
    user,
    workflowCourse,
  };
}
