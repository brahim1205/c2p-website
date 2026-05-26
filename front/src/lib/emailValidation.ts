export function isBasicEmail(value: string) {
  const normalized = value.trim();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf('@')) return false;

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!localPart || !domain || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (normalized.includes(' ') || normalized.includes('\t') || normalized.includes('\n')) return false;

  const dotIndex = domain.lastIndexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}
