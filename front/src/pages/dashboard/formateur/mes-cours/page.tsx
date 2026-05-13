import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/base/Skeleton';
import ImageUploadField from '@/components/base/ImageUploadField';
import CourseCreationWizard from './components/CourseCreationWizard';
import { getWizardStorageKey } from './components/wizardStorage';
import {
  courseStatusClasses,
  courseStatusLabels,
  getInstructorWorkflowAction,
  type CourseWorkflowStatus,
} from '@/lib/courseWorkflow';
import { getCourseDeliveryLabel, type CourseDeliveryMode } from '@/lib/courseDelivery';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import {
  deleteFormateurCourse,
  fetchFormateurCourses,
  updateFormateurCourse,
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';


interface Course {
  id: string | number;
  title: string;
  category: string;
  description: string | null;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  delivery_mode: CourseDeliveryMode;
  access_type: 'free' | 'paid';
  is_free: boolean;
  promotion_percentage: number;
  trailer_url: string | null;
  students_count: number;
  completion_rate: number;
  status: CourseWorkflowStatus;
  revenue: number;
  modules: number;
  duration: string | null;
  updated_at: string;
  thumbnail: string | null;
  price: number;
  current_price?: number;
}

type CourseFormErrors = Partial<Record<
  'title' | 'category' | 'description' | 'level' | 'delivery_mode' | 'modules' | 'duration' | 'price' | 'promotion_percentage' | 'thumbnail' | 'trailer_url',
  string
>>;

const COURSE_LEVEL_LABELS: Record<Course['level'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all_levels: 'Tous niveaux',
};

const COURSE_DELIVERY_LABELS: Record<CourseDeliveryMode, string> = {
  online: 'En ligne',
  onsite: 'Présentiel',
  hybrid: 'Hybride',
};

function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateCourseForm(form: Partial<Course>) {
  const errors: CourseFormErrors = {};
  const title = String(form.title ?? '').trim();
  const category = String(form.category ?? '').trim();
  const description = String(form.description ?? '');
  const duration = String(form.duration ?? '').trim();
  const modules = Number(form.modules ?? 0);
  const price = Number(form.price ?? 0);
  const promotionPercentage = Number(form.promotion_percentage ?? 0);
  const thumbnail = String(form.thumbnail ?? '').trim();
  const trailerUrl = String(form.trailer_url ?? '').trim();
  const level = String(form.level ?? '').trim();
  const deliveryMode = String(form.delivery_mode ?? '').trim();
  const isFree = Boolean(form.is_free);

  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!category) errors.category = 'La catégorie est obligatoire.';
  else if (category.length < 2) errors.category = 'La catégorie doit contenir au moins 2 caractères.';

  if (description.length > 500) errors.description = 'La description ne peut pas dépasser 500 caractères.';
  if (!['beginner', 'intermediate', 'advanced', 'all_levels'].includes(level)) {
    errors.level = 'Sélectionnez un niveau valide.';
  }
  if (!['online', 'onsite', 'hybrid'].includes(deliveryMode)) {
    errors.delivery_mode = 'Sélectionnez un format valide.';
  }
  if (!duration) errors.duration = 'La durée est obligatoire.';
  if (!Number.isFinite(modules) || modules < 1 || modules > 200) errors.modules = 'Le nombre de modules doit être compris entre 1 et 200.';
  if (!Number.isFinite(price) || price < 0) errors.price = 'Le prix doit être supérieur ou égal à 0.';
  if (!isFree && price <= 0) errors.price = 'Renseignez un prix supérieur à 0 pour une formation payante.';
  if (!Number.isFinite(promotionPercentage) || promotionPercentage < 0 || promotionPercentage > 100) {
    errors.promotion_percentage = 'La promotion doit être comprise entre 0 et 100%.';
  }
  if (thumbnail && !isValidHttpUrl(thumbnail)) errors.thumbnail = 'La miniature doit être une URL http(s) valide.';
  if (trailerUrl && !isValidHttpUrl(trailerUrl)) errors.trailer_url = 'La bande-annonce doit être une URL http(s) valide.';

  return errors;
}

function isIgnorableTransportError(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const message = 'message' in err ? String(err.message) : '';
  const code = 'code' in err ? String(err.code) : '';
  return (
    code === 'NETWORK_ERROR'
    || code === 'REQUEST_TIMEOUT'
    || message === 'Failed to fetch'
    || message === 'Erreur reseau.'
  );
}

