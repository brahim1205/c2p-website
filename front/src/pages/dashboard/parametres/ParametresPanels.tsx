import { ROLE_LABELS, type AuthUser } from '@/lib/roles';
import { settingsTabs, type SettingsTab } from './parametresModel';

export function SettingsHeader() {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-teal-700">Compte C2P</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Paramètres</h1>
      <p className="mt-2 text-gray-600">Gérez vos informations de compte, vos préférences et la sécurité.</p>
    </div>
  );
}

export function AccountSummary({
  displayName,
  email,
  loading,
  user,
}: {
  displayName: string;
  email: string;
  loading: boolean;
  user: AuthUser | null;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {user ? ROLE_LABELS[user.role] : 'Compte C2P'} · {email || 'Email non renseigné'}
          </p>
        </div>
        {loading ? (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">Synchronisation...</span>
        ) : (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">Compte actif</span>
        )}
      </div>
    </div>
  );
}

export function SettingsSidebar({
  activeTab,
  onChangeTab,
}: {
  activeTab: SettingsTab;
  onChangeTab: (tab: SettingsTab) => void;
}) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      {settingsTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChangeTab(tab.id)}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <i className={`${tab.icon} text-lg`}></i>
          {tab.label}
        </button>
      ))}
    </aside>
  );
}

export function PrivacyPanel({ role, onNavigate }: { role?: AuthUser['role']; onNavigate: (path: string) => void }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Confidentialité</h2>
        <p className="mt-1 text-sm text-gray-500">Contrôlez ce que les autres voient selon votre rôle et vos pages publiques.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900">Profil public</h3>
          <p className="mt-2 text-sm text-gray-500">
            Votre profil public presente uniquement les informations visibles par les autres utilisateurs selon votre role.
          </p>
          <button
            type="button"
            onClick={() => onNavigate(role === 'formateur' ? '/dashboard/formateur/profil-public' : '/dashboard/profile')}
            className="mt-4 rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            Ouvrir le profil
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900">Données personnelles</h3>
          <p className="mt-2 text-sm text-gray-500">
            Vous pouvez corriger vos informations ici. Les exports complets de données doivent être traités par l’équipe C2P.
          </p>
          <a href="mailto:support@c2p.sn" className="mt-4 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Contacter C2P
          </a>
        </div>
      </div>
    </div>
  );
}

export function DeleteAccountConfirmModal({
  deleting,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Supprimer votre compte ?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Cette action est irréversible. Toutes les données liées au compte seront supprimées ou anonymisées selon les règles C2P.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
