import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import ImageUploadField from '@/components/base/ImageUploadField';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';
import {
  fetchUploadStrategy,
  uploadFileToServer,
  uploadVideoToServer,
  type UploadStrategyPayload,
} from '@/lib/uploadApi';

type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
type LessonType = 'video' | 'article' | 'pdf' | 'quiz' | 'assignment' | 'live' | 'practice' | 'coding';
type AssetType = 'video' | 'pdf' | 'audio' | 'archive' | 'slides' | 'link' | 'code';
type ExamType = 'quiz' | 'assignment' | 'project';
type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

interface CourseCreationWizardProps {
  open: boolean;
  userId?: string | null;
  onClose: () => void;
  onCreated: (payload: { id: string | number; title: string }) => Promise<void> | void;
}

interface CourseBasicsDraft {
  title: string;
  category: string;
  description: string;
  level: CourseLevel;
  duration: string;
  is_free: boolean;
  price: number;
  promotion_percentage: number;
  thumbnail: string;
  trailer_url: string;
}

interface LessonDraft {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  description: string;
  content: string;
  code_language: string;
  code_sample: string;
  exercise_instructions: string;
  is_preview: boolean;
  status: 'draft' | 'published';
  position: number;
}

interface SectionDraft {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  position: number;
  lessons: LessonDraft[];
}

interface AssetDraft {
  id: string;
  lessonId: string;
  lessonTitle: string;
  asset_type: AssetType;
  title: string;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  size_bytes: number | null;
  status: 'processing' | 'ready';
  queueStatus: 'queued' | 'uploading' | 'ready' | 'error';
  progress: number;
  errorMessage: string | null;
}

interface QuestionChoiceDraft {
  id: string;
  label: string;
  value: string;
  is_correct: boolean;
}

interface QuestionDraft {
  id: string;
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
  choices: QuestionChoiceDraft[];
}

interface ExamDraft {
  id: string;
  title: string;
  type: ExamType;
  exam_date: string;
  participants: number;
  max_grade: number;
  timer_minutes: number;
  auto_correction: boolean;
  question_bank: boolean;
  ai_generation: boolean;
  anti_cheat: boolean;
  questions: QuestionDraft[];
}

interface WizardDraftState {
  draftId: string;
  step: number;
  course: CourseBasicsDraft;
  sections: SectionDraft[];
  assets: AssetDraft[];
  exams: ExamDraft[];
  selectedLessonId: string;
  selectedExamId: string;
}

type CourseFieldErrors = Partial<Record<
  'title' | 'category' | 'description' | 'level' | 'duration' | 'price' | 'promotion_percentage' | 'thumbnail' | 'trailer_url',
  string
>>;

const STEP_LABELS = [
  'Fondations',
  'Contenus',
  'Leçons',
  'Quiz',
] as const;

const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all_levels: 'Tous niveaux',
};

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: 'Leçon vidéo',
  article: 'Article',
  pdf: 'PDF',
  quiz: 'Quiz',
  assignment: 'Devoir',
  live: 'Live session',
  practice: 'Exercice pratique',
  coding: 'Coding challenge',
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  video: 'Vidéo',
  pdf: 'PDF',
  audio: 'Audio',
  archive: 'ZIP',
  slides: 'Slides',
  link: 'Lien externe',
  code: 'Fichier de code',
};

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  quiz: 'Quiz',
  assignment: 'Devoir',
  project: 'Projet',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiples',
  true_false: 'Vrai / Faux',
  open: 'Réponse ouverte',
};

const LEGACY_DRAFT_KEY_PREFIX = 'c2p:trainer-course-draft:';

function createLocalId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

function makeChoiceDraft(label = '', value = '', isCorrect = false): QuestionChoiceDraft {
  return {
    id: createLocalId('choice'),
    label,
    value,
    is_correct: isCorrect,
  };
}

function makeQuestionDraft(type: QuestionType = 'single_choice'): QuestionDraft {
  return {
    id: createLocalId('question'),
    prompt: '',
    type,
    points: 10,
    explanation: '',
    required: true,
    choices: type === 'open'
      ? []
      : type === 'true_false'
        ? [makeChoiceDraft('Vrai', 'true'), makeChoiceDraft('Faux', 'false')]
        : [makeChoiceDraft()],
  };
}

function makeLessonDraft(position: number, overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    id: createLocalId('lesson'),
    title: `Leçon ${position}`,
    type: 'video',
    duration: '',
    description: '',
    content: '',
    code_language: 'markdown',
    code_sample: '',
    exercise_instructions: '',
    is_preview: false,
    status: 'draft',
    position,
    ...overrides,
  };
}

function makeSectionDraft(position: number, overrides: Partial<SectionDraft> = {}): SectionDraft {
  return {
    id: createLocalId('section'),
    title: `Chapitre ${position}`,
    description: '',
    status: 'draft',
    position,
    lessons: [makeLessonDraft(1)],
    ...overrides,
  };
}

function makeExamDraft(): ExamDraft {
  return {
    id: createLocalId('exam'),
    title: '',
    type: 'quiz',
    exam_date: '',
    participants: 0,
    max_grade: 20,
    timer_minutes: 30,
    auto_correction: true,
    question_bank: false,
    ai_generation: false,
    anti_cheat: false,
    questions: [makeQuestionDraft()],
  };
}

function makeDefaultCourseBasics(): CourseBasicsDraft {
  return {
    title: '',
    category: '',
    description: '',
    level: 'intermediate',
    duration: '1h',
    is_free: false,
    price: 0,
    promotion_percentage: 0,
    thumbnail: '',
    trailer_url: '',
  };
}

function makeDefaultWizardState(): WizardDraftState {
  const firstSection = makeSectionDraft(1);
  const firstLesson = firstSection.lessons[0];
  const firstExam = makeExamDraft();

  return {
    draftId: createLocalId('course-wizard'),
    step: 1,
    course: makeDefaultCourseBasics(),
    sections: [firstSection],
    assets: [],
    exams: [firstExam],
    selectedLessonId: firstLesson.id,
    selectedExamId: firstExam.id,
  };
}

export function getWizardStorageKey(userId: string) {
  return `c2p:trainer-course-wizard:${userId}`;
}

function getFieldClass(hasError?: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-teal-500'
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

function formatTime(value: Date) {
  return value.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeSections(sections: SectionDraft[]) {
  return sections.map((section, sectionIndex) => ({
    ...section,
    position: sectionIndex + 1,
    lessons: section.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      position: lessonIndex + 1,
    })),
  }));
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function validateCourseBasics(course: CourseBasicsDraft) {
  const errors: CourseFieldErrors = {};
  if (!course.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  } else if (course.title.trim().length < 3) {
    errors.title = 'Le titre doit contenir au moins 3 caractères.';
  }

  if (!course.category.trim()) {
    errors.category = 'La catégorie est obligatoire.';
  } else if (course.category.trim().length < 2) {
    errors.category = 'La catégorie doit contenir au moins 2 caractères.';
  }

  if (course.description.trim().length > 500) {
    errors.description = 'La description ne peut pas dépasser 500 caractères.';
  }

  if (!course.duration.trim()) {
    errors.duration = 'La durée estimée est obligatoire.';
  }

  if (!course.is_free && (!Number.isFinite(course.price) || course.price <= 0)) {
    errors.price = 'Renseignez un prix supérieur à 0 pour une formation payante.';
  }

  if (!Number.isFinite(course.promotion_percentage) || course.promotion_percentage < 0 || course.promotion_percentage > 100) {
    errors.promotion_percentage = 'La promotion doit être comprise entre 0 et 100%.';
  }

  if (course.thumbnail.trim() && !isValidHttpUrl(course.thumbnail.trim())) {
    errors.thumbnail = 'La couverture doit être une URL http(s) valide.';
  }

  if (course.trailer_url.trim() && !isValidHttpUrl(course.trailer_url.trim())) {
    errors.trailer_url = 'La bande-annonce doit être une URL http(s) valide.';
  }

  return errors;
}

