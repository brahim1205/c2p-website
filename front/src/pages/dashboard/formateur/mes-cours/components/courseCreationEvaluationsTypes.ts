import type {
  CourseDeliveryMode,
  ExamDraft,
  QuestionChoiceDraft,
  QuestionDraft,
} from './courseWizardModel';

export interface CourseCreationEvaluationsStepProps {
  exams: ExamDraft[];
  selectedExam: ExamDraft | null;
  selectedExamId: string;
  deliveryMode: CourseDeliveryMode;
  restrictionMessage: string | null;
  onSelectExam: (examId: string) => void;
  onAddExam: () => void;
  onUpdateExam: <K extends keyof ExamDraft>(examId: string, field: K, value: ExamDraft[K]) => void;
  onAddQuestion: (examId: string) => void;
  onUpdateQuestion: <K extends keyof QuestionDraft>(examId: string, questionId: string, field: K, value: QuestionDraft[K]) => void;
  onRemoveQuestion: (examId: string, questionId: string) => void;
  onAddChoice: (examId: string, questionId: string) => void;
  onUpdateChoice: <K extends keyof QuestionChoiceDraft>(
    examId: string,
    questionId: string,
    choiceId: string,
    field: K,
    value: QuestionChoiceDraft[K],
  ) => void;
  onRemoveChoice: (examId: string, questionId: string, choiceId: string) => void;
}

export interface EvaluationEditorProps {
  exam: ExamDraft;
  deliveryMode: CourseDeliveryMode;
  onUpdateExam: CourseCreationEvaluationsStepProps['onUpdateExam'];
  onAddQuestion: CourseCreationEvaluationsStepProps['onAddQuestion'];
  onUpdateQuestion: CourseCreationEvaluationsStepProps['onUpdateQuestion'];
  onRemoveQuestion: CourseCreationEvaluationsStepProps['onRemoveQuestion'];
  onAddChoice: CourseCreationEvaluationsStepProps['onAddChoice'];
  onUpdateChoice: CourseCreationEvaluationsStepProps['onUpdateChoice'];
  onRemoveChoice: CourseCreationEvaluationsStepProps['onRemoveChoice'];
}

export interface QuestionsEditorProps {
  exam: ExamDraft;
  onAddQuestion: CourseCreationEvaluationsStepProps['onAddQuestion'];
  onUpdateQuestion: CourseCreationEvaluationsStepProps['onUpdateQuestion'];
  onRemoveQuestion: CourseCreationEvaluationsStepProps['onRemoveQuestion'];
  onAddChoice: CourseCreationEvaluationsStepProps['onAddChoice'];
  onUpdateChoice: CourseCreationEvaluationsStepProps['onUpdateChoice'];
  onRemoveChoice: CourseCreationEvaluationsStepProps['onRemoveChoice'];
}

export interface ChoicesEditorProps {
  examId: string;
  question: QuestionDraft;
  onAddChoice: CourseCreationEvaluationsStepProps['onAddChoice'];
  onUpdateChoice: CourseCreationEvaluationsStepProps['onUpdateChoice'];
  onRemoveChoice: CourseCreationEvaluationsStepProps['onRemoveChoice'];
}
