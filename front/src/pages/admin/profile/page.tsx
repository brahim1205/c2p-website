import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { changeAccountPassword, fetchProfile, fetchSecurity, updateProfile } from '@/lib/accountApi';
import { ROLE_LABELS } from '@/lib/roles';
import { formatDateTime } from '@/lib/formatters';
import AvatarUpload from '@/components/base/AvatarUpload';

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    avatar: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [sessions, setSessions] = useState<{ id: string; device: string; location: string; lastActive: string; current: boolean }[]>([]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profile, security] = await Promise.all([
        fetchProfile(user.id),
        fetchSecurity(user.id),
      ]);

      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
      });
      setSessions(security.sessions);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le profil administrateur.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAvatarChange = async (url: string) => {
    if (!user?.id) return;

    setFormData((prev) => ({ ...prev, avatar: url }));
    updateUser({ avatar: url });

    try {
      await updateProfile(user.id, { avatar: url });
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
      loadProfile();
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le mot de passe n a pas pu etre modifie.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Profil' }]} />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profil administrateur</h1>
            <p className="text-gray-600 mt-1">Coordonnees, presentation et securite du compte admin.</p>
          </div>
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="px-5 py-2.5 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]"
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
              <AvatarUpload
                src={formData.avatar || null}
                initials={userInitials}
                size="lg"
                editable={isEditing}
                onChange={handleAvatarChange}
              />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{formData.firstName} {formData.lastName}</h2>
                <p className="text-gray-600">{formData.email}</p>
                <span className="inline-flex mt-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 border border-red-100">
                  {user?.role ? ROLE_LABELS[user.role] : 'Administrateur'}
                </span>
              </div>
            </div>

            <div className="grid gap-4 mt-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Biographie</label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                />
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button onClick={handleSave} className="px-5 py-2.5 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]">
                  Enregistrer
                </button>
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Securite</h2>
              <div className="grid gap-4 mt-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={handlePasswordChange} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Changer le mot de passe
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">Sessions recentes</h2>
              <div className="mt-5 space-y-3">
                {loading && <p className="text-sm text-gray-500">Chargement des sessions...</p>}
                {!loading && sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{session.device}</p>
                        <p className="text-sm text-gray-600">{session.location}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(session.lastActive)}</p>
                      </div>
                      {session.current && (
                        <span className="rounded-full bg-[#14B8A6]/10 px-3 py-1 text-xs font-medium text-[#0D9488]">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
