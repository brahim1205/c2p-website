import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';


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
  course_name?: string;
}

export default function FormateurApprenantsPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Enrollment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await backendClient
        .from('course_enrollments')
        .select('*, courses(title)')
        .order('last_active', { ascending: false });

      if (err) throw err;
      const mapped = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        course_name: row.courses && typeof row.courses === 'object' ? (row.courses as { title?: string }).title : undefined,
      })) as Enrollment[];
      setStudents(mapped);
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

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.course_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = students.length;
  const activeThisWeek = students.filter((s) => {
    const d = new Date(s.last_active);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;
  const avgCompletion = totalCount
    ? Math.round(students.reduce((a, s) => a + s.progress, 0) / totalCount)
    : 0;
  const unreadMessages = students.filter((s) => s.status === 'active').length;

  const handleViewDetails = (student: Enrollment) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleSendMessage = (student: Enrollment) => {
    success('Message ouvert', `Conversation avec ${student.student_name} ouverte.`);
    navigate(`/dashboard/messages?student=${encodeURIComponent(student.student_id)}&name=${encodeURIComponent(student.student_name)}`);
  };

  const getStatusBadge = (status: string) => {
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
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-teal-500';
    return 'bg-amber-500';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Mes apprenants' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes apprenants</h1>
          <p className="text-gray-600 text-sm md:text-base">Suivez la progression et gérez vos apprenants inscrits</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total apprenants', value: String(totalCount), icon: 'ri-group-line', color: 'bg-teal-500' },
            { label: 'Actifs cette semaine', value: String(activeThisWeek), icon: 'ri-user-follow-line', color: 'bg-green-500' },
            { label: 'Taux de complétion', value: `${avgCompletion}%`, icon: 'ri-bar-chart-line', color: 'bg-blue-500' },
            { label: 'Messages non lus', value: String(unreadMessages), icon: 'ri-message-3-line', color: 'bg-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un apprenant..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
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
        </div>

        {/* Students Table */}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
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
                      <td className="px-4 py-3 text-sm text-gray-700">{student.course_name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div className={`${getProgressColor(student.progress)} h-1.5 rounded-full`} style={{ width: `${student.progress}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{student.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.grade ? `${student.grade}/20` : '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(student.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(student.last_active).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendMessage(student)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            <i className="ri-message-3-line text-teal-600 text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleViewDetails(student)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
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
            <p className="text-gray-600">Ajustez vos filtres</p>
          </div>
        )}

        {/* Student Detail Modal */}
        {showDetailModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center gap-4 mb-6">
                {selectedStudent.student_avatar ? (
                  <img src={selectedStudent.student_avatar} alt={selectedStudent.student_name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-xl font-bold text-teal-700">
                    {selectedStudent.student_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedStudent.student_name}</h3>
                  <p className="text-sm text-gray-600">{selectedStudent.student_email || '-'}</p>
                  {getStatusBadge(selectedStudent.status)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Formation</p>
                  <p className="text-sm font-medium text-gray-900">{selectedStudent.course_name || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Progression</p>
                  <p className="text-sm font-medium text-gray-900">{selectedStudent.progress}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Note moyenne</p>
                  <p className="text-sm font-medium text-gray-900">{selectedStudent.grade ? `${selectedStudent.grade}/20` : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Dernière activité</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(selectedStudent.last_active).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => { handleSendMessage(selectedStudent); setShowDetailModal(false); }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <i className="ri-message-3-line"></i>
                  Envoyer un message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
