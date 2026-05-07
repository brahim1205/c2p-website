import { useState, useEffect } from 'react';
import { loadXP, getCurrentStreak } from '../../cours/[id]/storage';

function getLevel(xp: number): { level: number; title: string; nextThreshold: number } {
  const levels = [
    { threshold: 0, title: 'Novice' },
    { threshold: 100, title: 'Apprenti' },
    { threshold: 500, title: 'Étudiant' },
    { threshold: 1000, title: 'Adepte' },
    { threshold: 2500, title: 'Confirmé' },
    { threshold: 5000, title: 'Expert' },
    { threshold: 10000, title: 'Maître' },
    { threshold: 20000, title: 'Guru' },
  ];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].threshold) {
      const next = levels[i + 1];
      return {
        level: i + 1,
        title: levels[i].title,
        nextThreshold: next ? next.threshold : Infinity,
      };
    }
  }
  return { level: 1, title: 'Novice', nextThreshold: 100 };
}

export default function XPBar() {
  const [xp, setXp] = useState(loadXP());
  const [streak, setStreak] = useState(getCurrentStreak());

  useEffect(() => {
    setXp(loadXP());
    setStreak(getCurrentStreak());
  }, []);

  const { level, title, nextThreshold } = getLevel(xp);
  const prevThreshold = [0, 100, 500, 1000, 2500, 5000, 10000, 20000][level - 1] ?? 0;
  const progressInLevel = nextThreshold === Infinity ? 100 : ((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <i className="ri-fire-line text-amber-600 text-lg"></i>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title} · Niveau {level}</p>
            <p className="text-xs text-gray-500">{xp.toLocaleString()} XP totaux</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">
            <i className="ri-fire-line text-orange-500 text-xs"></i>
            <span className="text-xs font-semibold text-orange-600">{streak} jours</span>
          </div>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progressInLevel, 100)}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-gray-400">{prevThreshold.toLocaleString()} XP</span>
        <span className="text-[10px] text-gray-400">
          {nextThreshold === Infinity ? 'Max' : `${nextThreshold.toLocaleString()} XP`}
        </span>
      </div>
    </div>
  );
}