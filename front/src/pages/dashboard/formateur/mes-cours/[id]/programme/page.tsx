import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { SkeletonList } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  courseStatusClasses,
  courseStatusLabels,
  getCourseReadinessIssues,
  getInstructorWorkflowAction,
  type CourseWorkflowStatus,
} from '@/lib/courseWorkflow';
import {
  deleteFormateurCourseLesson,
  deleteFormateurCourseSection,
  deleteFormateurLessonAsset,
  fetchFormateurCourseProgram,
  reorderFormateurCourseLessons,
  reorderFormateurCourseSections,
  saveFormateurCourseLesson,
  saveFormateurCourseSection,
  saveFormateurLessonAsset,
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';
import { uploadFileToServer } from '@/lib/uploadApi';

type CourseStatus = CourseWorkflowStatus;
type ItemStatus = 'draft' | 'published';
type LessonType = 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
type AssetType = 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
type AssetStatus = 'processing' | 'ready';
type EntityId = string | number;

interface Course {
  id: EntityId;
  title: string;
  category: string;
  description: string | null;
  duration: string | null;
  thumbnail?: string | null;
  modules: number;
  lessons_count?: number;
  preview_lessons_count?: number;
  published_lessons_count?: number;
  status: CourseStatus;
  updated_at?: string;
}

interface CourseSection {
  id: EntityId;
  course_id: EntityId;
  title: string;
  description: string | null;
  position: number;
  status: ItemStatus;
  lessons_count?: number;
}

interface CourseLesson {
  id: EntityId;
  course_id: EntityId;
  section_id: EntityId;
  title: string;
  description: string | null;
  type: LessonType;
  duration: string | null;
  content?: string | null;
  code_language?: string | null;
  code_sample?: string | null;
  exercise_instructions?: string | null;
  position: number;
  is_preview: boolean;
  status: ItemStatus;
}

interface LessonAsset {
  id: EntityId;
  lesson_id: EntityId;
  section_id: EntityId;
  course_id: EntityId;
  title: string;
  asset_type: AssetType;
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  status: AssetStatus;
}

interface SectionFormState {
  title: string;
  description: string;
  status: ItemStatus;
}

interface LessonFormState {
  section_id: string;
  title: string;
  description: string;
  type: LessonType;
  duration: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: ItemStatus;
}

interface AssetFormState {
  lesson_id: string;
  title: string;
  asset_type: AssetType;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: string;
  status: AssetStatus;
}

type SectionFormErrors = Partial<Record<'title' | 'description', string>>;
type LessonFormErrors = Partial<Record<'section_id' | 'title' | 'description' | 'duration' | 'content' | 'code_sample' | 'exercise_instructions', string>>;
type AssetFormErrors = Partial<Record<'lesson_id' | 'title' | 'url' | 'thumbnail_url' | 'mime_type' | 'size_bytes', string>>;

const lessonTypeLabels: Record<LessonType, string> = {
  video: 'Vidéo',
  article: 'Article',
  pdf: 'PDF',
  quiz: 'Quiz',
  assignment: 'Devoir',
  live: 'Live',
  practice: 'Exercice pratique',
  coding: 'Coding challenge',
};

const assetTypeLabels: Record<AssetType, string> = {
  video: 'Vidéo',
  pdf: 'PDF',
  audio: 'Audio',
  archive: 'Archive',
  slides: 'Slides',
  link: 'Lien',
  code: 'Code',
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  review: 'En révision',
  published: 'Publié',
  rejected: 'Rejeté',
  archived: 'Archivé',
};

const statusClasses: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-200 text-gray-700',
};

const emptySectionForm = (): SectionFormState => ({
  title: '',
  description: '',
  status: 'draft',
});

const emptyLessonForm = (sectionId = ''): LessonFormState => ({
  section_id: sectionId,
  title: '',
  description: '',
  type: 'video',
  duration: '',
  content: '',
  code_language: 'markdown',
  code_sample: '',
  exercise_instructions: '',
  is_preview: false,
  status: 'draft',
});

const emptyAssetForm = (lessonId = ''): AssetFormState => ({
  lesson_id: lessonId,
  title: '',
  asset_type: 'link',
  url: '',
  thumbnail_url: '',
  mime_type: '',
  size_bytes: '',
  status: 'ready',
});

