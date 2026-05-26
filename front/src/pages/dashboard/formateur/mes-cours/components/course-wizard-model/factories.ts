import type {
  CourseBasicsDraft,
  ExamDraft,
  LessonDraft,
  QuestionChoiceDraft,
  QuestionDraft,
  QuestionType,
  SectionDraft,
  WizardDraftState,
} from '../courseWizardTypes';

export const LEGACY_DRAFT_KEY_PREFIX = 'c2p:trainer-course-draft:';

export function createLocalId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

export function makeChoiceDraft(label = '', value = '', isCorrect = false): QuestionChoiceDraft {
  return {
    id: createLocalId('choice'),
    label,
    value,
    is_correct: isCorrect,
  };
}

export function makeQuestionDraft(type: QuestionType = 'single_choice'): QuestionDraft {
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

export function makeLessonDraft(position: number, overrides: Partial<LessonDraft> = {}): LessonDraft {
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

export function makeSectionDraft(position: number, overrides: Partial<SectionDraft> = {}): SectionDraft {
  return {
    id: createLocalId('section'),
    title: `Partie ${position}`,
    description: '',
    status: 'draft',
    position,
    lessons: [makeLessonDraft(1)],
    ...overrides,
  };
}

export function makeExamDraft(): ExamDraft {
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

export function makeDefaultCourseBasics(): CourseBasicsDraft {
  return {
    title: '',
    category: '',
    description: '',
    objectives: [''],
    prerequisites: [''],
    tools: [''],
    level: 'intermediate',
    delivery_mode: 'online',
    duration: '1h',
    is_free: false,
    price: 0,
    promotion_percentage: 0,
    thumbnail: '',
    trailer_url: '',
  };
}

export function makeDefaultWizardState(): WizardDraftState {
  const firstSection = makeSectionDraft(1);
  const firstLesson = firstSection.lessons[0];

  return {
    draftId: createLocalId('course-wizard'),
    step: 1,
    course: makeDefaultCourseBasics(),
    sections: [firstSection],
    assets: [],
    exams: [],
    selectedLessonId: firstLesson.id,
    selectedExamId: '',
  };
}
