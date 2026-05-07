import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import { useToast } from '@/hooks/useToast';

interface Skill {
  name: string;
  level: number;
  maxLevel: number;
  category: string;
}

interface WeeklyActivity {
  day: string;
  hours: number;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const skills: Skill[] = [
  { name: 'Marketing Digital', level: 78, maxLevel: 100, category: 'Marketing' },
  { name: 'React & Frontend', level: 45, maxLevel: 100, category: 'Tech' },
  { name: 'Comptabilité', level: 92, maxLevel: 100, category: 'Finance' },
  { name: 'UI/UX Design', level: 100, maxLevel: 100, category: 'Design' },
  { name: 'Gestion de Projet', level: 12, maxLevel: 100, category: 'Management' },
  { name: 'Data Science', level: 15, maxLevel: 100, category: 'Data' },
];

const weeklyActivity: WeeklyActivity[] = [
  { day: 'Lun', hours: 2.5 },
  { day: 'Mar', hours: 3.0 },
  { day: 'Mer', hours: 1.5 },
  { day: 'Jeu', hours: 4.0 },
  { day: 'Ven', hours: 2.0 },
  { day: 'Sam', hours: 5.5 },
  { day: 'Dim', hours: 1.0 },
];

const achievements: Achievement[] = [
  { id: 1, title: 'Premier Pas', description: 'Terminé votre première leçon', icon: 'ri-footprint-line', color: 'bg-teal-500', unlocked: true, unlockedAt: '2026-01-15' },
  { id: 2, title: 'Assidu', description: '7 jours d\'apprentissage consécutifs', icon: 'ri-fire-line', color: 'bg-orange-500', unlocked: true, unlockedAt: '2026-02-03' },
  { id: 3, title: 'Premier Certificat', description: 'Obtenu votre premier certificat', icon: 'ri-award-line', color: 'bg-yellow-500', unlocked: true, unlockedAt: '2026-03-10' },
  { id: 4, title: 'Expert', description: '100 leçons complétées', icon: 'ri-vip-crown-line', color: 'bg-teal-500', unlocked: true, unlockedAt: '2026-04-20' },
  { id: 5, title: 'Marathonien', description: '50 heures d\'apprentissage', icon: 'ri-timer-flash-line', color: 'bg-green-500', unlocked: true, unlockedAt: '2026-04-28' },
  { id: 6, title: 'Maître', description: '5 formations terminées', icon: 'ri-medal-line', color: 'bg-red-500', unlocked: false },
  { id: 7, title: 'Mentor', description: 'Aider un autre apprenant', icon: 'ri-hand-heart-line', color: 'bg-teal-500', unlocked: false },
  { id: 8, title: 'Polyglotte', description: 'Formations dans 3 domaines différents', icon: 'ri-global-line', color: 'bg-teal-500', unlocked: true, unlockedAt: '2026-03-25' },
];

export default function ApprenantProgressionPage() {
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState(weeklyActivity.map(d => ({ ...d })));
  const [streakCount, setStreakCount] = useState(12);
  const [recordStreak, setRecordStreak] = useState(23);
  const [skillsList, setSkillsList] = useState<Skill[]>(skills);
  const [achievementsList, setAchievementsList] = useState<Achievement[]>(achievements);
  const [editGoal, setEditGoal] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveProgression = () => {
    success('Progression mise à jour', 'Vos objectifs et statistiques ont été enregistrés.');
    setShowEditModal(false);
  };

  const handleAddStreakDay = () => {
    setStreakCount(prev => prev + 1);
    success('Félicitations !', 'Vous avez ajouté une journée à votre streak !');
  };

  const totalHours = weeklyActivity.reduce((sum, d) => sum + d.hours, 0);
  const maxDay = Math.max(...weeklyActivity.map(d => d.hours));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Ma progression' }]} />

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Ma progression</h1>
            <p className="text-gray-600 text-sm md:text-base">Visualisez vos compétences et votre parcours d'apprentissage</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-edit-line"></i>
            </div>
            Éditer
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Heures totales', value: '156h', icon: 'ri-time-line', color: 'bg-teal-500' },
            { label: 'Leçons complétées', value: '142', icon: 'ri-check-double-line', color: 'bg-green-500' },
            { label: 'Compétences', value: '6', icon: 'ri-bar-chart-grouped-line', color: 'bg-teal-500' },
            { label: 'Succès débloqués', value: '6/8', icon: 'ri-trophy-line', color: 'bg-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Activité hebdomadaire</h2>
              <span className="text-sm text-gray-600">{totalHours.toFixed(1)}h cette semaine</span>
            </div>
            {loading ? (
              <SkeletonList count={1} />
            ) : (
              <div className="flex items-end gap-3 h-48">
                {weeklyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '140px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-teal-500 rounded-lg transition-all duration-500"
                        style={{ height: `${(day.hours / maxDay) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{day.day}</span>
                    <span className="text-xs text-gray-400">{day.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streak */}
          <div className="rounded-xl border border-orange-100 bg-[#fff7ed] p-6 shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-fire-line text-2xl text-orange-600"></i>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">12</p>
              <p className="text-sm font-medium text-gray-700 mb-4">jours de suite</p>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i < 5 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Votre record : 23 jours</p>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Mes compétences</h2>
          {loading ? (
            <SkeletonList count={6} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-100 rounded-lg hover:border-teal-200 transition-colors cursor-pointer"
                  onClick={() => setSelectedSkill(skill)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{skill.name}</h3>
                      <p className="text-xs text-gray-500">{skill.category}</p>
                    </div>
                    <span className="text-sm font-bold text-teal-600">{skill.level}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        skill.level >= 80 ? 'bg-green-500' : skill.level >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${skill.level}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Succès</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SkeletonCard count={8} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    ach.unlocked
                      ? 'border-transparent hover:shadow-md'
                      : 'border-gray-100 opacity-60'
                  }`}
                  style={{ backgroundColor: ach.unlocked ? undefined : '#f9fafb' }}
                >
                  <div className={`w-12 h-12 ${ach.unlocked ? ach.color : 'bg-gray-300'} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className={`${ach.icon} text-xl text-white`}></i>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{ach.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-xs text-gray-400">{ach.unlockedAt}</p>
                  )}
                  {!ach.unlocked && (
                    <span className="text-xs text-gray-400 font-medium">Verrouillé</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skill Detail Modal */}
        {selectedSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedSkill.name}</h3>
                <p className="text-sm text-gray-600">{selectedSkill.category}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Niveau actuel</span>
                  <span className="text-lg font-bold text-teal-600">{selectedSkill.level}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      selectedSkill.level >= 80 ? 'bg-green-500' : selectedSkill.level >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${selectedSkill.level}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  {selectedSkill.level >= 80
                    ? 'Excellent ! Vous maîtrisez cette compétence. Passez à un niveau avancé ou explorez des sujets connexes.'
                    : selectedSkill.level >= 50
                    ? 'Bonne progression ! Continuez vos formations pour atteindre la maîtrise.'
                    : 'Débutant. Continuez vos leçons pour progresser dans cette compétence.'}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Progression Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Modifier ma progression</h3>
                <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <i className="ri-close-line text-gray-500 text-xl"></i>
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objectif hebdomadaire (heures)</label>
                  <div className="space-y-3">
                    {weeklyHours.map((day, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-12">{day.day}</span>
                        <input
                          type="number"
                          min="0"
                          max="12"
                          step="0.5"
                          value={day.hours}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setWeeklyHours(prev => prev.map((d, idx) => idx === i ? { ...d, hours: val } : d));
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-400">h</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objectif de streak (jours)</label>
                  <input
                    type="number"
                    min="0"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    placeholder="Ex: 30"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="bg-teal-50 rounded-lg p-4">
                  <p className="text-sm text-teal-800">
                    <i className="ri-information-line mr-1"></i>
                    Les modifications appliqueront vos objectifs personnalisés à votre tableau de bord.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={handleSaveProgression} className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
