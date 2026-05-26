import type { ChangeEvent, RefObject } from 'react';
import type {
  ApprenantExam as Exam,
  ApprenantQuizChoice as QuizChoice,
  ApprenantQuizQuestion as QuizQuestion,
} from '@/lib/apprenantDashboardApi';
import {
  formatFileSize,
  getTypeLabel,
  type EntityId,
  type QuizAnswerDraft,
} from './examensModel';
import { QuizAnswerForm } from './QuizAnswerForm';

export interface ExamSubmitModalProps {
  exam: Exam;
  answerText: string;
  answerFile: File | null;
  uploadProgress: number;
  submitting: boolean;
  loadingQuizStructure: boolean;
  quizStructureError: boolean;
  quizQuestions: QuizQuestion[];
  quizChoicesByQuestion: Map<string, QuizChoice[]>;
  quizAnswerDrafts: Record<string, QuizAnswerDraft>;
  answerFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onAnswerTextChange: (value: string) => void;
  onAnswerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAnswerFile: () => void;
  onRetryQuizStructure: () => void;
  onQuizChoiceToggle: (question: QuizQuestion, choiceId: EntityId, checked: boolean) => void;
  onQuizOpenAnswerChange: (question: QuizQuestion, value: string) => void;
}

export function ExamSubmitModal({
  exam,
  answerText,
  answerFile,
  uploadProgress,
  submitting,
  loadingQuizStructure,
  quizStructureError,
  quizQuestions,
  quizChoicesByQuestion,
  quizAnswerDrafts,
  answerFileInputRef,
  onClose,
  onSubmit,
  onAnswerTextChange,
  onAnswerFileChange,
  onRemoveAnswerFile,
  onRetryQuizStructure,
  onQuizChoiceToggle,
  onQuizOpenAnswerChange,
}: ExamSubmitModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Soumettre : {exam.title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Type : {getTypeLabel(exam.type)} | Note max : {exam.max_grade}
        </p>
        {exam.instructions ? (
          <div className="mb-5 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Consigne du formateur</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{exam.instructions}</p>
          </div>
        ) : null}
        {(exam.attachments?.length ?? 0) > 0 && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">Fichiers joints</p>
            <div className="space-y-2">
              {exam.attachments?.map((attachment) => (
                <a
                  key={attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-teal-300 hover:text-teal-700"
                >
                  <span className="min-w-0 flex items-center gap-2">
                    <i className="ri-attachment-2"></i>
                    <span className="truncate">{attachment.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={onSubmit}>
          {exam.type === 'quiz' ? (
            <QuizAnswerForm
              loading={loadingQuizStructure}
              hasError={quizStructureError}
              questions={quizQuestions}
              choicesByQuestion={quizChoicesByQuestion}
              drafts={quizAnswerDrafts}
              onRetry={onRetryQuizStructure}
              onChoiceToggle={onQuizChoiceToggle}
              onOpenAnswerChange={onQuizOpenAnswerChange}
            />
          ) : (
            <AssignmentAnswerForm
              answerText={answerText}
              answerFile={answerFile}
              uploadProgress={uploadProgress}
              submitting={submitting}
              answerFileInputRef={answerFileInputRef}
              onAnswerTextChange={onAnswerTextChange}
              onAnswerFileChange={onAnswerFileChange}
              onRemoveAnswerFile={onRemoveAnswerFile}
            />
          )}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || loadingQuizStructure || quizStructureError}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  {uploadProgress > 0 && uploadProgress < 100 ? `Import ${uploadProgress}%` : 'Envoi...'}
                </span>
              ) : (
                'Soumettre'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AssignmentAnswerFormProps {
  answerText: string;
  answerFile: File | null;
  uploadProgress: number;
  submitting: boolean;
  answerFileInputRef: RefObject<HTMLInputElement | null>;
  onAnswerTextChange: (value: string) => void;
  onAnswerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAnswerFile: () => void;
}

function AssignmentAnswerForm({
  answerText,
  answerFile,
  uploadProgress,
  submitting,
  answerFileInputRef,
  onAnswerTextChange,
  onAnswerFileChange,
  onRemoveAnswerFile,
}: AssignmentAnswerFormProps) {
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Votre réponse</label>
        <textarea
          value={answerText}
          onChange={(event) => onAnswerTextChange(event.target.value)}
          placeholder="Expliquez votre démarche, ajoutez un commentaire ou collez votre réponse..."
          rows={8}
          maxLength={5000}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">{answerText.length}/5000 caractères</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fichier à déposer</label>
        <button
          type="button"
          onClick={() => answerFileInputRef.current?.click()}
          disabled={submitting}
          className="flex min-h-[168px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-teal-300 hover:bg-teal-50/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="ri-upload-cloud-2-line mb-2 text-3xl text-teal-600"></i>
          <span className="text-sm font-semibold text-gray-900">{answerFile ? answerFile.name : 'Importer un fichier'}</span>
          <span className="mt-1 text-xs text-gray-500">
            PDF, image, ZIP, document ou support de travail
          </span>
          {uploadProgress > 0 && uploadProgress < 100 ? (
            <span className="mt-2 text-xs font-semibold text-teal-700">Import {uploadProgress}%</span>
          ) : null}
        </button>
        <input
          ref={answerFileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.md,.json,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv"
          onChange={onAnswerFileChange}
        />
        {answerFile && (
          <button
            type="button"
            onClick={onRemoveAnswerFile}
            className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Retirer le fichier
          </button>
        )}
      </div>
    </div>
  );
}
