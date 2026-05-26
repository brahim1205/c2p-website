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
  initialTime?: number;
  onProgress?: (seconds: number) => void;
}

export const VIDEO_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function parseDuration(duration: string): number {
  let total = 0;
  const hMatch = duration.match(/(\d+)\s*h/);
  const mMatch = duration.match(/(\d+)\s*min/);
  const sMatch = duration.match(/(\d+)\s*s/);
  if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) total += parseInt(mMatch[1], 10) * 60;
  if (sMatch) total += parseInt(sMatch[1], 10);
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
