import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { downloadSimplePdf } from '@/lib/downloads';
import CertificateViewer, { type CertificateData } from '../../profile/components/CertificateViewer';
import {
  fetchApprenantCertificates,
  type ApprenantCertificate as Certificate,
} from '@/lib/apprenantDashboardApi';

function formatCertificateGrade(value: number | null) {
  return value != null ? `${value}` : '-';
}

export default function ApprenantCertificatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'ready' | 'pending'>('all');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [viewerData, setViewerData] = useState<CertificateData | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const loadCertificates = useCallback(async () => {
    if (!user?.id) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApprenantCertificates(user.id);
      setCertificates(data);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger vos certificats.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const filteredCertificates = useMemo(() => {
    if (statusFilter === 'all') return certificates;
    return certificates.filter((certificate) => certificate.status === statusFilter);
  }, [certificates, statusFilter]);

  const stats = useMemo(() => ({
    issued: certificates.filter((certificate) => certificate.status === 'issued').length,
    ready: certificates.filter((certificate) => certificate.status === 'ready').length,
    pending: certificates.filter((certificate) => certificate.status === 'pending').length,
    avgGrade: certificates.length
      ? (certificates.reduce((sum, certificate) => sum + Number(certificate.final_grade ?? certificate.grade ?? 0), 0) / certificates.length).toFixed(1)
      : '0.0',
  }), [certificates]);

  const openViewer = (certificate: Certificate) => {
    if (certificate.status !== 'issued') {
      error('Certificat indisponible', 'Ce certificat n est pas encore emissible.');
      return;
    }

    setViewerData({
      studentName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Apprenant C2P',
      courseTitle: certificate.course_name || certificate.title,
      instructor: 'C2P Academy',
      date: certificate.issued_at || certificate.completion_date || '',
      certificateId: certificate.certificate_number || certificate.certificate_id || `CERT-${certificate.id}`,
    });
    setShowViewer(true);
  };

  const handleDownload = (certificate: Certificate) => {
    if (certificate.status !== 'issued') {
      error('Indisponible', 'Le telechargement sera disponible apres emission.');
      return;
    }
    downloadSimplePdf(`${certificate.certificate_number || `certificat-${certificate.id}`}.pdf`, {
      title: 'CERTIFICAT DE REUSSITE',
      lines: [
        'Centre C2P',
        '',
        'Ce certificat est attribue a',
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Apprenant C2P',
        '',
        `Formation: ${certificate.course_name || certificate.title}`,
        `Identifiant: ${certificate.certificate_number || certificate.certificate_id || certificate.id}`,
        `Note finale: ${formatCertificateGrade(certificate.final_grade ?? certificate.grade ?? null)}`,
        `Date: ${certificate.issued_at ? formatDate(certificate.issued_at) : certificate.completion_date ? formatDate(certificate.completion_date) : '-'}`,
      ],
    });
    success('Telechargement', `Le certificat ${certificate.certificate_number || certificate.id} a ete telecharge.`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Certificats' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes certificats</h1>
          <p className="text-gray-600">Historique des certificats emis, prets ou encore en attente.</p>
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

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Emission</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-sm text-gray-500">Chargement des certificats...</td>
                  </tr>
                )}

                {!loading && filteredCertificates.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{certificate.course_name || certificate.title}</p>
                        <p className="text-sm text-gray-500">{certificate.certificate_number || 'Numero non genere'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        certificate.status === 'issued'
                          ? 'bg-green-100 text-green-700'
                          : certificate.status === 'ready'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {certificate.status === 'issued' ? 'Emis' : certificate.status === 'ready' ? 'Pret' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatCertificateGrade(certificate.final_grade ?? certificate.grade ?? null)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {certificate.issued_at ? formatDate(certificate.issued_at) : certificate.completion_date ? formatDate(certificate.completion_date) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openViewer(certificate)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handleDownload(certificate)}
                          className="px-3 py-1.5 rounded-lg bg-[#5fa6f3] text-white text-xs font-medium hover:bg-[#27346b]"
                        >
                          Telecharger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredCertificates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      Aucun certificat pour ce filtre. <Link to="/dashboard/apprenant/mes-cours" className="text-[#5fa6f3] font-medium">Voir mes formations</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Derniere emission</h2>
          <p className="text-sm text-gray-600 mt-1">
            {certificates[0]?.issued_at
              ? `Dernier certificat emis le ${formatDateTime(certificates[0].issued_at)}.`
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
