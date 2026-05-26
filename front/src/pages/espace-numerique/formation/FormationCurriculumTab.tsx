import { getTypeIcon, type CurriculumSection, type LessonProgressRecord } from './formationDetailModel';

export function CurriculumTab({
  curriculum,
  progressByLesson,
}: {
  curriculum: CurriculumSection[];
  progressByLesson: Map<number, LessonProgressRecord>;
}) {
  return (
    <div className="space-y-4" role="tabpanel" id="course-panel-curriculum" aria-labelledby="course-tab-curriculum">
      <h2 className="mb-5 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Programme de la formation</h2>
      {curriculum.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
          Le programme détaillé sera publié ici dès que le formateur aura finalisé les sections et les leçons.
        </div>
      ) : (
        curriculum.map((section) => <CurriculumSectionBlock key={section.id} section={section} progressByLesson={progressByLesson} />)
      )}
    </div>
  );
}

function CurriculumSectionBlock({
  progressByLesson,
  section,
}: {
  progressByLesson: Map<number, LessonProgressRecord>;
  section: CurriculumSection;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3.5 sm:px-6 sm:py-4">
        <h3 className="text-base font-bold text-gray-900 sm:text-lg">{section.title}</h3>
        <p className="text-sm text-gray-600 mt-1">{section.description || `${section.lessons.length} leçons dans ce module.`}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {section.lessons.map((lesson) => {
          const lessonState = progressByLesson.get(Number(lesson.id));
          const lessonCompleted = Boolean(lessonState?.completed) || Number(lessonState?.progress ?? 0) >= 100;
          return <CurriculumLessonRow key={lesson.id} lesson={lesson} lessonCompleted={lessonCompleted} lessonState={lessonState} />;
        })}
      </div>
    </div>
  );
}

function CurriculumLessonRow({
  lesson,
  lessonCompleted,
  lessonState,
}: {
  lesson: CurriculumSection['lessons'][number];
  lessonCompleted: boolean;
  lessonState?: LessonProgressRecord;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-6 sm:py-4">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${lessonCompleted ? 'bg-green-50' : 'bg-teal-50'}`}>
          <i className={`${lessonCompleted ? 'ri-checkbox-circle-fill text-green-600' : `${getTypeIcon(lesson.type)} text-teal-600`} text-base`}></i>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
          {lesson.description ? <p className="text-xs text-gray-500 mt-0.5">{lesson.description}</p> : null}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-500">{lesson.duration || 'N/A'}</div>
        {lessonState ? <div className="mt-1 text-[11px] font-medium text-gray-500">{lessonCompleted ? 'Terminée' : `${Math.round(Number(lessonState.progress || 0))}%`}</div> : null}
        {lesson.is_preview ? <span className="inline-block mt-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">Aperçu</span> : null}
      </div>
    </div>
  );
}
