import { useMemo } from 'react';
import { getLearningDaysForHeatmap } from '../../cours/[id]/storage';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getColorClass(xp: number): string {
  if (xp >= 100) return 'bg-teal-700';
  if (xp >= 50) return 'bg-teal-500';
  if (xp >= 25) return 'bg-teal-400';
  if (xp >= 10) return 'bg-teal-300';
  return 'bg-teal-200';
}

function formatMonthLabel(date: Date): string {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[date.getMonth()];
}

export default function LearningHeatmap() {
  const daysBack = 84;
  const dailyXP = useMemo(() => getLearningDaysForHeatmap(daysBack), []);

  const weeks = useMemo(() => {
    const result: { date: Date; dateStr: string; xp: number }[][] = [];
    let currentWeek: { date: Date; dateStr: string; xp: number }[] = [];
    const today = new Date();
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      currentWeek.push({ date: d, dateStr: ds, xp: dailyXP[ds] ?? 0 });
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [dailyXP]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wIdx) => {
      week.forEach((day) => {
        if (day.date.getMonth() !== lastMonth) {
          lastMonth = day.date.getMonth();
          labels.push({ label: formatMonthLabel(day.date), index: wIdx });
        }
      });
    });
    return labels;
  }, [weeks]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Heatmap d&apos;apprentissage</h3>
      <p className="text-xs text-gray-500 mb-4">12 dernières semaines d&apos;activité</p>

      <div className="flex gap-0.5 overflow-x-auto pb-1">
        <div className="flex flex-col gap-0.5 mr-1">
          {WEEK_DAYS.map((d, i) => (
            <div key={i} className="w-3 h-3 text-[8px] text-gray-400 flex items-center justify-center">
              {d}
            </div>
          ))}
        </div>

        <div>
          <div className="flex gap-0.5 mb-1 h-3">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[8px] text-gray-400 whitespace-nowrap"
                style={{ marginLeft: i === 0 ? `${m.index * 18}px` : undefined }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-0.5">
                {week.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className={`w-3 h-3 rounded-sm ${
                      day.xp > 0 ? getColorClass(day.xp) : 'bg-gray-100'
                    }`}
                    title={`${day.dateStr} · ${day.xp > 0 ? `${day.xp} XP` : 'Aucune activité'}`}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-gray-400">Moins</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
          <div className="w-3 h-3 rounded-sm bg-teal-200"></div>
          <div className="w-3 h-3 rounded-sm bg-teal-300"></div>
          <div className="w-3 h-3 rounded-sm bg-teal-400"></div>
          <div className="w-3 h-3 rounded-sm bg-teal-500"></div>
          <div className="w-3 h-3 rounded-sm bg-teal-700"></div>
        </div>
        <span className="text-[10px] text-gray-400">Plus</span>
      </div>
    </div>
  );
}