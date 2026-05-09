import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';

interface CourseOption {
  id: number;
  title: string;
  status: string;
}

interface CourseRelation {
  id: number;
  title: string;
  category: string | null;
  modules: number | null;
  duration: string | null;
  status: string;
}

interface Enrollment {
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

interface Exam {
  id: number;
  title: string;
  type: string;
  course_id: number;
  course_name?: string | null;
  max_grade: number | null;
  exam_date: string;
  status: string;
}

interface Submission {
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

interface Certificate {
  id: number;
  course_id: number;
  course_name: string | null;
  status: string;
  issued_at: string | null;
  final_grade: number | null;
  certificate_number: string | null;
}

interface StudentDetail {
  enrollments: Enrollment[];
  submissions: Submission[];
  certificates: Certificate[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatRelativeActivity(daysSinceActive?: number) {
  if (daysSinceActive === undefined || daysSinceActive === null) return '-';
  if (daysSinceActive <= 0) return "Aujourd'hui";
  if (daysSinceActive === 1) return 'Hier';
  if (daysSinceActive < 7) return `Il y a ${daysSinceActive} jours`;
  return `Il y a ${daysSinceActive} j`;
}

function getProgressColor(progress: number) {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-teal-500';
  if (progress >= 20) return 'bg-amber-500';
  return 'bg-gray-400';
}

function getStatusBadge(status: string) {
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

function getAttentionBadge(level: string | undefined) {
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

function getCertificateBadge(status: string | undefined) {
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

export default function FormateurApprenantsPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Enrollment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        backendClient
          .from('course_enrollments')
          .select('*, courses(id, title, category, modules, duration, status)')
          .order('last_active', { ascending: false }),
        backendClient.from('courses').select('*').order('title', { ascending: true }),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setStudents((studentsRes.data || []) as Enrollment[]);
      setCourses(((coursesRes.data || []) as CourseOption[]).filter((course) => course.status !== 'archived'));
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger les apprenants.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const loadStudentDetail = useCallback(async (student: Enrollment) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
    setDetailLoading(true);
    setStudentDetail(null);

    try {
      const [enrollmentsRes, submissionsRes, certificatesRes] = await Promise.all([
        backendClient
          .from('course_enrollments')
          .select('*, courses(id, title, category, modules, duration, status)')
          .eq('student_id', student.student_id)
          .order('progress', { ascending: false }),
        backendClient.from('submissions').select('*').eq('student_id', student.student_id).order('submitted_at', { ascending: false }),
        backendClient.from('certificates').select('*').eq('student_id', student.student_id).order('issued_at', { ascending: false }),
      ]);

      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (certificatesRes.error) throw certificatesRes.error;

      const examIds = Array.from(new Set(((submissionsRes.data || []) as Submission[]).map((submission) => submission.exam_id)));
      const examsRes = examIds.length
        ? await backendClient.from('exams').select('*').in('id', examIds)
        : { data: [], error: null };

      if (examsRes.error) throw examsRes.error;

      const examsById = new Map<number, Exam>(((examsRes.data || []) as Exam[]).map((exam) => [exam.id, exam]));
      const submissions = ((submissionsRes.data || []) as Submission[]).map((submission) => ({
        ...submission,
        exam: examsById.get(submission.exam_id) || null,
      }));

      setStudentDetail({
        enrollments: (enrollmentsRes.data || []) as Enrollment[],
        submissions,
        certificates: (certificatesRes.data || []) as Certificate[],
      });
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger le détail de cet apprenant.');
      console.error(err);
      setStudentDetail({ enrollments: [], submissions: [], certificates: [] });
    } finally {
      setDetailLoading(false);
    }
  }, [error]);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.student_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.course_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || String(student.course_id) === courseFilter;
    const matchesAttention = attentionFilter === 'all' || student.attention_level === attentionFilter;
    return matchesSearch && matchesStatus && matchesCourse && matchesAttention;
  }), [attentionFilter, courseFilter, searchQuery, statusFilter, students]);

  const uniqueStudentsCount = useMemo(
    () => new Set(students.map((student) => student.student_id)).size,
    [students],
  );
  const activeThisWeekCount = useMemo(
    () => new Set(students.filter((student) => (student.days_since_active ?? 99) <= 7).map((student) => student.student_id)).size,
    [students],
  );
  const avgCompletion = students.length
    ? Math.round(students.reduce((sum, student) => sum + student.progress, 0) / students.length)
    : 0;
  const attentionCount = useMemo(
    () => new Set(students.filter((student) => student.attention_level === 'at_risk').map((student) => student.student_id)).size,
    [students],
  );
  const certifiedCount = useMemo(
    () => new Set(students.filter((student) => student.certificate_status === 'issued').map((student) => student.student_id)).size,
    [students],
  );

  const detailStats = useMemo(() => {
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
  }, [studentDetail]);

