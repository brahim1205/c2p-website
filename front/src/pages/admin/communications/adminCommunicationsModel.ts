import type { AdminCampaign } from '@/lib/adminApi';
import type { CampaignAudience } from '@/lib/communicationsApi';

export const channelConfig = {
  email: { icon: 'ri-mail-line', label: 'Email', color: 'bg-teal-500' },
  sms: { icon: 'ri-message-2-line', label: 'SMS', color: 'bg-orange-500' },
  push: { icon: 'ri-notification-3-line', label: 'Push', color: 'bg-teal-500' },
  all: { icon: 'ri-broadcast-line', label: 'Multi-canal', color: 'bg-teal-600' },
} satisfies Record<AdminCampaign['type'], { icon: string; label: string; color: string }>;

export const statusConfig = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Planifiee', className: 'bg-amber-100 text-amber-700' },
  sent: { label: 'Envoyee', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Annulee', className: 'bg-red-100 text-red-700' },
} satisfies Record<AdminCampaign['status'], { label: string; className: string }>;

export const campaignAudienceOptions: Array<{ value: CampaignAudience; label: string }> = [
  { value: 'all_users', label: 'Tous les utilisateurs' },
  { value: 'all_apprenants', label: 'Tous les apprenants' },
  { value: 'active_clients', label: 'Clients actifs' },
  { value: 'project_holders', label: 'Porteurs de projet' },
  { value: 'verified_providers', label: 'Prestataires verifies' },
];

export function getCampaignAudienceLabel(value: CampaignAudience) {
  return campaignAudienceOptions.find((option) => option.value === value)?.label ?? campaignAudienceOptions[0].label;
}

export function resolveCampaignAudience(value: string): CampaignAudience {
  const byValue = campaignAudienceOptions.find((option) => option.value === value);
  if (byValue) {
    return byValue.value;
  }

  const normalized = value.trim().toLowerCase();
  const byLabel = campaignAudienceOptions.find((option) => option.label.toLowerCase() === normalized);
  return byLabel?.value ?? 'all_users';
}
