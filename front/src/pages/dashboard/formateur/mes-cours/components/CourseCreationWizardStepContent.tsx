import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import CourseCreationBasicsStep from './CourseCreationBasicsStep';
import CourseCreationEvaluationsStep from './CourseCreationEvaluationsStep';
import CourseCreationLessonContentStep from './CourseCreationLessonContentStep';
import CourseCreationProgramStep from './CourseCreationProgramStep';
import CourseCreationTableOfContents from './CourseCreationTableOfContents';
import CourseCreationWizardReview from './CourseCreationWizardReview';
import type { CourseListField } from './CourseListEditor';
import type {
  AssetDraft,
  AssetType,
  CourseBasicsDraft,
  CourseFieldErrors,
  ExamDraft,
  LessonDraft,
  QuestionChoiceDraft,
  QuestionDraft,
  SectionDraft,
  WizardDraftState,
} from './courseWizardModel';

interface LessonOption {
  sectionId: string;
  sectionTitle: string;
  lessonId: string;
  lessonTitle: string;
}

interface CourseCreationWizardStepContentProps {
  wizard: WizardDraftState;
  courseErrors: CourseFieldErrors;
  userId?: string | null;
  trailerInputRef: RefObject<HTMLInputElement | null>;
  isTrailerUploading: boolean;
  trailerUploadProgress: number;
  updateCourse: <K extends keyof CourseBasicsDraft>(field: K, value: CourseBasicsDraft[K]) => void;
  addCourseListItem: (field: CourseListField) => void;
  updateCourseListItem: (field: CourseListField, index: number, value: string) => void;
  removeCourseListItem: (field: CourseListField, index: number) => void;
  handleTrailerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  dragSectionId: string | null;
  dragLessonPayload: { sectionId: string; lessonId: string } | null;
  setDragSectionId: Dispatch<SetStateAction<string | null>>;
  setDragLessonPayload: Dispatch<SetStateAction<{ sectionId: string; lessonId: string } | null>>;
  updateSections: (updater: (sections: SectionDraft[]) => SectionDraft[]) => void;
  addSection: () => void;
  updateSectionField: (
    sectionId: string,
    field: keyof Omit<SectionDraft, 'id' | 'position' | 'lessons'>,
    value: string,
  ) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  addLesson: (sectionId: string) => void;
  updateLessonField: <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => void;
  removeLesson: (sectionId: string, lessonId: string) => void;
  moveLesson: (sectionId: string, lessonId: string, direction: -1 | 1) => void;
  openLessonContent: (lessonId: string) => void;
  selectedLesson: LessonDraft | null;
  lessonOptions: LessonOption[];
  pendingAssetType: AssetType;
  uploadedAssetsCount: number;
  pendingUploadsCount: number;
  uploadInputRef: RefObject<HTMLInputElement>;
  setPendingAssetType: (assetType: AssetType) => void;
  selectLesson: (lessonId: string) => void;
  addAssetLink: (lessonId: string, assetType: AssetType) => void;
  handleQueuedFiles: (lessonId: string, assetType: AssetType, files: FileList | null) => void;
  updateAsset: <K extends keyof AssetDraft>(assetId: string, field: K, value: AssetDraft[K]) => void;
  removeAsset: (assetId: string) => void;
  appendLessonSnippet: (snippet: string) => void;
  selectedExam: ExamDraft | null;
  examDeliveryRestrictionMessage: string | null;
  addExam: () => void;
  updateExam: <K extends keyof ExamDraft>(examId: string, field: K, value: ExamDraft[K]) => void;
  addQuestion: (examId: string) => void;
  updateQuestion: <K extends keyof QuestionDraft>(examId: string, questionId: string, field: K, value: QuestionDraft[K]) => void;
  removeQuestion: (examId: string, questionId: string) => void;
  addChoice: (examId: string, questionId: string) => void;
  updateChoice: <K extends keyof QuestionChoiceDraft>(
    examId: string,
    questionId: string,
    choiceId: string,
    field: K,
    value: QuestionChoiceDraft[K],
  ) => void;
  removeChoice: (examId: string, questionId: string, choiceId: string) => void;
  selectExam: (examId: string) => void;
}

