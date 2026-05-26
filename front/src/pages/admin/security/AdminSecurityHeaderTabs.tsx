export type AdminSecurityTab = 'overview' | 'users' | 'logs' | 'backups' | 'settings';

interface AdminSecurityHeaderTabsProps {
  activeTab: AdminSecurityTab;
  onChange: (tab: AdminSecurityTab) => void;
}

const securityTabs: Array<[AdminSecurityTab, string]> = [
  ['overview', 'Vue d ensemble'],
  ['users', 'Utilisateurs'],
  ['logs', 'Journaux'],
  ['backups', 'Sauvegardes'],
  ['settings', 'Parametres'],
];

export function AdminSecurityHeaderTabs({ activeTab, onChange }: AdminSecurityHeaderTabsProps) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">Securite et protection</h1>
          <p className="text-gray-600">Gestion de la securite de la plateforme</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center self-start rounded-2xl bg-[#5fa6f3] sm:self-auto lg:h-16 lg:w-16">
          <i className="ri-shield-check-line text-2xl text-white lg:text-3xl"></i>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Navigation securite admin">
          {securityTabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`admin-security-tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`admin-security-panel-${id}`}
              onClick={() => onChange(id)}
              className={`whitespace-nowrap px-4 py-4 text-sm font-medium transition-colors lg:px-6 ${
                activeTab === id
                  ? 'border-b-2 border-[#5fa6f3] text-[#5fa6f3]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
