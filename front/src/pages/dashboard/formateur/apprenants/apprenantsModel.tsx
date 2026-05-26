export interface CourseOption {
  id: number;
  title: string;
  status: string;
}

export interface CourseRelation {
  id: number;
  title: string;
  category: string | null;
  modules: number | null;
  duration: string | null;
  status: string;
}

export interface Enrollment {
  id: number;
  course_id: number;
  student_id: string;
  student_name: string;
  student_email: string | null;
  student_avatar: string | null;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  enrolled_at: string;
  course_name?: string | null;
  course_category?: string | null;
  course_sections_count?: number;
  course_lessons_count?: number;
  completed_sections_estimate?: number;
  remaining_sections_estimate?: number;
  completed_lessons_estimate?: number;
  remaining_lessons_estimate?: number;
  days_since_active?: number;
  submissions_count?: number;
  graded_submissions_count?: number;
  pending_grading_count?: number;
  avg_submission_grade?: number | null;
  latest_submission_at?: string | null;
  attention_level?: 'on_track' | 'watch' | 'at_risk' | 'completed' | string;
  certificate_status?: 'issued' | 'ready' | 'pending' | string;
  certificate_issued_at?: string | null;
  certificate_number?: string | null;
  courses?: CourseRelation | null;
}

export interface Exam {
  id: number;
  title: string;
  type: string;
  course_id: number;
  course_name?: string | null;
  max_grade: number | null;
  exam_date: string;
  status: string;
}

export interface Submission {
  id: number;
  exam_id: number;
  student_id: string;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
  file_name: string | null;
  file_url: string | null;
  answers?: unknown;
  exam?: Exam | null;
}

export interface Certificate {
  id: number;
  course_id: number;
  course_name: string | null;
  status: string;
  issued_at: string | null;
  final_grade: number | null;
  certificate_number: string | null;
}

export interface StudentDetail {
  enrollments: Enrollment[];
  submissions: Submission[];
  certificates: Certificate[];
}

export interface LearnersSnapshot {
  enrollments?: Enrollment[];
  courses?: CourseOption[];
}

export interface LearnerFilters {
  search: string;
  status: string;
  courseId: string;
  attention: string;
}

export interface LearnerStats {
  uniqueStudentsCount: number;
  activeThisWeekCount: number;
  avgCompletion: number;
  attentionCount: number;
  certifiedCount: number;
}

export interface StudentDetailStats {
  courseCount: number;
  avgProgress: number;
  submissionsCount: number;
  certificatesCount: number;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function filterLearners(students: Enrollment[], filters: LearnerFilters) {
  const normalizedSearch = filters.search.toLowerCase();
  return students.filter((student) => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(normalizedSearch) ||
      (student.student_email || '').toLowerCase().includes(normalizedSearch) ||
      (student.course_name || '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = filters.status === 'all' || student.status === filters.status;
    const matchesCourse = filters.courseId === 'all' || String(student.course_id) === filters.courseId;
    const matchesAttention = filters.attention === 'all' || student.attention_level === filters.attention;
    return matchesSearch && matchesStatus && matchesCourse && matchesAttention;
  });
}

export function getLearnerStats(students: Enrollment[]): LearnerStats {
  return {
    uniqueStudentsCount: new Set(students.map((student) => student.student_id)).size,
    activeThisWeekCount: new Set(students.filter((student) => (student.days_since_active ?? 99) <= 7).map((student) => student.student_id)).size,
    avgCompletion: students.length ? Math.round(students.reduce((sum, student) => sum + student.progress, 0) / students.length) : 0,
    attentionCount: new Set(students.filter((student) => student.attention_level === 'at_risk').map((student) => student.student_id)).size,
    certifiedCount: new Set(students.filter((student) => student.certificate_status === 'issued').map((student) => student.student_id)).size,
  };
}

export function getStudentDetailStats(studentDetail?: StudentDetail): StudentDetailStats {
  const detailEnrollments = studentDetail?.enrollments || [];
  const detailSubmissions = studentDetail?.submissions || [];
  const detailCertificates = studentDetail?.certificates || [];
  return {
    courseCount: detailEnrollments.length,
    avgProgress: detailEnrollments.length
      ? Math.round(detailEnrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / detailEnrollments.length)
      : 0,
    submissionsCount: detailSubmissions.length,
    certificatesCount: detailCertificates.length,
  };
}

export function formatRelativeActivity(daysSinceActive?: number) {
  if (daysSinceActive === undefined || daysSinceActive === null) return '-';
  if (daysSinceActive <= 0) return "Aujourd'hui";
  if (daysSinceActive === 1) return 'Hier';
  if (daysSinceActive < 7) return `Il y a ${daysSinceActive} jours`;
  return `Il y a ${daysSinceActive} j`;
}

export function getProgressColor(progress: number) {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-teal-500';
  if (progress >= 20) return 'bg-amber-500';
  return 'bg-gray-400';
}

export function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-amber-100 text-amber-700',
    completed: 'bg-teal-100 text-teal-700',
  };
  const labels: Record<string, string> = {
    active: 'Actif',
    inactive: 'Inactif',
    completed: 'Terminé',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

export function getAttentionBadge(level: string | undefined) {
  const styles: Record<string, string> = {
    on_track: 'bg-emerald-100 text-emerald-700',
    watch: 'bg-amber-100 text-amber-700',
    at_risk: 'bg-red-100 text-red-700',
    completed: 'bg-teal-100 text-teal-700',
  };
  const labels: Record<string, string> = {
    on_track: 'Sur la bonne voie',
    watch: 'À surveiller',
    at_risk: 'À relancer',
    completed: 'Terminé',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles[level || 'watch'] || 'bg-gray-100 text-gray-700'}`}>
      {labels[level || 'watch'] || level}
    </span>
  );
}

export function getCertificateBadge(status: string | undefined) {
  const styles: Record<string, string> = {
    issued: 'bg-violet-100 text-violet-700',
    ready: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    issued: 'Certifié',
    ready: 'Éligible',
    pending: 'En attente',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${styles[status || 'pending'] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status || 'pending'] || status}
    </span>
  );
}
