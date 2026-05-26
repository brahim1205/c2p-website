export function normalizeIp(ip?: string | null) {
  const value = String(ip ?? '').trim();
  if (!value) return 'Adresse masquee';
  if (['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost'].includes(value)) {
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

  const browser = /HeadlessChrome/i.test(value)
    ? 'Navigateur de test'
    : /Edg\//i.test(value)
      ? 'Microsoft Edge'
      : /Chrome\//i.test(value)
        ? 'Google Chrome'
        : /Firefox\//i.test(value)
          ? 'Mozilla Firefox'
          : /Safari\//i.test(value) && !/Chrome\//i.test(value)
            ? 'Safari'
            : 'Navigateur Web';

  const platform = /Windows/i.test(value)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(value)
      ? 'macOS'
      : /Android/i.test(value)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(value)
          ? 'iOS'
          : /Linux/i.test(value)
            ? 'Linux'
            : '';

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
