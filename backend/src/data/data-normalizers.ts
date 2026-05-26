import { BadRequestException } from '@nestjs/common';

export function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function trimText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

export function requireText(value: unknown, message: string) {
  const text = trimText(value);
  if (!text) {
    throw new BadRequestException(message);
  }
  return text;
}

export function requireInteger(value: unknown, min: number, max: number, message: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(message);
  }
  return parsed;
}

export function requireNumberInRange(value: unknown, min: number, max: number, message: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(message);
  }
  return Number(parsed);
}

export function requireNumberOrFallback(value: unknown, fallback: number) {
  const parsed = toNumber(value);
  return parsed === null ? fallback : parsed;
}

export function requireIdentifier(value: unknown, message: string) {
  const identifier = String(value ?? '').trim();
  if (!identifier) {
    throw new BadRequestException(message);
  }
  return identifier;
}

export function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function slugifyLiveSegment(value: unknown) {
  let slug = '';
  for (const char of String(value ?? '').trim().toLowerCase().normalize('NFD')) {
    const code = char.charCodeAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue;
    const isAlphaNumeric = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (isAlphaNumeric) {
      slug += char;
    } else if (slug && !slug.endsWith('-')) {
      slug += '-';
    }
  }
  return slug.endsWith('-') ? slug.slice(0, -1).slice(0, 80) : slug.slice(0, 80);
}

export function getDefaultLiveProvider() {
  return process.env.LIVE_PROVIDER === 'custom' ? 'custom' : 'jitsi';
}

export function getJitsiBaseUrl() {
  const value = String(process.env.LIVE_JITSI_BASE_URL || 'https://meet.jit.si');
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function buildJitsiRoomUrl(slug: string) {
  return `${getJitsiBaseUrl()}/${slug}`;
}

export function normalizeLiveProvider(value: unknown) {
  const provider = trimText(value) ?? getDefaultLiveProvider();
  if (!new Set(['jitsi', 'custom']).has(provider)) {
    throw new BadRequestException('Le fournisseur live est invalide.');
  }
  return provider as 'jitsi' | 'custom';
}

export function normalizeMeetingSlug(value: unknown, fallbackValues: unknown[]) {
  const provided = slugifyLiveSegment(value);
  if (provided) return provided;

  const fallback = fallbackValues
    .map((entry) => slugifyLiveSegment(entry))
    .filter(Boolean)
    .join('-')
    .slice(0, 80);

  if (!fallback) {
    throw new BadRequestException('Le slug de la salle virtuelle est invalide.');
  }

  return fallback;
}

export function ensureFutureDateString(value: string, message: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() < today.getTime()) {
    throw new BadRequestException(message);
  }
}

export function ensureFutureDateTime(classDate: string, classTime: string, message: string) {
  const parsed = new Date(`${classDate}T${classTime}:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    throw new BadRequestException(message);
  }
}

export function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

export function normalizeCourseLevel(value: unknown) {
  const normalized = (trimText(value) ?? 'intermediate')
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('');

  const mapping: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'all_levels'> = {
    beginner: 'beginner',
    debutant: 'beginner',
    debutants: 'beginner',
    intermediate: 'intermediate',
    intermediaire: 'intermediate',
    intermediaires: 'intermediate',
    advanced: 'advanced',
    avance: 'advanced',
    avances: 'advanced',
    all_levels: 'all_levels',
    alllevel: 'all_levels',
    tous_niveaux: 'all_levels',
    tousniveaux: 'all_levels',
  };

  return mapping[normalized] ?? null;
}

export function normalizeCourseBranch(value: unknown) {
  const normalized = (trimText(value) ?? 'form_actions')
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('');

  const mapping: Record<string, 'form_actions' | 'end'> = {
    form_actions: 'form_actions',
    formactions: 'form_actions',
    'form-action': 'form_actions',
    'form actions': 'form_actions',
    postformation: 'form_actions',
    end: 'end',
    ecole_numerique_de_dakar: 'end',
    ecolenumeriquededakar: 'end',
    ecole_numerique: 'end',
    'ecole numerique': 'end',
  };

  return mapping[normalized] ?? null;
}

export function normalizeBookingRequestType(value: unknown) {
  const requestType = trimText(value) ?? 'booking';
  if (!new Set(['booking', 'quote', 'appointment']).has(requestType)) {
    throw new BadRequestException('Le type de demande est invalide.');
  }
  return requestType as 'booking' | 'quote' | 'appointment';
}

export function normalizeBookingStatus(value: unknown, fallback: string) {
  const status = trimText(value) ?? fallback;
  if (!new Set(['pending', 'confirmed', 'in_progress', 'completed', 'declined', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut de la demande est invalide.');
  }
  return status as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'declined' | 'cancelled';
}

export function normalizeEscrowStatus(value: unknown, fallback: string) {
  const status = trimText(value) ?? fallback;
  if (!new Set(['awaiting_quote', 'awaiting_funding', 'funded', 'assigned', 'in_progress', 'delivery_review', 'released', 'refunded', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut du sequestre est invalide.');
  }
  return status as
    | 'awaiting_quote'
    | 'awaiting_funding'
    | 'funded'
    | 'assigned'
    | 'in_progress'
    | 'delivery_review'
    | 'released'
    | 'refunded'
    | 'cancelled';
}
