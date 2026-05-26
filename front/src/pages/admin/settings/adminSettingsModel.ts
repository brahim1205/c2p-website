import { type AdminCategory, type AdminIntegration, type AdminRule } from '@/lib/adminApi';

export type AdminSettingsTab = 'categories' | 'rules' | 'integrations';

export type AdminSettingsSnapshot = {
  categories: AdminCategory[];
  rules: AdminRule[];
  integrations: AdminIntegration[];
};

export const adminSettingsTabs: Array<{ id: AdminSettingsTab; label: string; icon: string }> = [
  { id: 'categories', label: 'Categories', icon: 'ri-folder-line' },
  { id: 'rules', label: 'Regles & Commissions', icon: 'ri-settings-4-line' },
  { id: 'integrations', label: 'Integrations', icon: 'ri-plug-line' },
];

export function getAdminCategoryTypeLabel(type: AdminCategory['type']) {
  const labels = { service: 'Service', formation: 'Formation', projet: 'Projet' };
  return { label: labels[type], className: 'bg-teal-100 text-teal-700' };
}
