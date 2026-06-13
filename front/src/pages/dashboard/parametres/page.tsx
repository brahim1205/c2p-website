import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  changeAccountPassword,
  deleteAccount,
  fetchProfile,
  switchAccountActivity,
  updateProfile,
} from '@/lib/accountApi';
import { queryKeys } from '@/lib/queryKeys';
import { ROLE_DASHBOARD_PATHS, type UserPreferences, type UserRole } from '@/lib/roles';
import {
  AccountSettingsPanel,
  ActivitiesPanel,
  PreferencesPanel,
  SecurityPanel,
} from './ParametresFormPanels';
import {
  AccountSummary,
  DeleteAccountConfirmModal,
  PrivacyPanel,
  SettingsHeader,
  SettingsSidebar,
} from './ParametresPanels';
import type { AccountSettingsForm, PasswordSettingsForm, SettingsTab } from './parametresModel';

const defaultPreferences: Required<UserPreferences> = {
  language: 'fr',
  emailNotifications: true,
  productUpdates: true,
  compactMode: false,
};

function normalizePreferences(preferences?: UserPreferences | null): Required<UserPreferences> {
  return { ...defaultPreferences, ...(preferences ?? {}) };
}

export default function ParametresPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { success, info, error } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preferences, setPreferences] = useState<Required<UserPreferences>>(() => normalizePreferences(user?.userPreferences));
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [switchingActivity, setSwitchingActivity] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountSettingsForm>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    location: user?.location ?? '',
    bio: user?.bio ?? '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordSettingsForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const displayName = useMemo(
    () => [accountForm.firstName, accountForm.lastName].filter(Boolean).join(' ') || 'Utilisateur C2P',
    [accountForm.firstName, accountForm.lastName],
  );

  const profileQueryKey = queryKeys.account.profile(user?.id);
  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const loading = profileQuery.isLoading;

  useEffect(() => {
    if (profileQuery.data) {
      const profile = profileQuery.data;
      setAccountForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        bio: profile.bio ?? '',
      });
      setPreferences(normalizePreferences(profile.userPreferences));
      updateUser(profile);
    }
  }, [profileQuery.data, updateUser]);

  useEffect(() => {
    if (profileQuery.isError) {
      console.error(profileQuery.error);
      error('Erreur', 'Impossible de charger vos paramètres.');
    }
  }, [error, profileQuery.error, profileQuery.isError]);

  const updatePreference = <K extends keyof Required<UserPreferences>>(key: K, value: Required<UserPreferences>[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      if (user?.id) {
        setSavingPreferences(true);
        void updateProfile(user.id, { userPreferences: next })
          .then((updated) => {
            updateUser(updated);
            queryClient.setQueryData(profileQueryKey, updated);
            success('Préférences enregistrées', 'Vos préférences sont synchronisées avec votre compte.');
          })
          .catch((err) => {
            console.error(err);
            error('Erreur', 'Impossible d enregistrer ces préférences.');
          })
          .finally(() => setSavingPreferences(false));
      }
      return next;
    });
  };

  const handleSaveAccount = async () => {
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const updated = await updateProfile(user.id, accountForm);
      updateUser(updated);
      queryClient.setQueryData(profileQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      success('Paramètres enregistrés', 'Vos informations de compte ont été mises à jour.');
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Impossible d enregistrer ces paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id || saving) return;

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      info('Champs requis', 'Renseignez le mot de passe actuel, le nouveau mot de passe et sa confirmation.');
      return;
    }
    if (passwordForm.newPassword.length < 10) {
      info('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      info('Confirmation incorrecte', 'La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSaving(true);
    try {
      await changeAccountPassword(user.id, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Mot de passe mis à jour', 'Votre mot de passe a été changé.');
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Impossible de changer le mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || deleting) return;

    setDeleting(true);
    try {
      await deleteAccount(user.id);
      success('Compte supprimé', 'Votre compte a été supprimé.');
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Impossible de supprimer ce compte.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSwitchActivity = async (role: UserRole) => {
    if (!user || switchingActivity) return;
    setSwitchingActivity(true);
    try {
      const updated = await switchAccountActivity(role);
      updateUser(updated);
      queryClient.setQueryData(profileQueryKey, updated);
      success('Activité activée', `Votre espace ${role} est maintenant actif.`);
      navigate(ROLE_DASHBOARD_PATHS[role]);
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Impossible de changer d activité.');
    } finally {
      setSwitchingActivity(false);
    }
  };

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Paramètres' }]} />
      <SettingsHeader />
      <AccountSummary displayName={displayName} email={accountForm.email} loading={loading} user={user} />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsSidebar activeTab={activeTab} onChangeTab={setActiveTab} />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {activeTab === 'account' && (
            <AccountSettingsPanel
              accountForm={accountForm}
              loading={loading}
              saving={saving}
              onChange={setAccountForm}
              onSave={handleSaveAccount}
            />
          )}
          {activeTab === 'activities' && user && (
            <ActivitiesPanel user={user} switching={switchingActivity} onSwitch={handleSwitchActivity} />
          )}
          {activeTab === 'preferences' && (
            <PreferencesPanel
              preferences={preferences}
              savingPreferences={savingPreferences}
              onUpdatePreference={updatePreference}
            />
          )}
          {activeTab === 'privacy' && <PrivacyPanel role={user?.role} onNavigate={navigate} />}
          {activeTab === 'security' && (
            <SecurityPanel
              passwordForm={passwordForm}
              saving={saving}
              onChange={setPasswordForm}
              onChangePassword={handleChangePassword}
              onRequestDelete={() => setShowDeleteConfirm(true)}
            />
          )}
        </section>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountConfirmModal
          deleting={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </DashboardLayout>
  );
}
