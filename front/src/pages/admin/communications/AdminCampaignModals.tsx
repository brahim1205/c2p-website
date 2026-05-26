import type { AdminCampaign } from '@/lib/adminApi';
import type { CampaignAudience } from '@/lib/communicationsApi';
import { campaignAudienceOptions } from './adminCommunicationsModel';

interface CampaignComposeForm {
  title: string;
  type: AdminCampaign['type'];
  target: CampaignAudience;
  content: string;
  schedule: boolean;
  scheduleDate: string;
}

interface ComposeCampaignModalProps {
  composeForm: CampaignComposeForm;
  setComposeForm: (form: CampaignComposeForm) => void;
  onClose: () => void;
  onSend: () => void;
}

interface PreviewCampaignModalProps {
  campaign: AdminCampaign;
  onClose: () => void;
}

export function ComposeCampaignModal({
  composeForm,
  setComposeForm,
  onClose,
  onSend,
}: ComposeCampaignModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" role="dialog" aria-modal="true" aria-labelledby="admin-communications-compose-title">
        <div className="flex items-center justify-between mb-6">
          <h3 id="admin-communications-compose-title" className="text-lg font-bold text-gray-900">Nouvelle campagne</h3>
          <button type="button" onClick={onClose} aria-label="Fermer la creation de campagne" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <i className="ri-close-line text-gray-500 text-xl"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-campaign-title" className="mb-1 block text-sm font-medium text-gray-700">Titre de la campagne</label>
            <input id="admin-campaign-title" value={composeForm.title} onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })} placeholder="Titre de la campagne" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admin-campaign-channel" className="mb-1 block text-sm font-medium text-gray-700">Canal</label>
              <select id="admin-campaign-channel" value={composeForm.type} onChange={(e) => setComposeForm({ ...composeForm, type: e.target.value as AdminCampaign['type'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Notification push</option>
                <option value="all">Multi-canal</option>
              </select>
            </div>
            <div>
              <label htmlFor="admin-campaign-target" className="mb-1 block text-sm font-medium text-gray-700">Audience cible</label>
              <select id="admin-campaign-target" value={composeForm.target} onChange={(e) => setComposeForm({ ...composeForm, target: e.target.value as CampaignAudience })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {campaignAudienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="admin-campaign-content" className="mb-1 block text-sm font-medium text-gray-700">Contenu du message</label>
            <textarea id="admin-campaign-content" value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })} rows={6} maxLength={500} placeholder="Redigez votre message ici..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          <label htmlFor="admin-campaign-schedule-toggle" className="flex items-center gap-3 text-sm text-gray-700">
            <input id="admin-campaign-schedule-toggle" type="checkbox" checked={composeForm.schedule} onChange={(e) => setComposeForm({ ...composeForm, schedule: e.target.checked })} />
            Planifier l envoi
          </label>
          {composeForm.schedule && <div>
            <label htmlFor="admin-campaign-schedule-date" className="mb-1 block text-sm font-medium text-gray-700">Date et heure d envoi</label>
            <input id="admin-campaign-schedule-date" type="datetime-local" value={composeForm.scheduleDate} onChange={(e) => setComposeForm({ ...composeForm, scheduleDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
          <button type="button" onClick={onSend} disabled={!composeForm.title.trim() || !composeForm.content.trim()} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${composeForm.title.trim() && composeForm.content.trim() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {composeForm.schedule ? 'Planifier' : 'Envoyer maintenant'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewCampaignModal({ campaign, onClose }: PreviewCampaignModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6" role="dialog" aria-modal="true" aria-labelledby="admin-communications-preview-title">
        <div className="flex items-center justify-between mb-6">
          <h3 id="admin-communications-preview-title" className="text-lg font-bold text-gray-900">Apercu de la campagne</h3>
          <button type="button" onClick={onClose} aria-label="Fermer l apercu de campagne" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <i className="ri-close-line text-gray-500 text-xl"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objet</p>
            <p className="text-sm font-medium text-gray-900">{campaign.title}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contenu</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.content}</p>
          </div>
        </div>
        <div className="mt-6">
          <button type="button" onClick={onClose} className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Fermer</button>
        </div>
      </div>
    </div>
  );
}
