import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';


interface VirtualClass {
  id: number;
  course_id: number | null;
  title: string;
  course_name: string | null;
  class_date: string;
  class_time: string;
  duration: string | null;
  students_count: number;
  max_students: number;
  status: string;
  provider?: 'jitsi' | 'custom';
  meeting_slug?: string | null;
  recording_enabled?: boolean;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  recording_url: string | null;
  room_link: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  instructor_notes?: string | null;
  allow_chat?: boolean;
  created_at: string;
}

type ClassFormErrors = Partial<Record<'title' | 'course_id' | 'class_date' | 'class_time' | 'duration' | 'max_students' | 'room_link' | 'meeting_slug' | 'recording_url' | 'instructor_notes', string>>;

const DEFAULT_CLASS_FORM = {
  title: '',
  course_id: '',
  course_name: '',
  class_date: '',
  class_time: '',
  duration: '',
  max_students: 30,
  provider: 'jitsi' as 'jitsi' | 'custom',
  meeting_slug: '',
  room_link: '',
  recording_enabled: true,
  recording_url: '',
  instructor_notes: '',
  allow_chat: true,
};

function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

function isFutureClassSlot(classDate: string, classTime: string) {
  const slot = new Date(`${classDate}T${classTime}:00`);
  return !Number.isNaN(slot.getTime()) && slot.getTime() > Date.now();
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateVirtualClassForm(
  form: {
    title?: string;
    course_id?: string | number | null;
    class_date?: string;
    class_time?: string;
    max_students?: number | null;
    status?: string | null;
    provider?: string | null;
    meeting_slug?: string | null;
    room_link?: string | null;
    recording_url?: string | null;
    instructor_notes?: string | null;
  },
  availableCourseIds: Set<string>,
) {
  const errors: ClassFormErrors = {};
  const title = String(form.title ?? '').trim();
  const courseId = String(form.course_id ?? '').trim();
  const classDate = String(form.class_date ?? '').trim();
  const classTime = String(form.class_time ?? '').trim();
  const maxStudents = Number(form.max_students ?? 0);
  const status = String(form.status ?? 'scheduled').trim() || 'scheduled';
  const provider = String(form.provider ?? 'jitsi').trim() || 'jitsi';
  const meetingSlug = String(form.meeting_slug ?? '').trim();
  const roomLink = String(form.room_link ?? '').trim();
  const recordingUrl = String(form.recording_url ?? '').trim();
  const instructorNotes = String(form.instructor_notes ?? '').trim();

  if (!title) errors.title = 'Le titre de la session est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!courseId) errors.course_id = 'La formation associée est obligatoire.';
  else if (!availableCourseIds.has(courseId)) errors.course_id = 'Sélectionnez une formation valide.';

  if (!classDate) errors.class_date = 'La date est obligatoire.';
  if (!classTime) errors.class_time = 'L’heure est obligatoire.';
  if (status === 'scheduled' && classDate && classTime && !isFutureClassSlot(classDate, classTime)) {
    errors.class_date = 'Programmez la classe sur un horaire futur.';
    errors.class_time = 'Programmez la classe sur un horaire futur.';
  }

  if (!Number.isFinite(maxStudents) || maxStudents < 1 || maxStudents > 500) {
    errors.max_students = 'Le nombre maximal de participants doit être compris entre 1 et 500.';
  }

  if (meetingSlug && !/^[a-z0-9-]{3,80}$/i.test(meetingSlug)) {
    errors.meeting_slug = 'Le slug doit contenir 3 à 80 caractères alphanumériques ou tirets.';
  }

  if (provider === 'custom' && !roomLink) {
    errors.room_link = 'Le lien de la salle est obligatoire pour un live personnalisé.';
  } else if (roomLink && !isValidUrl(roomLink)) {
    errors.room_link = 'Le lien de la salle doit être une URL valide.';
  }

  if (recordingUrl && !isValidUrl(recordingUrl)) {
    errors.recording_url = 'Le lien du replay doit être une URL valide.';
  }

  if (instructorNotes.length > 1200) {
    errors.instructor_notes = 'Les notes formateur ne peuvent pas dépasser 1200 caractères.';
  }

  return errors;
}

export default function FormateurClassesPage() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<VirtualClass[]>([]);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState(DEFAULT_CLASS_FORM);
  const [instructorCourses, setInstructorCourses] = useState<{ id: number; title: string }[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<VirtualClass | null>(null);
  const [editForm, setEditForm] = useState<Partial<VirtualClass>>();
  const [createErrors, setCreateErrors] = useState<ClassFormErrors>({});
  const [editErrors, setEditErrors] = useState<ClassFormErrors>({});
  const [createFormMessage, setCreateFormMessage] = useState<string | null>(null);
  const [editFormMessage, setEditFormMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const availableCourseIds = new Set(instructorCourses.map((course) => String(course.id)));

  const updateNewClass = <K extends keyof typeof DEFAULT_CLASS_FORM>(field: K, value: (typeof DEFAULT_CLASS_FORM)[K]) => {
    setNewClass((current) => ({ ...current, [field]: value }));
    setCreateErrors((current) => ({ ...current, [field]: undefined }));
    setCreateFormMessage(null);
  };

  const updateEditForm = <K extends keyof VirtualClass>(field: K, value: VirtualClass[K] | undefined) => {
    setEditForm((current) => ({ ...(current || {}), [field]: value }));
    setEditErrors((current) => ({ ...current, [field]: undefined }));
    setEditFormMessage(null);
  };

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
        provider: 'jitsi',
        meeting_slug: null,
        recording_enabled: true,
        recording_status: 'pending',
        recording_url: null,
        room_link: null,
        started_at: null,
        ended_at: null,
        instructor_notes: null,
        allow_chat: true,
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

  const handleCopyRoomLink = async (cls: VirtualClass) => {
    if (!cls.room_link) {
      error('Lien indisponible', 'Aucune salle n est encore associée à cette session.');
      return;
    }
    try {
      await navigator.clipboard.writeText(cls.room_link);
      success('Lien copié', 'Le lien de la salle a été copié dans le presse-papiers.');
    } catch (err) {
      console.error(err);
      error('Copie impossible', 'Impossible de copier le lien de la salle.');
    }
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
      success('Terminée', cls.recording_enabled
        ? `La classe "${cls.title}" est terminée. Le replay passe en préparation.`
        : `La classe "${cls.title}" est maintenant terminée.`);
      fetchClasses();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de terminer la classe.');
      console.error(err);
    }
  };

  const handleCreateClass = async () => {
    if (!user?.id) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return;
    }
    const nextErrors = validateVirtualClassForm(newClass, availableCourseIds);
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateFormMessage('Corrigez les champs signalés avant de programmer la classe.');
      return;
    }
    const selectedCourse = instructorCourses.find((course) => String(course.id) === newClass.course_id);
    if (!selectedCourse) {
      setCreateErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setCreateFormMessage('Corrigez les champs signalés avant de programmer la classe.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return;
    }
    setIsCreating(true);
    try {
      const { error: err } = await backendClient.from('virtual_classes').insert({
        instructor_id: user.id,
        course_id: Number(newClass.course_id),
        title: newClass.title,
        course_name: selectedCourse.title,
        class_date: newClass.class_date,
        class_time: newClass.class_time,
        duration: newClass.duration || null,
        max_students: newClass.max_students || 30,
        students_count: 0,
        provider: newClass.provider,
        meeting_slug: newClass.meeting_slug || null,
        room_link: newClass.room_link || null,
        recording_enabled: newClass.recording_enabled,
        recording_url: newClass.recording_url || null,
        instructor_notes: newClass.instructor_notes || null,
        allow_chat: newClass.allow_chat,
        status: 'scheduled',
      });

      if (err) throw err;
      success('Classe créée', 'La classe virtuelle a été programmée avec succès.');
      setShowCreateModal(false);
      setNewClass(DEFAULT_CLASS_FORM);
      setCreateErrors({});
      setCreateFormMessage(null);
      fetchClasses();
    } catch (err: unknown) {
      setCreateFormMessage('Impossible de créer la classe virtuelle.');
      error('Erreur', 'Impossible de créer la classe.');
      console.error(err);
    } finally {
      setIsCreating(false);
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
    setEditErrors({});
    setEditFormMessage(null);
    setShowDetailModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedClass) return;
    const nextErrors = validateVirtualClassForm(editForm, availableCourseIds);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      return;
    }
    const selectedCourse = instructorCourses.find((course) => String(course.id) === String(editForm.course_id));
    if (!selectedCourse) {
      setEditErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return;
    }
    setIsUpdating(true);
    try {
      const { error: err } = await backendClient
        .from('virtual_classes')
        .update({
          title: editForm.title,
          course_id: Number(editForm.course_id),
          course_name: selectedCourse.title,
          class_date: editForm.class_date,
          class_time: editForm.class_time,
          duration: editForm.duration || null,
          max_students: editForm.max_students,
          provider: editForm.provider,
          meeting_slug: editForm.meeting_slug || null,
          room_link: editForm.room_link || null,
          recording_enabled: editForm.recording_enabled,
          recording_url: editForm.recording_url || null,
          instructor_notes: editForm.instructor_notes || null,
          allow_chat: editForm.allow_chat,
        })
        .eq('id', selectedClass.id);

      if (err) throw err;
      success('Mise à jour', `"${editForm.title}" a été modifiée.`);
      setShowDetailModal(false);
      setSelectedClass(null);
      setEditForm({});
      setEditErrors({});
      setEditFormMessage(null);
      fetchClasses();
    } catch (err: unknown) {
      setEditFormMessage('Impossible de modifier la classe.');
      error('Erreur', 'Impossible de modifier la classe.');
      console.error(err);
    } finally {
      setIsUpdating(false);
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
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-live-line text-sm"></i>
                        </div>
                        {cls.provider === 'custom' ? 'Salle personnalisée' : 'Salle Jitsi'}
                      </span>
                      {cls.recording_url && (
                        <span className="flex items-center gap-1 text-teal-600">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-record-circle-line text-sm"></i>
                          </div>
                          Enregistrée
                        </span>
                      )}
                      {!cls.recording_url && cls.recording_status === 'processing' && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-loader-4-line text-sm animate-spin"></i>
                          </div>
                          Replay en préparation
                        </span>
                      )}
                    </div>
                    {cls.instructor_notes ? (
                      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{cls.instructor_notes}</p>
                    ) : null}
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
                        <button
                          onClick={() => handleCopyRoomLink(cls)}
                          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Copier le lien
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
                          onClick={() => handleCopyRoomLink(cls)}
                          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Copier le lien
                        </button>
                        <button
                          onClick={() => handleEditClick(cls)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <i className="ri-edit-line text-gray-600"></i>
                        </button>
                      </>
                    )}
                    {cls.status === 'ended' && (
                      <button
                        onClick={() => handleEditClick(cls)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                        title="Modifier le replay"
                      >
                        <i className="ri-edit-line text-gray-600"></i>
                      </button>
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
              {createFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createFormMessage}
                </div>
              ) : null}
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la session *</label>
                  <input
                    type="text"
                    value={newClass.title}
                    onChange={(e) => updateNewClass('title', e.target.value)}
                    placeholder="Ex: Session Q&A - React Hooks"
                    aria-invalid={Boolean(createErrors.title)}
                    className={getFieldClass(Boolean(createErrors.title))}
                  />
                  {createErrors.title ? <p className="mt-1 text-xs text-red-600">{createErrors.title}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <select
                    value={newClass.course_id}
                    onChange={(e) => {
                      const selected = instructorCourses.find((course) => String(course.id) === e.target.value);
                      setNewClass((current) => ({
                        ...current,
                        course_id: e.target.value,
                        course_name: selected?.title || '',
                      }));
                      setCreateErrors((current) => ({ ...current, course_id: undefined }));
                      setCreateFormMessage(null);
                    }}
                    aria-invalid={Boolean(createErrors.course_id)}
                    className={getFieldClass(Boolean(createErrors.course_id))}
                  >
                    <option value="">Sélectionner une formation</option>
                    {instructorCourses.map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  {createErrors.course_id ? <p className="mt-1 text-xs text-red-600">{createErrors.course_id}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newClass.class_date}
                      onChange={(e) => updateNewClass('class_date', e.target.value)}
                      aria-invalid={Boolean(createErrors.class_date)}
                      className={getFieldClass(Boolean(createErrors.class_date))}
                    />
                    {createErrors.class_date ? <p className="mt-1 text-xs text-red-600">{createErrors.class_date}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input
                      type="time"
                      value={newClass.class_time}
                      onChange={(e) => updateNewClass('class_time', e.target.value)}
                      aria-invalid={Boolean(createErrors.class_time)}
                      className={getFieldClass(Boolean(createErrors.class_time))}
                    />
                    {createErrors.class_time ? <p className="mt-1 text-xs text-red-600">{createErrors.class_time}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur live</label>
                    <select
                      value={newClass.provider}
                      onChange={(e) => updateNewClass('provider', e.target.value as 'jitsi' | 'custom')}
                      className={getFieldClass(false)}
                    >
                      <option value="jitsi">Jitsi auto-hébergé</option>
                      <option value="custom">Lien personnalisé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <select
                      value={newClass.duration}
                      onChange={(e) => updateNewClass('duration', e.target.value)}
                      className={getFieldClass(false)}
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
                      onChange={(e) => updateNewClass('max_students', parseInt(e.target.value, 10) || 30)}
                      aria-invalid={Boolean(createErrors.max_students)}
                      className={getFieldClass(Boolean(createErrors.max_students))}
                    />
                    {createErrors.max_students ? <p className="mt-1 text-xs text-red-600">{createErrors.max_students}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug de la salle</label>
                  <input
                    type="text"
                    value={newClass.meeting_slug}
                    onChange={(e) => updateNewClass('meeting_slug', e.target.value)}
                    placeholder="react-hooks-session"
                    aria-invalid={Boolean(createErrors.meeting_slug)}
                    className={getFieldClass(Boolean(createErrors.meeting_slug))}
                  />
                  <p className="mt-1 text-xs text-gray-500">Laissez vide pour une génération automatique.</p>
                  {createErrors.meeting_slug ? <p className="mt-1 text-xs text-red-600">{createErrors.meeting_slug}</p> : null}
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la salle</label>
                  <input
                    type="url"
                    value={newClass.room_link}
                    onChange={(e) => updateNewClass('room_link', e.target.value)}
                    placeholder={newClass.provider === 'custom' ? 'https://meet.c2p.sn/...' : 'Auto-généré pour Jitsi si laissé vide'}
                    aria-invalid={Boolean(createErrors.room_link)}
                    className={getFieldClass(Boolean(createErrors.room_link))}
                  />
                  {createErrors.room_link ? <p className="mt-1 text-xs text-red-600">{createErrors.room_link}</p> : null}
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de replay</label>
                  <input
                    type="url"
                    value={newClass.recording_url}
                    onChange={(e) => updateNewClass('recording_url', e.target.value)}
                    placeholder="https://.../replay"
                    aria-invalid={Boolean(createErrors.recording_url)}
                    className={getFieldClass(Boolean(createErrors.recording_url))}
                  />
                  {createErrors.recording_url ? <p className="mt-1 text-xs text-red-600">{createErrors.recording_url}</p> : null}
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes formateur</label>
                  <textarea
                    rows={4}
                    value={newClass.instructor_notes}
                    onChange={(e) => updateNewClass('instructor_notes', e.target.value)}
                    placeholder="Consignes de préparation, matériel demandé, déroulé..."
                    aria-invalid={Boolean(createErrors.instructor_notes)}
                    className={`${getFieldClass(Boolean(createErrors.instructor_notes))} resize-none`}
                  />
                  {createErrors.instructor_notes ? <p className="mt-1 text-xs text-red-600">{createErrors.instructor_notes}</p> : null}
                </div>
                <div className="dashboard-form-wide grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newClass.recording_enabled}
                      onChange={(e) => updateNewClass('recording_enabled', e.target.checked)}
                    />
                    Enregistrer automatiquement le replay
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newClass.allow_chat}
                      onChange={(e) => updateNewClass('allow_chat', e.target.checked)}
                    />
                    Activer le chat pendant la session
                  </label>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClass(DEFAULT_CLASS_FORM);
                    setCreateErrors({});
                    setCreateFormMessage(null);
                  }}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateClass}
                  disabled={isCreating}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Programmation...' : 'Programmer'}
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
              {editFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editFormMessage}
                </div>
              ) : null}
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => updateEditForm('title', e.target.value)}
                    aria-invalid={Boolean(editErrors.title)}
                    className={getFieldClass(Boolean(editErrors.title))}
                  />
                  {editErrors.title ? <p className="mt-1 text-xs text-red-600">{editErrors.title}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <select
                    value={String(editForm.course_id || '')}
                    onChange={(e) => {
                      const selected = instructorCourses.find((course) => String(course.id) === e.target.value);
                      setEditForm((current) => ({
                        ...(current || {}),
                        course_id: e.target.value ? Number(e.target.value) : null,
                        course_name: selected?.title || '',
                      }));
                      setEditErrors((current) => ({ ...current, course_id: undefined }));
                      setEditFormMessage(null);
                    }}
                    aria-invalid={Boolean(editErrors.course_id)}
                    className={getFieldClass(Boolean(editErrors.course_id))}
                  >
                    <option value="">Sélectionner une formation</option>
                    {instructorCourses.map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  {editErrors.course_id ? <p className="mt-1 text-xs text-red-600">{editErrors.course_id}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={editForm.class_date || ''}
                      onChange={(e) => updateEditForm('class_date', e.target.value)}
                      aria-invalid={Boolean(editErrors.class_date)}
                      className={getFieldClass(Boolean(editErrors.class_date))}
                    />
                    {editErrors.class_date ? <p className="mt-1 text-xs text-red-600">{editErrors.class_date}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input
                      type="time"
                      value={editForm.class_time || ''}
                      onChange={(e) => updateEditForm('class_time', e.target.value)}
                      aria-invalid={Boolean(editErrors.class_time)}
                      className={getFieldClass(Boolean(editErrors.class_time))}
                    />
                    {editErrors.class_time ? <p className="mt-1 text-xs text-red-600">{editErrors.class_time}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur live</label>
                    <select
                      value={String(editForm.provider || 'jitsi')}
                      onChange={(e) => updateEditForm('provider', e.target.value as VirtualClass['provider'])}
                      className={getFieldClass(false)}
                    >
                      <option value="jitsi">Jitsi auto-généré</option>
                      <option value="custom">Lien personnalisé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <input
                      type="text"
                      value={editForm.duration || ''}
                      onChange={(e) => updateEditForm('duration', e.target.value)}
                      className={getFieldClass(false)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max participants</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={editForm.max_students || 30}
                      onChange={(e) => updateEditForm('max_students', parseInt(e.target.value, 10) || 30)}
                      aria-invalid={Boolean(editErrors.max_students)}
                      className={getFieldClass(Boolean(editErrors.max_students))}
                    />
                    {editErrors.max_students ? <p className="mt-1 text-xs text-red-600">{editErrors.max_students}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug de la salle</label>
                    <input
                      type="text"
                      value={editForm.meeting_slug || ''}
                      onChange={(e) => updateEditForm('meeting_slug', e.target.value)}
                      placeholder="react-hooks-session"
                      aria-invalid={Boolean(editErrors.meeting_slug)}
                      className={getFieldClass(Boolean(editErrors.meeting_slug))}
                    />
                    {editErrors.meeting_slug ? <p className="mt-1 text-xs text-red-600">{editErrors.meeting_slug}</p> : null}
                  </div>
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la salle</label>
                  <input
                    type="url"
                    value={editForm.room_link || ''}
                    onChange={(e) => updateEditForm('room_link', e.target.value)}
                    aria-invalid={Boolean(editErrors.room_link)}
                    className={getFieldClass(Boolean(editErrors.room_link))}
                  />
                  {editErrors.room_link ? <p className="mt-1 text-xs text-red-600">{editErrors.room_link}</p> : null}
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de replay</label>
                  <input
                    type="url"
                    value={editForm.recording_url || ''}
                    onChange={(e) => updateEditForm('recording_url', e.target.value)}
                    placeholder="https://.../replay"
                    aria-invalid={Boolean(editErrors.recording_url)}
                    className={getFieldClass(Boolean(editErrors.recording_url))}
                  />
                  {editErrors.recording_url ? <p className="mt-1 text-xs text-red-600">{editErrors.recording_url}</p> : null}
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes formateur</label>
                  <textarea
                    rows={4}
                    value={editForm.instructor_notes || ''}
                    onChange={(e) => updateEditForm('instructor_notes', e.target.value)}
                    placeholder="Consignes de préparation, matériel demandé, déroulé..."
                    aria-invalid={Boolean(editErrors.instructor_notes)}
                    className={`${getFieldClass(Boolean(editErrors.instructor_notes))} resize-none`}
                  />
                  {editErrors.instructor_notes ? <p className="mt-1 text-xs text-red-600">{editErrors.instructor_notes}</p> : null}
                </div>
                <div className="dashboard-form-wide grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.recording_enabled)}
                      onChange={(e) => updateEditForm('recording_enabled', e.target.checked)}
                    />
                    Enregistrement du replay
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editForm.allow_chat !== false}
                      onChange={(e) => updateEditForm('allow_chat', e.target.checked)}
                    />
                    Chat activé
                  </label>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedClass(null);
                    setEditForm({});
                    setEditErrors({});
                    setEditFormMessage(null);
                  }}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
