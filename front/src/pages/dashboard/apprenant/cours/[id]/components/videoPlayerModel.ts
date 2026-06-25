export interface Chapter {
  time: number;
  label: string;
}

export interface VideoPlayerProps {
  duration: string;
  title: string;
  onComplete: () => void;
  isCompleted: boolean;
  chapters?: Chapter[];
  thumbnail?: string;
  src?: string;
  initialTime?: number;
  onProgress?: (seconds: number) => void;
}

export const VIDEO_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function readDurationUnit(duration: string, unit: string) {
  const unitIndex = duration.indexOf(unit);
  if (unitIndex <= 0) return 0;
  let cursor = unitIndex - 1;
  while (cursor >= 0 && duration[cursor] === ' ') cursor -= 1;
  let start = cursor;
  while (start >= 0 && duration[start] >= '0' && duration[start] <= '9') start -= 1;
  const value = Number(duration.slice(start + 1, cursor + 1));
  return Number.isFinite(value) ? value : 0;
}

export function parseDuration(duration: string): number {
  let total = readDurationUnit(duration, 'h') * 3600;
  total += readDurationUnit(duration, 'min') * 60;
  total += readDurationUnit(duration, 's');
  if (total === 0) {
    const num = parseInt(duration, 10);
    if (!isNaN(num)) total = num * 60;
  }
  return total || 300;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
