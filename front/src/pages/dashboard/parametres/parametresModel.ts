export type SettingsTab = 'account' | 'public-profile' | 'activities' | 'preferences' | 'privacy' | 'security';

export type AccountSettingsForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
};

export type PasswordSettingsForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const settingsTabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: 'account', label: 'Compte', icon: 'ri-user-settings-line' },
  { id: 'public-profile', label: 'Profil public', icon: 'ri-user-star-line' },
  { id: 'activities', label: 'Mes activités', icon: 'ri-swap-2-line' },
  { id: 'preferences', label: 'Préférences', icon: 'ri-equalizer-line' },
  { id: 'privacy', label: 'Confidentialité', icon: 'ri-shield-user-line' },
  { id: 'security', label: 'Sécurité', icon: 'ri-lock-password-line' },
];

/** Tabs a role can see: the public profile only exists for instructors. */
export function settingsTabsFor(role: string | undefined) {
  return settingsTabs.filter((tab) => tab.id !== 'public-profile' || role === 'formateur');
}

/** `?onglet=` value used by links that open a given settings tab. */
export const SETTINGS_TAB_PARAM: Partial<Record<string, SettingsTab>> = {
  'profil-public': 'public-profile',
  securite: 'security',
  preferences: 'preferences',
  confidentialite: 'privacy',
};