function formatBytes(value: number | null | undefined) {
  if (!value) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

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

function validateSectionForm(form: SectionFormState) {
  const errors: SectionFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Le titre de la section est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (form.description.length > 500) errors.description = 'La description ne peut pas dépasser 500 caractères.';
  return errors;
}

function validateLessonForm(form: LessonFormState, availableSectionIds: Set<string>) {
  const errors: LessonFormErrors = {};
  const title = form.title.trim();
  if (!String(form.section_id).trim()) errors.section_id = 'La section est obligatoire.';
  else if (!availableSectionIds.has(String(form.section_id))) errors.section_id = 'Sélectionnez une section valide.';
  if (!title) errors.title = 'Le titre de la leçon est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (form.description.length > 1000) errors.description = 'La description ne peut pas dépasser 1000 caractères.';
  if (form.duration.trim().length > 40) errors.duration = 'La durée est trop longue.';
  if (['article', 'practice', 'coding'].includes(form.type) && form.content.trim().length === 0) {
    errors.content = 'Ajoutez un contenu rédigé pour cette leçon.';
  }
  if (form.type === 'coding' && form.code_sample.trim().length === 0) {
    errors.code_sample = 'Ajoutez un extrait de code ou un énoncé technique.';
  }
  if (['assignment', 'practice'].includes(form.type) && form.exercise_instructions.trim().length === 0) {
    errors.exercise_instructions = 'Ajoutez les consignes de l’exercice.';
  }
  return errors;
}

function validateAssetForm(form: AssetFormState, availableLessonIds: Set<string>) {
  const errors: AssetFormErrors = {};
  const title = form.title.trim();
  const url = form.url.trim();
  const thumbnailUrl = form.thumbnail_url.trim();
  const sizeValue = form.size_bytes.trim();

  if (!String(form.lesson_id).trim()) errors.lesson_id = 'La leçon est obligatoire.';
  else if (!availableLessonIds.has(String(form.lesson_id))) errors.lesson_id = 'Sélectionnez une leçon valide.';
  if (!title) errors.title = 'Le titre du contenu est obligatoire.';
  else if (title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.';
  if (!url) errors.url = 'Ajoutez un lien ou importez un fichier.';
  else if (!isValidHttpUrl(url)) errors.url = 'L’URL du contenu doit être une URL http(s) valide.';
  if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl)) errors.thumbnail_url = 'La miniature doit être une URL http(s) valide.';
  if (sizeValue) {
    const size = Number(sizeValue);
    if (!Number.isFinite(size) || size < 0) errors.size_bytes = 'La taille doit être un nombre positif.';
  }
  return errors;
}

