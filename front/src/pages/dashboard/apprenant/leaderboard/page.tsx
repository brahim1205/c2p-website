import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import {
  loadLeaderboard,
  type LeaderboardEntry,
  loadXP,
  getCurrentStreak,
  loadCourseHistory,
} from '../../apprenant/cours/[id]/storage';

type Filter = 'all' | 'week' | 'month';

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBoard(loadLeaderboard());
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const userEntry = board.find((e) => e.isCurrentUser);
  const userRank = userEntry ? board.findIndex((e) => e.id === userEntry.id) + 1 : board.length + 1;
  const totalXP = loadXP();
  const streak = getCurrentStreak();
  const completedCourses = loadCourseHistory().filter((h) => h.progress === 100).length;

  // Sort by filter criteria (simulated)
  const filtered = [...board].sort((a, b) => {
    if (filter === 'week') return b.xp * (b.streak > 0 ? 1.2 : 1) - a.xp * (a.streak > 0 ? 1.2 : 1);
    if (filter === 'month') return b.lessonsCompleted - a.lessonsCompleted;
    return b.xp - a.xp;
  });

  const getRankStyle = (idx: number) => {
    if (idx === 0) return 'bg-amber-50 border-amber-200';
    if (idx === 1) return 'bg-gray-50 border-gray-200';
    if (idx === 2) return 'bg-orange-50 border-orange-200';
    return 'bg-white border-gray-100';
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="text-lg">🥇</span>;
    if (idx === 1) return <span className="text-lg">🥈</span>;
    if (idx === 2) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-bold text-gray-400 w-6 text-center">{idx + 1}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Classement' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Classement mondial</h1>
          <p className="text-gray-600 text-sm md:text-base">Comparez votre progression avec les autres apprenants</p>
        </div>

        {/* User Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-teal-700">#{userRank}</p>
            <p className="text-xs text-teal-600">Votre position</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{totalXP.toLocaleString()}</p>
            <p className="text-xs text-amber-600">XP total</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{streak}</p>
            <p className="text-xs text-orange-600">Jours consécutifs</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{completedCourses}</p>
            <p className="text-xs text-emerald-600">Cours terminés</p>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-8">
          <div className="flex items-end justify-center gap-3 md:gap-6 h-48">
            {filtered.slice(0, 3).map((entry, idx) => {
              const heights = ['h-28', 'h-40', 'h-24'];
              const order = idx === 0 ? 1 : idx === 1 ? 0 : 2;
              const h = heights[order];
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col items-center gap-2 ${order === 1 ? 'order-1' : order === 0 ? 'order-0' : 'order-2'}`}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    transition: `all 0.5s ease ${order * 150}ms`,
                  }}
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white shadow-md">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 text-sm font-bold">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 text-center max-w-[80px] truncate">{entry.name}</p>
                  <p className="text-[10px] text-gray-500">{entry.xp.toLocaleString()} XP</p>
                  <div className={`w-20 md:w-24 ${h} rounded-t-xl flex items-center justify-center ${
                    order === 1 ? 'bg-amber-100' : order === 0 ? 'bg-gray-200' : 'bg-orange-100'
                  }`}>
                    <span className="text-2xl font-bold text-gray-700">{order + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tableau de classement</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'all' as Filter, label: 'Global' },
              { key: 'week' as Filter, label: 'Semaine' },
              { key: 'month' as Filter, label: 'Mois' },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filter === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="hidden md:grid grid-cols-[60px_1fr_100px_100px_100px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Rang</span>
            <span>Apprenant</span>
            <span className="text-right">XP</span>
            <span className="text-right">Leçons</span>
            <span className="text-right">Cours</span>
            <span className="text-right">Streak</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex flex-col md:grid md:grid-cols-[60px_1fr_100px_100px_100px_100px] gap-3 md:gap-4 px-5 py-3.5 items-center transition-colors ${
                  entry.isCurrentUser ? 'bg-teal-50/50' : 'hover:bg-gray-50'
                }`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `all 0.3s ease ${idx * 50}ms`,
                }}
              >
                <div className="flex items-center gap-3 md:gap-0">
                  <span className="md:hidden text-xs font-semibold text-gray-500">#{idx + 1}</span>
                  <div className="hidden md:flex w-8 h-8 items-center justify-center">
                    {getRankBadge(idx)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 text-xs font-bold">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-teal-700' : 'text-gray-900'}`}>
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] rounded-full font-medium">
                          Vous
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 md:hidden">
                      {entry.xp.toLocaleString()} XP · {entry.lessonsCompleted} leçons
                    </p>
                  </div>
                </div>

                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-gray-900">{entry.xp.toLocaleString()}</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm text-gray-700">{entry.lessonsCompleted}</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm text-gray-700">{entry.coursesCompleted}</p>
                </div>
                <div className="hidden md:block text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    entry.streak >= 7
                      ? 'bg-orange-100 text-orange-700'
                      : entry.streak >= 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    <i className="ri-fire-line"></i>
                    {entry.streak}j
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User ranking summary if not in top */}
        {userRank > 10 && userEntry && (
          <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-teal-700">#{userRank}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Vous</p>
                <p className="text-xs text-gray-500">
                  {userEntry.xp.toLocaleString()} XP · {userEntry.lessonsCompleted} leçons · {userEntry.coursesCompleted} cours
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-teal-600 font-medium">
                {filtered[userRank - 2] ? `+${(filtered[userRank - 2].xp - userEntry.xp).toLocaleString()} XP pour dépasser ${filtered[userRank - 2].name.split(' ')[0]}` : 'Top !'}
              </span>
              <i className="ri-arrow-up-line text-teal-600"></i>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-trophy-line text-teal-600 text-xl"></i>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Montez dans le classement</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            Complétez des leçons, réussissez des quiz et maintenez une streak pour gagner plus de XP.
          </p>
          <Link
            to="/dashboard/apprenant/mes-cours"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-book-open-line"></i>
            Continuer à apprendre
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}