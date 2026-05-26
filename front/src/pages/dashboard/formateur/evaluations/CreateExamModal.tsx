import { type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from 'react';
import {
  DEFAULT_NEW_EXAM,
  type CourseOption,
  type Exam,
  type ExamFormErrors,
} from './evaluationModel';
import {
  ExamInstructionsAndAttachments,
  ExamMainInfoSection,
  ExamTypeSelector,
} from './CreateExamModalSections';
import { ExamPublicationSection } from './ExamPublicationSection';

export interface CreateExamModalProps {
  newExam: Partial<Exam>;
  selectedNewExamCourse?: CourseOption;
  instructorCourses: CourseOption[];
  createExamErrors: ExamFormErrors;
  createExamMessage: string | null;
  isCreatingExam: boolean;
  isUploadingExamAttachment: boolean;
  examAttachmentUploadProgress: number;
  examAttachmentInputRef: RefObject<HTMLInputElement>;
  updateNewExam: (field: keyof Exam, value: unknown) => void;
  setNewExam: Dispatch<SetStateAction<Partial<Exam>>>;
  setShowCreateExamModal: Dispatch<SetStateAction<boolean>>;
  setCreateExamErrors: Dispatch<SetStateAction<ExamFormErrors>>;
  setCreateExamMessage: Dispatch<SetStateAction<string | null>>;
  setIsUploadingExamAttachment: Dispatch<SetStateAction<boolean>>;
  setExamAttachmentUploadProgress: Dispatch<SetStateAction<number>>;
  handleExamAttachmentUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeExamAttachment: (url: string) => void;
  handleCreateExam: () => Promise<void>;
}

export default function CreateExamModal({
  newExam,
  selectedNewExamCourse,
  instructorCourses,
  createExamErrors,
  createExamMessage,
  isCreatingExam,
  isUploadingExamAttachment,
  examAttachmentUploadProgress,
  examAttachmentInputRef,
  updateNewExam,
  setNewExam,
  setShowCreateExamModal,
  setCreateExamErrors,
  setCreateExamMessage,
  setIsUploadingExamAttachment,
  setExamAttachmentUploadProgress,
  handleExamAttachmentUpload,
  removeExamAttachment,
  handleCreateExam,
}: CreateExamModalProps) {
  const closeModal = () => {
    setShowCreateExamModal(false);
    setNewExam(DEFAULT_NEW_EXAM);
    setCreateExamErrors({});
    setCreateExamMessage(null);
    setIsUploadingExamAttachment(false);
    setExamAttachmentUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-exam-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Évaluation</p>
            <h3 id="create-exam-title" className="mt-1 text-2xl font-bold text-gray-900">Nouvel examen</h3>
            <p className="mt-1 text-sm text-gray-600">Créez un quiz auto-corrigé ou un devoir à corriger manuellement.</p>
          </div>
          <button
            type="button"
            aria-label="Fermer le formulaire"
            onClick={closeModal}
            disabled={isCreatingExam || isUploadingExamAttachment}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {createExamMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createExamMessage}
            </div>
          ) : null}

          <ExamTypeSelector
            newExam={newExam}
            selectedNewExamCourse={selectedNewExamCourse}
            updateNewExam={updateNewExam}
            setCreateExamMessage={setCreateExamMessage}
          />

          <ExamMainInfoSection
            newExam={newExam}
            instructorCourses={instructorCourses}
            createExamErrors={createExamErrors}
            updateNewExam={updateNewExam}
            setNewExam={setNewExam}
            setCreateExamErrors={setCreateExamErrors}
            setCreateExamMessage={setCreateExamMessage}
          />

          <ExamInstructionsAndAttachments
            newExam={newExam}
            isCreatingExam={isCreatingExam}
            isUploadingExamAttachment={isUploadingExamAttachment}
            examAttachmentUploadProgress={examAttachmentUploadProgress}
            examAttachmentInputRef={examAttachmentInputRef}
            updateNewExam={updateNewExam}
            handleExamAttachmentUpload={handleExamAttachmentUpload}
            removeExamAttachment={removeExamAttachment}
          />

          <ExamPublicationSection newExam={newExam} updateNewExam={updateNewExam} />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {newExam.type === 'quiz'
              ? 'Après création, ouvrez la configuration du quiz pour ajouter les questions.'
              : 'Les réponses envoyées par les apprenants arriveront dans les soumissions à corriger.'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={isCreatingExam || isUploadingExamAttachment}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateExam}
              disabled={isCreatingExam || isUploadingExamAttachment}
              className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploadingExamAttachment ? 'Import en cours...' : isCreatingExam ? 'Création...' : 'Créer l’évaluation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
