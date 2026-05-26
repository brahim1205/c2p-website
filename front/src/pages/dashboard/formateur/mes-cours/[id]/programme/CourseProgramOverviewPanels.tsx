import { Link } from 'react-router-dom';
import type { CourseWorkflowStatus } from '@/lib/courseWorkflow';
import CourseProgramLessonRow from './CourseProgramLessonRow';
import {
  statusClasses,
  statusLabels,
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

interface CourseProgramOverviewHeaderProps {
  course: Course | null;
  groupedSections: CourseProgramSection[];
  subscriptionAllowed: boolean;
  courseWorkflowAction: WorkflowAction | null;
  onWorkflowAction: () => void | Promise<void>;
  onCreateSection: () => void;
  onCreateLesson: (sectionId?: EntityId) => void;
}

interface CourseProgramEmptyStateProps {
  subscriptionAllowed: boolean;
  onCreateSection: () => void;
}

interface CourseProgramSectionListProps {
  groupedSections: CourseProgramSection[];
  assets: LessonAsset[];
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

interface CourseProgramSectionCardProps extends CourseProgramSectionListProps {
  section: CourseProgramSection;
  sectionIndex: number;
}

export function CourseProgramOverviewHeader({
  course,
  groupedSections,
  subscriptionAllowed,
  courseWorkflowAction,
  onWorkflowAction,
  onCreateSection,
  onCreateLesson,
}: CourseProgramOverviewHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Programme de la formation</h1>
          {course?.status && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[course.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[course.status] ?? course.status}
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm md:text-base">
          Structurez vos chapitres, ordonnez les leçons et préparez la publication.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/dashboard/formateur/mes-cours"
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Retour aux formations
        </Link>
        {courseWorkflowAction && course && (
          <button
            onClick={() => void onWorkflowAction()}
            disabled={!subscriptionAllowed}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              course.status === 'published'
                ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                : course.status === 'review'
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {courseWorkflowAction.description}
          </button>
        )}
        <button
          onClick={() => onCreateLesson()}
          disabled={!groupedSections.length || !subscriptionAllowed}
          className="px-4 py-2.5 rounded-lg border border-teal-200 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ajouter une leçon
        </button>
        <button
          onClick={onCreateSection}
          disabled={!subscriptionAllowed}
          className="px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ajouter une section
        </button>
      </div>
    </div>
  );
}

export function CourseProgramEmptyState({ subscriptionAllowed, onCreateSection }: CourseProgramEmptyStateProps) {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
        <i className="ri-stack-line text-2xl text-teal-500"></i>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Commencez par la structure</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl mx-auto">
        Ajoutez une première section, puis créez vos leçons vidéo, article, PDF, quiz, devoir, exercice pratique, coding challenge ou live.
      </p>
      <button
        onClick={onCreateSection}
        disabled={!subscriptionAllowed}
        className="px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        Créer la première section
      </button>
    </div>
  );
}

export function CourseProgramSectionList(props: CourseProgramSectionListProps) {
  return (
    <div className="space-y-5">
      {props.groupedSections.map((section, sectionIndex) => (
        <CourseProgramSectionCard key={section.id} {...props} section={section} sectionIndex={sectionIndex} />
      ))}
    </div>
  );
}

function CourseProgramSectionCard({
  section,
  sectionIndex,
  groupedSections,
  assets,
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
}: CourseProgramSectionCardProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Section {sectionIndex + 1}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[section.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {statusLabels[section.status] ?? section.status}
              </span>
              <span className="text-xs text-gray-500">{section.lessons.length} leçon{section.lessons.length > 1 ? 's' : ''}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description || 'Aucune description pour cette section.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              title="Monter la section"
              onClick={() => onMoveSection(section.id, 'up')}
              disabled={sectionIndex === 0}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <i className="ri-arrow-up-line"></i>
            </button>
            <button
              title="Descendre la section"
              onClick={() => onMoveSection(section.id, 'down')}
              disabled={sectionIndex === groupedSections.length - 1}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <i className="ri-arrow-down-line"></i>
            </button>
            <button
              title="Modifier la section"
              onClick={() => onEditSection(section)}
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <i className="ri-edit-line"></i>
            </button>
            <button
              title="Supprimer la section"
              onClick={() => onDeleteSection(section)}
              className="w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              <i className="ri-delete-bin-line"></i>
            </button>
            <button
              onClick={() => onCreateLesson(section.id)}
              className="px-4 py-2 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Ajouter une leçon
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {section.lessons.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500">Aucune leçon dans cette section.</div>
        ) : (
          section.lessons.map((lesson, lessonIndex) => {
            const lessonAssets = assets
              .filter((asset) => String(asset.lesson_id) === String(lesson.id))
              .sort((left, right) => left.position - right.position);

            return (
              <CourseProgramLessonRow
                key={lesson.id}
                section={section}
                lesson={lesson}
                lessonIndex={lessonIndex}
                lessonAssets={lessonAssets}
                onOpenAsset={onOpenAsset}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
                onMoveLesson={onMoveLesson}
                onEditAsset={onEditAsset}
                onDeleteAsset={onDeleteAsset}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