function validateStructure(sections: SectionDraft[]) {
  if (sections.length === 0) {
    return 'Ajoutez au moins un chapitre.';
  }

  for (const section of sections) {
    if (!section.title.trim()) {
      return 'Chaque chapitre doit avoir un titre.';
    }
    if (section.lessons.length === 0) {
      return `Ajoutez au moins une leçon dans "${section.title}".`;
    }
    for (const lesson of section.lessons) {
      if (!lesson.title.trim()) {
        return `Chaque leçon de "${section.title}" doit avoir un titre.`;
      }
    }
  }

  return null;
}

function validateLessonEditors(sections: SectionDraft[]) {
  for (const section of sections) {
    for (const lesson of section.lessons) {
      if (['article', 'practice', 'coding'].includes(lesson.type) && !lesson.content.trim()) {
        return `Ajoutez un contenu rédigé pour "${lesson.title}".`;
      }
      if (lesson.type === 'coding' && !lesson.code_sample.trim()) {
        return `Ajoutez un exemple de code pour "${lesson.title}".`;
      }
      if (['assignment', 'practice'].includes(lesson.type) && !lesson.exercise_instructions.trim()) {
        return `Ajoutez les consignes pour "${lesson.title}".`;
      }
    }
  }
  return null;
}

function validateExams(exams: ExamDraft[]) {
  for (const exam of exams) {
    if (!exam.title.trim()) {
      return 'Chaque évaluation doit avoir un titre.';
    }
    if (!exam.exam_date.trim()) {
      return `Ajoutez une date pour "${exam.title}".`;
    }
    if (!Number.isFinite(exam.max_grade) || exam.max_grade < 1 || exam.max_grade > 100) {
      return `La note maximale de "${exam.title}" doit être comprise entre 1 et 100.`;
    }
    for (const question of exam.questions) {
      if (!question.prompt.trim()) {
        return `Chaque question de "${exam.title}" doit avoir un intitulé.`;
      }
      if (question.type !== 'open') {
        if (question.choices.length === 0) {
          return `Ajoutez des choix pour "${question.prompt}".`;
        }
        if (!question.choices.some((choice) => choice.is_correct)) {
          return `Sélectionnez au moins une bonne réponse pour "${question.prompt}".`;
        }
      }
    }
  }
  return null;
}

