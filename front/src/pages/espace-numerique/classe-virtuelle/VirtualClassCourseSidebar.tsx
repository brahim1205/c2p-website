import type { Lesson, Module } from './classeVirtuelleTypes';

interface VirtualClassCourseSidebarProps {
  completedLessons: number;
  courseModules: Module[];
  currentLesson: Lesson | null;
  expandedModule: string;
  progress: number;
  totalLessons: number;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleModule: (moduleId: string) => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return 'ri-play-circle-line';
    case 'quiz': return 'ri-question-line';
    case 'exercise': return 'ri-code-s-slash-line';
    case 'coding': return 'ri-code-s-slash-line';
    case 'practice': return 'ri-tools-line';
    case 'article': return 'ri-file-text-line';
    case 'live': return 'ri-live-line';
    case 'pdf': return 'ri-file-pdf-line';
    default: return 'ri-file-line';
  }
}

export default function VirtualClassCourseSidebar({
  completedLessons,
  courseModules,
  currentLesson,
  expandedModule,
  progress,
  totalLessons,
  onSelectLesson,
  onToggleModule,
}: VirtualClassCourseSidebarProps) {
  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0 hidden lg:block">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-base font-bold text-white mb-3">Contenu de la formation</h2>
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">{completedLessons} / {totalLessons} leçons</span>
            <span className="text-sm font-bold text-teal-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {courseModules.map((module) => (
          <div key={module.id} className="bg-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => onToggleModule(module.id)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-600 transition-colors">
              <span className="text-sm font-medium text-white">{module.title}</span>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className={`text-gray-400 ${expandedModule === module.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
              </div>
            </button>
            {expandedModule === module.id && (
              <div className="border-t border-gray-600">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => !lesson.locked && onSelectLesson(lesson)}
                    disabled={lesson.locked}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                      currentLesson?.id === lesson.id ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {lesson.completed ? (
                        <i className="ri-checkbox-circle-fill text-base text-green-400"></i>
                      ) : (
                        <i className={`${getTypeIcon(lesson.type)} text-base`}></i>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{lesson.title}</div>
                      <div className="text-xs opacity-75">{lesson.duration}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
