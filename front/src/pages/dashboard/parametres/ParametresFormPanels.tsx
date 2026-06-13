import { ROLE_LABELS, type AuthUser, type UserPreferences, type UserRole } from '@/lib/roles';
import type { AccountSettingsForm, PasswordSettingsForm } from './parametresModel';

type BooleanPreferenceKey = 'emailNotifications' | 'productUpdates' | 'compactMode';

const preferenceToggles: Array<{ key: BooleanPreferenceKey; label: string; description: string }> = [
  {
    key: 'emailNotifications',
    label: 'Notifications par email',
    description: 'Recevoir les informations importantes liées au compte.',
  },
  {
    key: 'productUpdates',
    label: 'Actualités C2P',
    description: 'Recevoir les nouveautés produit et annonces utiles.',
  },
  {
    key: 'compactMode',
    label: 'Interface compacte',
    description: 'Réduire certains espacements sur les pages de gestion.',
  },
];

const activityRoles: UserRole[] = ['client', 'prestataire', 'apprenant', 'formateur', 'porteur', 'partenaire'];

export function ActivitiesPanel({
  user,
  switching,
  onSwitch,
}: {
  user: AuthUser;
  switching: boolean;
  onSwitch: (role: UserRole) => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Évoluer entre les activités C2P</h2>
        <p className="mt-1 text-sm text-gray-500">
          Votre compte reste unique. Activez l’espace correspondant à l’étape actuelle de votre parcours d’autonomisation.
        </p>
      </div>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Les couples client/prestataire, apprenant/formateur et porteur/partenaire ne peuvent pas être actifs simultanément.
        Le passage vers l’activité opposée remplace automatiquement l’ancienne.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {activityRoles.map((role) => {
          const active = user.role === role;
          const alreadyAdded = user.roles?.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={active || switching}
              onClick={() => onSwitch(role)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
              } disabled:cursor-default`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-900">{ROLE_LABELS[role]}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  active ? 'bg-teal-600 text-white' : alreadyAdded ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                }`}>
                  {active ? 'Espace actif' : alreadyAdded ? 'Déjà ajouté' : 'Disponible'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AccountSettingsPanel({
  accountForm,
  loading,
  saving,
  onChange,
  onSave,
}: {
  accountForm: AccountSettingsForm;
  loading: boolean;
  saving: boolean;
  onChange: (form: AccountSettingsForm) => void;
  onSave: () => void;
}) {
  const updateField = (field: keyof AccountSettingsForm, value: string) => onChange({ ...accountForm, [field]: value });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Informations du compte</h2>
        <p className="mt-1 text-sm text-gray-500">Ces informations sont utilisées pour votre compte et vos espaces privés.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AccountInput label="Prénom" value={accountForm.firstName} onChange={(value) => updateField('firstName', value)} />
        <AccountInput label="Nom" value={accountForm.lastName} onChange={(value) => updateField('lastName', value)} />
        <AccountInput label="Email" type="email" value={accountForm.email} onChange={(value) => updateField('email', value)} />
        <AccountInput label="Téléphone" value={accountForm.phone} onChange={(value) => updateField('phone', value)} />
        <AccountInput label="Localisation" value={accountForm.location} onChange={(value) => updateField('location', value)} className="md:col-span-2" />
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-gray-700">Bio courte</span>
          <textarea
            value={accountForm.bio}
            onChange={(event) => updateField('bio', event.target.value)}
            rows={4}
            maxLength={500}
            className="mt-2 block w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <span className="mt-1 block text-xs text-gray-500">{accountForm.bio.length}/500 caractères</span>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading}
          className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

function AccountInput({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

export function PreferencesPanel({
  preferences,
  savingPreferences,
  onUpdatePreference,
}: {
  preferences: Required<UserPreferences>;
  savingPreferences: boolean;
  onUpdatePreference: <K extends keyof Required<UserPreferences>>(key: K, value: Required<UserPreferences>[K]) => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Préférences</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ces réglages sont synchronisés avec votre compte.
          {savingPreferences ? ' Enregistrement...' : ''}
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Langue</span>
          <select
            value={preferences.language}
            onChange={(event) => onUpdatePreference('language', event.target.value)}
            className="mt-2 block w-full max-w-sm rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </label>

        {preferenceToggles.map((toggle) => (
          <label key={toggle.key} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
            <span>
              <span className="block text-sm font-medium text-gray-900">{toggle.label}</span>
              <span className="mt-1 block text-sm text-gray-500">{toggle.description}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[toggle.key]}
              onChange={(event) => onUpdatePreference(toggle.key, event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function SecurityPanel({
  passwordForm,
  saving,
  onChange,
  onChangePassword,
  onRequestDelete,
}: {
  passwordForm: PasswordSettingsForm;
  saving: boolean;
  onChange: (form: PasswordSettingsForm) => void;
  onChangePassword: () => void;
  onRequestDelete: () => void;
}) {
  const updateField = (field: keyof PasswordSettingsForm, value: string) => onChange({ ...passwordForm, [field]: value });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
        <p className="mt-1 text-sm text-gray-500">Modifiez votre mot de passe ou supprimez votre compte.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PasswordInput label="Mot de passe actuel" value={passwordForm.currentPassword} onChange={(value) => updateField('currentPassword', value)} />
        <PasswordInput label="Nouveau mot de passe" value={passwordForm.newPassword} onChange={(value) => updateField('newPassword', value)} />
        <PasswordInput label="Confirmation" value={passwordForm.confirmPassword} onChange={(value) => updateField('confirmPassword', value)} />
      </div>

      <button
        type="button"
        onClick={onChangePassword}
        disabled={saving}
        className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
      </button>

      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="font-semibold text-red-700">Zone de danger</h3>
        <p className="mt-2 text-sm text-red-700/80">La suppression est définitive et ferme l’accès au compte.</p>
        <button type="button" onClick={onRequestDelete} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}
