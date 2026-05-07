import { useState, useEffect } from 'react';
import { loadLeaderboard, LeaderboardEntry } from '../../cours/[id]/storage';

type Filter = 'all' | 'week' | 'month';

export default function Leaderboard() {
  const [filter, setFilter] = useState<Filter>('all');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setBoard(loadLeaderboard());
  }, []);

  const filtered = board;
  const userRank = board.findIndex((e) => e.isCurrentUser) + 1 || board.length + 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Classement</h3>
          <p className="text-xs text-gray-500">
            Vous êtes <span className="font-semibold text-teal-600">#{userRank}</span>
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { key: 'all' as Filter, label: 'Global' },
            { key: 'week' as Filter, label: 'Semaine' },
            { key: 'month' as Filter, label: 'Mois' },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filter === f.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {filtered.slice(0, 10).map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              entry.isCurrentUser
                ? 'bg-teal-50 border border-teal-200'
                : 'hover:bg-gray-50'
            }`}
          >
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                idx === 0
                  ? 'bg-amber-100 text-amber-700'
                  : idx === 1
                    ? 'bg-gray-200 text-gray-700'
                    : idx === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-400'
              }`}
            >
              {idx + 1}
            </span>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              {entry.avatar ? (
                <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 text-xs font-bold">
                  {entry.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-teal-800' : 'text-gray-900'}`}>
                {entry.name}
                {entry.isCurrentUser && <span className="ml-1 text-xs text-teal-500">(Vous)</span>}
              </p>
              <p className="text-[10px] text-gray-400">
                {entry.lessonsCompleted} leçons · {entry.coursesCompleted} cours
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">{entry.xp.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">XP</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}