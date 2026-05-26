import type { Exam } from './evaluationModel';

type EvaluationTab = 'exams' | 'submissions';

interface EvaluationOverviewProps {
  exams: Exam[];
  pendingCount: number;
  averageGradePercent: number;
  activeTab: EvaluationTab;
  onTabChange: (tab: EvaluationTab) => void;
}

export default function EvaluationOverview({
  exams,
  pendingCount,
  averageGradePercent,
  activeTab,
  onTabChange,
}: EvaluationOverviewProps) {
  const submittedTotal = exams.reduce((sum, exam) => sum + exam.submitted, 0);
  const participantTotal = exams.reduce((sum, exam) => sum + exam.participants, 0);
  const participationRate = participantTotal > 0 ? Math.round((submittedTotal / participantTotal) * 100) : 0;
  const stats = [
    { label: 'Examens créés', value: String(exams.length), icon: 'ri-file-list-3-line', color: 'bg-teal-500' },
    { label: 'Soumissions en attente', value: String(pendingCount), icon: 'ri-time-line', color: 'bg-amber-500' },
    {
      label: 'Moyenne générale',
      value: `${averageGradePercent}%`,
      icon: 'ri-bar-chart-line',
      color: 'bg-green-500',
    },
    {
      label: 'Taux de participation',
      value: `${participationRate}%`,
      icon: 'ri-group-line',
      color: 'bg-blue-500',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200">
          <button
            type="button"
            onClick={() => onTabChange('exams')}
            aria-pressed={activeTab === 'exams'}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'exams' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mes examens
          </button>
          <button
            type="button"
            onClick={() => onTabChange('submissions')}
            aria-pressed={activeTab === 'submissions'}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'submissions' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Soumissions à corriger
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">{pendingCount}</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
