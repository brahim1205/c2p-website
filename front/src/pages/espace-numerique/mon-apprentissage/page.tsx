import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchApprenantCertificates, fetchApprenantEnrollments } from '@/lib/apprenantDashboardApi';
import {
  LearningCertificatesPanel,
  LearningCoursesPanel,
  LearningStatsCards,
  LearningTabs,
} from './MonApprentissagePanels';
import {
  buildLearningStats,
  type Certificate,
  type Enrollment,
} from './monApprentissageModel';

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
      const [enrollmentRows, certificateRows] = await Promise.all([
        fetchApprenantEnrollments(user.id),
        fetchApprenantCertificates(user.id),
      ]);

      setEnrollments((enrollmentRows as Enrollment[]) || []);
      setCertificates((certificateRows as Certificate[]) || []);
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

  const stats = useMemo(() => buildLearningStats(enrollments, certificates), [certificates, enrollments]);

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
        <LearningStatsCards stats={stats} />
        <LearningTabs
          activeTab={activeTab}
          enrollmentsCount={enrollments.length}
          certificatesCount={certificates.length}
          onTabChange={setActiveTab}
        />

        <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-white p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-2xl bg-gray-100"></div>
              ))}
            </div>
          ) : activeTab === 'courses' ? (
            <LearningCoursesPanel enrollments={enrollments} />
          ) : (
            <LearningCertificatesPanel certificates={certificates} user={user} />
          )}
        </div>
      </div>
    </div>
  );
}
