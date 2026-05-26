import type { Dispatch, SetStateAction } from 'react';
import { SkeletonList } from '@/components/base/Skeleton';
import {
  makeChoiceDraft,
  makeQuestionDraft,
  orderByPosition,
  type ChoiceDraft,
  type Exam,
  type QuestionDraft,
  type QuizChoice,
  type QuizQuestion,
} from './evaluationModel';
import { NewQuestionForm, QuizQuestionEditor } from './QuizBuilderQuestionEditor';

interface QuizBuilderModalProps {
  exam: Exam;
  questions: QuizQuestion[];
  choicesByQuestion: Map<string, QuizChoice[]>;
  loading: boolean;
  newQuestionDraft: QuestionDraft;
  questionDrafts: Record<string, QuestionDraft>;
  choiceDrafts: Record<string, ChoiceDraft>;
  newChoiceDrafts: Record<string, ChoiceDraft>;
  onClose: () => void;
  onCreateQuestion: () => void;
  onSaveQuestion: (question: QuizQuestion) => void;
  onDeleteQuestion: (question: QuizQuestion) => void;
  onMoveQuestion: (question: QuizQuestion, direction: -1 | 1) => void;
  onCreateChoice: (question: QuizQuestion) => void;
  onSaveChoice: (question: QuizQuestion, choice: QuizChoice) => void;
  onDeleteChoice: (choice: QuizChoice) => void;
  onMoveChoice: (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => void;
  setNewQuestionDraft: Dispatch<SetStateAction<QuestionDraft>>;
  setQuestionDrafts: Dispatch<SetStateAction<Record<string, QuestionDraft>>>;
  setChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
  setNewChoiceDrafts: Dispatch<SetStateAction<Record<string, ChoiceDraft>>>;
}

export default function QuizBuilderModal({
  exam,
  questions,
  choicesByQuestion,
  loading,
  newQuestionDraft,
  questionDrafts,
  choiceDrafts,
  newChoiceDrafts,
  onClose,
  onCreateQuestion,
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onCreateChoice,
  onSaveChoice,
  onDeleteChoice,
  onMoveChoice,
  setNewQuestionDraft,
  setQuestionDrafts,
  setChoiceDrafts,
  setNewChoiceDrafts,
}: QuizBuilderModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="quiz-builder-title" className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h3 id="quiz-builder-title" className="text-xl font-bold text-gray-900">Configuration du quiz</h3>
            <p className="text-sm text-gray-600 mt-1">{exam.title}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                {questions.length} question{questions.length > 1 ? 's' : ''}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                {questions.reduce((sum, question) => sum + question.points, 0)} points cumulés
              </span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                {exam.course_name || 'Formation'}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer la configuration du quiz"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
          >
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6">
              <SkeletonList count={4} />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <NewQuestionForm
                draft={newQuestionDraft}
                onDraftChange={setNewQuestionDraft}
                onCreateQuestion={onCreateQuestion}
              />

              {questions.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <p className="text-gray-600">Aucune question pour le moment. Ajoutez-en une pour structurer le quiz.</p>
                </div>
              ) : (
                orderByPosition(questions).map((question, index) => (
                  <QuizQuestionEditor
                    key={String(question.id)}
                    question={question}
                    index={index}
                    questionDraft={questionDrafts[String(question.id)] ?? makeQuestionDraft(question.type)}
                    choices={orderByPosition(choicesByQuestion.get(String(question.id)) ?? [])}
                    choiceDrafts={choiceDrafts}
                    newChoiceDraft={newChoiceDrafts[String(question.id)] ?? makeChoiceDraft()}
                    setQuestionDrafts={setQuestionDrafts}
                    setChoiceDrafts={setChoiceDrafts}
                    setNewChoiceDrafts={setNewChoiceDrafts}
                    onSaveQuestion={onSaveQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    onMoveQuestion={onMoveQuestion}
                    onCreateChoice={onCreateChoice}
                    onSaveChoice={onSaveChoice}
                    onDeleteChoice={onDeleteChoice}
                    onMoveChoice={onMoveChoice}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
