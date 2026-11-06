import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { changeFormateurExamStatus } from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import EditExamModal from './EditExamModal';
import type { Exam } from './evaluationModel';
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
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.formateur.root(user?.id) });

  const changeStatus = async (exam: Exam, status: 'ongoing' | 'closed') => {
    if (status === 'closed' && !window.confirm(`Fermer « ${exam.title} » ? Les apprenants ne pourront plus rendre de copie.`)) return;
    try {
      await changeFormateurExamStatus(exam.id, status);
      success(status === 'ongoing' ? 'Évaluation ouverte' : 'Évaluation fermée', status === 'ongoing' ? 'Les inscrits sont notifiés.' : 'Les copies rendues restent à corriger.');
      await refresh();
    } catch (reason) {
      error('Action impossible', reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Réessayez.');
    }
  };

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
          onEditExam={setEditingExam}
          onChangeStatus={(exam, status) => void changeStatus(exam, status)}
          onGrade={handleGrade}
        />

        {createExamModalProps && <CreateExamModal {...createExamModalProps} />}
        {quizBuilderModalProps && <QuizBuilderModal {...quizBuilderModalProps} />}
        {gradeSubmissionModalProps && <GradeSubmissionModal {...gradeSubmissionModalProps} />}
        {editingExam ? (
          <EditExamModal exam={editingExam} onClose={() => setEditingExam(null)} onSaved={async () => { success('Évaluation modifiée'); await refresh(); }} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