export default function FormateurCoursPage() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const { gateFor } = useSubscriptionAccess(user);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [workflowCourse, setWorkflowCourse] = useState<Course | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Course>>();
  const [editErrors, setEditErrors] = useState<CourseFormErrors>({});
  const [editFormMessage, setEditFormMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const isMountedRef = useRef(true);
  const subscriptionGate = gateFor('trainer_courses_manage');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateEditForm = <K extends keyof Course>(field: K, value: Course[K] | undefined) => {
    setEditForm((current) => {
      const next = { ...(current || {}), [field]: value };
      if (field === 'is_free') {
        const isFree = value === true;
        next.is_free = isFree;
        next.access_type = isFree ? 'free' : 'paid';
        if (isFree) {
          next.price = 0;
        }
      }
      if (field === 'price' && Number(value ?? 0) > 0) {
        next.is_free = false;
        next.access_type = 'paid';
      }
      return next;
    });
    setEditErrors((current) => ({ ...current, [field]: undefined }));
    setEditFormMessage(null);
  };

  const openCreateModal = () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (typeof window !== 'undefined' && user?.id) {
      window.localStorage.removeItem(getWizardStorageKey(user.id));
      window.localStorage.removeItem(`c2p:trainer-course-draft:${user.id}`);
    }
    setShowCreateWizard(true);
  };

  const fetchCourses = useCallback(async () => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setCourses([]);
        setLoading(false);
      }
      return;
    }
    if (isMountedRef.current) {
      setLoading(true);
    }
    try {
      const data = await fetchFormateurCourses(user.id);
      if (!isMountedRef.current) return;
      setCourses(data as Course[]);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (isIgnorableTransportError(err)) return;
      error('Erreur', 'Impossible de charger les formations.');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [error, user?.id]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleWorkflowAction = (course: Course) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setWorkflowCourse(course);
    setShowWorkflowModal(true);
  };

  const confirmWorkflowAction = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!workflowCourse || !user?.id) return;
    const action = getInstructorWorkflowAction(workflowCourse.status);
    if (!action) return;
    try {
      await updateFormateurCourseWorkflow(user.id, workflowCourse.id, action.nextStatus);
      if (!isMountedRef.current) return;
      success('Workflow mis à jour', `La formation "${workflowCourse.title}" est passée en ${courseStatusLabels[action.nextStatus].toLowerCase()}.`);
      setShowWorkflowModal(false);
      setWorkflowCourse(null);
      void fetchCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de mettre à jour le statut de la formation.';
      error('Transition impossible', message);
      console.error(err);
    }
  };

  const handleEdit = (course: Course) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedCourse(course);
    setEditForm({ ...course });
    setEditErrors({});
    setEditFormMessage(null);
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedCourse || !user?.id) return;
    const nextErrors = validateCourseForm(editForm || {});
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setEditFormMessage('Corrigez les champs signalés avant d’enregistrer.');
      return;
    }
    setIsUpdating(true);
    try {
      await updateFormateurCourse(user.id, selectedCourse.id, {
        title: editForm.title,
        category: editForm.category,
        level: editForm.level,
        delivery_mode: editForm.delivery_mode,
        status: editForm.status,
        description: editForm.description,
        duration: editForm.duration,
        modules: editForm.modules,
        price: editForm.price,
        access_type: editForm.is_free ? 'free' : 'paid',
        is_free: Boolean(editForm.is_free),
        promotion_percentage: editForm.promotion_percentage ?? 0,
        trailer_url: editForm.trailer_url || null,
        thumbnail: editForm.thumbnail || selectedCourse.thumbnail,
        updated_at: new Date().toISOString(),
      });
      if (!isMountedRef.current) return;
      success('Formation mise à jour', `"${editForm.title}" a été modifiée avec succès.`);
      setShowEditModal(false);
      setSelectedCourse(null);
      setEditForm({});
      setEditErrors({});
      setEditFormMessage(null);
      void fetchCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de modifier la formation.';
      setEditFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  const handleDelete = async (course: Course) => {
    if (!user?.id) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer "${course.title}" ? Cette action est irréversible.`))
      return;
    try {
      await deleteFormateurCourse(user.id, course.id);
      if (!isMountedRef.current) return;
      success('Formation supprimée', `"${course.title}" a été supprimée.`);
      void fetchCourses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Impossible de supprimer la formation.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${courseStatusClasses[status as CourseWorkflowStatus] || 'bg-gray-100 text-gray-700'}`}>
        {courseStatusLabels[status as CourseWorkflowStatus] || status}
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
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes formations</h1>
            <p className="text-gray-600 text-sm md:text-base">Créez, gérez et publiez vos formations</p>
          </div>
          <button
            onClick={openCreateModal}
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
              {(['all', 'published', 'draft', 'review', 'rejected', 'archived'] as const).map((status) => (
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
                        : status === 'review'
                          ? 'Révision'
                          : status === 'rejected'
                            ? 'Rejetés'
                            : 'Archivés'}
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
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                      {COURSE_LEVEL_LABELS[course.level] || 'Intermédiaire'}
                    </span>
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                      {getCourseDeliveryLabel(course.delivery_mode)}
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
                      {course.is_free ? 'Gratuit' : `${(course.current_price ?? course.price).toLocaleString('fr-FR')} FCFA`}
                    </span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Link
                        to={`/dashboard/formateur/mes-cours/${course.id}/programme`}
                        className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Programme
                      </Link>
                      {getInstructorWorkflowAction(course.status) && (
                        <button
                          onClick={() => handleWorkflowAction(course)}
                          disabled={!subscriptionGate.allowed}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            !subscriptionGate.allowed
                              ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                              : course.status === 'published'
                              ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                              : course.status === 'review'
                                ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          {getInstructorWorkflowAction(course.status)?.description}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(course)}
                        disabled={!subscriptionGate.allowed}
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

        <CourseCreationWizard
          open={showCreateWizard}
          userId={user?.id}
          onClose={() => setShowCreateWizard(false)}
          onCreated={async (createdCourse) => {
            const optimisticCourse: Course = {
              id: createdCourse.id,
              title: createdCourse.title,
              category: createdCourse.category || 'General',
              description: createdCourse.description || null,
              level: createdCourse.level,
              delivery_mode: createdCourse.delivery_mode,
              access_type: createdCourse.is_free ? 'free' : 'paid',
              is_free: createdCourse.is_free,
              promotion_percentage: createdCourse.promotion_percentage,
              trailer_url: createdCourse.trailer_url,
              students_count: 0,
              completion_rate: 0,
              status: 'draft',
              revenue: 0,
              modules: createdCourse.modules,
              duration: createdCourse.duration || 'N/A',
              updated_at: new Date().toISOString(),
              thumbnail: createdCourse.thumbnail,
              price: createdCourse.price,
              current_price: createdCourse.price,
            };

            setCourses((current) => [
              optimisticCourse,
              ...current.filter((course) => String(course.id) !== String(createdCourse.id)),
            ]);

            void fetchCourses();
          }}
        />

        {/* Workflow Modal */}
        {showWorkflowModal && workflowCourse && getInstructorWorkflowAction(workflowCourse.status) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-git-branch-line text-teal-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{getInstructorWorkflowAction(workflowCourse.status)?.description}</h3>
              </div>
              <p className="text-gray-600 mb-6">
                {workflowCourse.status === 'draft' && (
                  <>
                    Soumettre <strong>"{workflowCourse.title}"</strong> à l équipe admin pour validation.
                  </>
                )}
                {workflowCourse.status === 'review' && (
                  <>
                    Retirer <strong>"{workflowCourse.title}"</strong> de la file de révision et revenir en brouillon.
                  </>
                )}
                {workflowCourse.status === 'published' && (
                  <>
                    Archiver <strong>"{workflowCourse.title}"</strong> pour la retirer du catalogue sans la supprimer.
                  </>
                )}
                {(workflowCourse.status === 'rejected' || workflowCourse.status === 'archived') && (
                  <>
                    Repasser <strong>"{workflowCourse.title}"</strong> en brouillon pour la retravailler avant une nouvelle soumission.
                  </>
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowWorkflowModal(false);
                    setWorkflowCourse(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmWorkflowAction}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    workflowCourse.status === 'published'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : workflowCourse.status === 'review'
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  Confirmer
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
              {editFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editFormMessage}
                </div>
              ) : null}
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => updateEditForm('title', e.target.value)}
                    aria-invalid={Boolean(editErrors.title)}
                    className={getFieldClass(Boolean(editErrors.title))}
                  />
                  {editErrors.title ? <p className="mt-1 text-xs text-red-600">{editErrors.title}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => updateEditForm('category', e.target.value)}
                      aria-invalid={Boolean(editErrors.category)}
                      className={getFieldClass(Boolean(editErrors.category))}
                    />
                    {editErrors.category ? <p className="mt-1 text-xs text-red-600">{editErrors.category}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                    <select
                      value={editForm.level || 'intermediate'}
                      onChange={(e) => updateEditForm('level', e.target.value as Course['level'])}
                      aria-invalid={Boolean(editErrors.level)}
                      className={getFieldClass(Boolean(editErrors.level))}
                    >
                      {Object.entries(COURSE_LEVEL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {editErrors.level ? <p className="mt-1 text-xs text-red-600">{editErrors.level}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={editForm.delivery_mode || 'online'}
                      onChange={(e) => updateEditForm('delivery_mode', e.target.value as CourseDeliveryMode)}
                      aria-invalid={Boolean(editErrors.delivery_mode)}
                      className={getFieldClass(Boolean(editErrors.delivery_mode))}
                    >
                      {Object.entries(COURSE_DELIVERY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {editErrors.delivery_mode ? <p className="mt-1 text-xs text-red-600">{editErrors.delivery_mode}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => updateEditForm('status', e.target.value as CourseWorkflowStatus)}
                      className={getFieldClass(false)}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="review">En révision</option>
                      <option value="archived">Archivée</option>
                      {editForm.status === 'published' && <option value="published">Publiée</option>}
                      {editForm.status === 'rejected' && <option value="rejected">Rejetée</option>}
                    </select>
                  </div>
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editForm.description || ''}
                    onChange={(e) => updateEditForm('description', e.target.value)}
                    aria-invalid={Boolean(editErrors.description)}
                    className={`${getFieldClass(Boolean(editErrors.description))} resize-none`}
                  />
                  <p className="text-xs text-gray-500 mt-1">500 caractères max</p>
                  {editErrors.description ? <p className="mt-1 text-xs text-red-600">{editErrors.description}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <input
                      type="text"
                      value={editForm.duration || ''}
                      onChange={(e) => updateEditForm('duration', e.target.value)}
                      aria-invalid={Boolean(editErrors.duration)}
                      className={getFieldClass(Boolean(editErrors.duration))}
                    />
                    {editErrors.duration ? <p className="mt-1 text-xs text-red-600">{editErrors.duration}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.modules || 0}
                      onChange={(e) => updateEditForm('modules', parseInt(e.target.value, 10) || 0)}
                      aria-invalid={Boolean(editErrors.modules)}
                      className={getFieldClass(Boolean(editErrors.modules))}
                    />
                    {editErrors.modules ? <p className="mt-1 text-xs text-red-600">{editErrors.modules}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.price || 0}
                    onChange={(e) => updateEditForm('price', parseInt(e.target.value, 10) || 0)}
                    disabled={Boolean(editForm.is_free)}
                    aria-invalid={Boolean(editErrors.price)}
                    className={getFieldClass(Boolean(editErrors.price))}
                  />
                  {editErrors.price ? <p className="mt-1 text-xs text-red-600">{editErrors.price}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promotion (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.promotion_percentage || 0}
                    onChange={(e) => updateEditForm('promotion_percentage', parseInt(e.target.value, 10) || 0)}
                    aria-invalid={Boolean(editErrors.promotion_percentage)}
                    className={getFieldClass(Boolean(editErrors.promotion_percentage))}
                  />
                  {editErrors.promotion_percentage ? <p className="mt-1 text-xs text-red-600">{editErrors.promotion_percentage}</p> : null}
                </div>
                <label className="dashboard-form-wide flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.is_free)}
                    onChange={(e) => updateEditForm('is_free', e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Formation gratuite
                </label>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bande-annonce vidéo</label>
                  <input
                    type="url"
                    value={editForm.trailer_url || ''}
                    onChange={(e) => updateEditForm('trailer_url', e.target.value)}
                    aria-invalid={Boolean(editErrors.trailer_url)}
                    placeholder="https://.../trailer.mp4"
                    className={getFieldClass(Boolean(editErrors.trailer_url))}
                  />
                  {editErrors.trailer_url ? <p className="mt-1 text-xs text-red-600">{editErrors.trailer_url}</p> : null}
                </div>
                <ImageUploadField
                  label="Miniature de la formation"
                  value={editForm.thumbnail || selectedCourse.thumbnail || ''}
                  onChange={(url) => updateEditForm('thumbnail', url)}
                  folder="c2p/courses"
                  helper="Ce visuel sera utilise dans le catalogue et sur la fiche formation."
                />
                {editErrors.thumbnail ? <p className="dashboard-form-wide -mt-2 text-xs text-red-600">{editErrors.thumbnail}</p> : null}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCourse(null);
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
