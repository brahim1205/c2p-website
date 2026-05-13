import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { notifyInstructorEnrollment } from '@/hooks/useCreateNotification';
import { useToast } from '@/hooks/useToast';
import {
  getCourseDeliveryBadgeClass,
  getCourseDeliveryIcon,
  getCourseDeliveryLabel,
} from '@/lib/courseDelivery';
import {
  getCourseBranchBadgeClass,
  getCourseBranchDescription,
  getCourseBranchLabel,
} from '@/lib/courseBranch';

interface Course {
  id: number;
  title: string;
  category: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name?: string | null;
  modules: number | null;
  duration: string | null;
  students_count: number | null;
  price: number | null;
  current_price?: number | null;
  thumbnail: string | null;
  status: string;
  level?: string | null;
  rating?: number | null;
  is_free?: boolean | null;
  delivery_mode?: string | null;
  program_branch?: string | null;
  created_at: string;
}

interface CourseSection {
  id: number;
  title: string;
  description: string | null;
  position: number | null;
}

interface CourseLesson {
  id: number;
  section_id: number | null;
  title: string;
  description: string | null;
  type: string | null;
  duration: string | null;
  is_preview: boolean | null;
  position: number | null;
}

interface EnrollmentRecord {
  id: number;
  progress?: number;
  status?: string;
}

interface CourseReview {
  id: string | number;
  course_id: number;
  student_id: string;
  student_name: string;
  student_avatar?: string | null;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

interface LessonProgressRecord {
  id: string | number;
  lesson_id: number;
  progress: number;
  completed: boolean;
}

interface RelatedVirtualClass {
  id: number;
  title: string;
  class_date: string;
  class_time: string;
  status: string;
  recording_url?: string | null;
}

function normalizeCourseLevel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'debutant' || normalized === 'beginner') return 'Débutant';
  if (normalized === 'avance' || normalized === 'advanced') return 'Avancé';
  if (normalized === 'all_levels' || normalized === 'tous niveaux') return 'Tous niveaux';
  return 'Intermédiaire';
}

function getTypeIcon(type: string | null | undefined) {
  switch (type) {
    case 'video':
      return 'ri-play-circle-line';
    case 'quiz':
      return 'ri-question-line';
    case 'assignment':
      return 'ri-edit-box-line';
    case 'live':
      return 'ri-broadcast-line';
    case 'pdf':
      return 'ri-file-pdf-line';
    case 'article':
      return 'ri-article-line';
    default:
      return 'ri-file-line';
  }
}

