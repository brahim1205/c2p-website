import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchFormateurLearnerDetail,
  fetchFormateurLearners,
} from '@/lib/formateurDashboardApi';
import {
  filterLearners,
  getLearnerStats,
  getStudentDetailStats,
  type Certificate,
  type CourseOption,
  type Enrollment,
  type LearnerFilters,
  type LearnersSnapshot,
  type StudentDetail,
  type Submission,
} from './apprenantsModel';

export function useFormateurApprenantsSession() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Enrollment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const learnersQueryKey = useMemo(() => queryKeys.formateur.learners(user?.id), [user?.id]);
  const {
    data: learnersSnapshot,
    isLoading: loading,
    isError: learnersIsError,
    error: learnersError,
  } = useQuery({
    queryKey: learnersQueryKey,
    queryFn: async () => fetchFormateurLearners(user?.id ?? '') as Promise<LearnersSnapshot>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (learnersIsError) {
      error('Erreur', 'Impossible de charger les apprenants.');
      console.error(learnersError);
    }
  }, [error, learnersError, learnersIsError]);

  const students = useMemo(() => learnersSnapshot?.enrollments || [], [learnersSnapshot?.enrollments]);
  const courses = useMemo(
    () => (learnersSnapshot?.courses || []).filter((course: CourseOption) => course.status !== 'archived'),
    [learnersSnapshot?.courses],
  );

  const filters: LearnerFilters = useMemo(() => ({
    search: searchQuery,
    status: statusFilter,
    courseId: courseFilter,
    attention: attentionFilter,
  }), [attentionFilter, courseFilter, searchQuery, statusFilter]);

  const filteredStudents = useMemo(() => filterLearners(students, filters), [filters, students]);
  const stats = useMemo(() => getLearnerStats(students), [students]);

  const learnerDetailQueryKey = useMemo(
    () => queryKeys.formateur.learnerDetail(user?.id, selectedStudent?.student_id),
    [selectedStudent?.student_id, user?.id],
  );
  const {
    data: studentDetail,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailError,
  } = useQuery({
    queryKey: learnerDetailQueryKey,
    queryFn: async () => {
      const detail = await fetchFormateurLearnerDetail(user?.id ?? '', selectedStudent?.student_id ?? '');
      return {
        enrollments: detail.enrollments as Enrollment[],
        submissions: detail.submissions as Submission[],
        certificates: detail.certificates as Certificate[],
      } satisfies StudentDetail;
    },
    enabled: Boolean(user?.id && selectedStudent?.student_id && showDetailModal),
  });

  useEffect(() => {
    if (detailIsError) {
      error('Erreur', 'Impossible de charger le détail de cet apprenant.');
      console.error(detailError);
    }
  }, [detailError, detailIsError, error]);

  const detailStats = useMemo(() => getStudentDetailStats(studentDetail), [studentDetail]);

  const openStudentDetail = useCallback((student: Enrollment) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  }, []);

  const handleSendMessage = useCallback((student: Enrollment) => {
    success('Message ouvert', `Conversation avec ${student.student_name} ouverte.`);
    navigate(`/dashboard/messages?student=${encodeURIComponent(student.student_id)}&name=${encodeURIComponent(student.student_name)}`);
  }, [navigate, success]);

  const closeModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedStudent(null);
  }, []);

  return {
    attentionFilter,
    courseFilter,
    courses,
    detailLoading,
    detailStats,
    filteredStudents,
    loading,
    searchQuery,
    selectedStudent,
    showDetailModal,
    stats,
    statusFilter,
    studentDetail,
    closeModal,
    handleSendMessage,
    openStudentDetail,
    setAttentionFilter,
    setCourseFilter,
    setSearchQuery,
    setStatusFilter,
  };
}
