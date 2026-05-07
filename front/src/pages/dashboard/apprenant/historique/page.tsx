import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { loadCourseHistory, loadUnlockedBadges, BADGES, loadXP, getCurrentStreak } from '../cours/[id]/storage';
import XPBar from './components/XPBar';
import LearningHeatmap from './components/LearningHeatmap';
import Leaderboard from './components/Leaderboard';

export default function ApprenantHistoriquePage() {
  const [history, setHistory] = useState(loadCourseHistory());
  const [badges, setBadges] = useState(loadUnlockedBadges());
  const [xp, setXp] = useState(loadXP());
  const [streak, setStreak] = useState(getCurrentStreak());

  useEffect(() => {
    setHistory(loadCourseHistory());
    setBadges(loadUnlockedBadges());
    setXp(loadXP());
    setStreak(getCurrentStreak());
  }, []);

  const unlockedBadges = BADGES.filter((b) => badges.includes(b.id));
  const totalCompleted = history.reduce((sum, h) => sum + h.completedLessons, 0);
  const totalLessons = history.reduce((sum, h) => sum + h.totalLessons, 0);
  const globalProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const completedCourses = history.filter((h) => h.progress === 100).length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Apprenant', path: '/dashboard/apprenant' },
            { label: 'Mon historique' },
          ]}
        />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Mon historique</h1>
          <p className="text-sm text-gray-500">
            Suivi de toutes vos formations et de votre progression globale.
          </p>
        </div>

        {/* Top row: stats + XP + heatmap + leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left column: XP + stats */}
          <div className="space-y-4">
            <XPBar />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center mb-2">
                  <i className="ri-book-open-line text-teal-600 text-base"></i>
                </div>
                <p className="text-xl font-bold text-gray-900">{history.length}</p>
                <p className="text-[11px] text-gray-500">Formations suivies</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
                  <i className="ri-award-line text-emerald-600 text-base"></i>
                </div>
                <p className="text-xl font-bold text-gray-900">{completedCourses}</p>
                <p className="text-[11px] text-gray-500">Cours terminés</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
                  <i className="ri-trophy-line text-amber-600 text-base"></i>
                </div>
                <p className="text-xl font-bold text-gray-900">{unlockedBadges.length}</p>
                <p className="text-[11px] text-gray-500">Badges débloqués</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                  <i className="ri-fire-line text-orange-600 text-base"></i>
                </div>
                <p className="text-xl font-bold text-gray-900">{streak}</p>
                <p className="text-[11px] text-gray-500">Jours de suite</p>
              </div>
            </div>
          </div>

          {/* Middle column: heatmap */}
          <div className="lg:col-span-1">
            <LearningHeatmap />
          </div>

          {/* Right column: leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard />
          </div>
        </div>

        {/* Badges section */}
        {unlockedBadges.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-medal-line text-amber-500"></i>
              Mes badges ({unlockedBadges.length}/{BADGES.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${badge.color}-50 border border-${badge.color}-200`}
                >
                  <div className={`w-7 h-7 bg-${badge.color}-100 rounded-full flex items-center justify-center`}>
                    <i className={`${badge.icon} text-${badge.color}-600 text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{badge.name}</p>
                    <p className="text-[10px] text-gray-500">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {unlockedBadges.length < BADGES.length && (
              <p className="text-[11px] text-gray-400 mt-3">
                Encore {BADGES.length - unlockedBadges.length} badge{BADGES.length - unlockedBadges.length > 1 ? 's' : ''} à débloquer. Continuez à apprendre !
              </p>
            )}
          </div>
        )}

        {/* Courses list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Formations en cours</h2>
            <Link
              to="/dashboard/apprenant/mes-cours"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Voir le catalogue →
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-book-open-line text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun historique</h3>
              <p className="text-sm text-gray-500 mb-4">
                Vous n&apos;avez pas encore consulté de formation. Commencez votre parcours d&apos;apprentissage dès maintenant.
              </p>
              <Link
                to="/dashboard/apprenant/mes-cours"
                className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Explorer les formations
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history
                .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
                .map((entry) => (
                  <div key={entry.courseId} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <img
                        src={entry.thumbnail}
                        alt={entry.title}
                        className="w-full sm:w-32 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            {entry.category}
                          </span>
                          {entry.progress === 100 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <i className="ri-check-double-line"></i>
                              Terminé
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">{entry.title}</h3>
                        <p className="text-xs text-gray-500 mb-2">Par {entry.instructor}</p>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[200px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">{entry.progress}%</span>
                              <span className="text-xs text-gray-400">
                                {entry.completedLessons}/{entry.totalLessons}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  entry.progress === 100 ? 'bg-emerald-500' : 'bg-teal-500'
                                }`}
                                style={{ width: `${entry.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Link
                          to={`/dashboard/apprenant/cours/${entry.courseId}`}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            entry.progress === 100
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          {entry.progress === 100 ? 'Revoir' : 'Continuer'}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