  const handleSendMessage = useCallback((student: Enrollment) => {
    success('Message ouvert', `Conversation avec ${student.student_name} ouverte.`);
    navigate(`/dashboard/messages?student=${encodeURIComponent(student.student_id)}&name=${encodeURIComponent(student.student_name)}`);
  }, [navigate, success]);

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedStudent(null);
    setStudentDetail(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Mes apprenants' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes apprenants</h1>
          <p className="text-gray-600 text-sm md:text-base">Suivez la progression, les évaluations et les signaux d&apos;attention de vos apprenants.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Apprenants uniques', value: String(uniqueStudentsCount), icon: 'ri-group-line', color: 'bg-teal-500' },
            { label: 'Actifs cette semaine', value: String(activeThisWeekCount), icon: 'ri-user-follow-line', color: 'bg-green-500' },
            { label: 'Progression moyenne', value: `${avgCompletion}%`, icon: 'ri-bar-chart-line', color: 'bg-blue-500' },
            { label: 'À relancer', value: String(attentionCount), icon: 'ri-alarm-warning-line', color: 'bg-red-500' },
            { label: 'Certifiés', value: String(certifiedCount), icon: 'ri-award-line', color: 'bg-violet-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px_220px] gap-4">
            <div className="relative">
              <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher un apprenant ou une formation..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              aria-label="Filtrer par formation"
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
            >
              <option value="all">Toutes les formations</option>
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.title}
                </option>
              ))}
            </select>

