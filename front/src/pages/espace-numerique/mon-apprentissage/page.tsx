import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';

interface Enrollment {
  id: number;
  course_id: number;
  student_name: string;
  student_email: string | null;
  progress: number;
  grade: number | null;
  status: string;
  last_active: string;
  enrolled_at: string;
  courses: {
    id: number;
    title: string;
    category: string;
    description: string | null;
    modules: number | null;
    duration: string | null;
    thumbnail: string | null;
    delivery_mode?: string | null;
  } | null;
}

interface Certificate {
  id: number;
  title: string;
  course_name: string | null;
  final_grade: number | null;
  grade: number | null;
  status: string;
  certificate_number: string | null;
  issued_at: string | null;
  completion_date: string | null;
}

function getCourseImage(course: Enrollment['courses']) {
  if (course?.thumbnail) return course.thumbnail;
  return '/images/home/academy.jpg';
}

function formatLastAccessed(dateStr: string) {
  if (!dateStr) return 'Jamais';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Il y a quelques minutes';
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
  return date.toLocaleDateString('fr-FR');
}

export default function MonApprentissagePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { error } = useToast();
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates'>('courses');
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const fetchLearningData = useCallback(async () => {
    if (!user?.id) {
      setEnrollments([]);
      setCertificates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [enrollmentRes, certificateRes] = await Promise.all([
        backendClient
          .from('course_enrollments')
          .select('*, courses(id, title, category, description, modules, duration, thumbnail, delivery_mode)')
          .eq('student_id', user.id)
          .order('last_active', { ascending: false }),
        backendClient
          .from('certificates')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (enrollmentRes.error) throw enrollmentRes.error;
      if (certificateRes.error) throw certificateRes.error;

      setEnrollments((enrollmentRes.data as Enrollment[]) || []);
      setCertificates((certificateRes.data as Certificate[]) || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger votre espace d apprentissage.');
      setEnrollments([]);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void fetchLearningData();
  }, [fetchLearningData]);

  const stats = useMemo(() => ({
    totalCourses: enrollments.length,
    inProgress: enrollments.filter((course) => course.progress > 0 && course.progress < 100).length,
    completed: enrollments.filter((course) => course.progress >= 100).length,
    certificates: certificates.filter((certificate) => certificate.status === 'issued').length,
  }), [certificates, enrollments]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-56 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-c2p-bg px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[#dce3ec] bg-white p-8 shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
          <p className="c2p-eyebrow mb-4">Mon apprentissage</p>
          <h1 className="text-3xl font-semibold text-[#162033] sm:text-4xl">
            Connectez-vous pour retrouver vos cours, votre progression et vos certificats.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#556274]">
            Cet espace suit vos inscriptions reelles. Une fois connecte, vous retrouvez vos parcours en ligne, presentiels ou hybrides sans passer par des donnees de demonstration.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth/login" state={{ from: '/espace-numerique/mon-apprentissage' }} className="c2p-btn-accent px-6 py-3">
              Se connecter
            </Link>
            <Link to="/auth/register" className="c2p-btn-secondary px-6 py-3">
              Creer un compte
            </Link>
            <Link to="/espace-numerique" className="c2p-link inline-flex items-center gap-2 px-2 py-3 text-sm font-medium">
              <span>Explorer le catalogue</span>
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'apprenant' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-c2p-bg px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[#dce3ec] bg-white p-8 shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
          <p className="c2p-eyebrow mb-4">Mon apprentissage</p>
          <h1 className="text-3xl font-semibold text-[#162033] sm:text-4xl">
            Cet espace est reserve aux comptes apprenant.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#556274]">
            Le catalogue reste public, mais le suivi des parcours, des inscriptions et des certificats est rattache a un profil apprenant.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/espace-numerique" className="c2p-btn-accent px-6 py-3">
              Explorer le catalogue
            </Link>
            <Link to="/dashboard" className="c2p-btn-secondary px-6 py-3">
              Revenir au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon apprentissage</h1>
          <p className="text-base text-gray-600">Retrouvez vos inscriptions, votre progression et vos certificats reels.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Inscriptions', value: stats.totalCourses, icon: 'ri-book-open-line', tone: 'bg-slate-100 text-slate-700' },
            { label: 'En cours', value: stats.inProgress, icon: 'ri-loader-4-line', tone: 'bg-teal-50 text-teal-700' },
            { label: 'Terminees', value: stats.completed, icon: 'ri-checkbox-circle-line', tone: 'bg-green-50 text-green-700' },
            { label: 'Certificats emis', value: stats.certificates, icon: 'ri-award-line', tone: 'bg-amber-50 text-amber-700' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                  <i className={`${stat.icon} text-lg`}></i>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border-b border-gray-200 rounded-t-2xl">
          <div className="px-4 sm:px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('courses')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'courses'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes formations ({enrollments.length})
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'certificates'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Certificats ({certificates.length})
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-white p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-2xl bg-gray-100"></div>
              ))}
            </div>
          ) : activeTab === 'courses' ? (
            <div className="space-y-6">
              {enrollments.map((enrollment) => {
                const course = enrollment.courses;
                if (!course) return null;
                return (
                  <div key={enrollment.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-64 h-48 md:h-auto flex-shrink-0">
                        <img
                          src={getCourseImage(course)}
                          alt={course.title}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      <div className="flex-1 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#dce3ec] bg-[#f4f7fb] px-2.5 py-1 text-xs font-medium text-[#475569]">
                                {course.category}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getCourseDeliveryBadgeClass(course.delivery_mode)}`}>
                                <i className={getCourseDeliveryIcon(course.delivery_mode)}></i>
                                <span>{getCourseDeliveryLabel(course.delivery_mode)}</span>
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                            <p className="text-sm text-gray-600">
                              {course.modules || 0} modules • {course.duration || 'Duree non renseignee'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{formatLastAccessed(enrollment.last_active)}</span>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Progression
                            </span>
                            <span className="text-sm font-bold text-teal-600">{enrollment.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${enrollment.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-gray-600">
                            Statut : <span className="font-medium text-gray-900">{enrollment.progress >= 100 ? 'Termine' : enrollment.progress > 0 ? 'En cours' : 'A demarrer'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/espace-numerique/formation/${course.id}`}
                              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Voir le parcours
                            </Link>
                            <Link
                              to={`/espace-numerique/formation/${course.id}`}
                              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                            >
                              Continuer
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {enrollments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
                    <i className="ri-book-open-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune inscription pour le moment</h3>
                  <p className="text-sm text-gray-600 mb-6">Explorez le catalogue pour commencer un parcours en ligne, presentiel ou hybride.</p>
                  <Link
                    to="/espace-numerique"
                    className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Parcourir les formations
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="rounded-2xl border border-gray-200 p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <i className="ri-award-line text-2xl"></i>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      certificate.status === 'issued'
                        ? 'bg-green-50 text-green-700'
                        : certificate.status === 'ready'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}>
                      {certificate.status === 'issued' ? 'Emis' : certificate.status === 'ready' ? 'Pret' : 'En attente'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{certificate.course_name || certificate.title}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Reference</span>
                      <span className="font-medium text-gray-900">{certificate.certificate_number || 'A generer'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Note finale</span>
                      <span className="font-medium text-gray-900">{certificate.final_grade ?? certificate.grade ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Date</span>
                      <span className="font-medium text-gray-900">
                        {certificate.issued_at
                          ? new Date(certificate.issued_at).toLocaleDateString('fr-FR')
                          : certificate.completion_date
                            ? new Date(certificate.completion_date).toLocaleDateString('fr-FR')
                            : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      to={user.role === 'apprenant' ? '/dashboard/apprenant/certificats' : '/dashboard'}
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      <span>Voir le certificat</span>
                      <i className="ri-arrow-right-line"></i>
                    </Link>
                  </div>
                </div>
              ))}

              {certificates.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
                    <i className="ri-award-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun certificat pour le moment</h3>
                  <p className="text-sm text-gray-600">Terminez vos formations pour voir apparaître vos emissions reelles.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
