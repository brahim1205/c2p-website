import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import GlobalSearch from '../components/GlobalSearch';
import ResumeCourseBanner from '@/components/feature/ResumeCourseBanner';


interface Enrollment {
  id: number;
  course_id: number;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  courses: {
    id: number;
    title: string;
    category: string;
    modules: number | null;
    duration: string | null;
    thumbnail: string | null;
  } | null;
}

interface Certificate {
  id: number;
  title: string;
  course_name: string | null;
  grade: number | null;
  status: string;
  issued_at: string | null;
  certificate_number: string | null;
}

export default function ApprenantDashboardPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setEnrollments([]);
        setCertificates([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch enrollments
        const { data: enrData, error: enrErr } = await backendClient
          .from('course_enrollments')
          .select('*, courses(id, title, category, modules, duration, thumbnail)')
          .eq('student_id', user.id)
          .order('last_active', { ascending: false })
          .limit(5);
        if (enrErr) throw enrErr;
        setEnrollments(enrData || []);

        // Fetch certificates
        const { data: certData, error: certErr } = await backendClient
          .from('certificates')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'issued')
          .order('issued_at', { ascending: false })
          .limit(5);
        if (certErr) throw certErr;
        setCertificates(certData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const totalEnrolled = enrollments.length;
  const inProgressCount = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const completedCount = enrollments.filter((e) => e.progress >= 100).length;
  const totalHours = enrollments.reduce((sum, e) => {
    const hours = parseInt(e.courses?.duration?.replace(/\D/g, '') || '0');
    return sum + hours;
  }, 0);

  const handleContinue = (id: number) => {
    success('Cours repris', 'Bonne continuation dans votre apprentissage !');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Apprenant</h1>
          <p className="text-gray-600">Suivez vos formations et développez vos compétences</p>
        </div>

        <GlobalSearch context="apprenant" />

        {/* Resume banner */}
        <ResumeCourseBanner />

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SkeletonCard count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Formations en cours', value: String(inProgressCount), change: '+1', icon: 'ri-book-open-line', color: 'bg-teal-500' },
              { label: 'Formations terminées', value: String(completedCount), change: '+2', icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
              { label: 'Certificats obtenus', value: String(certificates.length), change: '+1', icon: 'ri-award-line', color: 'bg-yellow-500' },
              { label: "Heures d'apprentissage", value: String(totalHours), change: '+12h', icon: 'ri-time-line', color: 'bg-teal-600' },
            ].map((stat, index) => (
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
          {/* In Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Formations en cours</h2>
              <Link to="/dashboard/apprenant/mes-cours" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Voir tout
              </Link>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-4">
                {enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3).map((enrollment) => (
                  <div key={enrollment.id} className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{enrollment.courses?.title || 'Formation'}</h3>
                        <p className="text-sm text-gray-600">{enrollment.courses?.category || ''}</p>
                      </div>
                      <span className="text-sm font-bold text-teal-600">{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                    <Link
                      to={`/dashboard/apprenant/cours/${enrollment.course_id}`}
                      onClick={() => handleContinue(enrollment.course_id)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap text-center"
                    >
                      Continuer
                    </Link>
                  </div>
                ))}
                {enrollments.filter(e => e.progress > 0 && e.progress < 100).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune formation en cours</p>
                    <Link to="/espace-numerique" className="text-teal-600 text-sm mt-2 inline-block">Explorer le catalogue</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Certificates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Mes certificats</h2>
              <span className="text-sm text-gray-500">{certificates.length} certificats</span>
            </div>

            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-4">
                {certificates.slice(0, 3).map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-yellow-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className="ri-award-line text-xl text-yellow-600"></i>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{cert.course_name || cert.title}</h3>
                        <p className="text-sm text-gray-600">C2P Academy · {cert.grade ? `Note: ${cert.grade}/20` : 'Terminé'}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                      Télécharger
                    </button>
                  </div>
                ))}
                {certificates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun certificat obtenu</p>
                    <Link to="/dashboard/apprenant/mes-cours" className="text-teal-600 text-sm mt-2 inline-block">Voir mes formations</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link to="/dashboard/apprenant/mes-cours" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-book-open-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes formations</p>
            </Link>
            <Link to="/dashboard/apprenant/progression" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-all text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-bar-chart-grouped-line text-xl text-green-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Ma progression</p>
            </Link>
            <Link to="/dashboard/apprenant/certificats" className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 transition-all text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-award-line text-xl text-yellow-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Mes certificats</p>
            </Link>
            <Link to="/dashboard/messages" className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#14B8A6] transition-all text-center">
              <div className="w-12 h-12 bg-[#14B8A6]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-message-3-line text-xl text-[#14B8A6]"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Messagerie</p>
            </Link>
            <Link to="/espace-numerique" className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-all text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-compass-line text-xl text-teal-600"></i>
                </div>
              </div>
              <p className="font-medium text-gray-900 text-sm">Explorer le catalogue</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
