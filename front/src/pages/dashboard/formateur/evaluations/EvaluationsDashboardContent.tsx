import EvaluationOverview from './EvaluationOverview';
import { ExamsTable, SubmissionsTable } from './EvaluationTables';
import type { Exam, Submission } from './evaluationModel';

interface EvaluationsDashboardContentProps {
  activeTab: 'exams' | 'submissions';
  exams: Exam[];
  submissions: Submission[];
  loading: boolean;
  pendingCount: number;
  averageGradePercent: number;
  subscriptionAllowed: boolean;
  onTabChange: (tab: 'exams' | 'submissions') => void;
  onCreateExam: () => void;
  onConfigureQuiz: (exam: Exam) => void;
  onDeleteExam: (exam: Exam) => void;
  onGrade: (submission: Submission) => void;
}

export default function EvaluationsDashboardContent({
  activeTab,
  exams,
  submissions,
  loading,
  pendingCount,
  averageGradePercent,
  subscriptionAllowed,
  onTabChange,
  onCreateExam,
  onConfigureQuiz,
  onDeleteExam,
  onGrade,
}: EvaluationsDashboardContentProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Évaluations</h1>
          <p className="text-gray-600 text-sm md:text-base">Créez des examens, structurez vos quiz et corrigez les travaux des apprenants</p>
        </div>
        <button
          onClick={onCreateExam}
          disabled={!subscriptionAllowed}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-add-line text-base"></i>
          </div>
          Nouvel examen
        </button>
      </div>

      <EvaluationOverview
        exams={exams}
        pendingCount={pendingCount}
        averageGradePercent={averageGradePercent}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {activeTab === 'exams' && (
        <ExamsTable
          exams={exams}
          loading={loading}
          onConfigureQuiz={onConfigureQuiz}
          onDeleteExam={onDeleteExam}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsTable
          submissions={submissions}
          exams={exams}
          loading={loading}
          onGrade={onGrade}
        />
      )}
    </>
  );
}
