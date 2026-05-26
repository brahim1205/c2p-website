import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { downloadSimplePdf } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import {
  deleteFormateurCertificate,
  fetchFormateurCertificates,
  issueFormateurCertificate,
} from '@/lib/formateurDashboardApi';
import {
  CertificateFilters,
  CertificatePreviewModal,
  CertificateStatsGrid,
  CertificatesTable,
} from './CertificatePanels';
import {
  filterCertificates,
  formatCertificateGrade,
  type Certificate,
  type CertificateFilter,
} from './certificatesModel';

export default function FormateurCertificatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CertificateFilter>('all');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const certificatesQueryKey = useMemo(() => queryKeys.formateur.certificates(user?.id), [user?.id]);
  const {
    data: certs = [],
    isLoading: loading,
    isError,
    error: certificatesError,
  } = useQuery({
    queryKey: certificatesQueryKey,
    queryFn: async () => fetchFormateurCertificates(user?.id ?? '') as Promise<Certificate[]>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger les certificats.');
      console.error(certificatesError);
    }
  }, [certificatesError, error, isError]);

  const refreshCerts = async () => {
    await queryClient.invalidateQueries({ queryKey: certificatesQueryKey });
  };

  const filteredCerts = filterCertificates(certs, filter);

  const handleIssue = async (cert: Certificate) => {
    try {
      await issueFormateurCertificate(cert);
      success('Certificat délivré', `Le certificat pour ${cert.student_name} a été généré avec succès.`);
      await refreshCerts();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de délivrer le certificat.');
      console.error(err);
    }
  };

  const handlePreview = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowPreviewModal(true);
  };

  const handleDownload = (cert: Certificate) => {
    if (cert.status !== 'issued') {
      error('Certificat non disponible', "Ce certificat n'a pas encore été délivré.");
      return;
    }

    downloadSimplePdf(`${cert.certificate_id ?? `certificat-${cert.id}`}.pdf`, {
      title: 'CERTIFICAT DE REUSSITE',
      lines: [
        'Centre C2P',
        '',
        'Ce certificat est decerne a',
        cert.student_name,
        '',
        `Formation: ${cert.course_name ?? 'Formation C2P'}`,
        `Identifiant: ${cert.certificate_id ?? cert.id}`,
        `Note finale: ${formatCertificateGrade(cert.final_grade)}`,
        `Date: ${cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}`,
      ],
    });

    success('Téléchargement', `Le certificat ${cert.certificate_id ?? cert.id} a été généré.`);
  };

  const handleDelete = async (cert: Certificate) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le certificat de ${cert.student_name} ?`)) return;
    try {
      await deleteFormateurCertificate(cert.id);
      success('Supprimé', `Le certificat de ${cert.student_name} a été supprimé.`);
      await refreshCerts();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer le certificat.');
      console.error(err);
    }
  };

  const closePreview = () => {
    setShowPreviewModal(false);
    setSelectedCert(null);
  };

  const handleIssueFromPreview = async (cert: Certificate) => {
    await handleIssue(cert);
    closePreview();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Certificats' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Certificats</h1>
          <p className="text-gray-600 text-sm md:text-base">Délivrez et gérez les certificats de vos apprenants</p>
        </div>

        <CertificateStatsGrid certs={certs} />
        <CertificateFilters filter={filter} onFilterChange={setFilter} />
        <CertificatesTable
          certs={filteredCerts}
          loading={loading}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onIssue={handleIssue}
          onPreview={handlePreview}
        />

        {showPreviewModal && selectedCert ? (
          <CertificatePreviewModal
            cert={selectedCert}
            onClose={closePreview}
            onDownload={handleDownload}
            onIssue={handleIssueFromPreview}
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
