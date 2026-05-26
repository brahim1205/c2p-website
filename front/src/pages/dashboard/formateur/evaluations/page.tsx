import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import CreateExamModal from './CreateExamModal';
import EvaluationsDashboardContent from './EvaluationsDashboardContent';
import GradeSubmissionModal from './GradeSubmissionModal';
import QuizBuilderModal from './QuizBuilderModal';
import { useFormateurEvaluationsSession } from './useFormateurEvaluationsSession';

export default function FormateurEvaluationsPage() {
  const {
    activeTab,
    setActiveTab,
    exams,
    submissions,
    loading,
    pendingCount,
    averageGradePercent,
    subscriptionGate,
    openCreateExamModal,
    openQuizBuilder,
    handleDeleteExam,
    handleGrade,
    createExamModalProps,
    quizBuilderModalProps,
    gradeSubmissionModalProps,
  } = useFormateurEvaluationsSession();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Évaluations' },
          ]}
        />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <EvaluationsDashboardContent
          activeTab={activeTab}
          exams={exams}
          submissions={submissions}
          loading={loading}
          pendingCount={pendingCount}
          averageGradePercent={averageGradePercent}
          subscriptionAllowed={subscriptionGate.allowed}
          onTabChange={setActiveTab}
          onCreateExam={openCreateExamModal}
          onConfigureQuiz={openQuizBuilder}
          onDeleteExam={handleDeleteExam}
          onGrade={handleGrade}
        />

        {createExamModalProps && <CreateExamModal {...createExamModalProps} />}
        {quizBuilderModalProps && <QuizBuilderModal {...quizBuilderModalProps} />}
        {gradeSubmissionModalProps && <GradeSubmissionModal {...gradeSubmissionModalProps} />}
      </div>
    </DashboardLayout>
  );
}
