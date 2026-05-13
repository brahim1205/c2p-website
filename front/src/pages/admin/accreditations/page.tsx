import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { fetchAdminAccreditations, updateAdminAccreditation, type AdminAccreditation } from '@/lib/adminApi';
import { openHtmlPreview } from '@/lib/downloads';

export default function AdminAccreditationsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [accreditations, setAccreditations] = useState<AdminAccreditation[]>([]);
  const [selectedAccreditation, setSelectedAccreditation] = useState<AdminAccreditation | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingReject, setPendingReject] = useState<AdminAccreditation | null>(null);

  const loadAccreditations = useCallback(async () => {
    try {
      setAccreditations(await fetchAdminAccreditations());
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les accreditations.');
    }
  }, [error]);

  useEffect(() => {
    loadAccreditations();
  }, [loadAccreditations]);

  const filteredAccreditations = useMemo(() => accreditations.filter((item) => item.status === activeTab), [accreditations, activeTab]);

  const getStatusBadge = (status: AdminAccreditation['status']) => {
    const styles = { approved: 'bg-green-100 text-green-700', pending: 'bg-orange-100 text-orange-700', rejected: 'bg-red-100 text-red-700' };
    const labels = { approved: 'Approuve', pending: 'En attente', rejected: 'Rejete' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const handleApprove = async (item: AdminAccreditation) => {
    try {
      const updated = await updateAdminAccreditation(item.id, { status: 'approved', reject_reason: '' });
      setAccreditations((prev) => prev.map((entry) => entry.id === item.id ? updated : entry));
      success('Accreditation approuvee', item.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Validation impossible.');
    }
  };

  const handleReject = async () => {
    if (!pendingReject || !rejectReason.trim()) return;
    try {
      const updated = await updateAdminAccreditation(pendingReject.id, { status: 'rejected', reject_reason: rejectReason.trim() });
      setAccreditations((prev) => prev.map((entry) => entry.id === pendingReject.id ? updated : entry));
      setShowRejectReasonModal(false);
      setRejectReason('');
      setPendingReject(null);
      success('Accreditation rejetee', updated.name);
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
    body { font-family: Arial, sans-serif; background: #f5f1e8; color: #111; margin: 0; padding: 40px; }
    main { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #e6dfd0; border-radius: 20px; padding: 32px; }
    .eyebrow { color: #9a7a2f; text-transform: uppercase; letter-spacing: 0.3em; font-size: 12px; font-weight: 700; }
    h1 { margin: 18px 0 10px; font-size: 32px; }
    .meta { display: grid; gap: 10px; margin-top: 24px; }
    .meta div { padding: 14px 16px; border-radius: 14px; background: #faf7ef; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>${doc}</h1>
    <p>Dossier d'accreditation de ${item.name}</p>
    <div class="meta">
      <div><strong>Profession</strong><br />${item.profession}</div>
      <div><strong>Experience</strong><br />${item.experience}</div>
      <div><strong>Statut</strong><br />${item.status}</div>
      <div><strong>Date de depot</strong><br />${item.date}</div>
    </div>
  </main>
</body>
</html>`);
    success('Document ouvert', doc);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Accreditations' }]} />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion des accreditations</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['pending', 'approved', 'rejected'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#5fa6f3] text-[#5fa6f3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'pending' && `En attente (${accreditations.filter((item) => item.status === 'pending').length})`}
                  {tab === 'approved' && `Approuvees (${accreditations.filter((item) => item.status === 'approved').length})`}
                  {tab === 'rejected' && `Rejetees (${accreditations.filter((item) => item.status === 'rejected').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {filteredAccreditations.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <img src={item.avatar} alt={item.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2 flex-wrap">
                          <h3 className="text-base lg:text-lg font-bold text-gray-900">{item.name}</h3>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Profession :</span> {item.profession}</p>
                        <p className="text-sm text-gray-600 mb-3"><span className="font-medium">Experience :</span> {item.experience}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-gray-700">Documents fournis :</span>
                          {item.documents.map((doc) => <span key={doc} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{doc}</span>)}
                        </div>
                        <p className="text-xs text-gray-500">Demande soumise le {item.date}</p>
                        {item.reject_reason && <p className="text-xs text-red-600 mt-2">Motif : {item.reject_reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => { setSelectedAccreditation(item); setShowDocsModal(true); }} className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg hover:bg-[#27346b] transition-colors text-sm font-medium whitespace-nowrap">Voir les documents</button>
                      {item.status === 'pending' && (
                        <>
                          <button onClick={() => void handleApprove(item)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap">Approuver</button>
                          <button onClick={() => { setPendingReject(item); setShowRejectReasonModal(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap">Rejeter</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showDocsModal && selectedAccreditation && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Documents de {selectedAccreditation.name}</h3>
                <button onClick={() => setShowDocsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-3">
                {selectedAccreditation.documents.map((doc) => (
                  <div key={doc} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <span className="text-sm text-gray-700">{doc}</span>
                    <button onClick={() => handlePreviewDocument(selectedAccreditation, doc)} className="text-sm text-[#5fa6f3] font-medium">Consulter</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showRejectReasonModal && pendingReject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Motif du rejet</h3>
                <button onClick={() => { setShowRejectReasonModal(false); setPendingReject(null); setRejectReason(''); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Precisez le motif du rejet..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]"></textarea>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowRejectReasonModal(false); setPendingReject(null); setRejectReason(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void handleReject()} disabled={!rejectReason.trim()} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${rejectReason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
