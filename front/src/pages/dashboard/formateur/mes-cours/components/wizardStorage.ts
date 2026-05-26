import {
  LEGACY_DRAFT_KEY_PREFIX,
  makeDefaultWizardState,
  normalizeSections,
  type CourseBasicsDraft,
  type CourseDeliveryMode,
  type CourseLevel,
  type WizardDraftState,
} from './courseWizardModel';

const WIZARD_STORAGE_SCHEMA_VERSION = 1;
const WIZARD_STORAGE_KIND = 'trainer-course-wizard-draft';

interface StoredWizardDraft {
  kind: typeof WIZARD_STORAGE_KIND;
  schemaVersion: typeof WIZARD_STORAGE_SCHEMA_VERSION;
  userId: string;
  savedAt: string;
  draft: WizardDraftState;
}

export function getWizardStorageKey(userId: string) {
  return `c2p:trainer-course-wizard:${userId}`;
}

export function getLegacyWizardStorageKey(userId: string) {
  return `${LEGACY_DRAFT_KEY_PREFIX}${userId}`;
}

function parseStoredJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hydrateWizardDraft(value: unknown): WizardDraftState {
  const defaultState = makeDefaultWizardState();
  const parsed = isObject(value) ? value : {};
  const sections = Array.isArray(parsed.sections) ? parsed.sections : defaultState.sections;
  const exams = Array.isArray(parsed.exams) ? parsed.exams : defaultState.exams;

  return {
    ...defaultState,
    ...parsed,
    course: {
      ...defaultState.course,
      ...(isObject(parsed.course) ? parsed.course : {}),
    },
    sections: normalizeSections(sections as WizardDraftState['sections']),
    exams: exams as WizardDraftState['exams'],
    selectedLessonId: String(
      parsed.selectedLessonId
      || (sections as WizardDraftState['sections'])[0]?.lessons?.[0]?.id
      || defaultState.selectedLessonId,
    ),
    selectedExamId: String(parsed.selectedExamId || (exams as WizardDraftState['exams'])[0]?.id || defaultState.selectedExamId),
  };
}

export function normalizeWizardDraft(value: unknown): WizardDraftState {
  return hydrateWizardDraft(value);
}

function migrateLegacyBasicsDraft(value: unknown): WizardDraftState | null {
  if (!isObject(value)) return null;

  const parsedLegacy = value as Partial<CourseBasicsDraft>;
  const next = makeDefaultWizardState();
  next.course = {
    ...next.course,
    title: String(parsedLegacy.title ?? ''),
    category: String(parsedLegacy.category ?? ''),
    description: String(parsedLegacy.description ?? ''),
    objectives: Array.isArray(parsedLegacy.objectives) ? parsedLegacy.objectives.map(String) : next.course.objectives,
    prerequisites: Array.isArray(parsedLegacy.prerequisites) ? parsedLegacy.prerequisites.map(String) : next.course.prerequisites,
    tools: Array.isArray(parsedLegacy.tools) ? parsedLegacy.tools.map(String) : next.course.tools,
    level: (parsedLegacy.level as CourseLevel) || next.course.level,
    delivery_mode: (parsedLegacy.delivery_mode as CourseDeliveryMode) || next.course.delivery_mode,
    duration: String(parsedLegacy.duration ?? next.course.duration),
    is_free: Boolean(parsedLegacy.is_free),
    price: Number(parsedLegacy.price ?? 0),
    promotion_percentage: Number(parsedLegacy.promotion_percentage ?? 0),
    thumbnail: String(parsedLegacy.thumbnail ?? ''),
    trailer_url: String(parsedLegacy.trailer_url ?? ''),
  };
  return next;
}

export function readWizardDraft(userId: string): WizardDraftState {
  if (typeof window === 'undefined') return makeDefaultWizardState();

  const stored = parseStoredJson(window.localStorage.getItem(getWizardStorageKey(userId)));
  if (isObject(stored)) {
    const envelope = stored as Partial<StoredWizardDraft>;
    if (
      envelope.kind === WIZARD_STORAGE_KIND
      && envelope.schemaVersion === WIZARD_STORAGE_SCHEMA_VERSION
      && envelope.userId === userId
      && envelope.draft
    ) {
      return hydrateWizardDraft(envelope.draft);
    }
    return hydrateWizardDraft(stored);
  }

  const legacy = parseStoredJson(window.localStorage.getItem(getLegacyWizardStorageKey(userId)));
  return migrateLegacyBasicsDraft(legacy) ?? makeDefaultWizardState();
}

export function writeWizardDraft(userId: string, draft: WizardDraftState) {
  if (typeof window === 'undefined') return;

  const payload: StoredWizardDraft = {
    kind: WIZARD_STORAGE_KIND,
    schemaVersion: WIZARD_STORAGE_SCHEMA_VERSION,
    userId,
    savedAt: new Date().toISOString(),
    draft,
  };
  window.localStorage.setItem(getWizardStorageKey(userId), JSON.stringify(payload));
}

export function clearWizardDraft(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getWizardStorageKey(userId));
  window.localStorage.removeItem(getLegacyWizardStorageKey(userId));
}
