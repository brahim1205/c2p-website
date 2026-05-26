import { Link } from 'react-router-dom';

function formatSessionTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CourseStatusBannersProps {
  showXpToast: boolean;
  xpGained: number;
  showSessionTimer: boolean;
  sessionTimer: number;
  currentProgress: number;
}

export default function CourseStatusBanners({
  showXpToast,
  xpGained,
  showSessionTimer,
  sessionTimer,
  currentProgress,
}: CourseStatusBannersProps) {
  return (
    <>
      {showXpToast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <i className="ri-fire-line text-lg"></i>
            <span className="text-sm font-bold">+{xpGained} XP</span>
          </div>
        </div>
      )}

      {showSessionTimer && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs">
            <i className="ri-timer-line text-teal-400"></i>
            <span className="font-mono">{formatSessionTime(sessionTimer)}</span>
            <span className="text-white/60">de session</span>
          </div>
        </div>
      )}

      {currentProgress === 100 && (
        <div className="mx-4 lg:mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-award-line text-amber-600 text-lg"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Cours terminé !</p>
              <p className="text-xs text-gray-500">Le certificat est disponible dans votre espace certificats lorsqu il est émis.</p>
            </div>
          </div>
          <Link
            to="/dashboard/apprenant/certificats"
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-award-line mr-1"></i>
            Mes certificats
          </Link>
        </div>
      )}
    </>
  );
}
