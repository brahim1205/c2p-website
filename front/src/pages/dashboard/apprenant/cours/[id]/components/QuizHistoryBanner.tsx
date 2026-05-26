import { QuizAttempt } from '../types';

interface QuizHistoryBannerProps {
  attempts: QuizAttempt[];
  bestScore: number;
  totalQuestions: number;
}

export default function QuizHistoryBanner({ attempts, bestScore, totalQuestions }: QuizHistoryBannerProps) {
  if (attempts.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <i className="ri-bar-chart-line text-teal-600 text-lg"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Historique des tentatives</p>
            <p className="text-xs text-gray-500">
              {attempts.length} tentative{attempts.length > 1 ? 's' : ''} · Meilleur score : {bestScore}/{totalQuestions}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {attempts.slice(-3).map((attempt, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                (attempt.score / attempt.total) * 100 >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : (attempt.score / attempt.total) * 100 >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {attempt.score}/{attempt.total}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
