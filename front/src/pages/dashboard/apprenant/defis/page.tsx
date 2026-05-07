import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  loadXP,
  addXP,
  XP_REWARDS,
  loadCompletedLessons,
  loadCourseHistory,
  loadSessionTime,
} from '../cours/[id]/storage';

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  unit: string;
  xpReward: number;
  completed: boolean;
  type: 'lessons' | 'quiz' | 'time' | 'streak' | 'bookmark';
}

interface ChallengesState {
  date: string;
  challenges: DailyChallenge[];
  totalCompleted: number;
  claimed: string[];
}

const CHALLENGES_KEY = 'daily-challenges';

function generateDailyChallenges(): DailyChallenge[] {
  const allChallenges: Omit<DailyChallenge, 'current' | 'completed'>[] = [
    { id: 'lessons-3', title: 'Apprenti du jour', description: 'Compléter 3 leçons aujourd\'hui', icon: 'ri-book-open-line', target: 3, unit: 'leçons', xpReward: 30, type: 'lessons' },
    { id: 'quiz-1', title: 'Testez vos connaissances', description: 'Réussir 1 quiz avec au moins 80%', icon: 'ri-question-line', target: 1, unit: 'quiz', xpReward: 40, type: 'quiz' },
    { id: 'time-30', title: 'Session concentrée', description: 'Apprendre pendant 30 minutes', icon: 'ri-timer-line', target: 30, unit: 'min', xpReward: 25, type: 'time' },
    { id: 'streak-continue', title: 'Maintenez le rythme', description: 'Ajouter une journée à votre streak', icon: 'ri-fire-line', target: 1, unit: 'jour', xpReward: 50, type: 'streak' },
    { id: 'bookmark-2', title: 'Collectionneur', description: 'Ajouter 2 leçons aux favoris', icon: 'ri-bookmark-line', target: 2, unit: 'favoris', xpReward: 20, type: 'bookmark' },
    { id: 'lessons-5', title: 'Marathonien', description: 'Compléter 5 leçons aujourd\'hui', icon: 'ri-run-line', target: 5, unit: 'leçons', xpReward: 60, type: 'lessons' },
    { id: 'time-60', title: 'Expert en concentration', description: 'Apprendre pendant 60 minutes', icon: 'ri-hourglass-line', target: 60, unit: 'min', xpReward: 45, type: 'time' },
    { id: 'quiz-perfect', title: 'Sans faute', description: 'Réussir un quiz avec 100%', icon: 'ri-medal-line', target: 1, unit: 'quiz parfait', xpReward: 75, type: 'quiz' },
  ];
  // Pick 4 random challenges for the day
  const shuffled = [...allChallenges].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  return selected.map((c) => ({ ...c, current: 0, completed: false }));
}

function loadChallengesState(): ChallengesState {
  try {
    const raw = localStorage.getItem(CHALLENGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChallengesState;
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date === today) return parsed;
    }
  } catch { /* noop */ }
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    challenges: generateDailyChallenges(),
    totalCompleted: 0,
    claimed: [],
  };
}

function saveChallengesState(state: ChallengesState): void {
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(state));
}

function computeCurrentProgress(type: string): number {
  if (type === 'lessons') {
    // Count lessons completed today (approximation: check if any lessons were completed)
    const history = loadCourseHistory();
    const today = new Date().toISOString().split('T')[0];
    return history.filter(h => h.lastAccessed.startsWith(today)).reduce((s, h) => s + h.completedLessons, 0);
  }
  if (type === 'time') {
    // Sum session time from today (approximation)
    const history = loadCourseHistory();
    let totalSeconds = 0;
    for (const entry of history) {
      totalSeconds += loadSessionTime(entry.courseId);
    }
    return Math.floor(totalSeconds / 60);
  }
  if (type === 'quiz') {
    // Check quiz scores from today — we don't track per-day, so use 0
    return 0;
  }
  if (type === 'streak') {
    // Approximate: check if user has learned today
    const today = new Date().toISOString().split('T')[0];
    const history = loadCourseHistory();
    const accessedToday = history.some(h => h.lastAccessed.startsWith(today));
    return accessedToday ? 1 : 0;
  }
  if (type === 'bookmark') {
    // We don't track per-day bookmarks, so use 0
    return 0;
  }
  return 0;
}

