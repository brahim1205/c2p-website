import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { downloadCertificatePdf } from '@/lib/downloads';
import CertificateViewer, { type CertificateData } from '../../profile/components/CertificateViewer';
import {
  fetchApprenantCertificates,
  type ApprenantCertificate as Certificate,
} from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

function formatCertificateGrade(value: number | null) {
  return value != null ? `${value}/20` : '-';
}

type CertificateStatus = 'issued' | 'ready' | 'pending';

type CertificateView = {
  id: string;
  courseName: string;
  instructor: string;
  grade: number | null;
  status: CertificateStatus;
  certificateNumber: string | null;
  issuedAt: string | null;
  completionDate: string | null;
};

function normalizeStatus(status: string | undefined): CertificateStatus {
  if (status === 'issued' || status === 'active') return 'issued';
  if (status === 'ready') return 'ready';
  return 'pending';
}

function fromDatabaseCertificate(certificate: Certificate): CertificateView {
  return {
    id: `db-${certificate.id}`,
    courseName: certificate.course_name || certificate.title || 'Formation C2P',
    instructor: 'C2P Academy',
    grade: certificate.final_grade ?? certificate.grade ?? null,
    status: normalizeStatus(certificate.status),
    certificateNumber: certificate.certificate_number || certificate.certificate_id || null,
    issuedAt: certificate.issued_at,
    completionDate: certificate.completion_date || null,
  };
}

function getCertificateDate(certificate: CertificateView) {
  return certificate.issuedAt || certificate.completionDate || '';
}

function getCertificateCompletionDate(certificate: CertificateView) {
  return certificate.completionDate || certificate.issuedAt || '';
}

export default function ApprenantCertificatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [viewerData, setViewerData] = useState<CertificateData | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const {
    data: databaseCertificates = [],
    isError,
    isLoading: loading,
  } = useQuery<Certificate[]>({
    queryKey: queryKeys.apprenant.certificates(user?.id),
    queryFn: () => fetchApprenantCertificates(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger vos certificats.');
    }
  }, [error, isError]);

  const certificates = useMemo(() => {
    const normalized = databaseCertificates.map(fromDatabaseCertificate);
    const seen = new Set<string>();
    return normalized
      .filter((certificate) => {
        const key = certificate.certificateNumber || certificate.courseName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(getCertificateDate(b) || 0).getTime() - new Date(getCertificateDate(a) || 0).getTime());
  }, [databaseCertificates]);

  const filteredCertificates = useMemo(() => {
    if (statusFilter === 'all') return certificates;
    return certificates.filter((certificate) => certificate.status === statusFilter);
  }, [certificates, statusFilter]);

  const stats = useMemo(() => {
    const issuedWithGrades = certificates.filter((certificate) => certificate.status === 'issued' && certificate.grade != null);

    return {
      issued: certificates.filter((certificate) => certificate.status === 'issued').length,
      ready: certificates.filter((certificate) => certificate.status === 'ready').length,
      pending: certificates.filter((certificate) => certificate.status === 'pending').length,
      avgGrade: issuedWithGrades.length
        ? (issuedWithGrades.reduce((sum, certificate) => sum + Number(certificate.grade), 0) / issuedWithGrades.length).toFixed(1)
        : '0.0',
    };
  }, [certificates]);

  const latestIssuedCertificate = useMemo(
    () => certificates.find((certificate) => certificate.status === 'issued'),
    [certificates],
  );

  const openViewer = (certificate: CertificateView) => {
    if (certificate.status !== 'issued') {
      error('Certificat indisponible', 'Ce certificat n est pas encore emissible.');
      return;
    }

    setViewerData({
      studentName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Apprenant C2P',
      courseTitle: certificate.courseName,
      instructor: certificate.instructor,
      date: getCertificateCompletionDate(certificate) ? formatDate(getCertificateCompletionDate(certificate)) : '',
      certificateId: certificate.certificateNumber || certificate.id,
    });
    setShowViewer(true);
  };

  const handleDownload = (certificate: CertificateView) => {
    if (certificate.status !== 'issued') {
      error('Indisponible', 'Le telechargement sera disponible apres emission.');
      return;
    }
    downloadCertificatePdf(`${certificate.certificateNumber || `certificat-${certificate.id}`}.pdf`, {
      studentName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Apprenant C2P',
      courseTitle: certificate.courseName,
      instructor: certificate.instructor,
      date: getCertificateCompletionDate(certificate) ? formatDate(getCertificateCompletionDate(certificate)) : '-',
      certificateId: certificate.certificateNumber || certificate.id,
    });
    success('Telechargement', `Le certificat ${certificate.certificateNumber || certificate.id} a ete telecharge.`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Certificats' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes certificats</h1>
          <p className="text-gray-600">Retrouvez vos certificats emis par C2P et ceux generes apres une formation terminee.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Emis', value: stats.issued, icon: 'ri-award-line', color: 'bg-green-500' },
            { label: 'Prets', value: stats.ready, icon: 'ri-time-line', color: 'bg-amber-500' },
            { label: 'En attente', value: stats.pending, icon: 'ri-loader-4-line', color: 'bg-blue-500' },
            { label: 'Note moyenne', value: stats.avgGrade, icon: 'ri-bar-chart-line', color: 'bg-[#5fa6f3]' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.color} text-white flex items-center justify-center`}>
                  <i className={`${stat.icon} text-base`}></i>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'issued', 'ready', 'pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status ? 'bg-[#5fa6f3] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'Tous' : status === 'issued' ? 'Emis' : status === 'ready' ? 'Prets' : 'En attente'}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          {loading && (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && filteredCertificates.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredCertificates.map((certificate) => (
                <article key={certificate.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <i className="ri-award-line text-xl" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{certificate.courseName}</p>
                        <p className="mt-1 text-sm text-gray-500">{certificate.certificateNumber || 'Numero non genere'}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      certificate.status === 'issued'
                        ? 'bg-green-100 text-green-700'
                        : certificate.status === 'ready'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {certificate.status === 'issued' ? 'Emis' : certificate.status === 'ready' ? 'Pret' : 'En attente'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs text-gray-500">Note finale</p>
                      <p className="mt-1 font-semibold text-gray-900">{formatCertificateGrade(certificate.grade)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs text-gray-500">Emission</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {certificate.issuedAt ? formatDate(certificate.issuedAt) : certificate.completionDate ? formatDate(certificate.completionDate) : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => openViewer(certificate)}
                      disabled={certificate.status !== 'issued'}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDownload(certificate)}
                      disabled={certificate.status !== 'issued'}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Telecharger
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && filteredCertificates.length === 0 && (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <i className="ri-award-line text-2xl" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Aucun certificat</h2>
              <p className="mt-1 text-sm text-gray-500">Terminez une formation eligible pour voir votre certificat ici.</p>
              <Link to="/dashboard/apprenant/mes-cours" className="mt-4 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                Voir mes formations
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Derniere emission</h2>
          <p className="text-sm text-gray-600 mt-1">
            {latestIssuedCertificate?.issuedAt
              ? `Dernier certificat emis le ${formatDateTime(latestIssuedCertificate.issuedAt)}.`
              : 'Aucun certificat emis pour le moment.'}
          </p>
        </div>
      </div>

      {showViewer && viewerData && (
        <CertificateViewer
          data={viewerData}
          onClose={() => setShowViewer(false)}
        />
      )}
    </DashboardLayout>
  );
}
