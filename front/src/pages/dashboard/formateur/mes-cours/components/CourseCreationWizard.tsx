import { type CourseCreationWizardProps } from './courseWizardModel';
import CourseCreationWizardFrame from './CourseCreationWizardFrame';
import CourseCreationWizardStepContent from './CourseCreationWizardStepContent';
import { useCourseCreationWizardSession } from './useCourseCreationWizardSession';

export default function CourseCreationWizard({
  open,
  embedded = false,
  userId,
  onClose,
  onCreated,
}: CourseCreationWizardProps) {
  const session = useCourseCreationWizardSession({
    open,
    userId,
    onClose,
    onCreated,
  });

  if (!open) return null;

  const wizardContent = (
    <CourseCreationWizardFrame
      embedded={embedded}
      wizard={session.wizard}
      savingDraftAt={session.savingDraftAt}
      stepMessage={session.stepMessage}
      isSubmitting={session.isSubmitting}
      pendingUploadsCount={session.pendingUploadsCount}
      onClose={onClose}
      onReset={session.resetWizard}
      onAutosaveCheck={session.showAutosaveStatus}
      onPrevious={session.goToPreviousStep}
      onNext={session.goToNextStep}
      onSubmit={session.submitWizard}
      setWizard={session.setWizard}
      setStepMessage={session.setStepMessage}
      validateCurrentStep={session.validateCurrentStep}
    >
      <CourseCreationWizardStepContent
        wizard={session.wizard}
        courseErrors={session.courseErrors}
        userId={userId}
        trailerInputRef={session.trailerInputRef}
        isTrailerUploading={session.isTrailerUploading}
        trailerUploadProgress={session.trailerUploadProgress}
        updateCourse={session.updateCourse}
        addCourseListItem={session.addCourseListItem}
        updateCourseListItem={session.updateCourseListItem}
        removeCourseListItem={session.removeCourseListItem}
        handleTrailerFileChange={session.handleTrailerFileChange}
        dragSectionId={session.dragSectionId}
        dragLessonPayload={session.dragLessonPayload}
        setDragSectionId={session.setDragSectionId}
        setDragLessonPayload={session.setDragLessonPayload}
        updateSections={session.updateSections}
        addSection={session.addSection}
        updateSectionField={session.updateSectionField}
        removeSection={session.removeSection}
        moveSection={session.moveSection}
        addLesson={session.addLesson}
        updateLessonField={session.updateLessonField}
        removeLesson={session.removeLesson}
        moveLesson={session.moveLesson}
        openLessonContent={session.openLessonContent}
        selectedLesson={session.selectedLesson}
        lessonOptions={session.lessonOptions}
        pendingAssetType={session.pendingAssetType}
        uploadedAssetsCount={session.uploadedAssetsCount}
        pendingUploadsCount={session.pendingUploadsCount}
        uploadInputRef={session.uploadInputRef}
        setPendingAssetType={session.setPendingAssetType}
        selectLesson={session.selectLesson}
        addAssetLink={session.addAssetLink}
        handleQueuedFiles={session.handleQueuedFiles}
        updateAsset={session.updateAsset}
        removeAsset={session.removeAsset}
        appendLessonSnippet={session.appendLessonSnippet}
        selectedExam={session.selectedExam}
        examDeliveryRestrictionMessage={session.examDeliveryRestrictionMessage}
        addExam={session.addExam}
        updateExam={session.updateExam}
        addQuestion={session.addQuestion}
        updateQuestion={session.updateQuestion}
        removeQuestion={session.removeQuestion}
        addChoice={session.addChoice}
        updateChoice={session.updateChoice}
        removeChoice={session.removeChoice}
        selectExam={session.selectExam}
      />
    </CourseCreationWizardFrame>
  );

  if (embedded) {
    return wizardContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60">
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full sm:flex sm:items-center sm:justify-center">
          {wizardContent}
        </div>
      </div>
    </div>
  );
}
