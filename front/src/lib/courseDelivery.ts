export type CourseDeliveryMode = 'online' | 'onsite' | 'hybrid';

export function normalizeCourseDeliveryMode(value: unknown): CourseDeliveryMode {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'onsite' || normalized === 'presentiel') {
    return 'onsite';
  }
  if (normalized === 'hybrid' || normalized === 'hybride') {
    return 'hybrid';
  }
  return 'online';
}

export function getCourseDeliveryLabel(value: unknown) {
  const mode = normalizeCourseDeliveryMode(value);
  if (mode === 'onsite') return 'Présentiel';
  if (mode === 'hybrid') return 'Hybride';
  return 'En ligne';
}

export function getCourseDeliveryIcon(value: unknown) {
  const mode = normalizeCourseDeliveryMode(value);
  if (mode === 'onsite') return 'ri-map-pin-line';
  if (mode === 'hybrid') return 'ri-repeat-2-line';
  return 'ri-wifi-line';
}

export function getCourseDeliveryBadgeClass(value: unknown) {
  const mode = normalizeCourseDeliveryMode(value);
  if (mode === 'onsite') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (mode === 'hybrid') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
}
