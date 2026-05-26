import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { ExamStatsCards, LatestSubmissionsPanel } from './ExamensPanels';
import { ExamensListPanel } from './ExamensListPanel';
import { ExamResultModal } from './ExamResultModal';
import { ExamSubmitModal } from './ExamSubmitModal';
import { useApprenantExamensSession } from './useApprenantExamensSession';

export default function ApprenantExamensPage() {
  const {
    loading,
    filter,
    setFilter,
    examStats,
    exams,
    filteredExams,
    submissions,
    latestSubmissions,
    selectedResultSubmission,
    setSelectedResultSubmission,
    openSubmit,
    submitModalProps,
  } = useApprenantExamensSession();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Mes examens' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes examens</h1>
          <p className="text-gray-600 text-sm md:text-base">Retrouvez les quiz auto-corrigés, les devoirs à déposer et les retours du formateur.</p>
        </div>

        <ExamStatsCards stats={examStats} />

        <ExamensListPanel
          loading={loading}
          filter={filter}
          stats={examStats}
          exams={filteredExams}
          submissions={submissions}
          onFilterChange={setFilter}
          onOpenSubmit={openSubmit}
          onSelectResult={setSelectedResultSubmission}
        />

        <LatestSubmissionsPanel
          loading={loading}
          submissions={latestSubmissions}
          exams={exams}
          onSelectResult={setSelectedResultSubmission}
        />

        {submitModalProps && <ExamSubmitModal {...submitModalProps} />}

        {selectedResultSubmission && (
          <ExamResultModal
            submission={selectedResultSubmission}
            exams={exams}
            onClose={() => setSelectedResultSubmission(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
