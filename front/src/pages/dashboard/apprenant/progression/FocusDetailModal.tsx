import { formatLearningTime, type FocusArea } from './progressionModel';

export function FocusDetailModal({ focus, onClose }: { focus: FocusArea; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${focus.iconBg}`}>
              <i className={`${focus.icon} ${focus.iconColor} text-xl`}></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{focus.label}</h3>
              <p className="text-sm text-gray-600">{focus.coursesCount} cours suivis</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100" aria-label="Fermer le détail de la compétence">
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Progression moyenne</span>
            <span className="text-lg font-bold text-teal-600">{focus.progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200">
            <div className={`h-3 rounded-full transition-all ${getProgressTone(focus.progress)}`} style={{ width: `${focus.progress}%` }}></div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <FocusMetric label="Leçons estimées" value={`${focus.completedLessons}/${focus.totalLessons}`} />
          <FocusMetric label="Cours terminés" value={String(focus.completedCourses)} />
          <FocusMetric className="col-span-2" label="Temps cumulé estimé" value={formatLearningTime(focus.learningTimeSeconds)} />
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-700">{getFocusRecommendation(focus.progress)}</p>
        </div>
      </div>
    </div>
  );
}

function FocusMetric({ className = '', label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={`rounded-lg bg-gray-50 p-3 ${className}`}>
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function getProgressTone(progress: number) {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-teal-500';
  return 'bg-amber-500';
}

function getFocusRecommendation(progress: number) {
  if (progress >= 80) {
    return 'Vous êtes en zone de maîtrise. Le bon levier maintenant est de finaliser les derniers cours et de capitaliser sur les certificats.';
  }
  if (progress >= 50) {
    return 'La base est bien installée. Gardez un rythme régulier et reprenez les cours laissés à mi-parcours pour consolider ce domaine.';
  }
  return 'Le domaine est encore en construction. Reprenez en priorité les cours les moins avancés pour remettre la progression sur des bases solides.';
}
