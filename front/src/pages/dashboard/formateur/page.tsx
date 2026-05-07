import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import GlobalSearch from '../components/GlobalSearch';
import { backendClient } from '@/lib/backendClient';


interface Course {
  id: number;
  title: string;
  status: string;
  students_count: number;
  completion_rate: number;
  revenue: number;
}

interface Enrollment {
  id: number;
  student_name: string;
  progress: number;
  last_active: string;
  courses?: { title: string } | null;
}

export default function FormateurDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Enrollment[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setCourses([]);
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        backendClient.from('courses').select('*').eq('instructor_id', user.id).order('updated_at', { ascending: false }).limit(4),
        backendClient.from('course_enrollments').select('*, courses(title)').order('last_active', { ascending: false }).limit(4),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setCourses((coursesRes.data || []).map((course) => ({
        completion_rate: 0,
        revenue: 0,
        students_count: 0,
        status: 'draft',
        ...course,
      })));
      setStudents(studentsRes.data || []);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger les données du tableau de bord.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalStudents = courses.reduce((a, c) => a + (c.students_count || 0), 0);
  const avgCompletion = courses.length
    ? Math.round(courses.reduce((a, c) => a + (c.completion_rate || 0), 0) / courses.length)
    : 0;
  const totalRevenue = courses.reduce((a, c) => a + (c.revenue || 0), 0);

  const stats = [
    { label: 'Formations actives', value: String(courses.filter((c) => c.status === 'published').length), change: '+2', icon: 'ri-presentation-line', color: 'bg-teal-500' },
    { label: 'Apprenants inscrits', value: String(totalStudents), change: '+18', icon: 'ri-group-line', color: 'bg-teal-500' },
    { label: 'Taux de complétion', value: `${avgCompletion}%`, change: '+3%', icon: 'ri-bar-chart-line', color: 'bg-green-500' },
    { label: 'Revenus totaux', value: `${(totalRevenue / 1000).toFixed(0)}K FCFA`, change: '+12%', icon: 'ri-money-cny-circle-line', color: 'bg-amber-500' },
  ];

  const handlePublish = async (id: number, title: string) => {
    try {
      const { error: err } = await backendClient
        .from('courses')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (err) throw err;
      success('Formation publiée', `"${title}" est maintenant visible sur la plateforme.`);
      loadData();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de publier la formation.');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      review: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      published: 'Publiée',
      draft: 'Brouillon',
      review: 'En révision',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatRevenue = (rev: number) => {
    if (!rev) return '0 FCFA';
    return rev.toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Formateur</h1>
          <p className="text-gray-600">Créez et dispensez vos formations</p>
        </div>

        <GlobalSearch context="formateur" />

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SkeletonCard count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className={`${stat.icon} text-xl text-white`}></i>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Formations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Mes formations</h2>
              <Link to="/dashboard/formateur/mes-cours" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir tout
              </Link>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-4">
                {courses.map((formation) => (
                  <div key={formation.id} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{formation.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">
                            <i className="ri-group-line mr-1"></i>
                            {formation.students_count} apprenants
                          </span>
                          <span className="text-sm text-gray-600">
                            <i className="ri-bar-chart-line mr-1"></i>
                            {formation.completion_rate}% complété
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(formation.status)}
                        <span className="text-sm font-medium text-gray-900">{formatRevenue(formation.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${formation.completion_rate}%` }}></div>
                    </div>
                    {formation.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(formation.id, formation.title)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                      >
                        Publier
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Apprenants récents</h2>
              <span className="text-sm text-gray-500">Activité des 7 derniers jours</span>
            </div>

            {loading ? (
              <SkeletonList count={4} />
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{student.student_name}</h3>
                      <p className="text-sm text-gray-600">
                        {student.courses && typeof student.courses === 'object' ? (student.courses as { title?: string }).title : 'Formation'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{student.progress}%</p>
                      <p className="text-xs text-gray-500">{new Date(student.last_active).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link to="/dashboard/formateur/mes-cours" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-book-open-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes formations</p>
            </Link>
            <Link to="/dashboard/formateur/classes-virtuelles" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-video-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Classes virtuelles</p>
            </Link>
            <Link to="/dashboard/formateur/apprenants" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-group-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes apprenants</p>
            </Link>
            <Link to="/dashboard/formateur/evaluations" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Évaluations</p>
            </Link>
            <Link to="/dashboard/formateur/certificats" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-award-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Certificats</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
