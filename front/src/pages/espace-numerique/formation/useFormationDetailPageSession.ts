import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  fetchEspaceCourseContext,
  fetchEspaceCourseDetail,
  publishEspaceCourseReview,
} from '@/lib/espaceNumeriqueApi';
import {
  readMetadataList,
  isPaidCourse,
  type Course,
  type CourseLesson,
  type CourseReview,
  type CourseSection,
  type FormationDetailTab,
  type EnrollmentRecord,
  type LessonProgressRecord,
  type RelatedVirtualClass,
} from './formationDetailModel';

export function useFormationDetailPageSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<FormationDetailTab>('overview');
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
    const courseId = String(id ?? '').trim();
    if (!courseId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [snapshot, context] = await Promise.all([
          fetchEspaceCourseDetail(courseId),
          user?.id
            ? fetchEspaceCourseContext(courseId).catch(() => ({ enrollment: null, lessonProgress: [] }))
            : Promise.resolve({ enrollment: null, lessonProgress: [] }),
        ]);

        setCourse((snapshot.course as Course | null) || null);
        setSections((snapshot.sections as CourseSection[]) || []);
        setLessons((snapshot.lessons as CourseLesson[]) || []);
        setExistingEnrollment((context.enrollment as EnrollmentRecord | null) || null);
        setLessonProgress((context.lessonProgress as LessonProgressRecord[]) || []);
        setReviews((snapshot.reviews as CourseReview[]) || []);
        setRelatedClasses((snapshot.virtualClasses as RelatedVirtualClass[]) || []);

        const myPublishedReview = snapshot.reviews.find((review) => user?.id && String(review.student_id) === String(user.id));
        setReviewDraft(myPublishedReview
          ? { rating: Number(myPublishedReview.rating || 5), comment: myPublishedReview.comment || '' }
          : { rating: 5, comment: '' });
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
    const metadataObjectives = readMetadataList(course?.objectives ?? course?.metadata?.learning_objectives);
    if (metadataObjectives.length > 0) return metadataObjectives;
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
  }, [course?.delivery_mode, course?.metadata?.learning_objectives, course?.objectives]);

  const requirements = useMemo(() => {
    const metadataPrerequisites = readMetadataList(course?.prerequisites ?? course?.metadata?.prerequisites);
    if (metadataPrerequisites.length > 0) return metadataPrerequisites;
    const base = ['Motivation et disponibilité pour suivre le parcours.'];
    if (course?.delivery_mode !== 'onsite') {
      base.unshift('Connexion internet stable pour suivre les contenus à distance.');
    }
    if (course?.delivery_mode !== 'online') {
      base.push('Disponibilité pour les sessions planifiées en présentiel.');
    }
    return base;
  }, [course?.delivery_mode, course?.metadata?.prerequisites, course?.prerequisites]);

  const tools = useMemo(
    () => readMetadataList(course?.tools ?? course?.metadata?.tools),
    [course?.metadata?.tools, course?.tools],
  );

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
    navigate(`/paiement?type=formation&course=${encodeURIComponent(String(course.id))}&returnTo=${encodeURIComponent(`/espace-numerique/formation/${course.id}`)}`);
  };

  const handleEnroll = async () => {
    openEnrollFlow();
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
      const savedReview = await publishEspaceCourseReview(course.id, {
        rating: reviewDraft.rating,
        comment: trimmedComment,
      });

      if (myReview) {
        const updatedReview = savedReview as CourseReview;
        setReviews((current) => current.map((entry) => (String(entry.id) === String(updatedReview.id) ? updatedReview : entry)));
        success('Avis mis à jour', 'Votre avis a été mis à jour.');
      } else {
        const createdReview = savedReview as CourseReview;
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

  return {
    activeTab,
    canWriteReview,
    course,
    curriculum,
    enrolling,
    existingEnrollment,
    handleEnroll,
    handleReviewSubmit,
    loading,
    myReview,
    objectives,
    openEnrollFlow,
    previewLessons,
    progressByLesson,
    rating,
    relatedClasses,
    requirements,
    reviewDraft,
    reviewGateMessage,
    reviewSubmitting,
    reviews,
    setActiveTab,
    setReviewDraft,
    tools,
    totalLessons,
    user,
  };
}
