import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { fetchAdminAccreditations, updateAdminAccreditation, type AdminAccreditation } from '@/lib/adminApi';
import { openHtmlPreview } from '@/lib/downloads';
import { formatDate } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import {
  AdminAccreditationDocumentsModal,
  AdminAccreditationRejectModal,
  AdminAccreditationsHero,
  AdminAccreditationsList,
  AdminAccreditationsSearch,
} from './AdminAccreditationsPagePanels';
import { statusLabels, type AccreditationStatus } from './adminAccreditationUi';

export default function AdminAccreditationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AccreditationStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccreditation, setSelectedAccreditation] = useState<AdminAccreditation | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingReject, setPendingReject] = useState<AdminAccreditation | null>(null);

  const accreditationsQuery = useQuery({
    queryKey: queryKeys.admin.accreditations(),
    queryFn: fetchAdminAccreditations,
  });

  useEffect(() => {
    if (accreditationsQuery.isError) {
      console.error(accreditationsQuery.error);
      error('Erreur', 'Impossible de charger les accréditations.');
    }
  }, [accreditationsQuery.error, accreditationsQuery.isError, error]);

  const accreditations = useMemo(() => accreditationsQuery.data ?? [], [accreditationsQuery.data]);
  const loading = accreditationsQuery.isLoading;

  const updateAccreditationsCache = (updater: (items: AdminAccreditation[]) => AdminAccreditation[]) => {
    queryClient.setQueryData<AdminAccreditation[]>(queryKeys.admin.accreditations(), (current) => updater(current ?? accreditations));
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.accreditations() });
  };

  const counts = useMemo(() => ({
    pending: accreditations.filter((item) => item.status === 'pending').length,
    approved: accreditations.filter((item) => item.status === 'approved').length,
    rejected: accreditations.filter((item) => item.status === 'rejected').length,
  }), [accreditations]);

  const filteredAccreditations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accreditations
      .filter((item) => item.status === activeTab)
      .filter((item) => {
        if (!query) return true;
        return [item.name, item.profession, item.experience, item.notes, item.reject_reason]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
  }, [accreditations, activeTab, searchQuery]);

  const handleApprove = async (item: AdminAccreditation) => {
    try {
      const updated = await updateAdminAccreditation(item.id, { status: 'approved', reject_reason: '' });
      updateAccreditationsCache((prev) => prev.map((entry) => (entry.id === item.id ? updated : entry)));
      success('Accréditation approuvée', item.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Validation impossible.');
    }
  };

  const handleReject = async () => {
    if (!pendingReject || !rejectReason.trim()) return;
    try {
      const updated = await updateAdminAccreditation(pendingReject.id, { status: 'rejected', reject_reason: rejectReason.trim() });
      updateAccreditationsCache((prev) => prev.map((entry) => (entry.id === pendingReject.id ? updated : entry)));
      setShowRejectReasonModal(false);
      setRejectReason('');
      setPendingReject(null);
      success('Accréditation rejetée', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Rejet impossible.');
    }
  };

  const handlePreviewDocument = (item: AdminAccreditation, doc: string) => {
    openHtmlPreview(`${item.name}-${doc}`, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${doc}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f8fa; color: #111827; margin: 0; padding: 40px; }
    main { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
    .eyebrow { color: #0f766e; text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; font-weight: 700; }
    h1 { margin: 18px 0 10px; font-size: 32px; }
    .meta { display: grid; gap: 10px; margin-top: 24px; }
    .meta div { padding: 14px 16px; border-radius: 12px; background: #f8fafc; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>${doc}</h1>
    <p>Dossier d'accréditation de ${item.name}</p>
    <div class="meta">
      <div><strong>Profession</strong><br />${item.profession}</div>
      <div><strong>Expérience</strong><br />${item.experience}</div>
      <div><strong>Statut</strong><br />${statusLabels[item.status]}</div>
      <div><strong>Date de dépôt</strong><br />${formatDate(item.date)}</div>
    </div>
  </main>
</body>
</html>`);
    success('Document ouvert', doc);
  };

  const closeRejectModal = () => {
    setShowRejectReasonModal(false);
    setPendingReject(null);
    setRejectReason('');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Accréditations' }]} />

        <AdminAccreditationsHero activeTab={activeTab} counts={counts} onSelectTab={setActiveTab} />
        <AdminAccreditationsSearch
          activeTab={activeTab}
          resultCount={filteredAccreditations.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <AdminAccreditationsList
          activeTab={activeTab}
          counts={counts}
          items={filteredAccreditations}
          loading={loading}
          onApprove={handleApprove}
          onOpenDocs={(entry) => { setSelectedAccreditation(entry); setShowDocsModal(true); }}
          onOpenReject={(entry) => { setPendingReject(entry); setShowRejectReasonModal(true); }}
          onPreviewDocument={handlePreviewDocument}
          onSelectTab={setActiveTab}
        />

        {showDocsModal && selectedAccreditation && (
          <AdminAccreditationDocumentsModal
            accreditation={selectedAccreditation}
            onClose={() => setShowDocsModal(false)}
            onPreviewDocument={handlePreviewDocument}
          />
        )}

        {showRejectReasonModal && pendingReject && (
          <AdminAccreditationRejectModal
            accreditation={pendingReject}
            rejectReason={rejectReason}
            onCancel={closeRejectModal}
            onChangeRejectReason={setRejectReason}
            onConfirm={() => void handleReject()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