function getCourseImage(course: Course) {
  if (course.thumbnail) return course.thumbnail;
  const catImages: Record<string, string> = {
    informatique: '/images/home/precision.jpg',
    langues: '/images/home/global.jpg',
    entrepreneuriat: '/images/home/venture.jpg',
    commerce: '/images/home/service.jpg',
    communication: '/images/home/academy.jpg',
    gestion: '/images/home/trust.jpg',
  };
  return catImages[(course.category || '').toLowerCase()] || catImages.informatique;
}

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [existingEnrollment, setExistingEnrollment] = useState<EnrollmentRecord | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRecord[]>([]);
  const [relatedClasses, setRelatedClasses] = useState<RelatedVirtualClass[]>([]);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    const courseId = Number(id);
    if (!courseId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [courseRes, sectionsRes, lessonsRes, enrollmentRes, progressRes] = await Promise.all([
          backendClient
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .eq('status', 'published')
            .maybeSingle(),
          backendClient
            .from('course_sections')
            .select('*')
            .eq('course_id', courseId)
            .eq('status', 'published')
            .order('position', { ascending: true }),
          backendClient
            .from('course_lessons')
            .select('*')
            .eq('course_id', courseId)
            .eq('status', 'published')
            .order('position', { ascending: true }),
          user?.id
            ? backendClient
                .from('course_enrollments')
                .select('id,progress,status')
                .eq('course_id', courseId)
                .eq('student_id', user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          user?.id
            ? backendClient
                .from('lesson_progress')
                .select('*')
                .eq('course_id', courseId)
                .eq('student_id', user.id)
                .order('last_viewed_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (courseRes.error) throw courseRes.error;
        if (sectionsRes.error) throw sectionsRes.error;
        if (lessonsRes.error) throw lessonsRes.error;
        if (enrollmentRes.error) throw enrollmentRes.error;
        if (progressRes.error) throw progressRes.error;

        setCourse((courseRes.data as Course | null) || null);
        setSections((sectionsRes.data as CourseSection[]) || []);
        setLessons((lessonsRes.data as CourseLesson[]) || []);
        setExistingEnrollment((enrollmentRes.data as EnrollmentRecord | null) || null);
        setLessonProgress(((progressRes.data as LessonProgressRecord[]) || []));

        const [reviewsResult, classesResult] = await Promise.allSettled([
          backendClient
            .from('course_reviews')
            .select('*')
            .eq('course_id', courseId)
            .eq('status', 'published')
            .order('created_at', { ascending: false }),
          backendClient
            .from('virtual_classes')
            .select('id,title,class_date,class_time,status,recording_url')
            .eq('course_id', courseId)
            .order('class_date', { ascending: false }),
        ]);

        const nextReviews = reviewsResult.status === 'fulfilled' && !reviewsResult.value.error
          ? ((reviewsResult.value.data as CourseReview[]) || [])
          : [];
        const nextClasses = classesResult.status === 'fulfilled' && !classesResult.value.error
          ? ((classesResult.value.data as RelatedVirtualClass[]) || [])
          : [];

        setReviews(nextReviews);
        setRelatedClasses(nextClasses);
        const myPublishedReview = nextReviews.find((review) => user?.id && String(review.student_id) === String(user.id));
        if (myPublishedReview) {
          setReviewDraft({
            rating: Number(myPublishedReview.rating || 5),
            comment: myPublishedReview.comment || '',
          });
        } else {
          setReviewDraft({ rating: 5, comment: '' });
        }
      } catch (err) {
        console.error(err);
        setCourse(null);
        setSections([]);
        setLessons([]);
        setExistingEnrollment(null);
        setReviews([]);
        setLessonProgress([]);
        setRelatedClasses([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id, user?.id]);

  const curriculum = useMemo(() => (
    sections.map((section) => ({
      ...section,
      lessons: lessons
        .filter((lesson) => String(lesson.section_id) === String(section.id))
        .sort((left, right) => (left.position ?? 0) - (right.position ?? 0)),
    }))
  ), [lessons, sections]);

  const totalLessons = lessons.length;
  const previewLessons = lessons.filter((lesson) => Boolean(lesson.is_preview)).length;
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : Number(course?.rating ?? 0);
  const progressByLesson = useMemo(() => {
    const map = new Map<number, LessonProgressRecord>();
    lessonProgress.forEach((entry) => {
      map.set(Number(entry.lesson_id), entry);
    });
    return map;
  }, [lessonProgress]);
  const myReview = useMemo(
    () => reviews.find((review) => user?.id && String(review.student_id) === String(user.id)) ?? null,
    [reviews, user?.id],
  );
  const canWriteReview = Boolean(
    user?.id &&
    (user.role === 'apprenant' || user.role === 'admin') &&
    existingEnrollment &&
    ((Number(existingEnrollment.progress ?? 0) > 0) || existingEnrollment.status === 'completed'),
  );
  const reviewGateMessage = !user?.id
    ? 'Connectez-vous avec un compte apprenant pour laisser un avis.'
    : (!existingEnrollment
      ? "Inscrivez-vous d’abord à cette formation pour publier un avis."
      : ((Number(existingEnrollment.progress ?? 0) <= 0 && existingEnrollment.status !== 'completed')
        ? 'Suivez au moins une leçon avant de publier un avis.'
        : null));

  const objectives = useMemo(() => {
    const items = [
      'Comprendre les fondamentaux utiles au terrain.',
      'Appliquer le contenu sur des cas concrets.',
      'Structurer une progression mesurable module par module.',
      'Finaliser un parcours exploitable dans un contexte professionnel.',
    ];
    if (course?.delivery_mode === 'hybrid') {
      items[1] = 'Alterner sessions en ligne et séquences en présentiel sur des cas concrets.';
    }
    if (course?.delivery_mode === 'onsite') {
      items[1] = 'Travailler en présentiel avec démonstrations et ateliers appliqués.';
    }
    return items;
  }, [course?.delivery_mode]);

  const requirements = useMemo(() => {
    const base = ['Motivation et disponibilité pour suivre le parcours.'];
    if (course?.delivery_mode !== 'onsite') {
      base.unshift('Connexion internet stable pour suivre les contenus à distance.');
    }
    if (course?.delivery_mode !== 'online') {
      base.push('Disponibilité pour les sessions planifiées en présentiel.');
    }
    return base;
  }, [course?.delivery_mode]);

  const openEnrollFlow = () => {
    if (!course) return;
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour vous inscrire à cette formation.');
      navigate('/auth/login', { state: { from: `/espace-numerique/formation/${course.id}` } });
      return;
    }
    if (user.role !== 'apprenant' && user.role !== 'admin') {
      toastError('Compte apprenant requis', 'Utilisez un compte apprenant pour suivre cette formation.');
      return;
    }
    if (existingEnrollment) {
      navigate('/espace-numerique/mon-apprentissage');
      return;
    }
    setShowEnrollModal(true);
  };

  const handleEnroll = async () => {
    if (!course || !user?.id) return;
    if (user.role !== 'apprenant' && user.role !== 'admin') return;

    setEnrolling(true);
    try {
      const { data, error } = await backendClient.from('course_enrollments').insert({
        course_id: course.id,
        student_id: user.id,
        student_name: `${user.firstName} ${user.lastName}`.trim(),
        student_email: user.email,
        progress: 0,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });

      if (error) {
        if (error.message?.includes('duplicate')) {
          toastError('Déjà inscrit', 'Vous êtes déjà inscrit à cette formation.');
          setExistingEnrollment({ id: Number((data as any)?.id ?? 0) || -1 });
          setShowEnrollModal(false);
          navigate('/espace-numerique/mon-apprentissage');
          return;
        }
        throw error;
      }

      if (course.instructor_id) {
        await notifyInstructorEnrollment(course.instructor_id, course.title);
      }

      success('Inscription réussie', `Vous êtes maintenant inscrit à "${course.title}".`);
      setExistingEnrollment({ id: Number((data as any)?.id ?? 0) || Date.now() });
      setShowEnrollModal(false);
      navigate('/espace-numerique/mon-apprentissage');
    } catch (err) {
      console.error(err);
      toastError('Erreur', 'Impossible de confirmer votre inscription pour le moment.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!course || !user?.id || !canWriteReview) return;
    const trimmedComment = reviewDraft.comment.trim();
    if (!trimmedComment) {
      toastError('Avis incomplet', 'Ajoutez un commentaire avant de publier votre avis.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const payload = {
        course_id: course.id,
        student_id: user.id,
        rating: reviewDraft.rating,
        comment: trimmedComment,
      };

      if (myReview) {
        const { data, error } = await backendClient.from('course_reviews').update(payload).eq('id', myReview.id);
        if (error) throw error;
        const updatedReview = (Array.isArray(data) ? data[0] : data) as CourseReview;
        setReviews((current) => current.map((entry) => (String(entry.id) === String(updatedReview.id) ? updatedReview : entry)));
        success('Avis mis à jour', 'Votre avis a été mis à jour.');
      } else {
        const { data, error } = await backendClient.from('course_reviews').insert(payload);
        if (error) throw error;
        const createdReview = (Array.isArray(data) ? data[0] : data) as CourseReview;
        setReviews((current) => [createdReview, ...current]);
        success('Avis publié', 'Votre avis est maintenant visible sur la formation.');
      }
    } catch (err) {
      console.error(err);
      toastError('Erreur', 'Impossible de publier cet avis pour le moment.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Formation non trouvée</h2>
          <Link to="/espace-numerique" className="text-teal-600 hover:text-teal-700">
            Retour aux formations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <img src={getCourseImage(course)} alt="" className="w-full h-full object-cover object-top" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/45"></div>

        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <Link to="/espace-numerique" className="inline-flex items-center space-x-2 text-sm text-gray-300 hover:text-white mb-6">
            <i className="ri-arrow-left-line"></i>
            <span>Retour aux formations</span>
          </Link>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-500 px-3 py-1 text-xs font-medium text-white sm:text-sm">
                  {course.category}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${getCourseBranchBadgeClass(course.program_branch)}`}>
                  {getCourseBranchLabel(course.program_branch)}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${getCourseDeliveryBadgeClass(course.delivery_mode)}`}>
                  <i className={getCourseDeliveryIcon(course.delivery_mode)}></i>
                  <span>{getCourseDeliveryLabel(course.delivery_mode)}</span>
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 sm:text-sm">
                  {normalizeCourseLevel(course.level)}
                </span>
              </div>

              <h1 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl">{course.title}</h1>
              <p className="mb-5 text-base text-gray-200 sm:mb-6 sm:text-lg">
                {course.description || 'Formation professionnelle de qualité pour développer vos compétences.'}
              </p>

              <div className="mb-5 flex flex-wrap items-center gap-4 sm:mb-6 sm:gap-6">
                <div className="flex items-center space-x-2">
                  <i className="ri-group-line text-base text-gray-300"></i>
                  <span className="text-sm text-gray-300">{course.students_count || 0} apprenants</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-time-line text-base text-gray-300"></i>
                  <span className="text-sm text-gray-300">{course.duration || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-book-line text-base text-gray-300"></i>
                  <span className="text-sm text-gray-300">{course.modules || 0} modules</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-play-list-line text-base text-gray-300"></i>
                  <span className="text-sm text-gray-300">{totalLessons} leçons</span>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white sm:h-12 sm:w-12">
                  <i className="ri-user-star-line text-xl"></i>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Formateur</div>
                  <div className="text-base font-medium">{course.instructor_name || 'Équipe pédagogique C2P'}</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl bg-white p-4 text-gray-900 shadow-xl sm:p-6">
                <div className="mb-4 aspect-video overflow-hidden rounded-lg">
                  <img src={getCourseImage(course)} alt={course.title} className="w-full h-full object-cover object-top" />
                </div>

                <div className="mb-4 text-2xl font-bold text-teal-600 sm:text-3xl">
                  {(course.current_price ?? course.price)
                    ? `${(course.current_price ?? course.price ?? 0).toLocaleString('fr-FR')} FCFA`
                    : 'Gratuit'}
                </div>

                <button
                  type="button"
                  onClick={openEnrollFlow}
                  className="mb-3 w-full rounded-lg bg-teal-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 sm:px-6 sm:text-base"
                >
                  {existingEnrollment ? 'Accéder à mon apprentissage' : 'S’inscrire maintenant'}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Branche</span>
                    <span className="font-medium">{getCourseBranchLabel(course.program_branch)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Format</span>
                    <span className="font-medium">{getCourseDeliveryLabel(course.delivery_mode)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Durée</span>
                    <span className="font-medium">{course.duration || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Modules</span>
                    <span className="font-medium">{course.modules || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Leçons d’aperçu</span>
                    <span className="font-medium">{previewLessons}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Certificat</span>
                    <span className="font-medium">Oui</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-40 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Navigation de la fiche formation">
            <button type="button" role="tab" id="course-tab-overview" aria-selected={activeTab === 'overview'} aria-controls="course-panel-overview" onClick={() => setActiveTab('overview')} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              Vue d’ensemble
            </button>
            <button type="button" role="tab" id="course-tab-curriculum" aria-selected={activeTab === 'curriculum'} aria-controls="course-panel-curriculum" onClick={() => setActiveTab('curriculum')} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'curriculum' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              Programme ({totalLessons} leçons)
            </button>
            <button type="button" role="tab" id="course-tab-reviews" aria-selected={activeTab === 'reviews'} aria-controls="course-panel-reviews" onClick={() => setActiveTab('reviews')} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reviews' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              Avis
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-8" role="tabpanel" id="course-panel-overview" aria-labelledby="course-tab-overview">
                <div>
                  <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">Description</h2>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {course.description || 'Cette formation vous donnera les compétences essentielles pour progresser avec une structure claire et des cas pratiques.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d7e6fb] bg-[#f8fbff] px-4 py-4">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getCourseBranchBadgeClass(course.program_branch)}`}>
                    {getCourseBranchLabel(course.program_branch)}
                  </span>
                  <p className="mt-3 text-sm leading-7 text-[#31445f]">
                    {getCourseBranchDescription(course.program_branch)}
                  </p>
                </div>

                <div>
                  <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">Ce que vous allez apprendre</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {objectives.map((objective) => (
                      <div key={objective} className="flex items-start space-x-3">
                        <i className="ri-check-line text-base text-teal-600 mt-0.5"></i>
                        <span className="text-sm text-gray-700">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">Prérequis</h2>
                  <ul className="space-y-2">
                    {requirements.map((requirement) => (
                      <li key={requirement} className="flex items-start space-x-3">
                        <i className="ri-checkbox-circle-line text-base text-gray-400 mt-0.5"></i>
                        <span className="text-sm text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-4" role="tabpanel" id="course-panel-curriculum" aria-labelledby="course-tab-curriculum">
                <h2 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Programme de la formation</h2>
                {curriculum.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
                    Le programme détaillé sera publié ici dès que le formateur aura finalisé les sections et les leçons.
                  </div>
                ) : (
                  curriculum.map((section) => (
                    <div key={section.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3.5 sm:px-6 sm:py-4">
                        <h3 className="text-base font-bold text-gray-900 sm:text-lg">{section.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {section.description || `${section.lessons.length} leçons dans ce module.`}
                        </p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {section.lessons.map((lesson) => {
                          const lessonState = progressByLesson.get(Number(lesson.id));
                          const lessonCompleted = Boolean(lessonState?.completed) || Number(lessonState?.progress ?? 0) >= 100;
                          return (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-6 sm:py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${lessonCompleted ? 'bg-green-50' : 'bg-teal-50'}`}>
                                <i className={`${lessonCompleted ? 'ri-checkbox-circle-fill text-green-600' : `${getTypeIcon(lesson.type)} text-teal-600`} text-base`}></i>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                                {lesson.description ? <p className="text-xs text-gray-500 mt-0.5">{lesson.description}</p> : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{lesson.duration || 'N/A'}</div>
                              {lessonState ? (
                                <div className="mt-1 text-[11px] font-medium text-gray-500">
                                  {lessonCompleted ? 'Terminée' : `${Math.round(Number(lessonState.progress || 0))}%`}
                                </div>
                              ) : null}
                              {lesson.is_preview ? (
                                <span className="inline-block mt-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                                  Aperçu
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6" role="tabpanel" id="course-panel-reviews" aria-labelledby="course-tab-reviews">
                <h2 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Avis des apprenants</h2>
                <div className="rounded-xl bg-gray-50 p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">{rating > 0 ? rating.toFixed(1) : '-'}</div>
                      <div className="flex items-center justify-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i key={star} className={`ri-star-fill text-base ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">{reviews.length} avis publiés</div>
                    </div>
                    <div className="max-w-lg text-sm text-gray-600 leading-7">
                      Les avis affichés ici proviennent des apprenants réellement inscrits au parcours.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{myReview ? 'Modifier votre avis' : 'Laisser un avis'}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {reviewGateMessage ?? 'Partagez un retour utile pour les prochains apprenants.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <label htmlFor="course-review-rating" className="grid gap-2 text-sm font-medium text-gray-700">
                      <span>Note</span>
                      <select
                        id="course-review-rating"
                        value={reviewDraft.rating}
                        disabled={!canWriteReview || reviewSubmitting}
                        onChange={(event) => setReviewDraft((current) => ({ ...current, rating: Number(event.target.value) }))}
                        className="c2p-input"
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>{value}/5</option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="course-review-comment" className="grid gap-2 text-sm font-medium text-gray-700">
                      <span>Commentaire</span>
                      <textarea
                        id="course-review-comment"
                        value={reviewDraft.comment}
                        disabled={!canWriteReview || reviewSubmitting}
                        onChange={(event) => setReviewDraft((current) => ({ ...current, comment: event.target.value }))}
                        rows={4}
                        className="c2p-input min-h-[120px] resize-y"
                        placeholder="Ce que ce parcours vous a apporté, ce qui pourrait être renforcé, le format, le rythme..."
                      />
                    </label>
                    <div>
                      <button
                        type="button"
                        disabled={!canWriteReview || reviewSubmitting}
                        onClick={handleReviewSubmit}
                        className="c2p-btn-primary w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {reviewSubmitting ? 'Publication...' : (myReview ? 'Mettre à jour mon avis' : 'Publier mon avis')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
                      Aucun avis publié pour cette formation pour le moment.
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{review.student_name}</p>
                              {user?.id && String(review.student_id) === String(user.id) ? (
                                <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-medium text-[#475569]">Vous</span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <i key={star} className={`ri-star-fill text-sm ${Number(review.rating) >= star ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-gray-700">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cadre de formation</h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <i className="ri-building-line mt-0.5 text-teal-600"></i>
                  <div>
                    <p className="font-medium text-gray-900">{getCourseBranchLabel(course.program_branch)}</p>
                    <p className="text-gray-600">{getCourseBranchDescription(course.program_branch)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className={`${getCourseDeliveryIcon(course.delivery_mode)} mt-0.5 text-teal-600`}></i>
                  <div>
                    <p className="font-medium text-gray-900">{getCourseDeliveryLabel(course.delivery_mode)}</p>
                    <p className="text-gray-600">
                      {course.delivery_mode === 'onsite'
                        ? 'Sessions animées en présentiel avec suivi C2P.'
                        : course.delivery_mode === 'hybrid'
                          ? 'Parcours mixte avec temps synchrone et séquences en autonomie.'
                          : 'Accès à distance avec contenus consultables et suivi progressif.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="ri-user-star-line mt-0.5 text-teal-600"></i>
                  <div>
                    <p className="font-medium text-gray-900">{course.instructor_name || 'Équipe pédagogique C2P'}</p>
                    <p className="text-gray-600">Animation du parcours et supervision des modules publiés.</p>
                  </div>
                </div>
                {relatedClasses.length > 0 ? (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="mb-3 text-sm font-semibold text-gray-900">Sessions liees</p>
                    <div className="space-y-3">
                      {relatedClasses.slice(0, 2).map((entry) => (
                        <Link
                          key={entry.id}
                          to={`/espace-numerique/classe-virtuelle/${entry.id}`}
                          className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">{entry.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(entry.class_date).toLocaleDateString('fr-FR')} • {entry.class_time}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnrollModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="course-enroll-title" className="w-full max-w-md rounded-xl bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between sm:mb-6">
              <h3 id="course-enroll-title" className="text-xl font-bold text-gray-900">Confirmer l’inscription</h3>
              <button type="button" aria-label="Fermer la confirmation d’inscription" onClick={() => setShowEnrollModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Formation</p>
                <p className="mt-1 font-semibold text-gray-900">{course.title}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Participant</span>
                <span className="font-medium text-gray-900">{`${user.firstName} ${user.lastName}`.trim()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Format</span>
                <span className="font-medium text-gray-900">{getCourseDeliveryLabel(course.delivery_mode)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tarif</span>
                <span className="font-semibold text-teal-700">
                  {(course.current_price ?? course.price)
                    ? `${(course.current_price ?? course.price ?? 0).toLocaleString('fr-FR')} FCFA`
                    : 'Gratuit'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnroll}
              disabled={enrolling}
              className="w-full px-6 py-3 bg-teal-600 text-white text-base font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {enrolling ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Inscription en cours...
                </span>
              ) : (
                'Confirmer l’inscription'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
