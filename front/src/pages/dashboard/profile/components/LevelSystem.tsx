import { useEffect, useState } from 'react';
import { loadXP } from '../../apprenant/cours/[id]/storage';

interface Level {
  name: string;
  min: number;
  max: number;
  icon: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const LEVELS: Level[] = [
  { name: 'Novice', min: 0, max: 499, icon: 'ri-seedling-line', color: '#9CA3AF', bgClass: 'bg-gray-100', textClass: 'text-gray-600', borderClass: 'border-gray-200' },
  { name: 'Apprenti', min: 500, max: 1499, icon: 'ri-plant-line', color: '#22C55E', bgClass: 'bg-green-100', textClass: 'text-green-700', borderClass: 'border-green-200' },
  { name: 'Explorateur', min: 1500, max: 2999, icon: 'ri-compass-3-line', color: '#5fa6f3', bgClass: 'bg-teal-100', textClass: 'text-teal-700', borderClass: 'border-teal-200' },
  { name: 'Adepte', min: 3000, max: 5499, icon: 'ri-lightbulb-line', color: '#F59E0B', bgClass: 'bg-amber-100', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
  { name: 'Expert', min: 5500, max: 8999, icon: 'ri-vip-crown-line', color: '#F97316', bgClass: 'bg-orange-100', textClass: 'text-orange-700', borderClass: 'border-orange-200' },
  { name: 'Maître', min: 9000, max: 13999, icon: 'ri-medal-line', color: '#EF4444', bgClass: 'bg-red-100', textClass: 'text-red-700', borderClass: 'border-red-200' },
  { name: 'Guru', min: 14000, max: Infinity, icon: 'ri-star-smile-line', color: '#27346b', bgClass: 'bg-teal-100', textClass: 'text-teal-700', borderClass: 'border-teal-200' },
];

function getLevelForXP(xp: number): Level {
  return LEVELS.find((l) => xp >= l.min && xp < l.max) || LEVELS[LEVELS.length - 1];
}

function getNextLevel(level: Level): Level | null {
  const idx = LEVELS.indexOf(level);
  if (idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
}

export default function LevelSystem() {
  const [mounted, setMounted] = useState(false);
  const xp = loadXP();
  const currentLevel = getLevelForXP(xp);
  const nextLevel = getNextLevel(currentLevel);

  const range = currentLevel.max - currentLevel.min;
  const progress = nextLevel ? Math.min(((xp - currentLevel.min) / range) * 100, 100) : 100;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Current level card */}
      <div className={`rounded-xl border ${currentLevel.borderClass} ${currentLevel.bgClass} p-5 text-center`}>
        <div className="relative inline-block mb-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: currentLevel.color + '20' }}
          >
            <i className={`${currentLevel.icon} text-3xl`} style={{ color: currentLevel.color }}></i>
          </div>
          {nextLevel && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
              {LEVELS.indexOf(currentLevel) + 1}
            </div>
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{currentLevel.name}</h3>
        <p className="text-sm text-gray-500">
          {nextLevel
            ? `${xp.toLocaleString('fr-FR')} / ${nextLevel.min.toLocaleString('fr-FR')} XP`
            : `${xp.toLocaleString('fr-FR')} XP — Niveau maximum atteint`}
        </p>
      </div>

      {/* Progress bar to next level */}
      {nextLevel && (
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-900">
              {currentLevel.name}
            </span>
            <span className="font-medium text-gray-900">
              {nextLevel.name}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: mounted ? `${progress}%` : '0%',
                backgroundColor: currentLevel.color,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            {nextLevel.min - xp > 0
              ? `Encore ${(nextLevel.min - xp).toLocaleString('fr-FR')} XP pour atteindre ${nextLevel.name}`
              : 'Niveau suivant débloquable !'}
          </p>
        </div>
      )}

      {/* All levels roadmap */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Parcours des niveaux</h3>
        <div className="space-y-3">
          {LEVELS.map((level, idx) => {
            const isCurrent = level.name === currentLevel.name;
            const isPast = xp >= level.max && level.max !== Infinity;
            const isFuture = xp < level.min;
            return (
              <div
                key={level.name}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrent
                    ? `${level.bgClass} ${level.borderClass} border`
                    : isPast
                    ? 'bg-gray-50 opacity-60'
                    : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent ? '' : isPast ? 'bg-gray-200' : 'bg-gray-100'
                  }`}
                  style={isCurrent ? { backgroundColor: level.color + '20' } : {}}
                >
                  <i
                    className={`${level.icon} text-lg ${isCurrent ? '' : isPast ? 'text-gray-400' : 'text-gray-300'}`}
                    style={isCurrent ? { color: level.color } : {}}
                  ></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${isCurrent ? level.textClass : isPast ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                      {level.name}
                    </p>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-white text-[10px] font-bold rounded-full border" style={{ borderColor: level.color, color: level.color }}>
                        Actuel
                      </span>
                    )}
                    {isPast && (
                      <i className="ri-check-line text-gray-400 text-sm"></i>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {level.max === Infinity
                      ? `${level.min}+ XP`
                      : `${level.min} — ${level.max} XP`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}