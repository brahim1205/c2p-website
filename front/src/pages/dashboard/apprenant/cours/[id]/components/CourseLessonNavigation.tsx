import type { Course, Lesson } from '../types';

interface CourseLessonNavigationProps {
  course: Course;
  activeLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
}

export default function CourseLessonNavigation({
  course,
  activeLesson,
  onSelectLesson,
}: CourseLessonNavigationProps) {
  if (!activeLesson) return null;

  const lessons = course.modules.flatMap((module) => module.lessons);
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === lessons.length - 1;

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => {
          if (activeIndex > 0) onSelectLesson(lessons[activeIndex - 1]);
        }}
        disabled={isFirst}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <i className="ri-arrow-left-line"></i>
        Précédent
      </button>
      <button
        onClick={() => {
          if (activeIndex < lessons.length - 1) onSelectLesson(lessons[activeIndex + 1]);
        }}
        disabled={isLast}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Suivant
        <i className="ri-arrow-right-line"></i>
      </button>
    </div>
  );
}
