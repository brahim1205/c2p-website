import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';
import ImageUploadField from '@/components/base/ImageUploadField';


interface Course {
  id: number;
  title: string;
  category: string;
  description: string | null;
  students_count: number;
  completion_rate: number;
  status: string;
  revenue: number;
  modules: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price: number;
}

export default function FormateurCoursPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Course>>();
  const [createForm, setCreateForm] = useState<Partial<Course>>({
    status: 'draft',
    modules: 1,
    price: 0,
    duration: '1h',
  });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await backendClient
        .from('courses')
        .select('*')
        .order('updated_at', { ascending: false });

      if (err) throw err;
      setCourses((data || []).map((course) => ({
        category: 'General',
        completion_rate: 0,
        duration: 'N/A',
        modules: 0,
        price: 0,
        revenue: 0,
        students_count: 0,
        thumbnail: null,
        updated_at: new Date().toISOString(),
        ...course,
      })));
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger les formations.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePublish = (course: Course) => {
    setSelectedCourse(course);
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    if (!selectedCourse) return;
    try {
      const { error: err } = await backendClient
        .from('courses')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', selectedCourse.id);

      if (err) throw err;
      success(
        'Formation publiée',
        `La formation "${selectedCourse.title}" est maintenant visible sur la plateforme.`
      );
      setShowPublishModal(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de publier la formation.');
      console.error(err);
    }
  };

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setEditForm({ ...course });
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedCourse || !editForm.title) return;
    try {
      const { error: err } = await backendClient
        .from('courses')
        .update({
          title: editForm.title,
          category: editForm.category,
          status: editForm.status,
          description: editForm.description,
          duration: editForm.duration,
          modules: editForm.modules,
          price: editForm.price,
          thumbnail: editForm.thumbnail || selectedCourse.thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCourse.id);

      if (err) throw err;
      success('Formation mise à jour', `"${editForm.title}" a été modifiée avec succès.`);
      setShowEditModal(false);
      setSelectedCourse(null);
      setEditForm({});
      fetchCourses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de modifier la formation.');
      console.error(err);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${course.title}" ? Cette action est irréversible.`))
      return;
    try {
      const { error: err } = await backendClient.from('courses').delete().eq('id', course.id);
      if (err) throw err;
      success('Formation supprimée', `"${course.title}" a été supprimée.`);
      fetchCourses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer la formation.');
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!createForm.title || !createForm.category) {
      error('Champs requis', 'Le titre et la catégorie sont obligatoires.');
      return;
    }
    try {
      const { error: err } = await backendClient.from('courses').insert({
        title: createForm.title,
        category: createForm.category,
        description: createForm.description || '',
        status: createForm.status || 'draft',
        modules: createForm.modules || 1,
        duration: createForm.duration || '1h',
        price: createForm.price || 0,
        thumbnail: createForm.thumbnail || null,
      });

      if (err) throw err;
      success('Formation créée', `"${createForm.title}" a été ajoutée avec succès.`);
      setShowCreateModal(false);
      setCreateForm({ status: 'draft', modules: 1, price: 0, duration: '1h' });
      fetchCourses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de créer la formation.');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-amber-100 text-amber-700',
      review: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      published: 'Publiée',
      draft: 'Brouillon',
      review: 'En révision',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatRevenue = (rev: number) => {
    if (!rev) return '0 FCFA';
    return rev.toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Mes cours' },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes formations</h1>
            <p className="text-gray-600 text-sm md:text-base">Créez, gérez et publiez vos formations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-add-line text-base"></i>
            </div>
            Nouvelle formation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une formation..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'published', 'draft', 'review'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all'
                    ? 'Tous'
                    : status === 'published'
                      ? 'Publiés'
                      : status === 'draft'
                        ? 'Brouillons'
                        : 'Révision'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-40 overflow-hidden">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                      <div className="w-14 h-14 flex items-center justify-center">
                        <i className="ri-book-open-line text-3xl text-teal-300"></i>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">{getStatusBadge(course.status)}</div>
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md flex items-center gap-1">
                      <i className="ri-time-line"></i>
                      {course.duration || 'N/A'}
                    </span>
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md flex items-center gap-1">
                      <i className="ri-book-line"></i>
                      {course.modules} modules
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                      {course.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-base">{course.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>
                      <i className="ri-group-line mr-1"></i>
                      {course.students_count} apprenants
                    </span>
                    <span>
                      <i className="ri-bar-chart-line mr-1"></i>
                      {course.completion_rate}% complété
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${course.completion_rate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {formatRevenue(course.revenue)}
                    </span>
                    <div className="flex gap-2">
                      {course.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(course)}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                        >
                          Publier
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(course)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <i className="ri-edit-line text-gray-600"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(course)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <i className="ri-delete-bin-line text-red-500"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCourses.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-search-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune formation trouvée</h3>
            <p className="text-gray-600">Ajustez vos filtres ou créez une nouvelle formation</p>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Nouvelle formation</h3>
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={createForm.title || ''}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Ex: Marketing Digital Avancé"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                  <input
                    type="text"
                    value={createForm.category || ''}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    placeholder="Ex: Marketing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={createForm.description || ''}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Description de la formation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">500 caractères max</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.modules || 1}
                      onChange={(e) => setCreateForm({ ...createForm, modules: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <input
                      type="text"
                      value={createForm.duration || ''}
                      onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                      placeholder="Ex: 12h"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.price || 0}
                    onChange={(e) => setCreateForm({ ...createForm, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={createForm.status || 'draft'}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="review">En révision</option>
                    <option value="published">Publiée</option>
                  </select>
                </div>
                <ImageUploadField
                  label="Miniature de la formation"
                  value={createForm.thumbnail || ''}
                  onChange={(url) => setCreateForm({ ...createForm, thumbnail: url })}
                  folder="c2p/courses"
                  helper="Importez la miniature de la formation ou collez une URL publique."
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ status: 'draft', modules: 1, price: 0, duration: '1h' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Créer la formation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Publish Modal */}
        {showPublishModal && selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-upload-cloud-line text-teal-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Publier la formation</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir publier <strong>"{selectedCourse.title}"</strong> ? Elle sera immédiatement visible par tous les apprenants.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setSelectedCourse(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmPublish}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Publier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedCourse && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-edit-line text-teal-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Modifier la formation</h3>
              </div>
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                    >
                      <option value="published">Publiée</option>
                      <option value="draft">Brouillon</option>
                      <option value="review">En révision</option>
                    </select>
                  </div>
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">500 caractères max</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <input
                      type="text"
                      value={editForm.duration || ''}
                      onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.modules || 0}
                      onChange={(e) => setEditForm({ ...editForm, modules: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.price || 0}
                    onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <ImageUploadField
                  label="Miniature de la formation"
                  value={editForm.thumbnail || selectedCourse.thumbnail || ''}
                  onChange={(url) => setEditForm({ ...editForm, thumbnail: url })}
                  folder="c2p/courses"
                  helper="Ce visuel sera utilise dans le catalogue et sur la fiche formation."
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCourse(null);
                    setEditForm({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmEdit}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
