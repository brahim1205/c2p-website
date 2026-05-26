import type { AdminCampaign } from '@/lib/adminApi';
import { channelConfig, resolveCampaignAudience, statusConfig } from './adminCommunicationsModel';

interface AdminCampaignCardProps {
  campaign: AdminCampaign;
  onCancelScheduled: (campaign: AdminCampaign) => void;
  onDelete: (id: number) => void;
  onDuplicate: (campaign: AdminCampaign) => void;
  onEditDraft: (campaign: AdminCampaign) => void;
  onPreview: (campaign: AdminCampaign) => void;
}

export function AdminCampaignCard({
  campaign,
  onCancelScheduled,
  onDelete,
  onDuplicate,
  onEditDraft,
  onPreview,
}: AdminCampaignCardProps) {
  const channel = channelConfig[campaign.type];
  const status = statusConfig[campaign.status];

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
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
          <button type="button" onClick={() => onPreview(campaign)} className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
            Apercu
          </button>
          {campaign.status === 'draft' && (
            <button
              type="button"
              onClick={() => onEditDraft({ ...campaign, target: resolveCampaignAudience(campaign.target) })}
              className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              Continuer
            </button>
          )}
          {campaign.status === 'scheduled' && (
            <button type="button" onClick={() => onCancelScheduled(campaign)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors whitespace-nowrap">
              Annuler
            </button>
          )}
          <button type="button" onClick={() => onDuplicate(campaign)} aria-label={`Dupliquer la campagne ${campaign.title}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" title="Dupliquer">
            <i className="ri-file-copy-line text-gray-500 text-sm"></i>
          </button>
          <button type="button" onClick={() => onDelete(campaign.id)} aria-label={`Supprimer la campagne ${campaign.title}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
            <i className="ri-delete-bin-line text-red-500 text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
