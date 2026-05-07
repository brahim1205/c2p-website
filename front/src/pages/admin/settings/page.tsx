import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminCategory, deleteAdminCategory, fetchAdminCategories, fetchAdminIntegrations, fetchAdminRules, updateAdminCategory, updateAdminIntegration, updateAdminRule, type AdminCategory, type AdminIntegration, type AdminRule } from '@/lib/adminApi';
import { downloadJsonFile } from '@/lib/downloads';

export default function AdminSettingsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'categories' | 'rules' | 'integrations'>('categories');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [rules, setRules] = useState<AdminRule[]>([]);
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'service' as AdminCategory['type'] });
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string | number | boolean>>({});

  const loadSettings = useCallback(async () => {
    try {
      const [categoriesData, rulesData, integrationsData] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminRules(),
        fetchAdminIntegrations(),
      ]);
      setCategories(categoriesData);
      setRules(rulesData);
      setIntegrations(integrationsData);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le parametrage plateforme.');
    }
  }, [error]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const commissionRate = useMemo(() => Number(rules.find((rule) => rule.id === 'commission_rate')?.value ?? 15), [rules]);

  const handleToggleCategory = async (id: number) => {
    const current = categories.find((category) => category.id === id);
    if (!current) return;
    try {
      const updated = await updateAdminCategory(id, { active: !current.active });
      setCategories((prev) => prev.map((category) => category.id === id ? updated : category));
      success('Categorie mise a jour', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La categorie n a pas pu etre modifiee.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteAdminCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      success('Categorie supprimee', 'La categorie a ete retiree.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Suppression impossible.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    try {
      const created = await createAdminCategory({ name: newCategory.name, type: newCategory.type, active: true });
      setCategories((prev) => [created, ...prev]);
      setNewCategory({ name: '', type: 'service' });
      setShowAddCategory(false);
      success('Categorie ajoutee', created.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Creation impossible.');
    }
  };

  const handleSaveRule = async (rule: AdminRule) => {
    const rawValue = editValues[rule.id];
    let value: AdminRule['value'] = rawValue ?? rule.value;
    if (rule.type === 'number' || rule.type === 'percent') value = Number(value);
    if (rule.type === 'toggle') value = Boolean(value);
    try {
      const updated = await updateAdminRule(rule.id, { value });
      setRules((prev) => prev.map((item) => item.id === rule.id ? updated : item));
      setEditingRule(null);
      setEditValues({});
      success('Regle enregistree', updated.label);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La regle n a pas pu etre enregistree.');
    }
  };

  const handleToggleIntegration = async (integration: AdminIntegration) => {
    try {
      const updated = await updateAdminIntegration(integration.id, {
        status: integration.status === 'connected' ? 'disconnected' : 'connected',
        lastSync: integration.status === 'connected' ? integration.lastSync : new Date().toLocaleString('fr-FR'),
      });
      setIntegrations((prev) => prev.map((item) => item.id === integration.id ? updated : item));
      success(updated.status === 'connected' ? 'Integration connectee' : 'Integration deconnectee', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Mise a jour integration impossible.');
    }
  };

  const handleSyncIntegration = async (integration: AdminIntegration) => {
    try {
      const updated = await updateAdminIntegration(integration.id, {
        lastSync: new Date().toLocaleString('fr-FR'),
      });
      setIntegrations((prev) => prev.map((item) => item.id === integration.id ? updated : item));
      success('Synchronisation terminee', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Synchronisation impossible.');
    }
  };

  const getTypeLabel = (type: AdminCategory['type']) => {
    const labels = { service: 'Service', formation: 'Formation', projet: 'Projet' };
    return { label: labels[type], className: 'bg-teal-100 text-teal-700' };
  };

  const handleExportConfig = () => {
    downloadJsonFile('admin-platform-config.json', {
      generatedAt: new Date().toISOString(),
      categories,
      rules,
      integrations,
    });
    success('Configuration exportee', 'Le snapshot de configuration a ete telecharge.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Parametrage' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Parametrage de la plateforme</h1>
            <p className="text-gray-600 text-sm mt-1">Configurer les categories, regles et integrations</p>
          </div>
          <button onClick={handleExportConfig} className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2">
            <i className="ri-download-line"></i>
            Exporter config
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'categories', label: 'Categories', icon: 'ri-folder-line' },
              { id: 'rules', label: 'Regles & Commissions', icon: 'ri-settings-4-line' },
              { id: 'integrations', label: 'Integrations', icon: 'ri-plug-line' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-2 px-4 lg:px-6 py-4 font-medium whitespace-nowrap transition-colors text-sm ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <i className={`${tab.icon} text-base`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{categories.length} categories au total</p>
              <button onClick={() => setShowAddCategory(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2">
                <i className="ri-add-line"></i>
                Ajouter une categorie
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const typeInfo = getTypeLabel(category.type);
                return (
                  <div key={category.id} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${category.active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${typeInfo.className}`}>{typeInfo.label}</span>
                      <button onClick={() => void handleToggleCategory(category.id)} className="relative inline-flex items-center cursor-pointer">
                        <div className={`w-9 h-5 rounded-full transition-colors ${category.active ? 'bg-teal-500' : 'bg-gray-300'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ml-0.5 ${category.active ? 'translate-x-4' : ''}`} />
                        </div>
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{category.count} elements associes</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${category.active ? 'text-teal-600' : 'text-gray-400'}`}>{category.active ? 'Active' : 'Desactivee'}</span>
                      <button onClick={() => void handleDeleteCategory(category.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                        <i className="ri-delete-bin-line text-red-400 text-sm"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Regles de la plateforme</h2>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors ${editingRule === rule.id ? 'border-teal-300 bg-teal-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                      <p className="text-sm font-medium text-gray-900">{rule.label}</p>
                      <p className="text-xs text-gray-500">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingRule === rule.id ? (
                        <>
                          {rule.type === 'toggle' ? (
                            <input type="checkbox" checked={editValues[rule.id] !== undefined ? Boolean(editValues[rule.id]) : Boolean(rule.value)} onChange={(e) => setEditValues({ ...editValues, [rule.id]: e.target.checked })} />
                          ) : (
                            <input type={rule.type === 'text' ? 'text' : 'number'} value={editValues[rule.id] !== undefined ? String(editValues[rule.id]) : String(rule.value)} onChange={(e) => setEditValues({ ...editValues, [rule.id]: e.target.value })} className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-right" />
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{rule.type === 'toggle' ? (rule.value ? 'Active' : 'Desactive') : `${rule.value}${rule.type === 'percent' ? '%' : ''}`}</span>
                        </div>
                      )}
                      <button onClick={() => editingRule === rule.id ? void handleSaveRule(rule) : (setEditingRule(rule.id), setEditValues({ ...editValues, [rule.id]: rule.value }))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <i className={`${editingRule === rule.id ? 'ri-check-line text-teal-600' : 'ri-edit-line text-gray-500'} text-sm`}></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Simulation de commission</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 mb-1">Montant transaction</p><p className="text-lg font-bold text-gray-900">25,000 FCFA</p></div>
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 mb-1">Commission C2P ({commissionRate}%)</p><p className="text-lg font-bold text-gray-900">{Math.round(25000 * (commissionRate / 100)).toLocaleString('fr-FR')} FCFA</p></div>
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-100"><p className="text-xs text-teal-600 mb-1">Net prestataire</p><p className="text-lg font-bold text-teal-700">{Math.round(25000 * (1 - commissionRate / 100)).toLocaleString('fr-FR')} FCFA</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {integrations.map((integration) => (
              <div key={integration.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${integration.status === 'connected' ? 'bg-teal-100' : 'bg-gray-100'}`}>
                    <i className={`${integration.icon} text-xl ${integration.status === 'connected' ? 'text-teal-600' : 'text-gray-400'}`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{integration.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${integration.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{integration.status === 'connected' ? 'Connecte' : 'Deconnecte'}</span>
                    </div>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                    {integration.lastSync && <p className="text-xs text-gray-400 mt-0.5">Derniere sync : {integration.lastSync}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {integration.status === 'connected' && <button onClick={() => void handleSyncIntegration(integration)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">Synchroniser</button>}
                  <button onClick={() => void handleToggleIntegration(integration)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${integration.status === 'connected' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                    {integration.status === 'connected' ? 'Deconnecter' : 'Connecter'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddCategory && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Nouvelle categorie</h3>
                <button onClick={() => setShowAddCategory(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-4">
                <input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Ex: Menuiserie" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <select value={newCategory.type} onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as AdminCategory['type'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="service">Service (AlloPresta)</option>
                  <option value="formation">Formation (Espace Numerique)</option>
                  <option value="projet">Projet (ProjectCenter)</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddCategory(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void handleAddCategory()} disabled={!newCategory.name.trim()} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${newCategory.name.trim() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Creer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
