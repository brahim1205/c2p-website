import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { deleteAdminContentItem, fetchAdminContentItems, updateAdminContentItem, type AdminContentItem } from '@/lib/adminApi';
import { downloadCsvFile } from '@/lib/downloads';

export default function AdminContentPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'published' | 'rejected'>('all');
  const [selectedContent, setSelectedContent] = useState<number[]>([]);
  const [contents, setContents] = useState<AdminContentItem[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminContentItem | null>(null);

  const loadContents = useCallback(async () => {
    try {
      setContents(await fetchAdminContentItems());
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les contenus admin.');
    }
  }, [error]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const filteredContents = useMemo(
    () => (activeTab === 'all' ? contents : contents.filter((content) => content.status === activeTab)),
    [activeTab, contents],
  );

  const stats = useMemo(() => [
    { label: 'Contenus totaux', value: String(contents.length), icon: 'ri-file-list-line', color: 'bg-teal-500' },
    { label: 'Publies', value: String(contents.filter((content) => content.status === 'published').length), icon: 'ri-check-line', color: 'bg-green-500' },
    { label: 'En attente', value: String(contents.filter((content) => content.status === 'pending').length), icon: 'ri-time-line', color: 'bg-orange-500' },
    { label: 'Rejetes', value: String(contents.filter((content) => content.status === 'rejected').length), icon: 'ri-alert-line', color: 'bg-red-500' },
  ], [contents]);

  const getStatusBadge = (status: AdminContentItem['status']) => {
    const styles = {
      published: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels = { published: 'Publie', pending: 'En attente', rejected: 'Rejete' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const mutateStatus = async (id: number, status: AdminContentItem['status']) => {
    try {
      const updated = await updateAdminContentItem(id, { status });
      setContents((prev) => prev.map((content) => (content.id === id ? updated : content)));
      success(status === 'published' ? 'Contenu publie' : 'Contenu rejete', updated.title);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre a jour le contenu.');
    }
  };

  const handleBulkStatus = async (status: AdminContentItem['status']) => {
    try {
      const updates = await Promise.all(selectedContent.map((id) => updateAdminContentItem(id, { status })));
      const byId = new Map(updates.map((item) => [item.id, item]));
      setContents((prev) => prev.map((content) => byId.get(content.id) ?? content));
      setSelectedContent([]);
      success('Traitement termine', `${updates.length} contenu(x) mis a jour.`);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Le traitement en masse a echoue.');
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteAdminContentItem(selectedItem.id);
      setContents((prev) => prev.filter((content) => content.id !== selectedItem.id));
      setShowDeleteModal(false);
      setSelectedItem(null);
      success('Contenu supprime', 'Le contenu a ete retire.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Suppression impossible.');
    }
  };

  const handleExport = () => {
    downloadCsvFile('admin-moderation-contenus.csv', filteredContents.map((content) => ({
      id: content.id,
      titre: content.title,
      type: content.type,
      auteur: content.author,
      statut: content.status,
      categorie: content.category,
      vues: content.views,
      date: content.date,
      table_source: content.source_table,
      id_source: content.source_id,
    })));
    success('Export demarre', 'Les donnees de moderation ont ete telechargees.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Contenus' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion des contenus</h1>
          <button onClick={handleExport} className="px-6 py-3 bg-[#14B8A6] text-white rounded-lg hover:bg-[#0D9488] transition-colors font-medium whitespace-nowrap">
            Exporter les donnees
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
                <i className={`${stat.icon} text-xl text-white`}></i>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['all', 'pending', 'published', 'rejected'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#14B8A6] text-[#14B8A6]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'all' && `Tous (${contents.length})`}
                  {tab === 'pending' && `En attente (${contents.filter((content) => content.status === 'pending').length})`}
                  {tab === 'published' && `Publies (${contents.filter((content) => content.status === 'published').length})`}
                  {tab === 'rejected' && `Rejetes (${contents.filter((content) => content.status === 'rejected').length})`}
                </button>
              ))}
            </div>
          </div>

          {selectedContent.length > 0 && (
            <div className="bg-[#14B8A6]/10 border-b border-[#14B8A6]/20 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[#0D9488]">{selectedContent.length} contenu(x) selectionne(s)</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleBulkStatus('published')} className="px-4 py-2 bg-white text-[#14B8A6] border border-[#14B8A6] rounded-lg hover:bg-[#14B8A6]/5 transition-colors text-sm font-medium whitespace-nowrap">Publier</button>
                <button onClick={() => handleBulkStatus('rejected')} className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap">Rejeter</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input type="checkbox" checked={filteredContents.length > 0 && selectedContent.length === filteredContents.length} onChange={() => setSelectedContent(selectedContent.length === filteredContents.length ? [] : filteredContents.map((content) => content.id))} className="w-4 h-4 text-[#14B8A6] border-gray-300 rounded focus:ring-[#14B8A6] cursor-pointer" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vues</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContents.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={selectedContent.includes(content.id)} onChange={() => setSelectedContent((prev) => prev.includes(content.id) ? prev.filter((id) => id !== content.id) : [...prev, content.id])} className="w-4 h-4 text-[#14B8A6] border-gray-300 rounded focus:ring-[#14B8A6] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{content.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{content.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{content.author}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{content.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{content.views}</td>
                    <td className="px-6 py-4">{getStatusBadge(content.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{content.date}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => { setSelectedItem(content); setShowViewModal(true); }} className="p-2 text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-lg transition-colors" title="Voir"><i className="ri-eye-line text-base"></i></button>
                        {content.status !== 'published' && <button onClick={() => mutateStatus(content.id, 'published')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Publier"><i className="ri-check-line text-base"></i></button>}
                        {content.status !== 'rejected' && <button onClick={() => mutateStatus(content.id, 'rejected')} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Rejeter"><i className="ri-close-line text-base"></i></button>}
                        <button onClick={() => { setSelectedItem(content); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer"><i className="ri-delete-bin-line text-base"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.title}</h3>
                <button onClick={() => setShowViewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">{getStatusBadge(selectedItem.status)}<span className="text-sm text-gray-600">{selectedItem.type} • {selectedItem.category}</span></div>
                <p className="text-sm text-gray-700">{selectedItem.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Auteur</p><p className="text-sm font-medium text-gray-900">{selectedItem.author}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Vues</p><p className="text-sm font-medium text-gray-900">{selectedItem.views}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Date</p><p className="text-sm font-medium text-gray-900">{selectedItem.date}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">ID</p><p className="text-sm font-medium text-gray-900">#{selectedItem.id}</p></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowViewModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Fermer</button>
                {selectedItem.status === 'pending' && (
                  <>
                    <button onClick={() => { void mutateStatus(selectedItem.id, 'published'); setShowViewModal(false); }} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Publier</button>
                    <button onClick={() => { void mutateStatus(selectedItem.id, 'rejected'); setShowViewModal(false); }} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Rejeter</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Supprimer ce contenu ?</h3>
                <button onClick={() => setShowDeleteModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <p className="text-sm text-gray-600 mb-6">Vous allez supprimer <strong>{selectedItem.title}</strong>. Cette action est irreversible.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void confirmDelete()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
