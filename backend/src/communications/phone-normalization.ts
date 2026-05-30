export function normalizeSmsRecipientPhone(phone?: string | null) {
  const digits = phone?.replace(/[^\d+]/g, '').trim();
  if (!digits) return null;
  if (digits.startsWith('+221')) return `221${digits.slice(4)}`;
  if (digits.startsWith('00221')) return `221${digits.slice(5)}`;
  if (digits.startsWith('221')) return digits;
  if (/^0[76]\d{8}$/.test(digits)) return `221${digits.slice(1)}`;
  if (/^[76]\d{8}$/.test(digits)) return `221${digits}`;
  return /^\d{12}$/.test(digits) ? digits : null;
}

export function normalizeUserPhoneForStorage(phone?: string | null) {
  const normalized = normalizeSmsRecipientPhone(phone);
  return normalized ? `+${normalized}` : undefined;
}
