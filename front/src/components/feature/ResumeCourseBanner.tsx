import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  loadCourseHistory,
  type CourseHistoryEntry,
} from '@/pages/dashboard/apprenant/cours/[id]/storage';

const DISMISS_PREFIX = 'resume-banner-dismissed-';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function isDismissed(courseId: number): boolean {
  const raw = localStorage.getItem(`${DISMISS_PREFIX}${courseId}`);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  return !isNaN(ts) && Date.now() - ts < DISMISS_TTL_MS;
}

function dismiss(courseId: number) {
  localStorage.setItem(`${DISMISS_PREFIX}${courseId}`, String(Date.now()));
}

export default function ResumeCourseBanner() {
  const [entry, setEntry] = useState<CourseHistoryEntry | null>(null);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(() => {
    const history = loadCourseHistory();
    const candidates = history
      .filter((h) => h.progress > 0 && h.progress < 100)
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    const top = candidates[0] ?? null;
    if (top && !isDismissed(top.courseId)) {
      setEntry(top);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleDismiss = () => {
    if (entry) dismiss(entry.courseId);
    setVisible(false);
  };

  if (!visible || !entry) return null;

  return (
    <div className="bg-teal-600 text-white rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm animate-[slideDown_0.4s_ease-out]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="ri-play-circle-line text-lg text-white"></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            Continuer où vous vous êtes arrêté
          </p>
          <p className="text-xs text-teal-100 truncate">
            {entry.title} — {entry.progress}% complété
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/dashboard/apprenant/cours/${entry.courseId}`}
          className="px-4 py-2 bg-white text-teal-700 rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors whitespace-nowrap"
        >
          Reprendre
        </Link>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          aria-label="Masquer"
        >
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}