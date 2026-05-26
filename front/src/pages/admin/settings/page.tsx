import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminCategory, deleteAdminCategory, fetchAdminCategories, fetchAdminIntegrations, fetchAdminRules, updateAdminCategory, updateAdminIntegration, updateAdminRule, type AdminCategory, type AdminIntegration, type AdminRule } from '@/lib/adminApi';
import { downloadJsonFile } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import {
  AddCategoryModal,
  AdminSettingsTabs,
  CategoriesPanel,
  IntegrationsPanel,
  RulesPanel,
} from './AdminSettingsPanels';
import { type AdminSettingsSnapshot, type AdminSettingsTab } from './adminSettingsModel';

export default function AdminSettingsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>('categories');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'service' as AdminCategory['type'] });
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string | number | boolean>>({});

  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: async (): Promise<AdminSettingsSnapshot> => {
      const [categoriesData, rulesData, integrationsData] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminRules(),
        fetchAdminIntegrations(),
      ]);
      return {
        categories: categoriesData,
        rules: rulesData,
        integrations: integrationsData,
      };
    },
  });

  useEffect(() => {
    if (settingsQuery.isError) {
      console.error(settingsQuery.error);
      error('Erreur', 'Impossible de charger le parametrage plateforme.');
    }
  }, [error, settingsQuery.error, settingsQuery.isError]);

  const categories = useMemo(() => settingsQuery.data?.categories ?? [], [settingsQuery.data?.categories]);
  const rules = useMemo(() => settingsQuery.data?.rules ?? [], [settingsQuery.data?.rules]);
  const integrations = useMemo(() => settingsQuery.data?.integrations ?? [], [settingsQuery.data?.integrations]);

  const updateSettingsCache = (updater: (snapshot: AdminSettingsSnapshot) => AdminSettingsSnapshot) => {
    queryClient.setQueryData<AdminSettingsSnapshot>(queryKeys.admin.settings(), (current) => updater(current ?? {
      categories,
      rules,
      integrations,
    }));
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
  };

  const commissionRate = useMemo(() => Number(rules.find((rule) => rule.id === 'commission_rate')?.value ?? 15), [rules]);

  const handleToggleCategory = async (id: number) => {
    const current = categories.find((category) => category.id === id);
    if (!current) return;
    try {
      const updated = await updateAdminCategory(id, { active: !current.active });
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        categories: snapshot.categories.map((category) => category.id === id ? updated : category),
      }));
      success('Categorie mise a jour', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La categorie n a pas pu etre modifiee.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteAdminCategory(id);
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        categories: snapshot.categories.filter((category) => category.id !== id),
      }));
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
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        categories: [created, ...snapshot.categories],
      }));
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
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        rules: snapshot.rules.map((item) => item.id === rule.id ? updated : item),
      }));
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
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        integrations: snapshot.integrations.map((item) => item.id === integration.id ? updated : item),
      }));
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
      updateSettingsCache((snapshot) => ({
        ...snapshot,
        integrations: snapshot.integrations.map((item) => item.id === integration.id ? updated : item),
      }));
      success('Synchronisation terminee', updated.name);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Synchronisation impossible.');
    }
  };

  const handleStartEditRule = (rule: AdminRule) => {
    setEditingRule(rule.id);
    setEditValues({ ...editValues, [rule.id]: rule.value });
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
          <button type="button" onClick={handleExportConfig} aria-label="Exporter config de la plateforme" className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2">
            <i className="ri-download-line"></i>
            Exporter config
          </button>
        </div>

        <AdminSettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'categories' && (
          <CategoriesPanel
            categories={categories}
            onAdd={() => setShowAddCategory(true)}
            onDelete={(id) => void handleDeleteCategory(id)}
            onToggle={(id) => void handleToggleCategory(id)}
          />
        )}

        {activeTab === 'rules' && (
          <RulesPanel
            commissionRate={commissionRate}
            editingRule={editingRule}
            editValues={editValues}
            rules={rules}
            onEditRule={handleStartEditRule}
            onEditValuesChange={setEditValues}
            onSaveRule={(rule) => void handleSaveRule(rule)}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsPanel
            integrations={integrations}
            onSync={(integration) => void handleSyncIntegration(integration)}
            onToggle={(integration) => void handleToggleIntegration(integration)}
          />
        )}

        {showAddCategory && (
          <AddCategoryModal
            category={newCategory}
            onCategoryChange={setNewCategory}
            onClose={() => setShowAddCategory(false)}
            onCreate={() => void handleAddCategory()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