            <select
              value={attentionFilter}
              onChange={(event) => setAttentionFilter(event.target.value)}
              aria-label="Filtrer par attention"
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
            >
              <option value="all">Tous les signaux</option>
              <option value="on_track">Sur la bonne voie</option>
              <option value="watch">À surveiller</option>
              <option value="at_risk">À relancer</option>
              <option value="completed">Terminés</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {(['all', 'active', 'inactive', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : status === 'inactive' ? 'Inactifs' : 'Terminés'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={6} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formation</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progression</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Évaluations</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attention</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Certificat</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Activité</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {student.student_avatar ? (
                            <img src={student.student_avatar} alt={student.student_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                              {student.student_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{student.student_name}</p>
                            <p className="text-xs text-gray-500">{student.student_email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{student.course_name || '-'}</p>
                        <p className="text-xs text-gray-500">{student.course_category || student.courses?.category || 'Formation'}</p>
                      </td>
                      <td className="px-4 py-3 min-w-52">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div className={`${getProgressColor(student.progress)} h-1.5 rounded-full`} style={{ width: `${student.progress}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{student.progress}%</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {student.completed_lessons_estimate || 0}/{student.course_lessons_count || 0} leçons estimées
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {student.graded_submissions_count || 0}/{student.submissions_count || 0}
                        </p>
                        <p className="text-xs text-gray-500">
                          {student.avg_submission_grade !== null && student.avg_submission_grade !== undefined
                            ? `Moy. ${student.avg_submission_grade}`
                            : `${student.pending_grading_count || 0} en attente`}
                        </p>
                      </td>
                      <td className="px-4 py-3">{getAttentionBadge(student.attention_level)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {getCertificateBadge(student.certificate_status)}
                          {student.certificate_number && <p className="text-xs text-gray-500">{student.certificate_number}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <p>{formatRelativeActivity(student.days_since_active)}</p>
                        <p className="text-xs text-gray-500">{formatDate(student.last_active)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendMessage(student)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-teal-50 rounded-lg transition-colors"
                            title="Envoyer un message"
                          >
                            <i className="ri-message-3-line text-teal-600 text-sm"></i>
                          </button>
                          <button
                            onClick={() => loadStudentDetail(student)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir le détail"
                          >
                            <i className="ri-eye-line text-gray-600 text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredStudents.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-user-search-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun apprenant trouvé</h3>
            <p className="text-gray-600">Ajustez vos filtres pour élargir la liste.</p>
          </div>
        )}

        {showDetailModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {selectedStudent.student_avatar ? (
                    <img src={selectedStudent.student_avatar} alt={selectedStudent.student_name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-xl font-bold text-teal-700">
                      {selectedStudent.student_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedStudent.student_name}</h3>
                    <p className="text-sm text-gray-600">{selectedStudent.student_email || '-'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getAttentionBadge(selectedStudent.attention_level)}
                      {getStatusBadge(selectedStudent.status)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Fermer le détail"
                >
                  <i className="ri-close-line text-xl text-gray-500"></i>
                </button>
              </div>

              {detailLoading ? (
                <SkeletonList count={4} />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Formations suivies', value: String(detailStats.courseCount), icon: 'ri-book-open-line', color: 'bg-teal-500' },
                      { label: 'Progression moyenne', value: `${detailStats.avgProgress}%`, icon: 'ri-bar-chart-line', color: 'bg-blue-500' },
                      { label: 'Évaluations soumises', value: String(detailStats.submissionsCount), icon: 'ri-file-list-3-line', color: 'bg-amber-500' },
                      { label: 'Certificats', value: String(detailStats.certificatesCount), icon: 'ri-award-line', color: 'bg-violet-500' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                            <i className={`${stat.icon} text-white text-sm`}></i>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-xs text-gray-600">{stat.label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <section className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Parcours sur vos formations</h4>
                      <button
                        onClick={() => handleSendMessage(selectedStudent)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                      >
                        Envoyer un message
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(studentDetail?.enrollments || []).map((enrollment) => (
                        <div key={enrollment.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h5 className="font-semibold text-gray-900">{enrollment.course_name || 'Formation'}</h5>
                                {getStatusBadge(enrollment.status)}
                                {getAttentionBadge(enrollment.attention_level)}
                                {getCertificateBadge(enrollment.certificate_status)}
                              </div>
                              <p className="text-sm text-gray-600">{enrollment.course_category || enrollment.courses?.category || 'Formation'}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={`/dashboard/formateur/mes-cours/${enrollment.course_id}/programme`}
                                onClick={closeModal}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Voir le programme
                              </Link>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs text-gray-500 mb-1">Progression</p>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className={`${getProgressColor(enrollment.progress)} h-2 rounded-full`} style={{ width: `${enrollment.progress}%` }}></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{enrollment.progress}%</span>
                              </div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs text-gray-500 mb-1">Leçons estimées</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {enrollment.completed_lessons_estimate || 0}/{enrollment.course_lessons_count || 0}
                              </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs text-gray-500 mb-1">Évaluations</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {enrollment.graded_submissions_count || 0}/{enrollment.submissions_count || 0} corrigées
                              </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs text-gray-500 mb-1">Dernière activité</p>
                              <p className="text-sm font-semibold text-gray-900">{formatRelativeActivity(enrollment.days_since_active)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>{enrollment.completed_sections_estimate || 0}/{enrollment.course_sections_count || 0} sections</span>
                            <span>{enrollment.pending_grading_count || 0} correction(s) en attente</span>
                            <span>
                              Note moyenne:{' '}
                              {enrollment.avg_submission_grade !== null && enrollment.avg_submission_grade !== undefined
                                ? `${enrollment.avg_submission_grade}`
                                : 'N/A'}
                            </span>
                            <span>Dernier accès: {formatDate(enrollment.last_active)}</span>
                            {enrollment.certificate_number && <span>Certificat: {enrollment.certificate_number}</span>}
                          </div>
                        </div>
                      ))}

                      {(studentDetail?.enrollments || []).length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                          Aucun parcours trouvé sur vos formations.
                        </div>
                      )}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <section className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Évaluations récentes</h4>
                      <div className="space-y-3">
                        {(studentDetail?.submissions || []).slice(0, 6).map((submission) => (
                          <div key={submission.id} className="rounded-lg bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{submission.exam?.title || 'Évaluation'}</p>
                                <p className="text-xs text-gray-500">
                                  {submission.exam?.course_name || selectedStudent.course_name || 'Formation'} • {formatDate(submission.submitted_at)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                  {submission.grade !== null && submission.grade !== undefined
                                    ? `${submission.grade}/${submission.exam?.max_grade ?? 20}`
                                    : 'À corriger'}
                                </p>
                                <p className="text-xs text-gray-500">{submission.status === 'graded' ? 'Corrigé' : 'En attente'}</p>
                              </div>
                            </div>
                            {submission.feedback && <p className="text-xs text-gray-600 mt-2">{submission.feedback}</p>}
                          </div>
                        ))}

                        {(studentDetail?.submissions || []).length === 0 && (
                          <p className="text-sm text-gray-500">Aucune évaluation soumise pour le moment.</p>
                        )}
                      </div>
                    </section>

                    <section className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Certificats</h4>
                      <div className="space-y-3">
                        {(studentDetail?.certificates || []).map((certificate) => (
                          <div key={certificate.id} className="rounded-lg bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{certificate.course_name || 'Certificat'}</p>
                                <p className="text-xs text-gray-500">
                                  {certificate.issued_at ? `Émis le ${formatDate(certificate.issued_at)}` : 'En attente d’émission'}
                                </p>
                              </div>
                              <div className="text-right">
                                {getCertificateBadge(certificate.status)}
                                {certificate.certificate_number && (
                                  <p className="text-xs text-gray-500 mt-1">{certificate.certificate_number}</p>
                                )}
                              </div>
                            </div>
                            {certificate.final_grade !== null && certificate.final_grade !== undefined && (
                              <p className="text-xs text-gray-600 mt-2">Note finale: {certificate.final_grade}</p>
                            )}
                          </div>
                        ))}

                        {(studentDetail?.certificates || []).length === 0 && (
                          <p className="text-sm text-gray-500">Aucun certificat délivré sur vos formations.</p>
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
