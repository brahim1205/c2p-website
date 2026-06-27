import { findUserById } from '../auth/auth.store.js';
import { findRow } from '../data/data-app-store.js';
import { toNumber } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

export function position(row: Row) {
  return toNumber(row.position) ?? 0;
}

export function numberId(value: unknown) {
  return toNumber(value) ?? text(value);
}

export function text(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

export function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function nonNegativeInteger(value: unknown, fallback = 0) {
  const parsed = toNumber(value);
  if (parsed === null || !Number.isFinite(parsed)) {
    return Math.max(0, Math.floor(fallback));
  }
  return Math.max(0, Math.floor(parsed));
}

export function clampProgress(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value) ?? 0)));
}

export function mapLessonType(value: unknown) {
  const type = String(value ?? '').toLowerCase();
  if (type === 'video') return 'video';
  if (type === 'quiz') return 'quiz';
  if (type === 'assignment' || type === 'coding') return 'exercise';
  return 'reading';
}

export function buildContentBlocks(lesson: Row) {
  const blocks: Array<
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'callout'; tone: 'warning' | 'info'; text: string }
    | { type: 'quote'; text: string }
    | { type: 'list'; items: string[] }
  > = [];
  const rawContent = text(lesson.content);
  const description = text(lesson.description);
  const source = rawContent || description;
  if (!source) return blocks;

  const lines = source.split(/\r?\n/);
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'heading', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('> ')) {
      flushList();
      blocks.push({ type: 'quote', text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith(':::note')) {
      flushList();
      blocks.push({ type: 'callout', tone: 'info', text: 'Point clé à retenir' });
      continue;
    }
    if (line.startsWith(':::warning')) {
      flushList();
      blocks.push({ type: 'callout', tone: 'warning', text: 'Attention particulière' });
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      listItems.push(line.replace(/^- \[[ x]\] /i, '').replace(/^- /, '').trim());
      continue;
    }
    if (line.startsWith('```') || line === ':::') continue;
    flushList();
    blocks.push({ type: 'paragraph', text: line });
  }
  flushList();
  return blocks;
}

export function isSafeLocalUrl(value: string) {
  return value.startsWith('/uploads/') || value.startsWith('/c2p-documents/') || value.startsWith('/images/');
}

export function formatAssetSize(value: unknown) {
  const bytes = toNumber(value);
  if (!bytes || bytes <= 0) return 'Fichier';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAssetIcon(value: unknown) {
  const type = String(value ?? '').toLowerCase();
  if (type === 'video') return 'ri-video-line';
  if (type === 'pdf') return 'ri-file-pdf-line';
  if (type === 'slides') return 'ri-slideshow-line';
  if (type === 'link') return 'ri-link';
  return 'ri-attachment-2';
}

export function toQuizAttempt(row: Row) {
  const rawAnswers = row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
    ? row.answers as Record<string, unknown>
    : {};
  return {
    id: row.id,
    date: text(row.submitted_at ?? row.created_at, new Date().toISOString()),
    score: nonNegativeInteger(row.score),
    total: nonNegativeInteger(row.total),
    answers: Object.fromEntries(
      Object.entries(rawAnswers).map(([questionId, answerIndex]) => [
        questionId,
        nonNegativeInteger(answerIndex),
      ]),
    ),
  };
}

export function findInstructor(instructorId: unknown) {
  const fallback = { name: 'Formateur C2P', avatar: '' };
  const id = String(instructorId ?? '').trim();
  if (!id) return fallback;
  const user = findUserById(id) ?? findRow('auth_users', id);
  if (!user) return fallback;
  return {
    name: `${text(user.firstName)} ${text(user.lastName)}`.trim() || fallback.name,
    avatar: text(user.avatar),
  };
}

export function compareDatesDesc(left: unknown, right: unknown) {
  const leftDate = Date.parse(String(left ?? ''));
  const rightDate = Date.parse(String(right ?? ''));
  const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
  const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
  return normalizedRight - normalizedLeft;
}