export default function CourseCreationWizard({
  open,
  userId,
  onClose,
  onCreated,
}: CourseCreationWizardProps) {
  const { success, error, info } = useToast();
  const [wizard, setWizard] = useState<WizardDraftState>(makeDefaultWizardState());
  const [courseErrors, setCourseErrors] = useState<CourseFieldErrors>({});
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [savingDraftAt, setSavingDraftAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStrategy, setUploadStrategy] = useState<UploadStrategyPayload | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [isTrailerUploading, setIsTrailerUploading] = useState(false);
  const [trailerUploadProgress, setTrailerUploadProgress] = useState(0);
  const [pendingAssetType, setPendingAssetType] = useState<AssetType>('video');
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragLessonPayload, setDragLessonPayload] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);

  const selectedLesson = useMemo(
    () => wizard.sections.flatMap((section) => section.lessons).find((lesson) => lesson.id === wizard.selectedLessonId) ?? null,
    [wizard.sections, wizard.selectedLessonId],
  );

  const selectedExam = useMemo(
    () => wizard.exams.find((exam) => exam.id === wizard.selectedExamId) ?? null,
    [wizard.exams, wizard.selectedExamId],
  );

  const lessonOptions = useMemo(
    () => wizard.sections.flatMap((section) => section.lessons.map((lesson) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    }))),
    [wizard.sections],
  );

  const uploadedAssetsCount = wizard.assets.filter((asset) => asset.queueStatus === 'ready').length;
  const pendingUploadsCount = wizard.assets.filter((asset) => asset.queueStatus === 'queued' || asset.queueStatus === 'uploading').length;
  const hasUploadErrors = wizard.assets.some((asset) => asset.queueStatus === 'error');

  useEffect(() => {
    if (!open || !userId) return;

    const storageKey = getWizardStorageKey(userId);
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WizardDraftState;
        setWizard({
          ...makeDefaultWizardState(),
          ...parsed,
          sections: normalizeSections(parsed.sections ?? makeDefaultWizardState().sections),
          exams: parsed.exams?.length ? parsed.exams : makeDefaultWizardState().exams,
          selectedLessonId: parsed.selectedLessonId || parsed.sections?.[0]?.lessons?.[0]?.id || makeDefaultWizardState().selectedLessonId,
          selectedExamId: parsed.selectedExamId || parsed.exams?.[0]?.id || makeDefaultWizardState().selectedExamId,
        });
      } catch {
        setWizard(makeDefaultWizardState());
      }
    } else {
      const legacy = window.localStorage.getItem(`${LEGACY_DRAFT_KEY_PREFIX}${userId}`);
      if (legacy) {
        try {
          const parsedLegacy = JSON.parse(legacy) as Partial<CourseBasicsDraft>;
          const next = makeDefaultWizardState();
          next.course = {
            ...next.course,
            title: String(parsedLegacy.title ?? ''),
            category: String(parsedLegacy.category ?? ''),
            description: String(parsedLegacy.description ?? ''),
            level: (parsedLegacy.level as CourseLevel) || next.course.level,
            duration: String(parsedLegacy.duration ?? next.course.duration),
            is_free: Boolean(parsedLegacy.is_free),
            price: Number(parsedLegacy.price ?? 0),
            promotion_percentage: Number(parsedLegacy.promotion_percentage ?? 0),
            thumbnail: String(parsedLegacy.thumbnail ?? ''),
            trailer_url: String(parsedLegacy.trailer_url ?? ''),
          };
          setWizard(next);
        } catch {
          setWizard(makeDefaultWizardState());
        }
      } else {
        setWizard(makeDefaultWizardState());
      }
    }

    setCourseErrors({});
    setStepMessage(null);
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId) return;
    window.localStorage.setItem(getWizardStorageKey(userId), JSON.stringify(wizard));
    setSavingDraftAt(new Date());
  }, [open, userId, wizard]);

  useEffect(() => {
    if (!open) return;
    setLoadingStrategy(true);
    fetchUploadStrategy()
      .then((payload) => setUploadStrategy(payload))
      .catch((reason) => {
        console.error(reason);
        setUploadStrategy(null);
      })
      .finally(() => setLoadingStrategy(false));
  }, [open]);

  const updateCourse = <K extends keyof CourseBasicsDraft>(field: K, value: CourseBasicsDraft[K]) => {
    setWizard((current) => {
      const nextCourse = { ...current.course, [field]: value };
      if (field === 'is_free' && value === true) {
        nextCourse.price = 0;
      }
      if (field === 'price' && Number(value) > 0) {
        nextCourse.is_free = false;
      }
      return { ...current, course: nextCourse };
    });
    setCourseErrors((current) => ({ ...current, [field]: undefined }));
    setStepMessage(null);
  };

  const updateSections = (updater: (sections: SectionDraft[]) => SectionDraft[]) => {
    setWizard((current) => {
      const nextSections = normalizeSections(updater(current.sections));
      const nextLessonOptions = nextSections.flatMap((section) => section.lessons);
      const nextSelectedLessonId = nextLessonOptions.some((lesson) => lesson.id === current.selectedLessonId)
        ? current.selectedLessonId
        : nextLessonOptions[0]?.id ?? '';

      const validLessonIds = new Set(nextLessonOptions.map((lesson) => lesson.id));
      const nextAssets = current.assets.filter((asset) => validLessonIds.has(asset.lessonId)).map((asset) => {
        const lesson = nextLessonOptions.find((entry) => entry.id === asset.lessonId);
        return {
          ...asset,
          lessonTitle: lesson?.title ?? asset.lessonTitle,
        };
      });

      return {
        ...current,
        sections: nextSections,
        selectedLessonId: nextSelectedLessonId,
        assets: nextAssets,
      };
    });
    setStepMessage(null);
  };

  const updateExams = (updater: (exams: ExamDraft[]) => ExamDraft[]) => {
    setWizard((current) => {
      const nextExams = updater(current.exams);
      const nextSelectedExamId = nextExams.some((exam) => exam.id === current.selectedExamId)
        ? current.selectedExamId
        : nextExams[0]?.id ?? '';
      return {
        ...current,
        exams: nextExams,
        selectedExamId: nextSelectedExamId,
      };
    });
    setStepMessage(null);
  };

  const addSection = () => {
    updateSections((sections) => [
      ...sections,
      makeSectionDraft(sections.length + 1),
    ]);
  };

  const updateSectionField = (sectionId: string, field: keyof Omit<SectionDraft, 'id' | 'position' | 'lessons'>, value: string) => {
    updateSections((sections) => sections.map((section) => (
      section.id === sectionId ? { ...section, [field]: value } : section
    )));
  };

  const removeSection = (sectionId: string) => {
    updateSections((sections) => sections.filter((section) => section.id !== sectionId));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    updateSections((sections) => {
      const currentIndex = sections.findIndex((section) => section.id === sectionId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return sections;
      return reorderItems(sections, currentIndex, targetIndex);
    });
  };

  const addLesson = (sectionId: string) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        lessons: [
          ...section.lessons,
          makeLessonDraft(section.lessons.length + 1),
        ],
      };
    }));
  };

  const updateLessonField = <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => {
    updateSections((sections) => sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;
        const nextLesson = { ...lesson, [field]: value };
        if (field === 'type' && value === 'true_false') {
          void value;
        }
        return nextLesson;
      }),
    })));
  };

  const removeLesson = (sectionId: string, lessonId: string) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        lessons: section.lessons.filter((lesson) => lesson.id !== lessonId),
      };
    }));
  };

  const moveLesson = (sectionId: string, lessonId: string, direction: -1 | 1) => {
    updateSections((sections) => sections.map((section) => {
      if (section.id !== sectionId) return section;
      const currentIndex = section.lessons.findIndex((lesson) => lesson.id === lessonId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= section.lessons.length) return section;
      return {
        ...section,
        lessons: reorderItems(section.lessons, currentIndex, targetIndex),
      };
    }));
  };

  const addAssetLink = (lessonId: string, assetType: AssetType) => {
    if (!selectedLesson) return;
    setWizard((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          id: createLocalId('asset'),
          lessonId,
          lessonTitle: selectedLesson.title,
          asset_type: assetType,
          title: '',
          url: '',
          thumbnail_url: '',
          mime_type: '',
          size_bytes: null,
          status: assetType === 'video' ? 'processing' : 'ready',
          queueStatus: assetType === 'link' ? 'ready' : 'queued',
          progress: 0,
          errorMessage: null,
        },
      ],
    }));
  };

  const updateAsset = <K extends keyof AssetDraft>(assetId: string, field: K, value: AssetDraft[K]) => {
    setWizard((current) => ({
      ...current,
      assets: current.assets.map((asset) => (
        asset.id === assetId ? { ...asset, [field]: value, errorMessage: field === 'url' ? null : asset.errorMessage } : asset
      )),
    }));
    setStepMessage(null);
  };

  const removeAsset = (assetId: string) => {
    setWizard((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.id !== assetId),
    }));
  };

  const handleTrailerFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsTrailerUploading(true);
    setTrailerUploadProgress(0);
    try {
      const payload = await uploadVideoToServer(file, {
        folder: `c2p/course-drafts/${userId}/${wizard.draftId}/trailer`,
        filename: `trailer-${Date.now()}`,
        onProgress: setTrailerUploadProgress,
      });
      updateCourse('trailer_url', payload.url);
      success('Bande-annonce importée', 'La vidéo de présentation a été téléversée sur le serveur.');
    } catch (reason) {
      console.error(reason);
      error('Upload impossible', 'La bande-annonce n a pas pu être téléversée.');
    } finally {
      setIsTrailerUploading(false);
      setTrailerUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleQueuedFiles = async (lessonId: string, assetType: AssetType, files: FileList | null) => {
    if (!files || !userId) return;
    const lesson = lessonOptions.find((entry) => entry.lessonId === lessonId);
    if (!lesson) return;

    const queueIds: string[] = [];
    setWizard((current) => {
      const appended: AssetDraft[] = Array.from(files).map((file) => {
        const assetId = createLocalId('asset');
        queueIds.push(assetId);
        return {
          id: assetId,
          lessonId,
          lessonTitle: lesson.lessonTitle,
          asset_type: assetType,
          title: file.name,
          url: '',
          thumbnail_url: '',
          mime_type: file.type,
          size_bytes: file.size,
          status: assetType === 'video' ? 'processing' : 'ready',
          queueStatus: 'queued',
          progress: 0,
          errorMessage: null,
        };
      });

      return {
        ...current,
        assets: [...current.assets, ...appended],
      };
    });

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const assetId = queueIds[index];
      setWizard((current) => ({
        ...current,
        assets: current.assets.map((asset) => (
          asset.id === assetId ? { ...asset, queueStatus: 'uploading', progress: 0, errorMessage: null } : asset
        )),
      }));

      try {
        const payload = await uploadFileToServer(file, {
          folder: `c2p/course-drafts/${userId}/${wizard.draftId}/lessons/${lessonId}`,
          filename: `${assetType}-${Date.now()}-${index + 1}`,
          resourceType: assetType === 'video' ? 'video' : 'raw',
          onProgress: (progress) => {
            setWizard((current) => ({
              ...current,
              assets: current.assets.map((asset) => (
                asset.id === assetId ? { ...asset, progress } : asset
              )),
            }));
          },
        });

        setWizard((current) => ({
          ...current,
          assets: current.assets.map((asset) => (
            asset.id === assetId
              ? {
                ...asset,
                title: asset.title || file.name,
                url: payload.url,
                thumbnail_url: asset.thumbnail_url,
                mime_type: payload.mimeType || file.type,
                size_bytes: payload.size || file.size,
                status: assetType === 'video' ? 'processing' : 'ready',
                queueStatus: 'ready',
                progress: 100,
              }
              : asset
          )),
        }));
      } catch (reason) {
        console.error(reason);
        setWizard((current) => ({
          ...current,
          assets: current.assets.map((asset) => (
            asset.id === assetId
              ? {
                ...asset,
                queueStatus: 'error',
                errorMessage: 'Upload impossible.',
              }
              : asset
          )),
        }));
      }
    }
  };

  const addExam = () => {
    updateExams((exams) => [...exams, makeExamDraft()]);
  };

  const updateExam = <K extends keyof ExamDraft>(examId: string, field: K, value: ExamDraft[K]) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId ? { ...exam, [field]: value } : exam
    )));
  };

  const removeExam = (examId: string) => {
    updateExams((exams) => exams.filter((exam) => exam.id !== examId));
  };

  const addQuestion = (examId: string) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId
        ? { ...exam, questions: [...exam.questions, makeQuestionDraft()] }
        : exam
    )));
  };

  const updateQuestion = <K extends keyof QuestionDraft>(examId: string, questionId: string, field: K, value: QuestionDraft[K]) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => {
          if (question.id !== questionId) return question;
          if (field === 'type') {
            const nextType = value as QuestionType;
            return {
              ...question,
              type: nextType,
              choices: nextType === 'open'
                ? []
                : nextType === 'true_false'
                  ? [makeChoiceDraft('Vrai', 'true'), makeChoiceDraft('Faux', 'false')]
                  : question.choices.length > 0
                    ? question.choices
                    : [makeChoiceDraft()],
            };
          }
          return { ...question, [field]: value };
        }),
      };
    }));
  };

  const removeQuestion = (examId: string, questionId: string) => {
    updateExams((exams) => exams.map((exam) => (
      exam.id === examId
        ? { ...exam, questions: exam.questions.filter((question) => question.id !== questionId) }
        : exam
    )));
  };

  const addChoice = (examId: string, questionId: string) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => (
          question.id === questionId
            ? { ...question, choices: [...question.choices, makeChoiceDraft()] }
            : question
        )),
      };
    }));
  };

  const updateChoice = <K extends keyof QuestionChoiceDraft>(
    examId: string,
    questionId: string,
    choiceId: string,
    field: K,
    value: QuestionChoiceDraft[K],
  ) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => {
          if (question.id !== questionId) return question;
          return {
            ...question,
            choices: question.choices.map((choice) => {
              if (choice.id !== choiceId) {
                if (field === 'is_correct' && value === true && ['single_choice', 'true_false'].includes(question.type)) {
                  return { ...choice, is_correct: false };
                }
                return choice;
              }
              return {
                ...choice,
                [field]: value,
              };
            }),
          };
        }),
      };
    }));
  };

  const removeChoice = (examId: string, questionId: string, choiceId: string) => {
    updateExams((exams) => exams.map((exam) => {
      if (exam.id !== examId) return exam;
      return {
        ...exam,
        questions: exam.questions.map((question) => (
          question.id === questionId
            ? { ...question, choices: question.choices.filter((choice) => choice.id !== choiceId) }
            : question
        )),
      };
    }));
  };

  const appendLessonSnippet = (snippet: string) => {
    if (!selectedLesson) return;
    const nextContent = selectedLesson.content.trim()
      ? `${selectedLesson.content.trim()}\n\n${snippet}`
      : snippet;
    updateLessonField(selectedLesson.id, 'content', nextContent);
  };

  const validateCurrentStep = (step: number) => {
    if (step === 1) {
      const nextErrors = validateCourseBasics(wizard.course);
      setCourseErrors(nextErrors);
      const structureError = validateStructure(wizard.sections);
      if (Object.keys(nextErrors).length > 0 || structureError) {
        setStepMessage(structureError ?? 'Corrigez les informations de base avant de continuer.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (pendingUploadsCount > 0) {
        setStepMessage('Attendez la fin des uploads avant de passer à l étape suivante.');
        return false;
      }
      if (hasUploadErrors) {
        setStepMessage('Corrigez ou retirez les contenus en erreur avant de continuer.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const message = validateLessonEditors(wizard.sections);
      if (message) {
        setStepMessage(message);
        return false;
      }
      return true;
    }

    if (step === 4) {
      const message = validateExams(wizard.exams);
      if (message) {
        setStepMessage(message);
        return false;
      }
      return true;
    }

    return true;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep(wizard.step)) return;
    setStepMessage(null);
    setWizard((current) => ({
      ...current,
      step: Math.min(4, current.step + 1),
    }));
  };

  const goToPreviousStep = () => {
    setStepMessage(null);
    setWizard((current) => ({
      ...current,
      step: Math.max(1, current.step - 1),
    }));
  };

  const resetWizard = () => {
    if (userId) {
      window.localStorage.removeItem(getWizardStorageKey(userId));
    }
    setWizard(makeDefaultWizardState());
    setCourseErrors({});
    setStepMessage(null);
  };

  const submitWizard = async () => {
    if (!userId) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return;
    }

    const step1Valid = validateCurrentStep(1);
    const step2Valid = validateCurrentStep(2);
    const step3Valid = validateCurrentStep(3);
    const step4Valid = validateCurrentStep(4);
    if (!step1Valid || !step2Valid || !step3Valid || !step4Valid) {
      return;
    }

    setIsSubmitting(true);
    setStepMessage(null);

    let createdCourseId: string | number | null = null;
    try {
      const { data: createdCourse, error: createCourseError } = await backendClient.from<{ id: string | number; title: string }>('courses').insert({
        instructor_id: userId,
        title: wizard.course.title.trim(),
        category: wizard.course.category.trim(),
        level: wizard.course.level,
        description: wizard.course.description.trim(),
        status: 'draft',
        modules: wizard.sections.length || 1,
        duration: wizard.course.duration.trim(),
        price: wizard.course.is_free ? 0 : wizard.course.price,
        access_type: wizard.course.is_free ? 'free' : 'paid',
        is_free: wizard.course.is_free,
        promotion_percentage: wizard.course.promotion_percentage,
        trailer_url: wizard.course.trailer_url.trim() || null,
        thumbnail: wizard.course.thumbnail.trim() || null,
      });

      if (createCourseError || !createdCourse?.id) {
        throw createCourseError ?? new Error('Création du cours impossible.');
      }

      createdCourseId = createdCourse.id;
      const sectionIdMap = new Map<string, string | number>();
      const lessonIdMap = new Map<string, string | number>();
      const lessonSectionMap = new Map<string, string>();

      for (const section of normalizeSections(wizard.sections)) {
        const { data: createdSection, error: sectionError } = await backendClient.from<{ id: string | number }>('course_sections').insert({
          course_id: createdCourseId,
          title: section.title.trim(),
          description: section.description.trim(),
          status: section.status,
          position: section.position,
        });

        if (sectionError || !createdSection?.id) {
          throw sectionError ?? new Error(`Création du chapitre "${section.title}" impossible.`);
        }

        sectionIdMap.set(section.id, createdSection.id);

        for (const lesson of section.lessons) {
          const { data: createdLesson, error: lessonError } = await backendClient.from<{ id: string | number }>('course_lessons').insert({
            course_id: createdCourseId,
            section_id: createdSection.id,
            title: lesson.title.trim(),
            description: lesson.description.trim(),
            type: lesson.type,
            duration: lesson.duration.trim() || null,
            content: lesson.content.trim() || null,
            code_language: lesson.code_language.trim() || 'markdown',
            code_sample: lesson.code_sample.trim() || null,
            exercise_instructions: lesson.exercise_instructions.trim() || null,
            is_preview: lesson.is_preview,
            status: lesson.status,
            position: lesson.position,
          });

          if (lessonError || !createdLesson?.id) {
            throw lessonError ?? new Error(`Création de la leçon "${lesson.title}" impossible.`);
          }

          lessonIdMap.set(lesson.id, createdLesson.id);
          lessonSectionMap.set(lesson.id, section.id);
        }
      }

      for (const asset of wizard.assets.filter((entry) => entry.url.trim())) {
        const lessonId = lessonIdMap.get(asset.lessonId);
        const sectionDraftId = lessonSectionMap.get(asset.lessonId);
        const sectionId = sectionDraftId ? sectionIdMap.get(sectionDraftId) : null;
        if (!lessonId || !sectionId) continue;

        const { error: assetError } = await backendClient.from('lesson_assets').insert({
          lesson_id: lessonId,
          section_id: sectionId,
          course_id: createdCourseId,
          title: asset.title.trim() || asset.lessonTitle,
          asset_type: asset.asset_type,
          url: asset.url.trim(),
          thumbnail_url: asset.thumbnail_url.trim() || null,
          mime_type: asset.mime_type.trim() || null,
          size_bytes: asset.size_bytes,
          status: asset.asset_type === 'video' ? 'processing' : 'ready',
        });

        if (assetError) {
          throw assetError;
        }
      }

      for (const exam of wizard.exams) {
        const { data: createdExam, error: examError } = await backendClient.from<{ id: string | number }>('exams').insert({
          instructor_id: userId,
          course_id: createdCourseId,
          title: exam.title.trim(),
          type: exam.type,
          exam_date: exam.exam_date,
          participants: exam.participants,
          submitted: 0,
          avg_grade: null,
          status: 'upcoming',
          max_grade: exam.max_grade,
        });

        if (examError || !createdExam?.id) {
          throw examError ?? new Error(`Création de l évaluation "${exam.title}" impossible.`);
        }

        for (let questionIndex = 0; questionIndex < exam.questions.length; questionIndex += 1) {
          const question = exam.questions[questionIndex];
          const { data: createdQuestion, error: questionError } = await backendClient.from<{ id: string | number }>('quiz_questions').insert({
            exam_id: createdExam.id,
            prompt: question.prompt.trim(),
            type: question.type,
            points: question.points,
            explanation: question.explanation.trim(),
            required: question.required,
            position: questionIndex + 1,
          });

          if (questionError || !createdQuestion?.id) {
            throw questionError ?? new Error(`Création de la question "${question.prompt}" impossible.`);
          }

          for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex += 1) {
            const choice = question.choices[choiceIndex];
            if (!choice.label.trim()) continue;
            const { error: choiceError } = await backendClient.from('quiz_choices').insert({
              question_id: createdQuestion.id,
              label: choice.label.trim(),
              value: choice.value.trim() || choice.label.trim(),
              is_correct: choice.is_correct,
              position: choiceIndex + 1,
            });

            if (choiceError) {
              throw choiceError;
            }
          }
        }
      }

      success('Parcours de création terminé', `La formation "${wizard.course.title}" a été créée avec son programme initial.`);
      resetWizard();
      await onCreated({ id: createdCourseId, title: wizard.course.title.trim() });
      onClose();
    } catch (reason) {
      console.error(reason);
      const detail = reason && typeof reason === 'object' && 'message' in reason
        ? String(reason.message)
        : 'Impossible de finaliser la création de la formation.';
      setStepMessage(
        createdCourseId
          ? `${detail} Le cours a été créé partiellement. Reprenez-le ensuite depuis la liste.`
          : detail,
      );
      error('Création incomplète', detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const renderStepOne = () => (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 1</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Fondations du cours</h3>
          <p className="mt-1 text-sm text-slate-600">
            Définissez la fiche catalogue, le positionnement commercial et l ossature pédagogique.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre *</label>
            <input
              type="text"
              value={wizard.course.title}
              onChange={(event) => updateCourse('title', event.target.value)}
              placeholder="Ex: Marketing digital avancé pour PME"
              aria-invalid={Boolean(courseErrors.title)}
              className={getFieldClass(Boolean(courseErrors.title))}
            />
            {courseErrors.title ? <p className="mt-1 text-xs text-red-600">{courseErrors.title}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Catégorie *</label>
            <input
              type="text"
              value={wizard.course.category}
              onChange={(event) => updateCourse('category', event.target.value)}
              placeholder="Marketing, Produit, Comptabilité..."
              aria-invalid={Boolean(courseErrors.category)}
              className={getFieldClass(Boolean(courseErrors.category))}
            />
            {courseErrors.category ? <p className="mt-1 text-xs text-red-600">{courseErrors.category}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Niveau *</label>
            <select
              value={wizard.course.level}
              onChange={(event) => updateCourse('level', event.target.value as CourseLevel)}
              aria-invalid={Boolean(courseErrors.level)}
              className={getFieldClass(Boolean(courseErrors.level))}
            >
              {Object.entries(COURSE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {courseErrors.level ? <p className="mt-1 text-xs text-red-600">{courseErrors.level}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={4}
              maxLength={500}
              value={wizard.course.description}
              onChange={(event) => updateCourse('description', event.target.value)}
              placeholder="Résumez la promesse de la formation, les acquis et le public cible."
              aria-invalid={Boolean(courseErrors.description)}
              className={`${getFieldClass(Boolean(courseErrors.description))} resize-none`}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>500 caractères max</span>
              <span>{wizard.course.description.length}/500</span>
            </div>
            {courseErrors.description ? <p className="mt-1 text-xs text-red-600">{courseErrors.description}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Durée estimée *</label>
            <input
              type="text"
              value={wizard.course.duration}
              onChange={(event) => updateCourse('duration', event.target.value)}
              placeholder="Ex: 8h ou 4 semaines"
              aria-invalid={Boolean(courseErrors.duration)}
              className={getFieldClass(Boolean(courseErrors.duration))}
            />
            {courseErrors.duration ? <p className="mt-1 text-xs text-red-600">{courseErrors.duration}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Promotion (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={wizard.course.promotion_percentage}
              onChange={(event) => updateCourse('promotion_percentage', Number(event.target.value) || 0)}
              aria-invalid={Boolean(courseErrors.promotion_percentage)}
              className={getFieldClass(Boolean(courseErrors.promotion_percentage))}
            />
            {courseErrors.promotion_percentage ? <p className="mt-1 text-xs text-red-600">{courseErrors.promotion_percentage}</p> : null}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Accès</p>
                <p className="text-xs text-slate-500">Basculer entre formation gratuite et formation payante.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={wizard.course.is_free}
                  onChange={(event) => updateCourse('is_free', event.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Gratuit
              </label>
            </div>
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Prix (FCFA)</label>
              <input
                type="number"
                min={0}
                value={wizard.course.price}
                onChange={(event) => updateCourse('price', Number(event.target.value) || 0)}
                disabled={wizard.course.is_free}
                aria-invalid={Boolean(courseErrors.price)}
                className={getFieldClass(Boolean(courseErrors.price))}
              />
              {courseErrors.price ? <p className="mt-1 text-xs text-red-600">{courseErrors.price}</p> : null}
            </div>
          </div>

          <div className="md:col-span-2">
            <ImageUploadField
              label="Image de couverture"
              value={wizard.course.thumbnail}
              onChange={(url) => updateCourse('thumbnail', url)}
              folder={`c2p/course-drafts/${userId ?? 'anonymous'}/${wizard.draftId}/cover`}
              helper="Utilisez une couverture nette, lisible sur mobile et desktop."
            />
            {courseErrors.thumbnail ? <p className="mt-1 text-xs text-red-600">{courseErrors.thumbnail}</p> : null}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Bande-annonce vidéo</p>
                <p className="mt-1 text-xs text-slate-500">
                  Téléversez la vidéo sur le serveur ou collez une URL publique si elle est déjà hébergée.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => trailerInputRef.current?.click()}
                  disabled={isTrailerUploading}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTrailerUploading ? 'Upload...' : 'Téléverser la vidéo'}
                </button>
                <input
                  ref={trailerInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleTrailerFileChange}
                />
              </div>
            </div>
            <div className="mt-4">
              <input
                type="url"
                value={wizard.course.trailer_url}
                onChange={(event) => updateCourse('trailer_url', event.target.value)}
                placeholder="https://.../trailer.m3u8 ou .mp4"
                aria-invalid={Boolean(courseErrors.trailer_url)}
                className={getFieldClass(Boolean(courseErrors.trailer_url))}
              />
              {isTrailerUploading ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Upload en cours</span>
                    <span>{trailerUploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${trailerUploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {courseErrors.trailer_url ? <p className="mt-1 text-xs text-red-600">{courseErrors.trailer_url}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Structure pédagogique</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez les chapitres et les leçons. Le glisser-déposer est disponible sur desktop, les boutons monter/descendre restent visibles sur mobile.
            </p>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Ajouter un chapitre
          </button>
        </div>

        <div className="space-y-4">
          {wizard.sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => setDragSectionId(section.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragSectionId || dragSectionId === section.id) return;
                updateSections((sections) => {
                  const fromIndex = sections.findIndex((entry) => entry.id === dragSectionId);
                  const toIndex = sections.findIndex((entry) => entry.id === section.id);
                  if (fromIndex < 0 || toIndex < 0) return sections;
                  return reorderItems(sections, fromIndex, toIndex);
                });
                setDragSectionId(null);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-teal-700 shadow-sm">
                    {sectionIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) => updateSectionField(section.id, 'title', event.target.value)}
                      placeholder="Titre du chapitre"
                      className={getFieldClass(false)}
                    />
                    <textarea
                      rows={2}
                      value={section.description}
                      onChange={(event) => updateSectionField(section.id, 'description', event.target.value)}
                      placeholder="Objectif pédagogique du chapitre"
                      className={`${getFieldClass(false)} mt-2 resize-none`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, -1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    Monter
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    Descendre
                  </button>
                  <button
                    type="button"
                    onClick={() => addLesson(section.id)}
                    className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Ajouter une leçon
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {section.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => setDragLessonPayload({ sectionId: section.id, lessonId: lesson.id })}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!dragLessonPayload || dragLessonPayload.sectionId !== section.id || dragLessonPayload.lessonId === lesson.id) return;
                      updateSections((sections) => sections.map((entry) => {
                        if (entry.id !== section.id) return entry;
                        const fromIndex = entry.lessons.findIndex((candidate) => candidate.id === dragLessonPayload.lessonId);
                        const toIndex = entry.lessons.findIndex((candidate) => candidate.id === lesson.id);
                        if (fromIndex < 0 || toIndex < 0) return entry;
                        return {
                          ...entry,
                          lessons: reorderItems(entry.lessons, fromIndex, toIndex),
                        };
                      }));
                      setDragLessonPayload(null);
                    }}
                    className={`rounded-xl border p-3 transition-colors ${
                      wizard.selectedLessonId === lesson.id ? 'border-teal-300 bg-white' : 'border-slate-200 bg-white/90'
                    }`}
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto]">
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(event) => updateLessonField(lesson.id, 'title', event.target.value)}
                        placeholder="Titre de la leçon"
                        className={getFieldClass(false)}
                      />
                      <select
                        value={lesson.type}
                        onChange={(event) => updateLessonField(lesson.id, 'type', event.target.value as LessonType)}
                        className={getFieldClass(false)}
                      >
                        {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={lesson.duration}
                        onChange={(event) => updateLessonField(lesson.id, 'duration', event.target.value)}
                        placeholder="12 min"
                        className={getFieldClass(false)}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => moveLesson(section.id, lesson.id, -1)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLesson(section.id, lesson.id, 1)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={lesson.is_preview}
                          onChange={(event) => updateLessonField(lesson.id, 'is_preview', event.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Aperçu gratuit
                      </label>
                      <button
                        type="button"
                        onClick={() => setWizard((current) => ({ ...current, selectedLessonId: lesson.id, step: Math.max(current.step, 3) }))}
                        className="text-xs font-medium text-teal-700 hover:text-teal-800"
                      >
                        Éditer le contenu
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLesson(section.id, lesson.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Supprimer la leçon
                      </button>
                      <span className="ml-auto text-xs text-slate-400">Leçon {lessonIndex + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 2</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Uploads et bibliothèque de contenus</h3>
            <p className="mt-1 text-sm text-slate-600">
              Branchez vos vidéos, PDF, audio, ZIP, slides, liens externes et fichiers de code directement au serveur.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {loadingStrategy
              ? 'Chargement de la stratégie upload...'
              : uploadStrategy
                ? `Mode ${uploadStrategy.mode} · max requête ${formatBytes(uploadStrategy.requestMaxBytes)}`
                : 'Stratégie upload indisponible'}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Ajouter des contenus</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Choisissez d abord la leçon cible, puis importez un ou plusieurs fichiers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={!selectedLesson}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Importer des fichiers
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Leçon cible</label>
                <select
                  value={wizard.selectedLessonId}
                  onChange={(event) => setWizard((current) => ({ ...current, selectedLessonId: event.target.value }))}
                  className={getFieldClass(false)}
                >
                  {lessonOptions.map((option) => (
                    <option key={option.lessonId} value={option.lessonId}>
                      {option.sectionTitle} · {option.lessonTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Type de contenu</label>
                <select
                  value={pendingAssetType}
                  onChange={(event) => setPendingAssetType(event.target.value as AssetType)}
                  className={getFieldClass(false)}
                >
                  {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((assetType) => (
                    <option key={assetType} value={assetType}>{ASSET_TYPE_LABELS[assetType]}</option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedLesson) return;
                      addAssetLink(selectedLesson.id, pendingAssetType);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ajouter une carte contenu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingAssetType === 'link') {
                        info('Lien externe', 'Créez une carte contenu puis renseignez directement l URL.');
                        return;
                      }
                      uploadInputRef.current?.click();
                    }}
                    className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    Importer {ASSET_TYPE_LABELS[pendingAssetType].toLowerCase()}
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (!selectedLesson) return;
                handleQueuedFiles(selectedLesson.id, pendingAssetType === 'link' ? 'pdf' : pendingAssetType, event.target.files);
                event.target.value = '';
              }}
            />

            <div className="mt-4 grid gap-3">
              {wizard.assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Aucun contenu ajouté pour le moment.
                </div>
              ) : (
                wizard.assets.map((asset) => (
                  <div key={asset.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {ASSET_TYPE_LABELS[asset.asset_type]}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            asset.queueStatus === 'ready'
                              ? 'bg-green-100 text-green-700'
                              : asset.queueStatus === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {asset.queueStatus === 'ready' ? 'Prêt' : asset.queueStatus === 'error' ? 'Erreur' : 'En file'}
                          </span>
                          <span className="text-[11px] text-slate-400">{asset.lessonTitle}</span>
                        </div>
                        <input
                          type="text"
                          value={asset.title}
                          onChange={(event) => updateAsset(asset.id, 'title', event.target.value)}
                          placeholder="Titre du contenu"
                          className={getFieldClass(false)}
                        />
                        {asset.asset_type === 'link' ? (
                          <input
                            type="url"
                            value={asset.url}
                            onChange={(event) => updateAsset(asset.id, 'url', event.target.value)}
                            placeholder="https://..."
                            className={`${getFieldClass(false)} mt-2`}
                          />
                        ) : (
                          <input
                            type="url"
                            value={asset.url}
                            onChange={(event) => updateAsset(asset.id, 'url', event.target.value)}
                            placeholder="URL générée par l upload"
                            className={`${getFieldClass(false)} mt-2`}
                          />
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                          {asset.mime_type ? <span>{asset.mime_type}</span> : null}
                          {asset.size_bytes ? <span>{formatBytes(asset.size_bytes)}</span> : null}
                        </div>
                        {asset.queueStatus === 'uploading' ? (
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                              <span>Upload en cours</span>
                              <span>{asset.progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-teal-500 transition-all"
                                style={{ width: `${asset.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        {asset.errorMessage ? <p className="mt-2 text-xs text-red-600">{asset.errorMessage}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Vue d ensemble upload</h4>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Contenus prêts</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{uploadedAssetsCount}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">File active</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingUploadsCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-900">Pipeline média</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Upload lourd serveur: actif</li>
                <li>File queue front: active</li>
                <li>Transcodage HLS: nécessite le worker média dédié</li>
                <li>Miniature vidéo: à déclencher depuis le pipeline média</li>
                <li>Jetons d accès et anti-téléchargement: à brancher sur le player sécurisé</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-900">Limites par type</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {uploadStrategy ? (
                  (Object.entries(uploadStrategy.resourceTypes) as [string, UploadStrategyPayload['resourceTypes'][keyof UploadStrategyPayload['resourceTypes']]][]).map(([key, config]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span>{config.label}</span>
                      <span className="text-slate-400">{formatBytes(config.maxBytes)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Les limites seront visibles une fois la stratégie chargée.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderStepThree = () => (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 3</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Éditeur de leçons</h3>
          <p className="mt-1 text-sm text-slate-600">
            Rédigez les articles, exercices, live briefs et challenges avec une expérience pensée mobile-first.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-900">Leçons du programme</p>
            <div className="space-y-2">
              {lessonOptions.map((option) => {
                const lesson = wizard.sections
                  .find((section) => section.id === option.sectionId)
                  ?.lessons.find((entry) => entry.id === option.lessonId);
                if (!lesson) return null;
                return (
                  <button
                    key={option.lessonId}
                    type="button"
                    onClick={() => setWizard((current) => ({ ...current, selectedLessonId: option.lessonId }))}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                      wizard.selectedLessonId === option.lessonId
                        ? 'border-teal-300 bg-white text-slate-900'
                        : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <p className="font-medium">{lesson.title || 'Leçon sans titre'}</p>
                    <p className="mt-1 text-xs text-slate-400">{option.sectionTitle} · {LESSON_TYPE_LABELS[lesson.type]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            {selectedLesson ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre de la leçon</label>
                    <input
                      type="text"
                      value={selectedLesson.title}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'title', event.target.value)}
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={selectedLesson.type}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'type', event.target.value as LessonType)}
                      className={getFieldClass(false)}
                    >
                      {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[180px_auto]">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Durée</label>
                    <input
                      type="text"
                      value={selectedLesson.duration}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'duration', event.target.value)}
                      placeholder="12 min"
                      className={getFieldClass(false)}
                    />
                  </div>
                  <label className="mt-7 inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedLesson.is_preview}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'is_preview', event.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Leçon d aperçu gratuite
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Résumé</label>
                  <textarea
                    rows={3}
                    value={selectedLesson.description}
                    onChange={(event) => updateLessonField(selectedLesson.id, 'description', event.target.value)}
                    placeholder="Résumé visible dans le programme et la fiche de leçon."
                    className={`${getFieldClass(false)} resize-none`}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Titre Markdown', snippet: '## Nouveau bloc' },
                      { label: 'Note', snippet: ':::note\nPoint clé à retenir\n:::' },
                      { label: 'Checklist', snippet: '- [ ] Étape 1\n- [ ] Étape 2' },
                      { label: 'Code', snippet: '```ts\nconsole.log(\"Bonjour C2P\");\n```' },
                    ].map((entry) => (
                      <button
                        key={entry.label}
                        type="button"
                        onClick={() => appendLessonSnippet(entry.snippet)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Contenu rédigé / Markdown</label>
                  <textarea
                    rows={10}
                    value={selectedLesson.content}
                    onChange={(event) => updateLessonField(selectedLesson.id, 'content', event.target.value)}
                    placeholder="Rédigez ici le contenu principal, les instructions ou le script pédagogique."
                    className={`${getFieldClass(false)} resize-y font-mono`}
                  />
                </div>

                {selectedLesson.type === 'coding' ? (
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Langage</label>
                      <input
                        type="text"
                        value={selectedLesson.code_language}
                        onChange={(event) => updateLessonField(selectedLesson.id, 'code_language', event.target.value)}
                        placeholder="typescript, python, sql..."
                        className={getFieldClass(false)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Bloc de code</label>
                      <textarea
                        rows={8}
                        value={selectedLesson.code_sample}
                        onChange={(event) => updateLessonField(selectedLesson.id, 'code_sample', event.target.value)}
                        placeholder="Ajoutez un snippet ou un challenge technique."
                        className={`${getFieldClass(false)} resize-y font-mono`}
                      />
                    </div>
                  </div>
                ) : null}

                {['assignment', 'practice'].includes(selectedLesson.type) ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Consignes d exercice</label>
                    <textarea
                      rows={5}
                      value={selectedLesson.exercise_instructions}
                      onChange={(event) => updateLessonField(selectedLesson.id, 'exercise_instructions', event.target.value)}
                      placeholder="Expliquez la production attendue, les critères et le mode de restitution."
                      className={`${getFieldClass(false)} resize-y`}
                    />
                  </div>
                ) : null}

                <div className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Aperçu rapide</p>
                    <span className="text-xs text-slate-400">{LESSON_TYPE_LABELS[selectedLesson.type]}</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    {selectedLesson.description ? <p className="text-slate-300">{selectedLesson.description}</p> : null}
                    {selectedLesson.content ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900/70 p-3 text-slate-200">
                        {selectedLesson.content}
                      </pre>
                    ) : (
                      <p className="text-slate-500">Ajoutez du contenu pour prévisualiser la leçon.</p>
                    )}
                    {selectedLesson.code_sample ? (
                      <pre className="overflow-x-auto rounded-xl bg-black/40 p-3 text-emerald-200">
                        {selectedLesson.code_sample}
                      </pre>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Sélectionnez une leçon pour ouvrir l éditeur.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  const renderStepFour = () => (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Étape 4</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Quiz et évaluations</h3>
            <p className="mt-1 text-sm text-slate-600">
              Préparez les QCM, questions ouvertes, minuteries et règles de correction avant la publication.
            </p>
          </div>
          <button
            type="button"
            onClick={addExam}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Ajouter une évaluation
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-900">Évaluations du cours</p>
            <div className="space-y-2">
              {wizard.exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setWizard((current) => ({ ...current, selectedExamId: exam.id }))}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    wizard.selectedExamId === exam.id
                      ? 'border-teal-300 bg-white text-slate-900'
                      : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <p className="font-medium">{exam.title || 'Évaluation sans titre'}</p>
                  <p className="mt-1 text-xs text-slate-400">{EXAM_TYPE_LABELS[exam.type]} · {exam.max_grade} pts</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            {selectedExam ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre</label>
                    <input
                      type="text"
                      value={selectedExam.title}
                      onChange={(event) => updateExam(selectedExam.id, 'title', event.target.value)}
                      placeholder="Quiz de validation"
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={selectedExam.type}
                      onChange={(event) => updateExam(selectedExam.id, 'type', event.target.value as ExamType)}
                      className={getFieldClass(false)}
                    >
                      {Object.entries(EXAM_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                    <input
                      type="date"
                      value={selectedExam.exam_date}
                      onChange={(event) => updateExam(selectedExam.id, 'exam_date', event.target.value)}
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Note maximale</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedExam.max_grade}
                      onChange={(event) => updateExam(selectedExam.id, 'max_grade', Number(event.target.value) || 20)}
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Participants visés</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedExam.participants}
                      onChange={(event) => updateExam(selectedExam.id, 'participants', Number(event.target.value) || 0)}
                      className={getFieldClass(false)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Minuterie (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedExam.timer_minutes}
                      onChange={(event) => updateExam(selectedExam.id, 'timer_minutes', Number(event.target.value) || 0)}
                      className={getFieldClass(false)}
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    ['auto_correction', 'Correction automatique'],
                    ['question_bank', 'Banque de questions'],
                    ['ai_generation', 'Génération IA'],
                    ['anti_cheat', 'Anti-triche'],
                  ].map(([field, label]) => (
                    <label key={field} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedExam[field as keyof ExamDraft])}
                        onChange={(event) => updateExam(selectedExam.id, field as keyof ExamDraft, event.target.checked as never)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900">Questions</h4>
                    <button
                      type="button"
                      onClick={() => addQuestion(selectedExam.id)}
                      className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-white"
                    >
                      Ajouter une question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {selectedExam.questions.map((question, questionIndex) => (
                      <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">Question {questionIndex + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeQuestion(selectedExam.id, question.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[1fr_220px_100px]">
                          <input
                            type="text"
                            value={question.prompt}
                            onChange={(event) => updateQuestion(selectedExam.id, question.id, 'prompt', event.target.value)}
                            placeholder="Intitulé de la question"
                            className={getFieldClass(false)}
                          />
                          <select
                            value={question.type}
                            onChange={(event) => updateQuestion(selectedExam.id, question.id, 'type', event.target.value as QuestionType)}
                            className={getFieldClass(false)}
                          >
                            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={question.points}
                            onChange={(event) => updateQuestion(selectedExam.id, question.id, 'points', Number(event.target.value) || 1)}
                            className={getFieldClass(false)}
                          />
                        </div>
                        <textarea
                          rows={3}
                          value={question.explanation}
                          onChange={(event) => updateQuestion(selectedExam.id, question.id, 'explanation', event.target.value)}
                          placeholder="Explication affichée après correction ou lors du débrief."
                          className={`${getFieldClass(false)} mt-3 resize-none`}
                        />
                        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(event) => updateQuestion(selectedExam.id, question.id, 'required', event.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          Réponse obligatoire
                        </label>

                        {question.type !== 'open' ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-900">Réponses proposées</p>
                              <button
                                type="button"
                                onClick={() => addChoice(selectedExam.id, question.id)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                              >
                                Ajouter un choix
                              </button>
                            </div>
                            <div className="space-y-3">
                              {question.choices.map((choice) => (
                                <div key={choice.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                                  <input
                                    type="text"
                                    value={choice.label}
                                    onChange={(event) => updateChoice(selectedExam.id, question.id, choice.id, 'label', event.target.value)}
                                    placeholder="Libellé"
                                    className={getFieldClass(false)}
                                  />
                                  <input
                                    type="text"
                                    value={choice.value}
                                    onChange={(event) => updateChoice(selectedExam.id, question.id, choice.id, 'value', event.target.value)}
                                    placeholder="Valeur"
                                    className={getFieldClass(false)}
                                  />
                                  <button
                                    type="button"
                                    aria-pressed={choice.is_correct}
                                    onClick={() => updateChoice(
                                      selectedExam.id,
                                      question.id,
                                      choice.id,
                                      'is_correct',
                                      !choice.is_correct,
                                    )}
                                    className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
                                      choice.is_correct
                                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 text-slate-700 hover:bg-white'
                                    }`}
                                  >
                                    {choice.is_correct ? 'Réponse correcte' : 'Marquer correcte'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeChoice(selectedExam.id, question.id, choice.id)}
                                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Le wizard configure déjà les questions et la structure d évaluation. Les options premium comme la génération IA, l anti-triche forte ou la banque mutualisée demandent encore le pipeline métier dédié côté backend.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Sélectionnez une évaluation pour la configurer.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60">
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full sm:flex sm:items-center sm:justify-center">
          <div className="flex min-h-screen w-full flex-col bg-slate-50 sm:min-h-0 sm:max-w-6xl sm:rounded-[28px] sm:border sm:border-slate-200 sm:bg-white sm:shadow-2xl">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:rounded-t-[28px] sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Création guidée</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Nouvelle formation en 4 étapes</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Mobile-first, auto-enregistrement et découpage clair entre catalogue, contenus, leçons et évaluations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Fermer l assistant"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STEP_LABELS.map((label, index) => {
                  const step = index + 1;
                  const active = wizard.step === step;
                  const completed = wizard.step > step;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (step <= wizard.step || validateCurrentStep(wizard.step)) {
                          setStepMessage(null);
                          setWizard((current) => ({ ...current, step }));
                        }
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        active
                          ? 'border-teal-300 bg-teal-50'
                          : completed
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          active
                            ? 'bg-teal-600 text-white'
                            : completed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {completed ? '✓' : step}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>{savingDraftAt ? `Brouillon enregistré à ${formatTime(savingDraftAt)}` : 'Brouillon en attente'}</span>
                <span>{wizard.sections.length} chapitres · {wizard.sections.reduce((sum, section) => sum + section.lessons.length, 0)} leçons · {wizard.assets.length} contenus · {wizard.exams.length} évaluations</span>
              </div>
            </div>

            <div className="flex-1 px-4 py-5 sm:px-6">
              {stepMessage ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {stepMessage}
                </div>
              ) : null}

              {wizard.step === 1 ? renderStepOne() : null}
              {wizard.step === 2 ? renderStepTwo() : null}
              {wizard.step === 3 ? renderStepThree() : null}
              {wizard.step === 4 ? renderStepFour() : null}
            </div>

            <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:rounded-b-[28px] sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetWizard}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => info('Brouillon gardé', 'Vous pouvez fermer le wizard, le brouillon est conservé localement.')}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Vérifier l autosave
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={wizard.step === 1 ? onClose : goToPreviousStep}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {wizard.step === 1 ? 'Fermer' : 'Précédent'}
                  </button>
                  {wizard.step < 4 ? (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Suivant
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitWizard}
                      disabled={isSubmitting || pendingUploadsCount > 0}
                      className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isSubmitting ? 'Création en cours...' : 'Créer la formation'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