export default function ApprenantDefisPage() {
  const { success, info } = useToast();
  const [state, setState] = useState<ChallengesState>(loadChallengesState);
  const [mounted, setMounted] = useState(false);
  const [claimedAnim, setClaimedAnim] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const updated = prev.challenges.map((c) => {
          const current = computeCurrentProgress(c.type);
          return {
            ...c,
            current,
            completed: current >= c.target,
          };
        });
        const completedCount = updated.filter((c) => c.completed).length;
        return { ...prev, challenges: updated, totalCompleted: completedCount };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = useCallback((challengeId: string) => {
    setState((prev) => {
      if (prev.claimed.includes(challengeId)) return prev;
      const challenge = prev.challenges.find((c) => c.id === challengeId);
      if (!challenge || !challenge.completed) return prev;

      addXP(challenge.xpReward);
      const updatedClaimed = [...prev.claimed, challengeId];
      saveChallengesState({ ...prev, claimed: updatedClaimed });
      setClaimedAnim(challengeId);
      setTimeout(() => setClaimedAnim(null), 1500);
      success(`+${challenge.xpReward} XP récupérés !`, `Défi "${challenge.title}" complété.`);
      return { ...prev, claimed: updatedClaimed };
    });
  }, [success]);

  const totalXP = loadXP();
  const completedCount = state.challenges.filter((c) => c.completed).length;
  const claimedCount = state.claimed.length;
  const allCompleted = completedCount === state.challenges.length;

  const getProgressColor = (challenge: DailyChallenge) => {
    if (challenge.completed) return 'bg-emerald-500';
    if (challenge.current > 0) return 'bg-teal-500';
    return 'bg-gray-300';
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Défis quotidiens' }]} />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Défis quotidiens</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <i className="ri-fire-line text-amber-600 text-sm"></i>
                <span className="text-sm font-semibold text-amber-700">{totalXP} XP</span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Accomplissez vos missions quotidiennes pour gagner des bonus XP
          </p>
        </div>

        {/* Progress overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Progression du jour : {claimedCount}/{state.challenges.length} défis récupérés
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {allCompleted ? 'Tous les défis sont complétés !' : `${completedCount - claimedCount} en attente de récupération`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-600">
                {state.challenges.reduce((s, c) => (state.claimed.includes(c.id) ? s + c.xpReward : s), 0)} XP
              </p>
              <p className="text-xs text-gray-500">gagnés aujourd&apos;hui</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
              style={{ width: mounted ? `${(claimedCount / state.challenges.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {state.challenges.map((challenge, idx) => {
            const isClaimed = state.claimed.includes(challenge.id);
            const pct = Math.min((challenge.current / challenge.target) * 100, 100);
            return (
              <div
                key={challenge.id}
                className={`relative bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                  isClaimed ? 'border-emerald-200 bg-emerald-50/40' : challenge.completed ? 'border-teal-200' : 'border-gray-200'
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Claimed badge */}
                {isClaimed && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      <i className="ri-check-line mr-0.5"></i>
                      Récupéré
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isClaimed ? 'bg-emerald-100' : challenge.completed ? 'bg-teal-100' : 'bg-gray-100'
                  }`}>
                    <i className={`${challenge.icon} text-xl ${
                      isClaimed ? 'text-emerald-600' : challenge.completed ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold mb-0.5 ${isClaimed ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{challenge.description}</p>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">
                          {challenge.current}/{challenge.target} {challenge.unit}
                        </span>
                        <span className="font-medium text-gray-700">{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${getProgressColor(challenge)}`}
                          style={{ width: mounted ? `${Math.max(pct, 4)}%` : '0%' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <i className="ri-fire-line text-[10px]"></i>
                        +{challenge.xpReward} XP
                      </span>

                      {challenge.completed && !isClaimed && (
                        <button
                          onClick={() => handleClaim(challenge.id)}
                          className={`px-4 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-all whitespace-nowrap cursor-pointer ${
                            claimedAnim === challenge.id ? 'scale-105' : ''
                          }`}
                        >
                          <i className="ri-gift-line mr-1"></i>
                          Récupérer
                        </button>
                      )}

                      {isClaimed && (
                        <span className="text-xs text-emerald-600 font-medium">
                          <i className="ri-check-double-line mr-0.5"></i>
                          Complété
                        </span>
                      )}

                      {!challenge.completed && (
                        <Link
                          to="/dashboard/apprenant/mes-cours"
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Commencer
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly streak bonus */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-calendar-check-line text-amber-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Bonus hebdomadaire</h3>
              <p className="text-xs text-gray-500">Complétez tous les défis 7 jours de suite pour un bonus de 200 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
              // Simulate: first 3 days completed
              const completed = i < 3;
              return (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    completed
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-400'
                  }`}
                >
                  {dayNames[i]}
                </div>
              );
            })}
          </div>
        </div>

        {/* XP animation overlay */}
        {claimedAnim && (
          <div className="fixed top-4 right-4 z-50 animate-bounce">
            <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <i className="ri-fire-line text-lg"></i>
              <span className="text-sm font-bold">
                +{state.challenges.find((c) => c.id === claimedAnim)?.xpReward ?? 0} XP
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}