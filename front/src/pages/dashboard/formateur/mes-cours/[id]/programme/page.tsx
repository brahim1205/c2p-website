import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/useToast';
import {
  courseStatusLabels,
} from '@/lib/courseWorkflow';
import { queryKeys } from '@/lib/queryKeys';
import {
  updateFormateurCourseWorkflow,
} from '@/lib/formateurDashboardApi';
import AssetModal from './AssetModal';
import CourseProgramOverview from './CourseProgramOverview';
import LessonModal from './LessonModal';
import SectionModal from './SectionModal';
import { useCourseProgramData } from './useCourseProgramData';
import { useCourseProgramAssetEditor } from './useCourseProgramAssetEditor';
import { useCourseProgramDerivedState } from './useCourseProgramDerivedState';
import { useCourseProgramLessonEditor } from './useCourseProgramLessonEditor';
import { useCourseProgramSectionEditor } from './useCourseProgramSectionEditor';

export default function FormateurCourseProgramPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const queryClient = useQueryClient();

  const subscriptionGate = gateFor('trainer_courses_manage');

  const { courseProgramQuery, courseProgramQueryKey } = useCourseProgramData(user?.id, id);
  const {
    data: courseProgram,
    isLoading: loading,
    isError,
    error: courseProgramError,
  } = courseProgramQuery;

  useEffect(() => {
    if (!isError) return;
    const message = courseProgramError && typeof courseProgramError === 'object' && 'message' in courseProgramError
      ? String(courseProgramError.message)
      : 'Impossible de charger le programme.';
    error('Erreur', message);
    console.error(courseProgramError);
  }, [courseProgramError, error, isError]);

  const {
    assetCount,
    assets,
    availableLessonIds,
    availableSectionIds,
    course,
    courseWorkflowAction,
    groupedSections,
    lessonCount,
    lessons,
    previewCount,
    publishedCount,
    readinessIssues,
  } = useCourseProgramDerivedState(courseProgram);

  const refreshProgram = async () => {
    await queryClient.invalidateQueries({ queryKey: courseProgramQueryKey });
    await queryClient.invalidateQueries({ queryKey: queryKeys.formateur.courses(user?.id) });
  };

  const {
    closeSectionModal,
    deleteSection,
    editingSection,
    isSavingSection,
    moveSection,
    openCreateSectionModal,
    openEditSectionModal,
    sectionErrors,
    sectionForm,
    sectionFormMessage,
    showSectionModal,
    submitSection,
    updateSectionForm,
  } = useCourseProgramSectionEditor({
    course,
    courseId: id,
    groupedSections,
    subscriptionGate,
    userId: user?.id,
    onRefresh: refreshProgram,
    success,
    error,
  });

  const {
    closeLessonModal,
    deleteLesson,
    editingLesson,
    isSavingLesson,
    lessonErrors,
    lessonForm,
    lessonFormMessage,
    moveLesson,
    openCreateLessonModal,
    openEditLessonModal,
    showLessonModal,
    submitLesson,
    updateLessonForm,
  } = useCourseProgramLessonEditor({
    availableSectionIds,
    courseId: id,
    groupedSections,
    subscriptionGate,
    userId: user?.id,
    onRefresh: refreshProgram,
    success,
    error,
    info,
  });

  const {
    activeAssetLesson,
    assetErrors,
    assetFileInputRef,
    assetForm,
    assetFormMessage,
    assetUploadProgress,
    closeAssetModal,
    deleteAsset,
    editingAsset,
    handleAssetFileChange,
    isAssetUploading,
    isSavingAsset,
    openAssetModal,
    openEditAsset,
    resetAssetForm,
    showAssetModal,
    startNewAsset,
    submitAsset,
    updateAssetForm,
  } = useCourseProgramAssetEditor({
    availableLessonIds,
    courseId: id,
    lessons,
    subscriptionGate,
    userId: user?.id,
    onRefresh: refreshProgram,
    success,
    error,
  });

  const handleCourseWorkflowAction = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!courseWorkflowAction || !course) return;

    const confirmed = window.confirm(
      course.status === 'draft'
        ? `Soumettre "${course.title}" en révision ?`
        : course.status === 'review'
          ? `Retirer "${course.title}" de la révision et revenir en brouillon ?`
          : course.status === 'published'
            ? `Archiver "${course.title}" pour la retirer du catalogue ?`
            : `Repasser "${course.title}" en brouillon ?`,
    );

    if (!confirmed) return;

    try {
      if (!user?.id) throw new Error('Formation introuvable ou inaccessible.');
      await updateFormateurCourseWorkflow(user.id, course.id, courseWorkflowAction.nextStatus);

      success('Statut mis à jour', `La formation est maintenant ${courseStatusLabels[courseWorkflowAction.nextStatus].toLowerCase()}.`);
      await refreshProgram();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de changer le statut de la formation.';
      error('Transition impossible', message);
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Mes cours', path: '/dashboard/formateur/mes-cours' },
            { label: 'Programme' },
          ]}
        />
        <SubscriptionRequiredBanner gate={subscriptionGate} />

        <CourseProgramOverview
          course={course}
          loading={loading}
          groupedSections={groupedSections}
          assets={assets}
          readinessIssues={readinessIssues}
          lessonCount={lessonCount}
          previewCount={previewCount}
          publishedCount={publishedCount}
          assetCount={assetCount}
          subscriptionAllowed={subscriptionGate.allowed}
          courseWorkflowAction={courseWorkflowAction}
          onWorkflowAction={handleCourseWorkflowAction}
          onCreateSection={openCreateSectionModal}
          onCreateLesson={openCreateLessonModal}
          onEditSection={openEditSectionModal}
          onDeleteSection={deleteSection}
          onMoveSection={moveSection}
          onEditLesson={openEditLessonModal}
          onDeleteLesson={deleteLesson}
          onMoveLesson={moveLesson}
          onOpenAsset={openAssetModal}
          onEditAsset={openEditAsset}
          onDeleteAsset={deleteAsset}
        />

        {showSectionModal && (
          <SectionModal
            isEditing={Boolean(editingSection)}
            form={sectionForm}
            errors={sectionErrors}
            message={sectionFormMessage}
            isSaving={isSavingSection}
            onChange={updateSectionForm}
            onCancel={closeSectionModal}
            onSubmit={submitSection}
          />
        )}

        {showLessonModal && (
          <LessonModal
            isEditing={Boolean(editingLesson)}
            form={lessonForm}
            errors={lessonErrors}
            message={lessonFormMessage}
            sections={groupedSections}
            isSaving={isSavingLesson}
            onChange={updateLessonForm}
            onCancel={closeLessonModal}
            onSubmit={submitLesson}
          />
        )}

        {showAssetModal && activeAssetLesson && (
          <AssetModal
            lesson={activeAssetLesson}
            assets={assets
              .filter((asset) => String(asset.lesson_id) === String(activeAssetLesson.id))
              .sort((left, right) => left.position - right.position)}
            editingAsset={editingAsset}
            form={assetForm}
            errors={assetErrors}
            message={assetFormMessage}
            isUploading={isAssetUploading}
            uploadProgress={assetUploadProgress}
            isSaving={isSavingAsset}
            fileInputRef={assetFileInputRef}
            onNew={startNewAsset}
            onClose={closeAssetModal}
            onEdit={openEditAsset}
            onDelete={deleteAsset}
            onFileChange={handleAssetFileChange}
            onChange={updateAssetForm}
            onReset={resetAssetForm}
            onSubmit={submitAsset}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
