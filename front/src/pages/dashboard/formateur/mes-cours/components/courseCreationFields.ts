export function getFieldClass(hasError?: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-teal-500'
  }`;
}

export function formatBytes(value: number | null | undefined) {
  if (!value) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
