import { useEffect, useState } from 'react';
import { loadUnlockedBadges, BADGES } from '../../apprenant/cours/[id]/storage';

const rarityConfig: Record<string, { border: string; bg: string; glow: string }> = {
  amber: { border: 'border-amber-300', bg: 'bg-amber-50', glow: 'shadow-amber-200' },
  emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50', glow: 'shadow-emerald-200' },
  teal: { border: 'border-teal-300', bg: 'bg-teal-50', glow: 'shadow-teal-200' },
  violet: { border: 'border-violet-300', bg: 'bg-violet-50', glow: 'shadow-violet-200' },
  sky: { border: 'border-sky-300', bg: 'bg-sky-50', glow: 'shadow-sky-200' },
  rose: { border: 'border-rose-300', bg: 'bg-rose-50', glow: 'shadow-rose-200' },
  orange: { border: 'border-orange-300', bg: 'bg-orange-50', glow: 'shadow-orange-200' },
};

function getRarityStars(badgeId: string): number {
  const rare = ['quiz-master', 'xp-5000', 'streak-30', 'courses-3-done'];
  const medium = ['finisher', 'xp-1000', 'streak-7', 'courses-5', 'bookmarker'];
  if (rare.includes(badgeId)) return 3;
  if (medium.includes(badgeId)) return 2;
  return 1;
}

export default function BadgeShowcase() {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setUnlocked(loadUnlockedBadges());
  }, []);

  const unlockedBadges = BADGES.filter((b) => unlocked.includes(b.id));
  const lockedBadges = BADGES.filter((b) => !unlocked.includes(b.id));
  const totalBadges = BADGES.length;

  return (
    <div className="space-y-5">
      {/* Progress overview */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Badges débloqués</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {unlockedBadges.length}/{totalBadges} badge{totalBadges > 1 ? 's' : ''} collecté{totalBadges > 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-700"
            style={{ width: `${(unlockedBadges.length / totalBadges) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Unlocked badges grid */}
      {unlockedBadges.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {unlockedBadges.map((badge, idx) => {
            const config = rarityConfig[badge.color] || rarityConfig.amber;
            const stars = getRarityStars(badge.id);
            return (
              <div
                key={badge.id}
                className={`relative flex items-start gap-3 p-3 rounded-xl border ${config.border} ${config.bg} ${config.glow} shadow-sm hover:shadow-md transition-all animate-fadeInUp`}
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-${badge.color}-100`}>
                  <i className={`${badge.icon} text-${badge.color}-600 text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <i
                        key={i}
                        className={`ri-star-fill text-[10px] ${
                          i < stars ? 'text-amber-400' : 'text-gray-200'
                        }`}
                      ></i>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1">
                      {stars === 1 ? 'Commun' : stars === 2 ? 'Rare' : 'Légendaire'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Locked badges (preview) */}
      {lockedBadges.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer mb-3"
          >
            <i className={`ri-arrow-down-s-line transition-transform ${showAll ? 'rotate-180' : ''}`}></i>
            {showAll ? 'Masquer' : 'Voir'} les badges verrouillés ({lockedBadges.length})
          </button>

          {showAll && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-50">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <i className={`${badge.icon} text-gray-400 text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-500">{badge.name}</p>
                    <p className="text-xs text-gray-400">{badge.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Non débloqué</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
