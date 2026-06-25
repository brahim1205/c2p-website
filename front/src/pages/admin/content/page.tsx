import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { deleteAdminContentItem, fetchAdminContentItems, updateAdminContentItem, type AdminContentItem } from '@/lib/adminApi';
import { downloadCsvFile } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'pending' | 'published' | 'rejected' | 'archived'>('all');
  const [selectedContent, setSelectedContent] = useState<Array<number | string>>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminContentItem | null>(null);

  const contentQuery = useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: fetchAdminContentItems,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (contentQuery.isError) {
      console.error(contentQuery.error);
      error('Erreur', 'Impossible de charger les contenus admin.');
    }
  }, [contentQuery.error, contentQuery.isError, error]);

  const contents: AdminContentItem[] = useMemo(() => contentQuery.data ?? [], [contentQuery.data]);

  const filteredContents = useMemo(
    () => (activeTab === 'all' ? contents : contents.filter((content) => content.status === activeTab)),
    [activeTab, contents],
  );

  const getStatusBadge = (status: AdminContentItem['status']) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      published: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      rejected: 'bg-red-100 text-red-700',
      archived: 'bg-gray-200 text-gray-700',
    };
    const labels = { draft: 'Brouillon', published: 'Publie', pending: 'En attente', rejected: 'Rejete', archived: 'Archive' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const mutateStatus = async (id: number | string, status: AdminContentItem['status']) => {
    try {
      const updated = await updateAdminContentItem(id, { status });
      queryClient.setQueryData<AdminContentItem[]>(queryKeys.admin.content(), (current = []) => current.map((content) => (content.id === id ? updated : content)));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
      const labels: Record<AdminContentItem['status'], string> = {
        draft: 'Contenu repasse en brouillon',
        pending: 'Contenu renvoye en revision',
        published: 'Contenu publie',
        rejected: 'Contenu rejete',
        archived: 'Contenu archive',
      };
      success(labels[status], updated.title);
    } catch (err) {
      console.error(err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de mettre a jour le contenu.';
      error('Erreur', message);
    }
  };

  const handleBulkStatus = async (status: AdminContentItem['status']) => {
    try {
      const updates = await Promise.all(selectedContent.map((id) => updateAdminContentItem(id, { status })));
      const byId = new Map(updates.map((item) => [item.id, item]));
      queryClient.setQueryData<AdminContentItem[]>(queryKeys.admin.content(), (current = []) => current.map((content) => byId.get(content.id) ?? content));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
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
      queryClient.setQueryData<AdminContentItem[]>(queryKeys.admin.content(), (current = []) => current.filter((content) => content.id !== selectedItem.id));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
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
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Contenus' }]} />
        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Administration</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des contenus</h1>
              <p className="mt-2 text-sm text-gray-600 md:text-base">Validation, publication, archivage et revue des contenus de la plateforme.</p>
            </div>
            <button onClick={handleExport} className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700 whitespace-nowrap">
              Exporter les données
            </button>
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-6 overflow-x-auto px-6">
              {(['all', 'draft', 'pending', 'published', 'rejected', 'archived'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#5fa6f3] text-[#5fa6f3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'all' && `Tous (${contents.length})`}
                  {tab === 'draft' && `Brouillons (${contents.filter((content) => content.status === 'draft').length})`}
                  {tab === 'pending' && `En attente (${contents.filter((content) => content.status === 'pending').length})`}
                  {tab === 'published' && `Publies (${contents.filter((content) => content.status === 'published').length})`}
                  {tab === 'rejected' && `Rejetes (${contents.filter((content) => content.status === 'rejected').length})`}
                  {tab === 'archived' && `Archives (${contents.filter((content) => content.status === 'archived').length})`}
                </button>
              ))}
            </div>
          </div>

          {selectedContent.length > 0 && (
            <div className="bg-[#5fa6f3]/10 border-b border-[#5fa6f3]/20 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[#27346b]">{selectedContent.length} contenu(x) selectionne(s)</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleBulkStatus('published')} className="px-4 py-2 bg-white text-[#5fa6f3] border border-[#5fa6f3] rounded-lg hover:bg-[#5fa6f3]/5 transition-colors text-sm font-medium whitespace-nowrap">Publier</button>
                <button onClick={() => handleBulkStatus('rejected')} className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium whitespace-nowrap">Rejeter</button>
                <button onClick={() => handleBulkStatus('archived')} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap">Archiver</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input type="checkbox" checked={filteredContents.length > 0 && selectedContent.length === filteredContents.length} onChange={() => setSelectedContent(selectedContent.length === filteredContents.length ? [] : filteredContents.map((content) => content.id))} className="w-4 h-4 text-[#5fa6f3] border-gray-300 rounded focus:ring-[#5fa6f3] cursor-pointer" />
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
                      <input type="checkbox" checked={selectedContent.includes(content.id)} onChange={() => setSelectedContent((prev) => prev.includes(content.id) ? prev.filter((id) => id !== content.id) : [...prev, content.id])} className="w-4 h-4 text-[#5fa6f3] border-gray-300 rounded focus:ring-[#5fa6f3] cursor-pointer" />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{content.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{content.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{content.author}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{content.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{content.views}</td>
                    <td className="px-6 py-4">{getStatusBadge(content.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{content.date}</td>
                    <td className="px-6 py-4 text-right">
                      <details className="relative inline-block text-left">
                        <summary className="list-none rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                          Actions <i className="ri-arrow-down-s-line align-middle"></i>
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 text-left shadow-xl">
                          <button onClick={() => { setSelectedItem(content); setShowViewModal(true); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><i className="ri-eye-line text-[#5fa6f3]"></i> Voir le contenu</button>
                          {content.status !== 'published' && <button onClick={() => mutateStatus(content.id, 'published')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-green-50"><i className="ri-check-line text-green-600"></i> Publier</button>}
                          {content.status !== 'pending' && <button onClick={() => mutateStatus(content.id, 'pending')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"><i className="ri-refresh-line text-[#5fa6f3]"></i> Mettre en révision</button>}
                          {content.status !== 'rejected' && <button onClick={() => mutateStatus(content.id, 'rejected')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50"><i className="ri-close-line text-orange-600"></i> Rejeter</button>}
                          {content.status !== 'archived' && <button onClick={() => mutateStatus(content.id, 'archived')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><i className="ri-archive-line text-gray-600"></i> Archiver</button>}
                          {content.source_table !== 'courses' && <button onClick={() => { setSelectedItem(content); setShowDeleteModal(true); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"><i className="ri-delete-bin-line"></i> Supprimer</button>}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.title}</h3>
                <button onClick={() => setShowViewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-4">
                {selectedItem.thumbnail ? (
                  <img
                    src={selectedItem.thumbnail}
                    alt={`Miniature de ${selectedItem.title}`}
                    className="max-h-72 w-full rounded-xl border border-gray-200 bg-gray-100 object-contain"
                  />
                ) : null}
                {selectedItem.trailer_url ? (
                  <video
                    src={selectedItem.trailer_url}
                    controls
                    preload="metadata"
                    className="max-h-80 w-full rounded-xl border border-gray-200 bg-black"
                  >
                    Votre navigateur ne peut pas lire cette vidéo.
                  </video>
                ) : null}
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
                {selectedItem.status !== 'published' && (
                  <>
                    <button onClick={() => { void mutateStatus(selectedItem.id, 'published'); setShowViewModal(false); }} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Publier</button>
                    <button onClick={() => { void mutateStatus(selectedItem.id, 'rejected'); setShowViewModal(false); }} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Rejeter</button>
                  </>
                )}
                {selectedItem.status === 'published' && (
                  <button onClick={() => { void mutateStatus(selectedItem.id, 'archived'); setShowViewModal(false); }} className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">Archiver</button>
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
