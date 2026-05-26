export function createClientRandomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  const values = new Uint32Array(2);
  globalThis.crypto?.getRandomValues(values);
  const entropy = Array.from(values).map((value) => value.toString(36)).join('');
  return `${prefix}-${Date.now().toString(36)}-${entropy || 'fallback'}`;
}
