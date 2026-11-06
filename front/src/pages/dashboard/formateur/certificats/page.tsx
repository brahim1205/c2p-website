import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useCertificateBranding } from '@/hooks/useCertificateBranding';
import { downloadCertificatePdf } from '@/lib/downloads';
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
  toCertificateData,
  type Certificate,
  type CertificateFilter,
} from './certificatesModel';

export default function FormateurCertificatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const branding = useCertificateBranding();
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
    if (!window.confirm(`Délivrer le certificat de ${cert.student_name} sans attendre la validation de toutes les étapes ? Il sera immédiatement vérifiable.`)) return;
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

    const data = toCertificateData(cert, branding);
    downloadCertificatePdf(`certificat-${data.certificateId}.pdf`, data);
    success('Téléchargement', `Le certificat ${cert.certificate_id ?? cert.id} a été généré.`);
  };

  const handleDelete = async (cert: Certificate) => {
    const reason = window.prompt(`Révoquer le certificat de ${cert.student_name} ? Indiquez le motif (affiché sur la page de vérification) :`);
    if (reason === null) return;
    if (!reason.trim()) {
      error('Motif requis', 'Indiquez pourquoi ce certificat est révoqué.');
      return;
    }
    try {
      await deleteFormateurCertificate(cert.id, reason.trim());
      success('Certificat révoqué', `Le certificat de ${cert.student_name} n’est plus valide.`);
      await refreshCerts();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de révoquer le certificat.');
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
