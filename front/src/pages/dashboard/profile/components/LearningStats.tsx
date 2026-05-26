import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchApprenantEnrollments, type ApprenantEnrollment } from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay());
  return weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getWeeklyActivity(enrollments: ApprenantEnrollment[]): { label: string; xp: number }[] {
  const weekly: Record<string, number> = {};
  for (const enrollment of enrollments) {
    const ds = String(enrollment.last_active ?? enrollment.enrolled_at ?? '').slice(0, 10);
    if (!ds) continue;
    const label = getWeekLabel(ds);
    weekly[label] = (weekly[label] || 0) + Math.max(1, Math.round(Number(enrollment.progress || 0) / 10));
  }
  const entries = Object.entries(weekly).map(([label, xp]) => ({ label, xp }));
  entries.sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  return entries.slice(-12);
}

function parseDurationToMinutes(d: string): number {
  let total = readDurationUnit(d, 'h') * 60;
  total += readDurationUnit(d, 'min');
  if (total === 0) {
    const num = parseInt(d, 10);
    if (!isNaN(num)) total = num;
  }
  return total;
}

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

export default function LearningStats() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.apprenant.enrollments(user?.id),
    enabled: user?.role === 'apprenant' && Boolean(user.id),
    queryFn: () => fetchApprenantEnrollments(user?.id ?? ''),
  });
  const enrollments: ApprenantEnrollment[] = enrollmentsQuery.data ?? [];
  const weeklyXP = getWeeklyActivity(enrollments);
  const history = enrollments.map((enrollment) => {
    const totalLessons = Math.max(
      enrollment.course_lessons_count ?? 0,
      enrollment.courses?.modules ?? 0,
      enrollment.completed_lessons_estimate ?? 0,
      1,
    );
    return {
      courseId: enrollment.courses?.id ?? enrollment.course_id,
      title: enrollment.courses?.title || enrollment.course_name || 'Formation',
      progress: Math.max(0, Math.min(100, Math.round(Number(enrollment.progress || 0)))),
      totalLessons,
      completedLessons: Math.max(
        0,
        enrollment.completed_lessons_estimate ?? Math.round((Number(enrollment.progress || 0) / 100) * totalLessons),
      ),
    };
  });
  const completedCourses = history.filter((h) => h.progress === 100).length;
  const inProgress = history.filter((h) => h.progress < 100).length;
  const totalLessons = history.reduce((s, h) => s + h.totalLessons, 0);
  const totalCompleted = history.reduce((s, h) => s + h.completedLessons, 0);

  const totalMinutes = history.reduce((sum, h) => {
    const avgMin = parseDurationToMinutes(h.totalLessons > 0 ? '45 min' : '30 min');
    return sum + h.completedLessons * avgMin;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMin = totalMinutes % 60;

  const maxWeeklyXP = weeklyXP.length > 0 ? Math.max(...weeklyXP.map((w) => w.xp)) : 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-teal-700">{history.length}</p>
          <p className="text-xs text-teal-600">Cours suivis</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-700">{completedCourses}</p>
          <p className="text-xs text-emerald-600">Cours terminés</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-700">{totalCompleted}</p>
          <p className="text-xs text-amber-600">Leçons complétées</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-700">
            {totalHours}h{totalMin}
          </p>
          <p className="text-xs text-orange-600">Temps d'apprentissage</p>
        </div>
      </div>

      {/* Weekly XP bar chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">XP gagné par semaine</h3>
          <span className="text-xs text-gray-400">12 dernières semaines</span>
        </div>
        {weeklyXP.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Aucune donnée pour le moment</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {weeklyXP.map((w, i) => {
              const pct = (w.xp / maxWeeklyXP) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md transition-all duration-700"
                    style={{
                      height: mounted ? `${Math.max(pct, 8)}%` : '0%',
                      transitionDelay: `${i * 60}ms`,
                    }}
                    title={`${w.xp} XP`}
                  />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap truncate w-full text-center">
                    {w.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global progress donut + course breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 self-start">Progression globale</h3>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3"
                strokeDasharray={`${totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0}, 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-xl font-bold text-gray-900">
                {totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%
              </span>
              <span className="text-[10px] text-gray-500">complété</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Répartition par cours</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map((h) => (
              <div key={h.courseId}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{h.title}</p>
                  <span className="text-xs text-gray-500">
                    {h.completedLessons}/{h.totalLessons}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      h.progress === 100 ? 'bg-emerald-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${h.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-xs text-gray-400">Aucun cours suivi</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
