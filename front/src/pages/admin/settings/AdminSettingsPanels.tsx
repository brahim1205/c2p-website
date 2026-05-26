import { type AdminCategory, type AdminIntegration, type AdminRule } from '@/lib/adminApi';
import { adminSettingsTabs, getAdminCategoryTypeLabel, type AdminSettingsTab } from './adminSettingsModel';

export function AdminSettingsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminSettingsTab;
  onTabChange: (tab: AdminSettingsTab) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Sections du parametrage plateforme">
        {adminSettingsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`admin-settings-panel-${tab.id}`}
            id={`admin-settings-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors lg:px-6 ${
              activeTab === tab.id ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className={`${tab.icon} text-base`}></i>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoriesPanel({
  categories,
  onAdd,
  onDelete,
  onToggle,
}: {
  categories: AdminCategory[];
  onAdd: () => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="space-y-6" role="tabpanel" id="admin-settings-panel-categories" aria-labelledby="admin-settings-tab-categories">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">{categories.length} categories au total</p>
        <button type="button" onClick={onAdd} aria-label="Ajouter une categorie" className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
          <i className="ri-add-line"></i>
          Ajouter une categorie
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} onDelete={onDelete} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

export function RulesPanel({
  commissionRate,
  editingRule,
  editValues,
  rules,
  onEditValuesChange,
  onEditRule,
  onSaveRule,
}: {
  commissionRate: number;
  editingRule: string | null;
  editValues: Record<string, string | number | boolean>;
  rules: AdminRule[];
  onEditValuesChange: (values: Record<string, string | number | boolean>) => void;
  onEditRule: (rule: AdminRule) => void;
  onSaveRule: (rule: AdminRule) => void;
}) {
  return (
    <div className="space-y-6" role="tabpanel" id="admin-settings-panel-rules" aria-labelledby="admin-settings-tab-rules">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-bold text-gray-900">Regles de la plateforme</h2>
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              editValues={editValues}
              editing={editingRule === rule.id}
              rule={rule}
              onEditRule={onEditRule}
              onEditValuesChange={onEditValuesChange}
              onSaveRule={onSaveRule}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Simulation de commission</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CommissionMetric label="Montant transaction" value="25,000 FCFA" />
          <CommissionMetric label={`Commission C2P (${commissionRate}%)`} value={`${Math.round(25000 * (commissionRate / 100)).toLocaleString('fr-FR')} FCFA`} />
          <CommissionMetric featured label="Net prestataire" value={`${Math.round(25000 * (1 - commissionRate / 100)).toLocaleString('fr-FR')} FCFA`} />
        </div>
      </div>
    </div>
  );
}

export function IntegrationsPanel({
  integrations,
  onSync,
  onToggle,
}: {
  integrations: AdminIntegration[];
  onSync: (integration: AdminIntegration) => void;
  onToggle: (integration: AdminIntegration) => void;
}) {
  return (
    <div className="space-y-6" role="tabpanel" id="admin-settings-panel-integrations" aria-labelledby="admin-settings-tab-integrations">
      {integrations.map((integration) => (
        <div key={integration.id} className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${integration.status === 'connected' ? 'bg-teal-100' : 'bg-gray-100'}`}>
              <i className={`${integration.icon} text-xl ${integration.status === 'connected' ? 'text-teal-600' : 'text-gray-400'}`}></i>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">{integration.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${integration.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {integration.status === 'connected' ? 'Connecte' : 'Deconnecte'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{integration.description}</p>
              {integration.lastSync ? <p className="mt-0.5 text-xs text-gray-400">Derniere sync : {integration.lastSync}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {integration.status === 'connected' ? (
              <button type="button" onClick={() => onSync(integration)} aria-label={`Synchroniser l integration ${integration.name}`} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Synchroniser
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onToggle(integration)}
              aria-pressed={integration.status === 'connected'}
              aria-label={`${integration.status === 'connected' ? 'Deconnecter' : 'Connecter'} l integration ${integration.name}`}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${integration.status === 'connected' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
            >
              {integration.status === 'connected' ? 'Deconnecter' : 'Connecter'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AddCategoryModal({
  category,
  onCategoryChange,
  onClose,
  onCreate,
}: {
  category: { name: string; type: AdminCategory['type'] };
  onCategoryChange: (category: { name: string; type: AdminCategory['type'] }) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="admin-settings-add-category-title">
        <div className="mb-6 flex items-center justify-between">
          <h3 id="admin-settings-add-category-title" className="text-lg font-bold text-gray-900">Nouvelle categorie</h3>
          <button type="button" onClick={onClose} aria-label="Fermer la creation de categorie" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100">
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="admin-category-name" className="mb-1 block text-sm font-medium text-gray-700">Nom de la categorie</label>
            <input id="admin-category-name" type="text" value={category.name} onChange={(event) => onCategoryChange({ ...category, name: event.target.value })} placeholder="Ex: Menuiserie" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="admin-category-type" className="mb-1 block text-sm font-medium text-gray-700">Type de categorie</label>
            <select id="admin-category-type" value={category.type} onChange={(event) => onCategoryChange({ ...category, type: event.target.value as AdminCategory['type'] })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="service">Service (AlloPresta)</option>
              <option value="formation">Formation (Espace Numerique)</option>
              <option value="projet">Projet (ProjectCenter)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Annuler</button>
          <button type="button" onClick={onCreate} disabled={!category.name.trim()} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${category.name.trim() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'cursor-not-allowed bg-gray-300 text-gray-500'}`}>Creer</button>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ category, onDelete, onToggle }: { category: AdminCategory; onDelete: (id: number) => void; onToggle: (id: number) => void }) {
  const typeInfo = getAdminCategoryTypeLabel(category.type);
  return (
    <div className={`rounded-xl border bg-white p-4 transition-all hover:shadow-md ${category.active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
      <div className="mb-3 flex items-start justify-between">
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${typeInfo.className}`}>{typeInfo.label}</span>
        <button type="button" onClick={() => onToggle(category.id)} aria-pressed={category.active} aria-label={`${category.active ? 'Desactiver' : 'Activer'} la categorie ${category.name}`} className="relative inline-flex cursor-pointer items-center">
          <div className={`h-5 w-9 rounded-full transition-colors ${category.active ? 'bg-teal-500' : 'bg-gray-300'}`}>
            <div className={`ml-0.5 mt-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${category.active ? 'translate-x-4' : ''}`} />
          </div>
        </button>
      </div>
      <h3 className="mb-1 text-sm font-bold text-gray-900">{category.name}</h3>
      <p className="mb-3 text-xs text-gray-500">{category.count} elements associes</p>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${category.active ? 'text-teal-600' : 'text-gray-400'}`}>{category.active ? 'Active' : 'Desactivee'}</span>
        <button type="button" onClick={() => onDelete(category.id)} aria-label={`Supprimer la categorie ${category.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50" title="Supprimer">
          <i className="ri-delete-bin-line text-sm text-red-400"></i>
        </button>
      </div>
    </div>
  );
}

function RuleRow({
  editValues,
  editing,
  rule,
  onEditRule,
  onEditValuesChange,
  onSaveRule,
}: {
  editValues: Record<string, string | number | boolean>;
  editing: boolean;
  rule: AdminRule;
  onEditRule: (rule: AdminRule) => void;
  onEditValuesChange: (values: Record<string, string | number | boolean>) => void;
  onSaveRule: (rule: AdminRule) => void;
}) {
  return (
    <div className={`flex flex-col justify-between rounded-lg border p-4 transition-colors sm:flex-row sm:items-center ${editing ? 'border-teal-300 bg-teal-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
      <div className="mb-3 min-w-0 flex-1 sm:mb-0">
        <p className="text-sm font-medium text-gray-900">{rule.label}</p>
        <p className="text-xs text-gray-500">{rule.description}</p>
      </div>
      <div className="flex items-center gap-3">
        {editing ? (
          rule.type === 'toggle' ? (
            <input aria-label={`Activer ou desactiver ${rule.label}`} type="checkbox" checked={editValues[rule.id] !== undefined ? Boolean(editValues[rule.id]) : Boolean(rule.value)} onChange={(event) => onEditValuesChange({ ...editValues, [rule.id]: event.target.checked })} />
          ) : (
            <input aria-label={`Valeur pour ${rule.label}`} type={rule.type === 'text' ? 'text' : 'number'} value={editValues[rule.id] !== undefined ? String(editValues[rule.id]) : String(rule.value)} onChange={(event) => onEditValuesChange({ ...editValues, [rule.id]: event.target.value })} className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          )
        ) : (
          <span className="text-sm font-bold text-gray-900">{rule.type === 'toggle' ? (rule.value ? 'Active' : 'Desactive') : `${rule.value}${rule.type === 'percent' ? '%' : ''}`}</span>
        )}
        <button type="button" onClick={() => (editing ? onSaveRule(rule) : onEditRule(rule))} aria-label={editing ? `Enregistrer la regle ${rule.label}` : `Modifier la regle ${rule.label}`} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100">
          <i className={`${editing ? 'ri-check-line text-teal-600' : 'ri-edit-line text-gray-500'} text-sm`}></i>
        </button>
      </div>
    </div>
  );
}

function CommissionMetric({ featured = false, label, value }: { featured?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-lg p-3 ${featured ? 'border border-teal-100 bg-teal-50' : 'bg-gray-50'}`}>
      <p className={`mb-1 text-xs ${featured ? 'text-teal-600' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-bold ${featured ? 'text-teal-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