export default function FormateurCourseProgramPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const { gateFor } = useSubscriptionAccess(user);

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [assets, setAssets] = useState<LessonAsset[]>([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [editingAsset, setEditingAsset] = useState<LessonAsset | null>(null);
  const [activeAssetLesson, setActiveAssetLesson] = useState<CourseLesson | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm());
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm());
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm());
  const [isAssetUploading, setIsAssetUploading] = useState(false);
  const [assetUploadProgress, setAssetUploadProgress] = useState(0);
  const [sectionErrors, setSectionErrors] = useState<SectionFormErrors>({});
  const [lessonErrors, setLessonErrors] = useState<LessonFormErrors>({});
  const [assetErrors, setAssetErrors] = useState<AssetFormErrors>({});
  const [sectionFormMessage, setSectionFormMessage] = useState<string | null>(null);
  const [lessonFormMessage, setLessonFormMessage] = useState<string | null>(null);
  const [assetFormMessage, setAssetFormMessage] = useState<string | null>(null);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionGate = gateFor('trainer_courses_manage');

  const groupedSections = useMemo(() => {
    return [...sections]
      .sort((left, right) => left.position - right.position)
      .map((section) => ({
        ...section,
        lessons: lessons
          .filter((lesson) => String(lesson.section_id) === String(section.id))
          .sort((left, right) => left.position - right.position),
        assets: assets
          .filter((asset) => String(asset.section_id) === String(section.id))
          .sort((left, right) => left.position - right.position),
      }));
  }, [assets, lessons, sections]);

  const activeLessonAssets = useMemo(() => {
    if (!activeAssetLesson) return [];
    return assets
      .filter((asset) => String(asset.lesson_id) === String(activeAssetLesson.id))
      .sort((left, right) => left.position - right.position);
  }, [activeAssetLesson, assets]);

  const availableSectionIds = useMemo(() => new Set(groupedSections.map((section) => String(section.id))), [groupedSections]);
  const availableLessonIds = useMemo(() => new Set(lessons.map((lesson) => String(lesson.id))), [lessons]);

  const updateSectionForm = <K extends keyof SectionFormState>(field: K, value: SectionFormState[K]) => {
    setSectionForm((current) => ({ ...current, [field]: value }));
    setSectionErrors((current) => ({ ...current, [field]: undefined }));
    setSectionFormMessage(null);
  };

  const updateLessonForm = <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
    setLessonForm((current) => ({ ...current, [field]: value }));
    setLessonErrors((current) => ({ ...current, [field]: undefined }));
    setLessonFormMessage(null);
  };

  const updateAssetForm = <K extends keyof AssetFormState>(field: K, value: AssetFormState[K]) => {
    setAssetForm((current) => ({ ...current, [field]: value }));
    setAssetErrors((current) => ({ ...current, [field]: undefined }));
    setAssetFormMessage(null);
  };

  const fetchProgram = useCallback(async () => {
    if (!id || !user?.id) return;
    setLoading(true);
    try {
      const snapshot = await fetchFormateurCourseProgram(user.id, id);
      setCourse(snapshot.course as Course | null);
      setSections(snapshot.sections as CourseSection[]);
      setLessons(snapshot.lessons as CourseLesson[]);
      setAssets(snapshot.assets as LessonAsset[]);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de charger le programme.';
      error('Erreur', message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error, id, user?.id]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const openCreateSectionModal = () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingSection(null);
    setSectionForm(emptySectionForm());
    setSectionErrors({});
    setSectionFormMessage(null);
    setShowSectionModal(true);
  };

  const openEditSectionModal = (section: CourseSection) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      description: section.description ?? '',
      status: section.status,
    });
    setSectionErrors({});
    setSectionFormMessage(null);
    setShowSectionModal(true);
  };

  const openCreateLessonModal = (sectionId?: EntityId) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!groupedSections.length) {
      info('Programme requis', 'Créez d abord une section avant d ajouter une leçon.');
      return;
    }
    setEditingLesson(null);
    setLessonForm(emptyLessonForm(String(sectionId ?? groupedSections[0]?.id ?? '')));
    setLessonErrors({});
    setLessonFormMessage(null);
    setShowLessonModal(true);
  };

  const openEditLessonModal = (lesson: CourseLesson) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setEditingLesson(lesson);
    setLessonForm({
      section_id: String(lesson.section_id),
      title: lesson.title,
      description: lesson.description ?? '',
      type: lesson.type,
      duration: lesson.duration ?? '',
      content: lesson.content ?? '',
      code_language: lesson.code_language ?? 'markdown',
      code_sample: lesson.code_sample ?? '',
      exercise_instructions: lesson.exercise_instructions ?? '',
      is_preview: Boolean(lesson.is_preview),
      status: lesson.status,
    });
    setLessonErrors({});
    setLessonFormMessage(null);
    setShowLessonModal(true);
  };

  const openAssetModal = (lesson: CourseLesson) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setActiveAssetLesson(lesson);
    setEditingAsset(null);
    setAssetForm(emptyAssetForm(String(lesson.id)));
    setAssetErrors({});
    setAssetFormMessage(null);
    setShowAssetModal(true);
  };

  const openEditAsset = (asset: LessonAsset) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    const lesson = lessons.find((candidate) => String(candidate.id) === String(asset.lesson_id));
    if (!lesson) return;
    setActiveAssetLesson(lesson);
    setEditingAsset(asset);
    setAssetForm({
      lesson_id: String(asset.lesson_id),
      title: asset.title,
      asset_type: asset.asset_type,
      url: asset.url,
      thumbnail_url: asset.thumbnail_url ?? '',
      mime_type: asset.mime_type ?? '',
      size_bytes: asset.size_bytes ? String(asset.size_bytes) : '',
      status: asset.status,
    });
    setAssetErrors({});
    setAssetFormMessage(null);
    setShowAssetModal(true);
  };

  const submitSection = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!id || !course || !user?.id) return;
    const nextErrors = validateSectionForm(sectionForm);
    setSectionErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSectionFormMessage('Corrigez les champs signalés avant d’enregistrer la section.');
      return;
    }

    setIsSavingSection(true);
    try {
      await saveFormateurCourseSection(user.id, id, {
        id: editingSection?.id,
        title: sectionForm.title,
        description: sectionForm.description,
        status: sectionForm.status,
        position: editingSection?.position,
      });
      success(
        editingSection ? 'Section mise à jour' : 'Section créée',
        editingSection ? `La section "${sectionForm.title}" a été mise à jour.` : `La section "${sectionForm.title}" a été ajoutée à ${course.title}.`,
      );
      setShowSectionModal(false);
      setEditingSection(null);
      setSectionForm(emptySectionForm());
      setSectionErrors({});
      setSectionFormMessage(null);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible d enregistrer la section.';
      setSectionFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      setIsSavingSection(false);
    }
  };

  const submitLesson = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!id || !user?.id) return;
    const nextErrors = validateLessonForm(lessonForm, availableSectionIds);
    setLessonErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLessonFormMessage('Corrigez les champs signalés avant d’enregistrer la leçon.');
      return;
    }

    setIsSavingLesson(true);
    try {
      await saveFormateurCourseLesson(user.id, id, {
        id: editingLesson?.id,
        section_id: lessonForm.section_id,
        title: lessonForm.title,
        description: lessonForm.description,
        type: lessonForm.type,
        duration: lessonForm.duration,
        content: lessonForm.content,
        code_language: lessonForm.code_language,
        code_sample: lessonForm.code_sample,
        exercise_instructions: lessonForm.exercise_instructions,
        is_preview: lessonForm.is_preview,
        status: lessonForm.status,
        position: editingLesson?.position,
      });
      success(
        editingLesson ? 'Leçon mise à jour' : 'Leçon créée',
        editingLesson ? `La leçon "${lessonForm.title}" a été mise à jour.` : `La leçon "${lessonForm.title}" a été ajoutée au programme.`,
      );
      setShowLessonModal(false);
      setEditingLesson(null);
      setLessonForm(emptyLessonForm(groupedSections[0] ? String(groupedSections[0].id) : ''));
      setLessonErrors({});
      setLessonFormMessage(null);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible d enregistrer la leçon.';
      setLessonFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      setIsSavingLesson(false);
    }
  };

  const submitAsset = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (isAssetUploading) {
      setAssetFormMessage('Patientez jusqu’à la fin de l’upload avant d’enregistrer le contenu.');
      return;
    }
    const nextErrors = validateAssetForm(assetForm, availableLessonIds);
    setAssetErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setAssetFormMessage('Corrigez les champs signalés avant d’enregistrer le contenu.');
      return;
    }

    setIsSavingAsset(true);
    try {
      if (!id || !user?.id) throw new Error('Formation introuvable ou inaccessible.');
      await saveFormateurLessonAsset(user.id, id, {
        id: editingAsset?.id,
        lesson_id: assetForm.lesson_id,
        title: assetForm.title,
        asset_type: assetForm.asset_type,
        url: assetForm.url,
        thumbnail_url: assetForm.thumbnail_url,
        mime_type: assetForm.mime_type,
        size_bytes: assetForm.size_bytes,
        status: assetForm.status,
        position: editingAsset?.position,
      });
      success(
        editingAsset ? 'Contenu mis à jour' : 'Contenu ajouté',
        editingAsset ? `Le contenu "${assetForm.title}" a été mis à jour.` : `Le contenu "${assetForm.title}" a été attaché à la leçon.`,
      );
      setEditingAsset(null);
      setAssetForm(emptyAssetForm(activeAssetLesson ? String(activeAssetLesson.id) : ''));
      setAssetErrors({});
      setAssetFormMessage(null);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible d enregistrer le contenu.';
      setAssetFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      setIsSavingAsset(false);
    }
  };

  const deleteAsset = async (asset: LessonAsset) => {
    if (!id || !user?.id) return;
    if (!window.confirm(`Supprimer le contenu "${asset.title}" ?`)) return;
    try {
      await deleteFormateurLessonAsset(user.id, id, asset.id);
      success('Contenu supprimé', `"${asset.title}" a été retiré de la leçon.`);
      if (editingAsset && String(editingAsset.id) === String(asset.id)) {
        setEditingAsset(null);
        setAssetForm(emptyAssetForm(activeAssetLesson ? String(activeAssetLesson.id) : ''));
      }
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de supprimer le contenu.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const handleAssetFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id || !assetForm.lesson_id) return;

    if (assetForm.asset_type === 'link') {
      setAssetFormMessage('Les liens externes se saisissent directement, sans upload de fichier.');
      error('Type incompatible', 'Les liens externes se saisissent directement, sans upload de fichier.');
      event.target.value = '';
      return;
    }

    setIsAssetUploading(true);
    setAssetUploadProgress(0);
    try {
      const resourceType = assetForm.asset_type === 'video' ? 'video' : 'raw';
      const filename = `lesson-${assetForm.lesson_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uploaded = await uploadFileToServer(file, {
        folder: `c2p/courses/${id}/lessons/${assetForm.lesson_id}`,
        filename,
        resourceType,
        onProgress: setAssetUploadProgress,
      });

      setAssetForm((current) => ({
        ...current,
        url: uploaded.url,
        mime_type: file.type || current.mime_type,
        size_bytes: String(file.size),
        title: current.title || file.name,
        status: 'ready',
      }));
      setAssetErrors((current) => ({
        ...current,
        url: undefined,
        mime_type: undefined,
        size_bytes: undefined,
        title: undefined,
      }));
      setAssetFormMessage(null);
      success('Fichier importé', 'Le contenu a été téléversé et rattaché au formulaire.');
    } catch (err: unknown) {
      console.error(err);
      setAssetFormMessage('Impossible d envoyer le fichier.');
      error('Erreur d upload', 'Impossible d envoyer le fichier.');
    } finally {
      setIsAssetUploading(false);
      setAssetUploadProgress(0);
      event.target.value = '';
    }
  };

  const deleteSection = async (section: CourseSection) => {
    if (!id || !user?.id) return;
    if (!window.confirm(`Supprimer la section "${section.title}" et toutes ses leçons ?`)) return;
    try {
      await deleteFormateurCourseSection(user.id, id, section.id);
      success('Section supprimée', `"${section.title}" a été retirée du programme.`);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de supprimer la section.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const deleteLesson = async (lesson: CourseLesson) => {
    if (!id || !user?.id) return;
    if (!window.confirm(`Supprimer la leçon "${lesson.title}" ?`)) return;
    try {
      await deleteFormateurCourseLesson(user.id, id, lesson.id);
      success('Leçon supprimée', `"${lesson.title}" a été retirée du programme.`);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de supprimer la leçon.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const moveSection = async (sectionId: EntityId, direction: 'up' | 'down') => {
    if (!id || !user?.id) return;
    const orderedSections = [...groupedSections];
    const currentIndex = orderedSections.findIndex((section) => String(section.id) === String(sectionId));
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentSection = orderedSections[currentIndex];
    const targetSection = orderedSections[targetIndex];

    if (!currentSection || !targetSection) return;

    try {
      await reorderFormateurCourseSections(user.id, id, currentSection, targetSection);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de réordonner les sections.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const moveLesson = async (sectionId: EntityId, lessonId: EntityId, direction: 'up' | 'down') => {
    if (!id || !user?.id) return;
    const targetSection = groupedSections.find((section) => String(section.id) === String(sectionId));
    if (!targetSection) return;

    const orderedLessons = [...targetSection.lessons];
    const currentIndex = orderedLessons.findIndex((lesson) => String(lesson.id) === String(lessonId));
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentLesson = orderedLessons[currentIndex];
    const adjacentLesson = orderedLessons[targetIndex];

    if (!currentLesson || !adjacentLesson) return;

    try {
      await reorderFormateurCourseLessons(user.id, id, currentLesson, adjacentLesson);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de réordonner les leçons.';
      error('Erreur', message);
      console.error(err);
    }
  };

  const courseWorkflowAction = course ? getInstructorWorkflowAction(course.status) : null;
  const readinessIssues = useMemo(
    () =>
      course
        ? getCourseReadinessIssues({
            description: course.description,
            duration: course.duration,
            thumbnail: course.thumbnail ?? null,
            sectionCount: groupedSections.length,
            lessonCount: lessons.length,
          })
        : [],
    [course, groupedSections.length, lessons.length],
  );

  const handleCourseWorkflowAction = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!courseWorkflowAction || !course) return;

    const confirmed = window.confirm(
      course.status === 'draft'
        ? `Soumettre "${course.title}" en révision ?`
        : course.status === 'review'
          ? `Retirer "${course.title}" de la révision et revenir en brouillon ?`
          : course.status === 'published'
            ? `Archiver "${course.title}" pour la retirer du catalogue ?`
            : `Repasser "${course.title}" en brouillon ?`,
    );

    if (!confirmed) return;

    try {
      if (!user?.id) throw new Error('Formation introuvable ou inaccessible.');
      await updateFormateurCourseWorkflow(user.id, course.id, courseWorkflowAction.nextStatus);

      success('Statut mis à jour', `La formation est maintenant ${courseStatusLabels[courseWorkflowAction.nextStatus].toLowerCase()}.`);
      await fetchProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de changer le statut de la formation.';
      error('Transition impossible', message);
      console.error(err);
    }
  };

  const lessonCount = lessons.length;
  const previewCount = lessons.filter((lesson) => lesson.is_preview).length;
  const publishedCount = lessons.filter((lesson) => lesson.status === 'published').length;
  const assetCount = assets.length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Mes cours', path: '/dashboard/formateur/mes-cours' },
            { label: 'Programme' },
          ]}
        />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Programme de la formation</h1>
              {course?.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[course.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[course.status] ?? course.status}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              Structurez vos chapitres, ordonnez les leçons et préparez la publication.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/formateur/mes-cours"
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Retour aux formations
            </Link>
            {courseWorkflowAction && course && (
              <button
                onClick={() => void handleCourseWorkflowAction()}
                disabled={!subscriptionGate.allowed}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  course.status === 'published'
                    ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                    : course.status === 'review'
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {courseWorkflowAction.description}
              </button>
            )}
            <button
              onClick={() => openCreateLessonModal()}
              disabled={!groupedSections.length || !subscriptionGate.allowed}
              className="px-4 py-2.5 rounded-lg border border-teal-200 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter une leçon
            </button>
            <button
              onClick={openCreateSectionModal}
              disabled={!subscriptionGate.allowed}
              className="px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ajouter une section
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : !course ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Formation introuvable</h2>
            <p className="text-gray-600 mb-6">Cette formation n existe pas ou n est plus accessible.</p>
            <Link
              to="/dashboard/formateur/mes-cours"
              className="inline-flex px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Revenir à mes formations
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold mb-2">{course.category}</p>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h2>
                    <p className="text-sm text-gray-600 leading-6">{course.description || 'Ajoutez une description pour clarifier la promesse pédagogique de ce cours.'}</p>
                  </div>
                  <div className="min-w-[180px] text-sm text-gray-600 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span>Durée estimée</span>
                      <strong className="text-gray-900">{course.duration || 'Non définie'}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Sections</span>
                      <strong className="text-gray-900">{groupedSections.length}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Leçons</span>
                      <strong className="text-gray-900">{lessonCount}</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  {readinessIssues.length > 0
                    ? `Avant soumission, il manque ${readinessIssues.join(', ')}.`
                    : course.status === 'review'
                      ? 'Cette formation est actuellement en attente de validation admin.'
                      : course.status === 'published'
                        ? 'Cette formation est en ligne. Archivez-la si vous souhaitez la retirer du catalogue.'
                        : course.status === 'rejected'
                          ? 'Cette formation a été rejetée. Reprenez-la en brouillon pour la corriger.'
                          : course.status === 'archived'
                            ? 'Cette formation est archivée et n apparaît plus dans le catalogue.'
                            : 'Le programme est prêt pour une soumission en révision.'}
                </div>
              </div>

              <aside className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Vue d ensemble</h3>
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Structure</div>
                    <div className="text-lg font-semibold text-gray-900">{groupedSections.length} section{groupedSections.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Leçons publiées</div>
                    <div className="text-lg font-semibold text-gray-900">{publishedCount}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Leçons en aperçu</div>
                    <div className="text-lg font-semibold text-gray-900">{previewCount}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Contenus attachés</div>
                    <div className="text-lg font-semibold text-gray-900">{assetCount}</div>
                  </div>
                </div>
              </aside>
            </div>

            {groupedSections.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
                  <i className="ri-stack-line text-2xl text-teal-500"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Commencez par la structure</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-2xl mx-auto">
                  Ajoutez une première section, puis créez vos leçons vidéo, article, PDF, quiz, devoir, exercice pratique, coding challenge ou live.
                </p>
                <button
                  onClick={openCreateSectionModal}
                  disabled={!subscriptionGate.allowed}
                  className="px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Créer la première section
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedSections.map((section, sectionIndex) => (
                  <section key={section.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="border-b border-gray-200 px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Section {sectionIndex + 1}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[section.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {statusLabels[section.status] ?? section.status}
                            </span>
                            <span className="text-xs text-gray-500">{section.lessons.length} leçon{section.lessons.length > 1 ? 's' : ''}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
                          <p className="text-sm text-gray-600">{section.description || 'Aucune description pour cette section.'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            title="Monter la section"
                            onClick={() => moveSection(section.id, 'up')}
                            disabled={sectionIndex === 0}
                            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <i className="ri-arrow-up-line"></i>
                          </button>
                          <button
                            title="Descendre la section"
                            onClick={() => moveSection(section.id, 'down')}
                            disabled={sectionIndex === groupedSections.length - 1}
                            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <i className="ri-arrow-down-line"></i>
                          </button>
                          <button
                            title="Modifier la section"
                            onClick={() => openEditSectionModal(section)}
                            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            title="Supprimer la section"
                            onClick={() => deleteSection(section)}
                            className="w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                          <button
                            onClick={() => openCreateLessonModal(section.id)}
                            className="px-4 py-2 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                          >
                            Ajouter une leçon
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {section.lessons.length === 0 ? (
                        <div className="px-6 py-8 text-sm text-gray-500">Aucune leçon dans cette section.</div>
                      ) : (
                        section.lessons.map((lesson, lessonIndex) => {
                          const lessonAssets = assets
                            .filter((asset) => String(asset.lesson_id) === String(lesson.id))
                            .sort((left, right) => left.position - right.position);

                          return (
                          <div key={lesson.id} className="px-6 py-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                <i
                                  className={
                                    lesson.type === 'video'
                                      ? 'ri-video-line'
                                      : lesson.type === 'article'
                                        ? 'ri-file-text-line'
                                        : lesson.type === 'pdf'
                                          ? 'ri-file-pdf-line'
                                          : lesson.type === 'quiz'
                                            ? 'ri-questionnaire-line'
                                            : lesson.type === 'assignment'
                                              ? 'ri-task-line'
                                              : lesson.type === 'practice'
                                                ? 'ri-tools-line'
                                                : lesson.type === 'coding'
                                                  ? 'ri-code-s-slash-line'
                                                  : 'ri-live-line'
                                  }
                                ></i>
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{lesson.title}</span>
                                  <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                                    {lessonTypeLabels[lesson.type]}
                                  </span>
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusClasses[lesson.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {statusLabels[lesson.status] ?? lesson.status}
                                  </span>
                                  {lesson.is_preview && (
                                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                                      Aperçu
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{lesson.description || 'Aucune description pour cette leçon.'}</p>
                                <p className="text-xs text-gray-500">
                                  Position {lesson.position}
                                  {lesson.duration ? ` • ${lesson.duration}` : ''}
                                  {lessonAssets.length > 0 ? ` • ${lessonAssets.length} contenu${lessonAssets.length > 1 ? 's' : ''}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                title="Gérer les contenus"
                                onClick={() => openAssetModal(lesson)}
                                className="px-3 py-2 rounded-lg border border-teal-200 text-teal-700 text-xs font-medium hover:bg-teal-50 transition-colors"
                              >
                                Contenus
                              </button>
                              <button
                                title="Monter la leçon"
                                onClick={() => moveLesson(section.id, lesson.id, 'up')}
                                disabled={lessonIndex === 0}
                                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <i className="ri-arrow-up-line"></i>
                              </button>
                              <button
                                title="Descendre la leçon"
                                onClick={() => moveLesson(section.id, lesson.id, 'down')}
                                disabled={lessonIndex === section.lessons.length - 1}
                                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <i className="ri-arrow-down-line"></i>
                              </button>
                              <button
                                title="Modifier la leçon"
                                onClick={() => openEditLessonModal(lesson)}
                                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                title="Supprimer la leçon"
                                onClick={() => deleteLesson(lesson)}
                                className="w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </div>
                          {lessonAssets.length > 0 && (
                            <div className="ml-14 flex flex-wrap gap-2">
                              {lessonAssets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                                >
                                  <span className="font-medium text-gray-900">{asset.title}</span>
                                  <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-600">
                                    {assetTypeLabels[asset.asset_type]}
                                  </span>
                                  {asset.size_bytes ? <span>{formatBytes(asset.size_bytes)}</span> : null}
                                  <a
                                    href={asset.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-teal-700 hover:text-teal-800"
                                    title="Ouvrir le contenu"
                                  >
                                    <i className="ri-external-link-line"></i>
                                  </a>
                                  <button
                                    title="Modifier le contenu"
                                    onClick={() => openEditAsset(asset)}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </button>
                                  <button
                                    title="Supprimer le contenu"
                                    onClick={() => deleteAsset(asset)}
                                    className="text-red-500 hover:text-red-600 transition-colors"
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        );
                        })
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {showSectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {editingSection ? 'Modifier la section' : 'Nouvelle section'}
              </h3>
              {sectionFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {sectionFormMessage}
                </div>
              ) : null}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={sectionForm.title}
                    onChange={(event) => updateSectionForm('title', event.target.value)}
                    placeholder="Ex: Fondamentaux"
                    aria-invalid={Boolean(sectionErrors.title)}
                    className={getFieldClass(Boolean(sectionErrors.title))}
                  />
                  {sectionErrors.title ? <p className="mt-1 text-xs text-red-600">{sectionErrors.title}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={sectionForm.description}
                    onChange={(event) => updateSectionForm('description', event.target.value)}
                    placeholder="Objectif pédagogique de cette section"
                    aria-invalid={Boolean(sectionErrors.description)}
                    className={`${getFieldClass(Boolean(sectionErrors.description))} resize-none`}
                  />
                  {sectionErrors.description ? <p className="mt-1 text-xs text-red-600">{sectionErrors.description}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={sectionForm.status}
                    onChange={(event) => updateSectionForm('status', event.target.value as ItemStatus)}
                    className={getFieldClass(false)}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowSectionModal(false);
                    setEditingSection(null);
                    setSectionForm(emptySectionForm());
                    setSectionErrors({});
                    setSectionFormMessage(null);
                  }}
                  disabled={isSavingSection}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitSection}
                  disabled={isSavingSection}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingSection ? 'Enregistrement...' : editingSection ? 'Enregistrer' : 'Créer la section'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLessonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {editingLesson ? 'Modifier la leçon' : 'Nouvelle leçon'}
              </h3>
              {lessonFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {lessonFormMessage}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                    <select
                      value={lessonForm.section_id}
                      onChange={(event) => updateLessonForm('section_id', event.target.value)}
                      aria-invalid={Boolean(lessonErrors.section_id)}
                      className={getFieldClass(Boolean(lessonErrors.section_id))}
                    >
                      <option value="">Sélectionner une section</option>
                      {groupedSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                    {lessonErrors.section_id ? <p className="mt-1 text-xs text-red-600">{lessonErrors.section_id}</p> : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(event) => updateLessonForm('title', event.target.value)}
                      placeholder="Ex: Introduction vidéo"
                      aria-invalid={Boolean(lessonErrors.title)}
                      className={getFieldClass(Boolean(lessonErrors.title))}
                    />
                    {lessonErrors.title ? <p className="mt-1 text-xs text-red-600">{lessonErrors.title}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={lessonForm.type}
                      onChange={(event) => updateLessonForm('type', event.target.value as LessonType)}
                      className={getFieldClass(false)}
                    >
                      {Object.entries(lessonTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                    <input
                      type="text"
                      value={lessonForm.duration}
                      onChange={(event) => updateLessonForm('duration', event.target.value)}
                      placeholder="Ex: 12 min"
                      aria-invalid={Boolean(lessonErrors.duration)}
                      className={getFieldClass(Boolean(lessonErrors.duration))}
                    />
                    {lessonErrors.duration ? <p className="mt-1 text-xs text-red-600">{lessonErrors.duration}</p> : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={4}
                      value={lessonForm.description}
                      onChange={(event) => updateLessonForm('description', event.target.value)}
                      placeholder="Résumé de la leçon, consignes ou objectifs"
                      aria-invalid={Boolean(lessonErrors.description)}
                      className={`${getFieldClass(Boolean(lessonErrors.description))} resize-none`}
                    />
                    {lessonErrors.description ? <p className="mt-1 text-xs text-red-600">{lessonErrors.description}</p> : null}
                  </div>

                  {['article', 'practice', 'coding'].includes(lessonForm.type) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenu riche / Markdown</label>
                      <textarea
                        rows={10}
                        value={lessonForm.content}
                        onChange={(event) => updateLessonForm('content', event.target.value)}
                        placeholder="# Titre&#10;&#10;Structure, étapes, ressources..."
                        aria-invalid={Boolean(lessonErrors.content)}
                        className={`${getFieldClass(Boolean(lessonErrors.content))} resize-y font-mono`}
                      />
                      {lessonErrors.content ? <p className="mt-1 text-xs text-red-600">{lessonErrors.content}</p> : null}
                    </div>
                  )}

                  {lessonForm.type === 'coding' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Langage</label>
                        <input
                          type="text"
                          value={lessonForm.code_language}
                          onChange={(event) => updateLessonForm('code_language', event.target.value)}
                          placeholder="typescript"
                          className={getFieldClass(false)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code / énoncé technique</label>
                        <textarea
                          rows={8}
                          value={lessonForm.code_sample}
                          onChange={(event) => updateLessonForm('code_sample', event.target.value)}
                          placeholder="function solve() { ... }"
                          aria-invalid={Boolean(lessonErrors.code_sample)}
                          className={`${getFieldClass(Boolean(lessonErrors.code_sample))} resize-y font-mono`}
                        />
                        {lessonErrors.code_sample ? <p className="mt-1 text-xs text-red-600">{lessonErrors.code_sample}</p> : null}
                      </div>
                    </>
                  )}

                  {['assignment', 'practice'].includes(lessonForm.type) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Consignes de l’exercice</label>
                      <textarea
                        rows={6}
                        value={lessonForm.exercise_instructions}
                        onChange={(event) => updateLessonForm('exercise_instructions', event.target.value)}
                        placeholder="Livrable attendu, critères d’évaluation et temps conseillé."
                        aria-invalid={Boolean(lessonErrors.exercise_instructions)}
                        className={`${getFieldClass(Boolean(lessonErrors.exercise_instructions))} resize-y`}
                      />
                      {lessonErrors.exercise_instructions ? <p className="mt-1 text-xs text-red-600">{lessonErrors.exercise_instructions}</p> : null}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={lessonForm.status}
                      onChange={(event) => updateLessonForm('status', event.target.value as ItemStatus)}
                      className={getFieldClass(false)}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="published">Publié</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 mt-6 md:mt-0">
                    <input
                      type="checkbox"
                      checked={lessonForm.is_preview}
                      onChange={(event) => updateLessonForm('is_preview', event.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    Disponible en aperçu
                  </label>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 h-fit">
                  <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Aperçu éditeur</div>
                  <h4 className="text-lg font-semibold text-gray-900">{lessonForm.title || 'Titre de la leçon'}</h4>
                  <p className="mt-2 text-sm text-gray-600">{lessonForm.description || 'Le résumé de la leçon apparaîtra ici.'}</p>
                  {lessonForm.content ? (
                    <div className="mt-4 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
                      {lessonForm.content}
                    </div>
                  ) : null}
                  {lessonForm.code_sample ? (
                    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-[#0f172a]">
                      <div className="border-b border-slate-700 px-4 py-2 text-xs uppercase tracking-wide text-slate-300">
                        {lessonForm.code_language || 'code'}
                      </div>
                      <pre className="overflow-x-auto p-4 text-xs text-emerald-200">
                        <code>{lessonForm.code_sample}</code>
                      </pre>
                    </div>
                  ) : null}
                  {lessonForm.exercise_instructions ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {lessonForm.exercise_instructions}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowLessonModal(false);
                    setEditingLesson(null);
                    setLessonForm(emptyLessonForm(groupedSections[0] ? String(groupedSections[0].id) : ''));
                    setLessonErrors({});
                    setLessonFormMessage(null);
                  }}
                  disabled={isSavingLesson}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitLesson}
                  disabled={isSavingLesson}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingLesson ? 'Enregistrement...' : editingLesson ? 'Enregistrer' : 'Créer la leçon'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssetModal && activeAssetLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Contenus de la leçon</h3>
                  <p className="text-sm text-gray-600">
                    {activeAssetLesson.title} • {lessonTypeLabels[activeAssetLesson.type]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAsset(null);
                      setAssetForm(emptyAssetForm(String(activeAssetLesson.id)));
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Nouveau contenu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssetModal(false);
                      setEditingAsset(null);
                      setActiveAssetLesson(null);
                      setAssetForm(emptyAssetForm());
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                <div className="space-y-3">
                  {activeLessonAssets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                      Aucun contenu rattaché à cette leçon pour le moment.
                    </div>
                  ) : (
                    activeLessonAssets.map((asset) => (
                      <div key={asset.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-900">{asset.title}</span>
                              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                {assetTypeLabels[asset.asset_type]}
                              </span>
                              <span className={`rounded-md px-2 py-1 text-xs font-medium ${asset.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {asset.status === 'ready' ? 'Prêt' : 'Traitement'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 break-all">{asset.url}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Position {asset.position}
                              {asset.mime_type ? ` • ${asset.mime_type}` : ''}
                              {asset.size_bytes ? ` • ${formatBytes(asset.size_bytes)}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-lg border border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-50 transition-colors"
                            >
                              Ouvrir
                            </a>
                            <button
                              type="button"
                              onClick={() => openEditAsset(asset)}
                              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              title="Modifier le contenu"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAsset(asset)}
                              className="w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              title="Supprimer le contenu"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-5 h-fit">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">
                    {editingAsset ? 'Modifier le contenu' : 'Ajouter un contenu'}
                  </h4>
                  {assetFormMessage ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {assetFormMessage}
                    </div>
                  ) : null}

                  <input
                    ref={assetFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAssetFileChange}
                    accept={assetForm.asset_type === 'video' ? 'video/*' : undefined}
                  />

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                      <input
                        type="text"
                        value={assetForm.title}
                        onChange={(event) => updateAssetForm('title', event.target.value)}
                        placeholder="Ex: Support PDF du module"
                        aria-invalid={Boolean(assetErrors.title)}
                        className={getFieldClass(Boolean(assetErrors.title))}
                      />
                      {assetErrors.title ? <p className="mt-1 text-xs text-red-600">{assetErrors.title}</p> : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={assetForm.asset_type}
                        onChange={(event) => updateAssetForm('asset_type', event.target.value as AssetType)}
                        className={getFieldClass(false)}
                      >
                        {Object.entries(assetTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => assetFileInputRef.current?.click()}
                        disabled={isAssetUploading || isSavingAsset || assetForm.asset_type === 'link'}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAssetUploading ? `Envoi ${assetUploadProgress}%` : 'Importer un fichier'}
                      </button>
                      {assetForm.asset_type === 'link' && (
                        <p className="text-xs text-gray-500 self-center">Les liens externes se saisissent directement dans l URL.</p>
                      )}
                    </div>

                    {isAssetUploading ? (
                      <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-medium text-teal-700">
                          <span>Upload du contenu en cours</span>
                          <span>{assetUploadProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${assetUploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                      <input
                        type="url"
                        value={assetForm.url}
                        onChange={(event) => updateAssetForm('url', event.target.value)}
                        placeholder="https://..."
                        aria-invalid={Boolean(assetErrors.url)}
                        className={getFieldClass(Boolean(assetErrors.url))}
                      />
                      {assetErrors.url ? <p className="mt-1 text-xs text-red-600">{assetErrors.url}</p> : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Miniature</label>
                      <input
                        type="url"
                        value={assetForm.thumbnail_url}
                        onChange={(event) => updateAssetForm('thumbnail_url', event.target.value)}
                        placeholder="https://... (optionnel)"
                        aria-invalid={Boolean(assetErrors.thumbnail_url)}
                        className={getFieldClass(Boolean(assetErrors.thumbnail_url))}
                      />
                      {assetErrors.thumbnail_url ? <p className="mt-1 text-xs text-red-600">{assetErrors.thumbnail_url}</p> : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">MIME type</label>
                        <input
                          type="text"
                          value={assetForm.mime_type}
                          onChange={(event) => updateAssetForm('mime_type', event.target.value)}
                          placeholder="application/pdf"
                          className={getFieldClass(false)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taille (octets)</label>
                        <input
                          type="number"
                          min={0}
                          value={assetForm.size_bytes}
                          onChange={(event) => updateAssetForm('size_bytes', event.target.value)}
                          placeholder="Optionnel"
                          aria-invalid={Boolean(assetErrors.size_bytes)}
                          className={getFieldClass(Boolean(assetErrors.size_bytes))}
                        />
                        {assetErrors.size_bytes ? <p className="mt-1 text-xs text-red-600">{assetErrors.size_bytes}</p> : null}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select
                        value={assetForm.status}
                        onChange={(event) => updateAssetForm('status', event.target.value as AssetStatus)}
                        className={getFieldClass(false)}
                      >
                        <option value="ready">Prêt</option>
                        <option value="processing">Traitement</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAsset(null);
                        setAssetForm(emptyAssetForm(String(activeAssetLesson.id)));
                        setAssetErrors({});
                        setAssetFormMessage(null);
                      }}
                      disabled={isSavingAsset || isAssetUploading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Réinitialiser
                    </button>
                    <button
                      type="button"
                      onClick={submitAsset}
                      disabled={isSavingAsset || isAssetUploading}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAssetUploading ? 'Upload...' : isSavingAsset ? 'Enregistrement...' : editingAsset ? 'Enregistrer' : 'Créer le contenu'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
