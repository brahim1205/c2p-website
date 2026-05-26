import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminCampaign, deleteAdminCampaign, fetchAdminCampaigns, updateAdminCampaign, type AdminCampaign } from '@/lib/adminApi';
import { dispatchSmsCampaign, fetchEmailGatewayStatus, fetchSmsGatewayStatus, type CampaignAudience } from '@/lib/communicationsApi';
import { queryKeys } from '@/lib/queryKeys';
import { AdminCampaignCard } from './AdminCampaignCard';
import {
  getCampaignAudienceLabel,
  resolveCampaignAudience,
} from './adminCommunicationsModel';
import { ComposeCampaignModal, PreviewCampaignModal } from './AdminCampaignModals';

export default function AdminCommunicationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<AdminCampaign | null>(null);
  const [composeForm, setComposeForm] = useState({
    title: '',
    type: 'email' as AdminCampaign['type'],
    target: 'all_users' as CampaignAudience,
    content: '',
    schedule: false,
    scheduleDate: '',
  });

  const campaignsQuery = useQuery({
    queryKey: queryKeys.admin.communications(),
    queryFn: fetchAdminCampaigns,
  });

  const gatewaysQuery = useQuery({
    queryKey: queryKeys.admin.communicationGateways(),
    queryFn: async () => {
      const [sms, emailGateway] = await Promise.all([
        fetchSmsGatewayStatus(),
        fetchEmailGatewayStatus(),
      ]);
      return { sms, email: emailGateway };
    },
  });

  useEffect(() => {
    if (campaignsQuery.isError) {
      console.error(campaignsQuery.error);
      error('Erreur', 'Impossible de charger les campagnes.');
    }
  }, [campaignsQuery.error, campaignsQuery.isError, error]);

  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data]);
  const smsGatewayStatus = gatewaysQuery.data?.sms ?? null;
  const emailGatewayStatus = gatewaysQuery.data?.email ?? null;

  const updateCampaignsCache = (updater: (items: AdminCampaign[]) => AdminCampaign[]) => {
    queryClient.setQueryData<AdminCampaign[]>(queryKeys.admin.communications(), (current) => updater(current ?? campaigns));
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.communications() });
  };

  const filtered = activeTab === 'all' ? campaigns : campaigns.filter((campaign) => campaign.status === activeTab);
  const averageOpenRate = useMemo(() => {
    const sent = campaigns.filter((campaign) => campaign.openRate !== null && campaign.openRate !== undefined);
    if (!sent.length) return '0%';
    return `${Math.round(sent.reduce((sum, campaign) => sum + Number(campaign.openRate || 0), 0) / sent.length)}%`;
  }, [campaigns]);

  const resetCompose = () => {
    setComposeForm({ title: '', type: 'email', target: 'all_users', content: '', schedule: false, scheduleDate: '' });
  };

  const handleSendNow = async () => {
    if (!composeForm.title.trim() || !composeForm.content.trim()) return;
    try {
      const created = await createAdminCampaign({
        title: composeForm.title,
        type: composeForm.type,
        target: getCampaignAudienceLabel(composeForm.target),
        status: composeForm.schedule ? 'scheduled' : 'sent',
        sentCount: composeForm.schedule ? 0 : 2847,
        openRate: composeForm.schedule ? null : 72,
        scheduledDate: composeForm.schedule ? composeForm.scheduleDate : null,
        createdAt: new Date().toISOString().split('T')[0],
        content: composeForm.content,
      });

      let smsDispatchSummary = '';
      if (!composeForm.schedule) {
        const result = await dispatchSmsCampaign({
          title: composeForm.title,
          type: composeForm.type,
          target: composeForm.target,
          content: composeForm.content,
        });
        const parts = [];
        if (composeForm.type === 'email' || composeForm.type === 'all') {
          parts.push(`${result.channels.email.delivered}/${result.channels.email.attempted} email`);
        }
        if (composeForm.type === 'sms' || composeForm.type === 'all') {
          parts.push(`${result.channels.sms.delivered}/${result.channels.sms.attempted} SMS`);
        }
        if (composeForm.type === 'push' || composeForm.type === 'all') {
          parts.push(`${result.channels.push.delivered}/${result.channels.push.attempted} notification`);
        }
        smsDispatchSummary = parts.length > 0 ? ` ${parts.join(' · ')}.` : '';
      }

      updateCampaignsCache((prev) => [created, ...prev]);
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
      updateCampaignsCache((prev) => prev.filter((campaign) => campaign.id !== id));
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
      updateCampaignsCache((prev) => [duplicated, ...prev]);
      success('Campagne dupliquee', 'Une copie brouillon a ete creee.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Duplication impossible.');
    }
  };

  const handleCancelScheduled = async (campaign: AdminCampaign) => {
    try {
      const updated = await updateAdminCampaign(campaign.id, { status: 'cancelled' });
      updateCampaignsCache((prev) => prev.map((item) => (item.id === campaign.id ? updated : item)));
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
            <div className="mt-3 flex flex-wrap gap-2">
            {smsGatewayStatus && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                <span className={`h-2 w-2 rounded-full ${smsGatewayStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>SMS {smsGatewayStatus.provider}</span>
                <span>{smsGatewayStatus.configured ? 'configure' : 'configuration requise'}</span>
              </div>
            )}
            {emailGatewayStatus && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                <span className={`h-2 w-2 rounded-full ${emailGatewayStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>Email {emailGatewayStatus.provider}</span>
                <span>{emailGatewayStatus.configured ? 'configure' : 'configuration requise'}</span>
              </div>
            )}
            </div>
          </div>
          <button type="button" onClick={() => setShowCompose(true)} aria-label="Creer une nouvelle campagne de communication" className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2">
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
            <div className="flex space-x-8 px-6 overflow-x-auto" role="tablist" aria-label="Filtres des campagnes">
              {(['all', 'draft', 'scheduled', 'sent'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`admin-communications-panel-${tab}`}
                  id={`admin-communications-tab-${tab}`}
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

          <div className="p-6 space-y-4" role="tabpanel" id={`admin-communications-panel-${activeTab}`} aria-labelledby={`admin-communications-tab-${activeTab}`}>
            {filtered.map((campaign) => (
              <AdminCampaignCard
                key={campaign.id}
                campaign={campaign}
                onCancelScheduled={handleCancelScheduled}
                onDelete={handleDeleteCampaign}
                onDuplicate={handleDuplicateCampaign}
                onEditDraft={(draft) => {
                  setComposeForm({
                    title: draft.title,
                    type: draft.type,
                    target: resolveCampaignAudience(draft.target),
                    content: draft.content,
                    schedule: false,
                    scheduleDate: '',
                  });
                  setShowCompose(true);
                }}
                onPreview={(item) => { setPreviewCampaign(item); setShowPreview(true); }}
              />
            ))}
          </div>
        </div>

        {showCompose && (
          <ComposeCampaignModal
            composeForm={composeForm}
            setComposeForm={setComposeForm}
            onClose={() => setShowCompose(false)}
            onSend={handleSendNow}
          />
        )}

        {showPreview && previewCampaign && (
          <PreviewCampaignModal campaign={previewCampaign} onClose={() => setShowPreview(false)} />
        )}
      </div>
    </AdminLayout>
  );
}
