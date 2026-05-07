import { Course, Module } from '../types';

interface Props {
  course: Course;
  completedLessons: Set<number>;
}

export default function ProgressSection({ course, completedLessons }: Props) {
  const totalCompleted = completedLessons.size;
  const currentProgress = Math.round((totalCompleted / course.totalLessons) * 100);

  const getModuleProgress = (module: Module) => {
    const moduleCompleted = module.lessons.filter(l => completedLessons.has(l.id)).length;
    const pct = Math.round((moduleCompleted / module.lessons.length) * 100);
    return { completed: moduleCompleted, total: module.lessons.length, pct };
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Progression globale</span>
          <span className="text-sm font-bold text-teal-600">{currentProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div className="bg-teal-600 h-3 rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }}></div>
        </div>
        <p className="text-xs text-gray-500">{totalCompleted}/{course.totalLessons} leçons complétées · {course.duration} au total</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Progression par module</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.modules.map(module => {
            const prog = getModuleProgress(module);
            return (
              <div key={module.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700 truncate pr-2">{module.title}</span>
                  <span className="text-xs font-bold text-teal-600 flex-shrink-0">{prog.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${prog.pct}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{prog.completed}/{prog.total} leçons</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}