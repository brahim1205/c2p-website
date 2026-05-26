import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { changeAccountPassword, fetchProfile, fetchSecurity, updateProfile } from '@/lib/accountApi';
import { queryKeys } from '@/lib/queryKeys';
import { AdminProfileHeader } from './AdminProfileHeader';
import {
  AdminIdentitySection,
  AdminSecuritySection,
  AdminSessionsSection,
  type AdminPasswordFormData,
  type AdminProfileFormData,
} from './AdminProfileSections';

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AdminProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    avatar: '',
  });
  const [passwordForm, setPasswordForm] = useState<AdminPasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.account.profile(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }
      const [profile, security] = await Promise.all([
        fetchProfile(user.id),
        fetchSecurity(user.id),
      ]);
      return { profile, security };
    },
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      const { profile } = profileQuery.data;
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
      });
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.isError) {
      console.error(profileQuery.error);
      error('Erreur', 'Impossible de charger le profil administrateur.');
    }
  }, [error, profileQuery.error, profileQuery.isError]);

  const loading = profileQuery.isLoading;
  const sessions = useMemo(() => profileQuery.data?.security.sessions ?? [], [profileQuery.data?.security.sessions]);

  const handleAvatarChange = async (url: string) => {
    if (!user?.id) return;

    setFormData((prev) => ({ ...prev, avatar: url }));
    updateUser({ avatar: url });

    try {
      await updateProfile(user.id, { avatar: url });
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.profile(user.id) });
    } catch (err) {
      console.error(err);
      error('Erreur', 'La photo de profil administrateur n a pas pu etre enregistree.');
    }
  };

  const userInitials = `${formData.firstName.slice(0, 1)}${formData.lastName.slice(0, 1)}`.toUpperCase() || 'A';

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      const updated = await updateProfile(user.id, formData);
      updateUser(updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.profile(user.id) });
      setIsEditing(false);
      success('Profil mis a jour', 'Les informations administrateur ont ete enregistrees.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le profil n a pas pu etre mis a jour.');
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.id) return;
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      error('Champs incomplets', 'Renseignez tous les champs de mot de passe.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Confirmation invalide', 'La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }

    try {
      await changeAccountPassword(user.id, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Mot de passe mis a jour', 'Le mot de passe administrateur a ete change.');
      void profileQuery.refetch();
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le mot de passe n a pas pu etre modifie.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Profil' }]} />

        <AdminProfileHeader isEditing={isEditing} onToggleEditing={() => setIsEditing((prev) => !prev)} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminIdentitySection
            formData={formData}
            isEditing={isEditing}
            user={user}
            userInitials={userInitials}
            onAvatarChange={handleAvatarChange}
            onFormChange={setFormData}
            onSave={handleSave}
          />

          <div className="space-y-6">
            <AdminSecuritySection passwordForm={passwordForm} onPasswordChange={setPasswordForm} onSubmit={handlePasswordChange} />
            <AdminSessionsSection loading={loading} sessions={sessions} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
