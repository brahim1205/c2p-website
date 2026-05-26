import type { Dispatch, SetStateAction } from 'react';
import AvatarUpload from '@/components/base/AvatarUpload';
import type { AuthUser } from '@/lib/roles';
import { ROLE_LABELS } from '@/lib/roles';
import { formatDateTime } from '@/lib/formatters';
import type { SecuritySession } from '@/lib/accountApi';

export type AdminProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  avatar: string;
};

export type AdminPasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AdminProfileUpdater = Dispatch<SetStateAction<AdminProfileFormData>>;
type AdminPasswordUpdater = Dispatch<SetStateAction<AdminPasswordFormData>>;

export function AdminIdentitySection({
  formData,
  isEditing,
  user,
  userInitials,
  onAvatarChange,
  onFormChange,
  onSave,
}: {
  formData: AdminProfileFormData;
  isEditing: boolean;
  user: AuthUser | null;
  userInitials: string;
  onAvatarChange: (url: string) => void;
  onFormChange: AdminProfileUpdater;
  onSave: () => void;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <AvatarUpload src={formData.avatar || null} initials={userInitials} size="lg" editable={isEditing} onChange={onAvatarChange} />
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{formData.firstName} {formData.lastName}</h2>
          <p className="text-gray-600">{formData.email}</p>
          <span className="inline-flex mt-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 border border-red-100">
            {user?.role ? ROLE_LABELS[user.role] : 'Administrateur'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 mt-6 md:grid-cols-2">
        <AdminTextField id="admin-profile-first-name" label="Prenom" value={formData.firstName} disabled={!isEditing} onChange={(value) => onFormChange((prev) => ({ ...prev, firstName: value }))} />
        <AdminTextField id="admin-profile-last-name" label="Nom" value={formData.lastName} disabled={!isEditing} onChange={(value) => onFormChange((prev) => ({ ...prev, lastName: value }))} />
        <AdminTextField id="admin-profile-email" label="Email" type="email" value={formData.email} disabled={!isEditing} onChange={(value) => onFormChange((prev) => ({ ...prev, email: value }))} />
        <AdminTextField id="admin-profile-phone" label="Telephone" type="tel" value={formData.phone} disabled={!isEditing} onChange={(value) => onFormChange((prev) => ({ ...prev, phone: value }))} />
        <AdminTextField id="admin-profile-location" label="Localisation" value={formData.location} disabled={!isEditing} className="md:col-span-2" onChange={(value) => onFormChange((prev) => ({ ...prev, location: value }))} />
        <div className="md:col-span-2">
          <label htmlFor="admin-profile-bio" className="block text-sm font-medium text-gray-700 mb-1">Biographie</label>
          <textarea
            id="admin-profile-bio"
            rows={4}
            value={formData.bio}
            onChange={(event) => onFormChange((prev) => ({ ...prev, bio: event.target.value }))}
            disabled={!isEditing}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20"
          />
        </div>
      </div>

      {isEditing && (
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onSave} className="px-5 py-2.5 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b]">
            Enregistrer
          </button>
        </div>
      )}
    </section>
  );
}

export function AdminSecuritySection({
  passwordForm,
  onPasswordChange,
  onSubmit,
}: {
  passwordForm: AdminPasswordFormData;
  onPasswordChange: AdminPasswordUpdater;
  onSubmit: () => void;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900">Securite</h2>
      <div className="grid gap-4 mt-5">
        <AdminPasswordField id="admin-profile-current-password" label="Mot de passe actuel" value={passwordForm.currentPassword} onChange={(value) => onPasswordChange((prev) => ({ ...prev, currentPassword: value }))} />
        <AdminPasswordField id="admin-profile-new-password" label="Nouveau mot de passe" value={passwordForm.newPassword} onChange={(value) => onPasswordChange((prev) => ({ ...prev, newPassword: value }))} />
        <AdminPasswordField id="admin-profile-confirm-password" label="Confirmation" value={passwordForm.confirmPassword} onChange={(value) => onPasswordChange((prev) => ({ ...prev, confirmPassword: value }))} />
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onSubmit} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Changer le mot de passe
        </button>
      </div>
    </section>
  );
}

export function AdminSessionsSection({ loading, sessions }: { loading: boolean; sessions: SecuritySession[] }) {
  return (
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
              {session.current && <span className="rounded-full bg-[#5fa6f3]/10 px-3 py-1 text-xs font-medium text-[#27346b]">Active</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminTextField({ className = '', disabled, id, label, onChange, type = 'text', value }: { className?: string; disabled: boolean; id: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm disabled:bg-gray-50 focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20" />
    </div>
  );
}

function AdminPasswordField({ id, label, onChange, value }: { id: string; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input id={id} type="password" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#5fa6f3] focus:outline-none focus:ring-2 focus:ring-[#5fa6f3]/20" />
    </div>
  );
}