export default function CourseCreationWizardStepContent({
  wizard,
  courseErrors,
  userId,
  trailerInputRef,
  isTrailerUploading,
  trailerUploadProgress,
  updateCourse,
  addCourseListItem,
  updateCourseListItem,
  removeCourseListItem,
  handleTrailerFileChange,
  dragSectionId,
  dragLessonPayload,
  setDragSectionId,
  setDragLessonPayload,
  updateSections,
  addSection,
  updateSectionField,
  removeSection,
  moveSection,
  addLesson,
  updateLessonField,
  removeLesson,
  moveLesson,
  openLessonContent,
  selectedLesson,
  lessonOptions,
  pendingAssetType,
  uploadedAssetsCount,
  pendingUploadsCount,
  uploadInputRef,
  setPendingAssetType,
  selectLesson,
  addAssetLink,
  handleQueuedFiles,
  updateAsset,
  removeAsset,
  appendLessonSnippet,
  selectedExam,
  examDeliveryRestrictionMessage,
  addExam,
  updateExam,
  addQuestion,
  updateQuestion,
  removeQuestion,
  addChoice,
  updateChoice,
  removeChoice,
  selectExam,
}: CourseCreationWizardStepContentProps) {
  if (wizard.step === 1) {
    return (
      <CourseCreationBasicsStep
        wizard={wizard}
        courseErrors={courseErrors}
        userId={userId}
        trailerInputRef={trailerInputRef}
        isTrailerUploading={isTrailerUploading}
        trailerUploadProgress={trailerUploadProgress}
        updateCourse={updateCourse}
        addCourseListItem={addCourseListItem}
        updateCourseListItem={updateCourseListItem}
        removeCourseListItem={removeCourseListItem}
        handleTrailerFileChange={handleTrailerFileChange}
      />
    );
  }

  if (wizard.step === 2) {
    return (
      <CourseCreationProgramStep
        wizard={wizard}
        dragSectionId={dragSectionId}
        dragLessonPayload={dragLessonPayload}
        setDragSectionId={setDragSectionId}
        setDragLessonPayload={setDragLessonPayload}
        updateSections={updateSections}
        addSection={addSection}
        updateSectionField={updateSectionField}
        removeSection={removeSection}
        moveSection={moveSection}
        addLesson={addLesson}
        updateLessonField={updateLessonField}
        removeLesson={removeLesson}
        moveLesson={moveLesson}
        openLessonContent={openLessonContent}
      />
    );
  }

  if (wizard.step === 3) {
    return (
      <CourseCreationLessonContentStep
        wizard={wizard}
        selectedLesson={selectedLesson}
        lessonOptions={lessonOptions}
        pendingAssetType={pendingAssetType}
        uploadedAssetsCount={uploadedAssetsCount}
        pendingUploadsCount={pendingUploadsCount}
        uploadInputRef={uploadInputRef}
        setPendingAssetType={setPendingAssetType}
        selectLesson={selectLesson}
        addAssetLink={addAssetLink}
        handleQueuedFiles={handleQueuedFiles}
        updateAsset={updateAsset}
        removeAsset={removeAsset}
        updateLessonField={updateLessonField}
        appendLessonSnippet={appendLessonSnippet}
      />
    );
  }

  if (wizard.step === 4) {
    return (
      <CourseCreationEvaluationsStep
        exams={wizard.exams}
        selectedExam={selectedExam}
        selectedExamId={wizard.selectedExamId}
        deliveryMode={wizard.course.delivery_mode}
        restrictionMessage={examDeliveryRestrictionMessage}
        onSelectExam={selectExam}
        onAddExam={addExam}
        onUpdateExam={updateExam}
        onAddQuestion={addQuestion}
        onUpdateQuestion={updateQuestion}
        onRemoveQuestion={removeQuestion}
        onAddChoice={addChoice}
        onUpdateChoice={updateChoice}
        onRemoveChoice={removeChoice}
      />
    );
  }

  return (
    <CourseCreationWizardReview
      wizard={wizard}
      tableOfContents={<CourseCreationTableOfContents sections={wizard.sections} exams={wizard.exams} />}
    />
  );
}
