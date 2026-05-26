import { Course, Lesson, Module } from '../types';

const typeIcons: Record<string, string> = {
  video: 'ri-play-circle-line',
  quiz: 'ri-question-line',
  reading: 'ri-book-open-line',
  exercise: 'ri-code-s-slash-line',
};

interface Props {
  course: Course;
  completedLessons: Set<number>;
  bookmarkedLessons: Set<number>;
  activeLesson: Lesson | null;
  notes: Record<number, string>;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: number) => void;
  onToggleBookmark: (lessonId: number) => void;
  onOpenNotes: (lesson: Lesson) => void;
  showMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function CourseSidebar({
  showMobile = false,
  onCloseMobile,
  course,
  completedLessons,
  bookmarkedLessons,
  activeLesson,
  notes,
  onSelectLesson,
  onToggleComplete,
  onToggleBookmark,
  onOpenNotes,
}: Props) {
  const totalLessons = Math.max(0, course.totalLessons);
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;

  const getModuleProgress = (module: Module) => {
    const done = module.lessons.filter((l) => completedLessons.has(l.id)).length;
    const pct = module.lessons.length > 0 ? Math.round((done / module.lessons.length) * 100) : 0;
    return { done, total: module.lessons.length, pct };
  };

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white ${showMobile ? 'fixed inset-0 z-50 rounded-none border-0' : ''}`}>
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Contenu du cours</h3>
          {showMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {completedLessons.size}/{totalLessons} leçons complétées
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
          <div
            className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${courseProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {course.modules.map((module) => {
          const prog = getModuleProgress(module);
          return (
            <div key={module.id} className="border-b border-gray-100 last:border-b-0">
              <div className="px-4 py-3 bg-gray-50/80">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {module.title}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {prog.done}/{prog.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                  <div
                    className="bg-teal-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${prog.pct}%` }}
                  ></div>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {module.lessons.map((lesson) => {
                  const isCompleted = completedLessons.has(lesson.id);
                  const isActive = activeLesson?.id === lesson.id;
                  const isBookmarked = bookmarkedLessons.has(lesson.id);
                  const hasNote = !!notes[lesson.id]?.trim();
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                        isActive ? 'bg-teal-50 border-l-2 border-l-teal-500' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(lesson.id);
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300 hover:border-teal-400'
                        }`}
                      >
                        {isCompleted && <i className="ri-check-line text-white text-[10px]"></i>}
                      </button>

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectLesson(lesson)}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {lesson.type === 'video' && lesson.thumbnail ? (
                              <img src={lesson.thumbnail} alt="" className="w-4 h-4 rounded object-cover" />
                            ) : (
                              <i
                                className={`${typeIcons[lesson.type]} text-xs ${
                                  isCompleted ? 'text-teal-600' : 'text-gray-400'
                                }`}
                              ></i>
                            )}
                          </div>
                          <p
                            className={`text-xs font-medium leading-tight truncate ${
                              isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'
                            }`}
                          >
                            {lesson.title}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {lesson.duration}
                        </p>
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {hasNote && (
                          <div className="w-5 h-5 flex items-center justify-center text-amber-500" title="Note enregistrée">
                            <i className="ri-sticky-note-fill text-[10px]"></i>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNotes(lesson);
                          }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 transition-colors cursor-pointer"
                          title="Notes"
                        >
                          <i className="ri-sticky-note-line text-[10px]"></i>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(lesson.id);
                          }}
                          className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                            isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'
                          }`}
                          title={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <i className={`${isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'} text-[10px]`}></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
