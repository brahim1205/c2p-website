const LOOPBACK_IPV4 = ['127', '0', '0', '1'].join('.');
const LOOPBACK_IPV6 = ['::', '1'].join('');
const LOOPBACK_IPV6_MAPPED = ['::ffff', LOOPBACK_IPV4].join(':');
const LOCAL_ADDRESSES = new Set([LOOPBACK_IPV4, LOOPBACK_IPV6, LOOPBACK_IPV6_MAPPED, 'localhost']);

const KNOWN_BROWSER_LABELS: Array<[RegExp, string]> = [
  [/HeadlessChrome/i, 'Navigateur de test'],
  [/Edg\//i, 'Microsoft Edge'],
  [/Chrome\//i, 'Google Chrome'],
  [/Firefox\//i, 'Mozilla Firefox'],
  [/Safari\//i, 'Safari'],
];

const KNOWN_PLATFORM_LABELS: Array<[RegExp, string]> = [
  [/Windows/i, 'Windows'],
  [/Mac OS X|Macintosh/i, 'macOS'],
  [/Android/i, 'Android'],
  [/iPhone|iPad|iOS/i, 'iOS'],
  [/Linux/i, 'Linux'],
];

function firstMatchingLabel(value: string, entries: Array<[RegExp, string]>, fallback = '') {
  return entries.find(([pattern]) => pattern.test(value))?.[1] ?? fallback;
}

export function normalizeIp(ip?: string | null) {
  const value = String(ip ?? '').trim();
  if (!value) return 'Adresse masquee';
  if (LOCAL_ADDRESSES.has(value)) {
    return 'Environnement local';
  }
  return value;
}

export function summarizeUserAgent(userAgent?: string | null) {
  const value = String(userAgent ?? '').trim();
  if (!value) return 'Navigateur Web';
  if (
    /^Navigateur /i.test(value)
    || /^(Google Chrome|Microsoft Edge|Mozilla Firefox|Safari) sur /i.test(value)
  ) {
    return value;
  }

  const browser = firstMatchingLabel(value, KNOWN_BROWSER_LABELS, 'Navigateur Web');
  const platform = firstMatchingLabel(value, KNOWN_PLATFORM_LABELS);

  if (browser === 'Navigateur de test') {
    return 'Navigateur local de test';
  }

  return platform ? `${browser} sur ${platform}` : browser;
}

export function addMinutes(baseIso: string, minutes: number) {
  return new Date(Date.parse(baseIso) + minutes * 60_000).toISOString();
}

export function addHours(baseIso: string, hours: number) {
  return new Date(Date.parse(baseIso) + hours * 3_600_000).toISOString();
}

export function addDays(baseIso: string, days: number) {
  return new Date(Date.parse(baseIso) + days * 86_400_000).toISOString();
}

export function isExpired(date?: string | null) {
  return !date ? false : Date.parse(date) <= Date.now();
}
