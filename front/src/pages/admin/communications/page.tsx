import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminCampaign, deleteAdminCampaign, fetchAdminCampaigns, updateAdminCampaign, type AdminCampaign } from '@/lib/adminApi';
import { dispatchSmsCampaign, fetchSmsGatewayStatus } from '@/lib/communicationsApi';

const channelConfig = {
  email: { icon: 'ri-mail-line', label: 'Email', color: 'bg-teal-500' },
  sms: { icon: 'ri-message-2-line', label: 'SMS', color: 'bg-orange-500' },
  push: { icon: 'ri-notification-3-line', label: 'Push', color: 'bg-teal-500' },
  all: { icon: 'ri-broadcast-line', label: 'Multi-canal', color: 'bg-teal-600' },
};

const statusConfig = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Planifiee', className: 'bg-amber-100 text-amber-700' },
  sent: { label: 'Envoyee', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Annulee', className: 'bg-red-100 text-red-700' },
};

export default function AdminCommunicationsPage() {
  const { success, error } = useToast();
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [smsGatewayStatus, setSmsGatewayStatus] = useState<{ provider: string; configured: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<AdminCampaign | null>(null);
  const [composeForm, setComposeForm] = useState({
    title: '',
    type: 'email' as AdminCampaign['type'],
    target: 'Tous les utilisateurs',
    content: '',
    schedule: false,
    scheduleDate: '',
  });

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaigns(await fetchAdminCampaigns());
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les campagnes.');
    }
  }, [error]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    void (async () => {
      try {
        setSmsGatewayStatus(await fetchSmsGatewayStatus());
      } catch {
        setSmsGatewayStatus(null);
      }
    })();
  }, []);

  const filtered = activeTab === 'all' ? campaigns : campaigns.filter((campaign) => campaign.status === activeTab);
  const averageOpenRate = useMemo(() => {
    const sent = campaigns.filter((campaign) => campaign.openRate !== null && campaign.openRate !== undefined);
    if (!sent.length) return '0%';
    return `${Math.round(sent.reduce((sum, campaign) => sum + Number(campaign.openRate || 0), 0) / sent.length)}%`;
  }, [campaigns]);

  const resetCompose = () => {
    setComposeForm({ title: '', type: 'email', target: 'Tous les utilisateurs', content: '', schedule: false, scheduleDate: '' });
  };

  const handleSendNow = async () => {
    if (!composeForm.title.trim() || !composeForm.content.trim()) return;
    try {
      const created = await createAdminCampaign({
        title: composeForm.title,
        type: composeForm.type,
        target: composeForm.target,
        status: composeForm.schedule ? 'scheduled' : 'sent',
        sentCount: composeForm.schedule ? 0 : 2847,
        openRate: composeForm.schedule ? null : 72,
        scheduledDate: composeForm.schedule ? composeForm.scheduleDate : null,
        createdAt: new Date().toISOString().split('T')[0],
        content: composeForm.content,
      });

      let smsDispatchSummary = '';
      if (!composeForm.schedule && (composeForm.type === 'sms' || composeForm.type === 'all')) {
        const result = await dispatchSmsCampaign({
          title: composeForm.title,
          type: composeForm.type,
          target: composeForm.target,
          content: composeForm.content,
        });
        smsDispatchSummary = result.skipped
          ? ' Envoi SMS ignore.'
          : ` ${result.dispatched}/${result.recipients} SMS remis.`;
      }

      setCampaigns((prev) => [created, ...prev]);
      setShowCompose(false);
      resetCompose();
      success(composeForm.schedule ? 'Campagne planifiee' : 'Campagne envoyee', `${created.title}.${smsDispatchSummary}`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La campagne n a pas pu etre enregistree.');
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    try {
      await deleteAdminCampaign(id);
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id));
      success('Campagne supprimee', 'La campagne a ete retiree.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Suppression impossible.');
    }
  };

  const handleDuplicateCampaign = async (campaign: AdminCampaign) => {
    try {
      const duplicated = await createAdminCampaign({
        ...campaign,
        title: `${campaign.title} (copie)`,
        status: 'draft',
        sentCount: 0,
        openRate: null,
        scheduledDate: null,
        createdAt: new Date().toISOString().split('T')[0],
      });
      setCampaigns((prev) => [duplicated, ...prev]);
      success('Campagne dupliquee', 'Une copie brouillon a ete creee.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Duplication impossible.');
    }
  };

  const handleCancelScheduled = async (campaign: AdminCampaign) => {
    try {
      const updated = await updateAdminCampaign(campaign.id, { status: 'cancelled' });
      setCampaigns((prev) => prev.map((item) => (item.id === campaign.id ? updated : item)));
      success('Campagne annulee', campaign.title);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Mise a jour impossible.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Communications' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Communications</h1>
            <p className="text-gray-600 text-sm mt-1">Notifications globales, campagnes et messages aux utilisateurs</p>
            {smsGatewayStatus && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                <span className={`h-2 w-2 rounded-full ${smsGatewayStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>SMS {smsGatewayStatus.provider}</span>
                <span>{smsGatewayStatus.configured ? 'configure' : 'configuration requise'}</span>
              </div>
            )}
          </div>
          <button onClick={() => setShowCompose(true)} className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2">
            <i className="ri-add-line"></i>
            Nouvelle campagne
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Campagnes envoyees', value: campaigns.filter((campaign) => campaign.status === 'sent').length, icon: 'ri-send-plane-line', color: 'bg-teal-500' },
            { label: 'En brouillon', value: campaigns.filter((campaign) => campaign.status === 'draft').length, icon: 'ri-draft-line', color: 'bg-gray-500' },
            { label: 'Planifiees', value: campaigns.filter((campaign) => campaign.status === 'scheduled').length, icon: 'ri-calendar-schedule-line', color: 'bg-amber-500' },
            { label: 'Taux moyen d ouverture', value: averageOpenRate, icon: 'ri-eye-line', color: 'bg-teal-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <i className={`${stat.icon} text-white text-sm`}></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['all', 'draft', 'scheduled', 'sent'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'all' && `Toutes (${campaigns.length})`}
                  {tab === 'draft' && `Brouillons (${campaigns.filter((campaign) => campaign.status === 'draft').length})`}
                  {tab === 'scheduled' && `Planifiees (${campaigns.filter((campaign) => campaign.status === 'scheduled').length})`}
                  {tab === 'sent' && `Envoyees (${campaigns.filter((campaign) => campaign.status === 'sent').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {filtered.map((campaign) => {
              const channel = channelConfig[campaign.type];
              const status = statusConfig[campaign.status];
              return (
                <div key={campaign.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-10 h-10 ${channel.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <i className={`${channel.icon} text-white`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900">{campaign.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Canal : {channel.label} · Cible : {campaign.target} · Creee le {campaign.createdAt}
                          {campaign.scheduledDate ? ` · Planifiee le ${campaign.scheduledDate}` : ''}
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-2">{campaign.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => { setPreviewCampaign(campaign); setShowPreview(true); }} className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                        Apercu
                      </button>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => {
                            setComposeForm({
                              title: campaign.title,
                              type: campaign.type,
                              target: campaign.target,
                              content: campaign.content,
                              schedule: false,
                              scheduleDate: '',
                            });
                            setShowCompose(true);
                          }}
                          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                        >
                          Continuer
                        </button>
                      )}
                      {campaign.status === 'scheduled' && (
                        <button onClick={() => handleCancelScheduled(campaign)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors whitespace-nowrap">
                          Annuler
                        </button>
                      )}
                      <button onClick={() => handleDuplicateCampaign(campaign)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" title="Dupliquer">
                        <i className="ri-file-copy-line text-gray-500 text-sm"></i>
                      </button>
                      <button onClick={() => handleDeleteCampaign(campaign.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                        <i className="ri-delete-bin-line text-red-500 text-sm"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showCompose && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Nouvelle campagne</h3>
                <button onClick={() => setShowCompose(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>
              <div className="space-y-4">
                <input value={composeForm.title} onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })} placeholder="Titre de la campagne" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select value={composeForm.type} onChange={(e) => setComposeForm({ ...composeForm, type: e.target.value as AdminCampaign['type'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Notification push</option>
                    <option value="all">Multi-canal</option>
                  </select>
                  <select value={composeForm.target} onChange={(e) => setComposeForm({ ...composeForm, target: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option>Tous les utilisateurs</option>
                    <option>Tous les apprenants</option>
                    <option>Clients actifs</option>
                    <option>Porteurs de projet</option>
                    <option>Prestataires verifies</option>
                  </select>
                </div>
                <textarea value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })} rows={6} maxLength={500} placeholder="Redigez votre message ici..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input type="checkbox" checked={composeForm.schedule} onChange={(e) => setComposeForm({ ...composeForm, schedule: e.target.checked })} />
                  Planifier l envoi
                </label>
                {composeForm.schedule && <input type="datetime-local" value={composeForm.scheduleDate} onChange={(e) => setComposeForm({ ...composeForm, scheduleDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCompose(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={handleSendNow} disabled={!composeForm.title.trim() || !composeForm.content.trim()} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${composeForm.title.trim() && composeForm.content.trim() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  {composeForm.schedule ? 'Planifier' : 'Envoyer maintenant'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPreview && previewCampaign && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Apercu de la campagne</h3>
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objet</p>
                  <p className="text-sm font-medium text-gray-900">{previewCampaign.title}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contenu</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewCampaign.content}</p>
                </div>
              </div>
              <div className="mt-6">
                <button onClick={() => setShowPreview(false)} className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
