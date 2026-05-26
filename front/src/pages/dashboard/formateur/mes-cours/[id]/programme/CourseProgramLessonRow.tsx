import {
  assetTypeLabels,
  formatBytes,
  lessonTypeLabels,
  statusClasses,
  statusLabels,
  type CourseLesson,
  type CourseProgramSection,
  type EntityId,
  type LessonAsset,
} from './programmeModel';

interface CourseLessonRowProps {
  section: CourseProgramSection;
  lesson: CourseLesson;
  lessonIndex: number;
  lessonAssets: LessonAsset[];
  onOpenAsset: (lesson: CourseLesson) => void;
  onEditLesson: (lesson: CourseLesson) => void;
  onDeleteLesson: (lesson: CourseLesson) => void;
  onMoveLesson: (sectionId: EntityId, lessonId: EntityId, direction: 'up' | 'down') => void;
  onEditAsset: (asset: LessonAsset) => void;
  onDeleteAsset: (asset: LessonAsset) => void;
}

function getLessonIconClass(type: CourseLesson['type']) {
  if (type === 'video') return 'ri-video-line';
  if (type === 'article') return 'ri-file-text-line';
  if (type === 'pdf') return 'ri-file-pdf-line';
  if (type === 'quiz') return 'ri-questionnaire-line';
  if (type === 'assignment') return 'ri-task-line';
  if (type === 'practice') return 'ri-tools-line';
  if (type === 'coding') return 'ri-code-s-slash-line';
  return 'ri-live-line';
}

export default function CourseProgramLessonRow({
  section,
  lesson,
  lessonIndex,
  lessonAssets,
  onOpenAsset,
  onEditLesson,
  onDeleteLesson,
  onMoveLesson,
  onEditAsset,
  onDeleteAsset,
}: CourseLessonRowProps) {
  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <i className={getLessonIconClass(lesson.type)}></i>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">{lesson.title}</span>
              <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                {lessonTypeLabels[lesson.type]}
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusClasses[lesson.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {statusLabels[lesson.status] ?? lesson.status}
              </span>
              {lesson.is_preview && (
                <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                  Aperçu
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{lesson.description || 'Aucune description pour cette leçon.'}</p>
            <p className="text-xs text-gray-500">
              Position {lesson.position}
              {lesson.duration ? ` • ${lesson.duration}` : ''}
              {lessonAssets.length > 0 ? ` • ${lessonAssets.length} contenu${lessonAssets.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            title="Gérer les contenus"
            onClick={() => onOpenAsset(lesson)}
            className="px-3 py-2 rounded-lg border border-teal-200 text-teal-700 text-xs font-medium hover:bg-teal-50 transition-colors"
          >
            Contenus
          </button>
          <button
            title="Monter la leçon"
            onClick={() => onMoveLesson(section.id, lesson.id, 'up')}
            disabled={lessonIndex === 0}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="ri-arrow-up-line"></i>
          </button>
          <button
            title="Descendre la leçon"
            onClick={() => onMoveLesson(section.id, lesson.id, 'down')}
            disabled={lessonIndex === section.lessons.length - 1}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="ri-arrow-down-line"></i>
          </button>
          <button
            title="Modifier la leçon"
            onClick={() => onEditLesson(lesson)}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <i className="ri-edit-line"></i>
          </button>
          <button
            title="Supprimer la leçon"
            onClick={() => onDeleteLesson(lesson)}
            className="w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
      {lessonAssets.length > 0 && (
        <CourseLessonAssetList
          lessonAssets={lessonAssets}
          onEditAsset={onEditAsset}
          onDeleteAsset={onDeleteAsset}
        />
      )}
    </div>
  );
}

function CourseLessonAssetList({
  lessonAssets,
  onEditAsset,
  onDeleteAsset,
}: Pick<CourseLessonRowProps, 'lessonAssets' | 'onEditAsset' | 'onDeleteAsset'>) {
  return (
    <div className="ml-14 flex flex-wrap gap-2">
      {lessonAssets.map((asset) => (
        <div
          key={asset.id}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
        >
          <span className="font-medium text-gray-900">{asset.title}</span>
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-600">
            {assetTypeLabels[asset.asset_type]}
          </span>
          {asset.size_bytes ? <span>{formatBytes(asset.size_bytes)}</span> : null}
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 hover:text-teal-800"
            title="Ouvrir le contenu"
          >
            <i className="ri-external-link-line"></i>
          </a>
          <button
            title="Modifier le contenu"
            onClick={() => onEditAsset(asset)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <i className="ri-edit-line"></i>
          </button>
          <button
            title="Supprimer le contenu"
            onClick={() => onDeleteAsset(asset)}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
