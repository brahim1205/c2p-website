import { Link } from 'react-router-dom';
import { SkeletonList } from '@/components/base/Skeleton';
import type { CourseWorkflowStatus } from '@/lib/courseWorkflow';
import {
  CourseProgramEmptyState,
  CourseProgramOverviewHeader,
  CourseProgramSectionList,
} from './CourseProgramOverviewPanels';
import CourseProgramSummary from './CourseProgramSummary';
import {
  type Course,
  type CourseLesson,
  type CourseProgramSection,
  type EntityId,
  type LessonAsset,
} from './programmeModel';

interface WorkflowAction {
  nextStatus: CourseWorkflowStatus;
  description: string;
}

interface CourseProgramOverviewProps {
  course: Course | null;
  loading: boolean;
  groupedSections: CourseProgramSection[];
  assets: LessonAsset[];
  readinessIssues: string[];
  lessonCount: number;
  previewCount: number;
  publishedCount: number;
  assetCount: number;
  subscriptionAllowed: boolean;
  courseWorkflowAction: WorkflowAction | null;
  onWorkflowAction: () => void | Promise<void>;
  onCreateSection: () => void;
  onCreateLesson: (sectionId?: EntityId) => void;
  onEditSection: (section: CourseProgramSection) => void;
  onDeleteSection: (section: CourseProgramSection) => void;
  onMoveSection: (sectionId: EntityId, direction: 'up' | 'down') => void;
  onEditLesson: (lesson: CourseLesson) => void;
  onDeleteLesson: (lesson: CourseLesson) => void;
  onMoveLesson: (sectionId: EntityId, lessonId: EntityId, direction: 'up' | 'down') => void;
  onOpenAsset: (lesson: CourseLesson) => void;
  onEditAsset: (asset: LessonAsset) => void;
  onDeleteAsset: (asset: LessonAsset) => void;
}

export default function CourseProgramOverview({
  course,
  loading,
  groupedSections,
  assets,
  readinessIssues,
  lessonCount,
  previewCount,
  publishedCount,
  assetCount,
  subscriptionAllowed,
  courseWorkflowAction,
  onWorkflowAction,
  onCreateSection,
  onCreateLesson,
  onEditSection,
  onDeleteSection,
  onMoveSection,
  onEditLesson,
  onDeleteLesson,
  onMoveLesson,
  onOpenAsset,
  onEditAsset,
  onDeleteAsset,
}: CourseProgramOverviewProps) {
  return (
    <>
      <CourseProgramOverviewHeader
        course={course}
        groupedSections={groupedSections}
        subscriptionAllowed={subscriptionAllowed}
        courseWorkflowAction={courseWorkflowAction}
        onWorkflowAction={onWorkflowAction}
        onCreateSection={onCreateSection}
        onCreateLesson={onCreateLesson}
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : !course ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Formation introuvable</h2>
          <p className="text-gray-600 mb-6">Cette formation n existe pas ou n est plus accessible.</p>
          <Link
            to="/dashboard/formateur/mes-cours"
            className="inline-flex px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Revenir à mes formations
          </Link>
        </div>
      ) : (
        <>
          <CourseProgramSummary
            course={course}
            sections={groupedSections}
            readinessIssues={readinessIssues}
            lessonCount={lessonCount}
            previewCount={previewCount}
            publishedCount={publishedCount}
            assetCount={assetCount}
          />

          {groupedSections.length === 0 ? (
            <CourseProgramEmptyState
              subscriptionAllowed={subscriptionAllowed}
              onCreateSection={onCreateSection}
            />
          ) : (
            <CourseProgramSectionList
              groupedSections={groupedSections}
              assets={assets}
              onCreateLesson={onCreateLesson}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              onMoveSection={onMoveSection}
              onEditLesson={onEditLesson}
              onDeleteLesson={onDeleteLesson}
              onMoveLesson={onMoveLesson}
              onOpenAsset={onOpenAsset}
              onEditAsset={onEditAsset}
              onDeleteAsset={onDeleteAsset}
            />
          )}
        </>
      )}
    </>
  );
}
