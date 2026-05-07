import { Course } from '../types';

interface Props {
  course: Course;
}

export default function CourseHeader({ course }: Props) {
  return (
    <div className="relative rounded-xl overflow-hidden mb-8">
      <div className="absolute inset-0">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
      </div>
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-full">{course.category}</span>
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">{course.level}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{course.title}</h1>
            <p className="text-white/80 text-sm md:text-base max-w-2xl">{course.description}</p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <img src={course.instructorAvatar} alt={course.instructor} className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            <div>
              <p className="text-sm font-medium text-white">{course.instructor}</p>
              <p className="text-xs text-white/70">Formateur</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}