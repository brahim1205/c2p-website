import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';


interface VirtualClass {
  id: number;
  title: string;
  course_name: string | null;
  class_date: string;
  class_time: string;
  duration: string | null;
  students_count: number;
  max_students: number;
  status: string;
  recording_url: string | null;
  room_link: string | null;
  created_at: string;
}

export default function FormateurClassesPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<VirtualClass[]>([]);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState({
    title: '',
    course_id: '',
    course_name: '',
    class_date: '',
    class_time: '',
    duration: '',
    max_students: 30,
    room_link: '',
  });
  const [instructorCourses, setInstructorCourses] = useState<{ id: number; title: string }[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<VirtualClass | null>(null);
  const [editForm, setEditForm] = useState<Partial<VirtualClass>>();

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await backendClient
        .from('virtual_classes')
        .select('*')
        .order('class_date', { ascending: true });

      if (err) throw err;
      setClasses((data || []).map((virtualClass) => ({
        class_time: '',
        duration: null,
        max_students: 30,
        recording_url: null,
        room_link: null,
        status: 'scheduled',
        students_count: 0,
        ...virtualClass,
      })));
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger les classes virtuelles.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchCourses = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient
        .from('courses')
        .select('id, title')
        .eq('status', 'published')
        .order('title', { ascending: true });
      if (err) throw err;
      setInstructorCourses(data || []);
    } catch (err: unknown) {
      console.error('Failed to load courses', err);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, [fetchClasses, fetchCourses]);

  const filteredClasses = filter === 'all' ? classes : classes.filter((c) => c.status === filter);

  const handleJoin = (cls: VirtualClass) => {
    if (cls.status === 'ended') {
      error('Classe terminée', "Cette session est déjà terminée. Consultez l'enregistrement.");
      return;
    }
    if (cls.room_link) {
      window.open(cls.room_link, '_blank', 'noopener,noreferrer');
    }
    success('Ouverture...', `Connexion à "${cls.title}" en cours...`);
  };

  const handleStartLive = async (cls: VirtualClass) => {
    try {
      const { error: err } = await backendClient
        .from('virtual_classes')
        .update({ status: 'live' })
        .eq('id', cls.id);

      if (err) throw err;
      success('En direct !', `La classe "${cls.title}" est maintenant en direct.`);
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de démarrer le direct.');
      console.error(err);
    }
  };

  const handleEndClass = async (cls: VirtualClass) => {
    try {
      const { error: err } = await backendClient
        .from('virtual_classes')
        .update({ status: 'ended' })
        .eq('id', cls.id);

      if (err) throw err;
      success('Terminée', `La classe "${cls.title}" est maintenant terminée.`);
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de terminer la classe.');
      console.error(err);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.title || !newClass.class_date || !newClass.class_time) {
      error('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      const { error: err } = await backendClient.from('virtual_classes').insert({
        title: newClass.title,
        course_name: newClass.course_name || null,
        class_date: newClass.class_date,
        class_time: newClass.class_time,
        duration: newClass.duration || null,
        max_students: newClass.max_students || 30,
        students_count: 0,
        room_link: newClass.room_link || null,
        status: 'scheduled',
      });

      if (err) throw err;
      success('Classe créée', 'La classe virtuelle a été programmée avec succès.');
      setShowCreateModal(false);
      setNewClass({ title: '', course_id: '', course_name: '', class_date: '', class_time: '', duration: '', max_students: 30, room_link: '' });
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de créer la classe.');
      console.error(err);
    }
  };

  const handleDeleteClass = async (cls: VirtualClass) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${cls.title}" ?`)) return;
    try {
      const { error: err } = await backendClient.from('virtual_classes').delete().eq('id', cls.id);
      if (err) throw err;
      success('Supprimée', `"${cls.title}" a été supprimée.`);
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer la classe.');
      console.error(err);
    }
  };

  const handleEditClick = (cls: VirtualClass) => {
    setSelectedClass(cls);
    setEditForm({ ...cls });
    setShowDetailModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedClass || !editForm.title || !editForm.class_date || !editForm.class_time) return;
    try {
      const { error: err } = await backendClient
        .from('virtual_classes')
        .update({
          title: editForm.title,
          course_name: editForm.course_name,
          class_date: editForm.class_date,
          class_time: editForm.class_time,
          duration: editForm.duration,
          max_students: editForm.max_students,
          room_link: editForm.room_link,
        })
        .eq('id', selectedClass.id);

      if (err) throw err;
      success('Mise à jour', `"${editForm.title}" a été modifiée.`);
      setShowDetailModal(false);
      setSelectedClass(null);
      setEditForm({});
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de modifier la classe.');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      live: 'bg-red-100 text-red-700 animate-pulse',
      ended: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-50 text-red-600',
    };
    const labels: Record<string, string> = {
      scheduled: 'Programmée',
      live: 'En direct',
      ended: 'Terminée',
      cancelled: 'Annulée',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Classes virtuelles' },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Classes virtuelles</h1>
            <p className="text-gray-600 text-sm md:text-base">Organisez et animez vos sessions en direct</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-video-add-line text-base"></i>
            </div>
            Nouvelle classe
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'scheduled', 'live', 'ended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'scheduled' ? 'Programmées' : f === 'live' ? 'En direct' : 'Terminées'}
            </button>
          ))}
        </div>

        {/* Classes List */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={4} />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(cls.status)}
                      <span className="text-sm text-gray-600">{cls.course_name || 'Sans formation associée'}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base mb-1">{cls.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-calendar-line text-sm"></i>
                        </div>
                        {cls.class_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-time-line text-sm"></i>
                        </div>
                        {cls.class_time} ({cls.duration || 'N/A'})
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-group-line text-sm"></i>
                        </div>
                        {cls.students_count}/{cls.max_students} participants
                      </span>
                      {cls.recording_url && (
                        <span className="flex items-center gap-1 text-teal-600">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-record-circle-line text-sm"></i>
                          </div>
                          Enregistrée
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {cls.status === 'live' && (
                      <>
                        <button
                          onClick={() => handleJoin(cls)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap flex items-center gap-2"
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-broadcast-line text-sm"></i>
                          </div>
                          Rejoindre
                        </button>
                        <button
                          onClick={() => handleEndClass(cls)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Terminer
                        </button>
                      </>
                    )}
                    {cls.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => handleStartLive(cls)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                        >
                          Démarrer
                        </button>
                        <button
                          onClick={() => handleEditClick(cls)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <i className="ri-edit-line text-gray-600"></i>
                        </button>
                      </>
                    )}
                    {cls.status === 'ended' && cls.recording_url && (
                      <button
                        onClick={() => window.open(cls.recording_url!, '_blank', 'noopener,noreferrer')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap flex items-center gap-2"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-play-circle-line text-sm"></i>
                        </div>
                        Replay
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i className="ri-delete-bin-line text-red-500"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredClasses.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-video-off-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune classe trouvée</h3>
            <p className="text-gray-600">Créez votre première classe virtuelle</p>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Programmer une classe virtuelle</h3>
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la session *</label>
                  <input
                    type="text"
                    value={newClass.title}
                    onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                    placeholder="Ex: Session Q&A - React Hooks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <select
                    value={newClass.course_name}
                    onChange={(e) => {
                      const selected = instructorCourses.find(c => c.title === e.target.value);
                      setNewClass({
                        ...newClass,
                        course_name: e.target.value,
                        course_id: selected ? String(selected.id) : ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                  >
                    <option value="">Sélectionner une formation</option>
                    {instructorCourses.map((course) => (
                      <option key={course.id} value={course.title}>{course.title}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newClass.class_date}
                      onChange={(e) => setNewClass({ ...newClass, class_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input
                      type="time"
                      value={newClass.class_time}
                      onChange={(e) => setNewClass({ ...newClass, class_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <select
                      value={newClass.duration}
                      onChange={(e) => setNewClass({ ...newClass, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    >
                      <option value="">Sélectionner</option>
                      <option value="30min">30 minutes</option>
                      <option value="1h">1 heure</option>
                      <option value="1h30">1 heure 30</option>
                      <option value="2h">2 heures</option>
                      <option value="3h">3 heures</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max participants</label>
                    <input
                      type="number"
                      min={1}
                      value={newClass.max_students}
                      onChange={(e) => setNewClass({ ...newClass, max_students: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la salle</label>
                  <input
                    type="url"
                    value={newClass.room_link}
                    onChange={(e) => setNewClass({ ...newClass, room_link: e.target.value })}
                    placeholder="https://meet.c2p.sn/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClass({ title: '', course_id: '', course_name: '', class_date: '', class_time: '', duration: '', max_students: 30, room_link: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateClass}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Programmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit/Detail Modal */}
        {showDetailModal && selectedClass && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Modifier la classe</h3>
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <input
                    type="text"
                    value={editForm.course_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={editForm.class_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, class_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input
                      type="time"
                      value={editForm.class_time || ''}
                      onChange={(e) => setEditForm({ ...editForm, class_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                  <input
                    type="text"
                    value={editForm.duration || ''}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la salle</label>
                  <input
                    type="url"
                    value={editForm.room_link || ''}
                    onChange={(e) => setEditForm({ ...editForm, room_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedClass(null);
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
