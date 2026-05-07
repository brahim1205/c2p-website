import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { fetchAdminReports, updateAdminReport, type AdminReport } from '@/lib/adminApi';

export default function AdminReportsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [pendingSuspend, setPendingSuspend] = useState<AdminReport | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setReports(await fetchAdminReports());
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les signalements.');
    }
  }, [error]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => reports.filter((report) => report.status === activeTab), [activeTab, reports]);

  const getStatusBadge = (status: AdminReport['status']) => {
    const styles = { pending: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700', dismissed: 'bg-gray-100 text-gray-700' };
    const labels = { pending: 'En attente', resolved: 'Resolu', dismissed: 'Rejete' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getPriorityBadge = (priority: AdminReport['priority']) => {
    const styles = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-teal-100 text-teal-700' };
    const labels = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>{labels[priority]}</span>;
  };

  const mutateReport = async (id: number, patch: Partial<AdminReport>, message: string) => {
    try {
      const updated = await updateAdminReport(id, patch);
      setReports((prev) => prev.map((report) => report.id === id ? updated : report));
      success(message, updated.reported);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le signalement n a pas pu etre mis a jour.');
    }
  };

  const confirmSuspend = async () => {
    if (!pendingSuspend || !suspendReason.trim()) return;
    await mutateReport(pendingSuspend.id, { status: 'resolved', adminAction: `Utilisateur suspendu - ${suspendReason.trim()}` }, 'Utilisateur suspendu');
    setShowSuspendModal(false);
    setPendingSuspend(null);
    setSuspendReason('');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Signalements' }]} />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion des signalements</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['pending', 'resolved', 'dismissed'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#14B8A6] text-[#14B8A6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'pending' && `En attente (${reports.filter((report) => report.status === 'pending').length})`}
                  {tab === 'resolved' && `Resolus (${reports.filter((report) => report.status === 'resolved').length})`}
                  {tab === 'dismissed' && `Rejetes (${reports.filter((report) => report.status === 'dismissed').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-5 lg:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">Signalement #{report.id}</span>
                    {getStatusBadge(report.status)}
                    {getPriorityBadge(report.priority)}
                  </div>
                  <span className="text-xs text-gray-500">{new Date(report.date).toLocaleString('fr-FR')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div><p className="text-xs text-gray-500 mb-1">Signale par</p><p className="text-sm font-medium text-gray-900">{report.reporter}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Utilisateur signale</p><p className="text-sm font-medium text-gray-900">{report.reported}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Type</p><p className="text-sm font-medium text-gray-900">{report.type}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Raison</p><p className="text-sm font-medium text-gray-900">{report.reason}</p></div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{report.description}</p>
                </div>

                {report.adminAction && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Action administrative</p>
                    <p className="text-sm font-medium text-gray-900">{report.adminAction}</p>
                  </div>
                )}

                {report.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
                    <button onClick={() => void mutateReport(report.id, { status: 'resolved', adminAction: 'Resolu par moderation' }, 'Signalement resolu')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap">
                      <i className="ri-check-line mr-1"></i>
                      Marquer comme resolu
                    </button>
                    <button onClick={() => void mutateReport(report.id, { status: 'dismissed', adminAction: 'Sans fondement' }, 'Signalement rejete')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium whitespace-nowrap">
                      <i className="ri-close-line mr-1"></i>
                      Rejeter
                    </button>
                    <button onClick={() => { setPendingSuspend(report); setShowSuspendModal(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap">
                      <i className="ri-user-forbid-line mr-1"></i>
                      Suspendre l utilisateur
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showSuspendModal && pendingSuspend && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Suspendre l utilisateur</h3>
                <button onClick={() => { setShowSuspendModal(false); setPendingSuspend(null); setSuspendReason(''); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Vous allez suspendre <strong>{pendingSuspend.reported}</strong>.</p>
              <textarea rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Motif de suspension..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"></textarea>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowSuspendModal(false); setPendingSuspend(null); setSuspendReason(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void confirmSuspend()} disabled={!suspendReason.trim()} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${suspendReason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
