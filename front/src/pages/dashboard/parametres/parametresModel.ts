export type SettingsTab = 'account' | 'preferences' | 'privacy' | 'security';

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
  { id: 'preferences', label: 'Préférences', icon: 'ri-equalizer-line' },
  { id: 'privacy', label: 'Confidentialité', icon: 'ri-shield-user-line' },
  { id: 'security', label: 'Sécurité', icon: 'ri-lock-password-line' },
];
