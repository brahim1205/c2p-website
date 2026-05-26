import type { Course, VirtualClass } from './classeVirtuelleTypes';

interface VirtualClassHeaderProps {
  course: Course | null;
  isEnded: boolean;
  isLive: boolean;
  isScheduled: boolean;
  vclass: VirtualClass;
}

export default function VirtualClassHeader({ course, isEnded, isLive, isScheduled, vclass }: VirtualClassHeaderProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white font-bold text-lg">{vclass.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <i className="ri-book-line"></i> {vclass.course_name || course?.title || 'Formation'}
            </span>
            <span className="flex items-center gap-1">
              <i className="ri-calendar-line"></i> {new Date(vclass.class_date).toLocaleDateString('fr-FR')}
            </span>
            <span className="flex items-center gap-1">
              <i className="ri-time-line"></i> {vclass.class_time} ({vclass.duration})
            </span>
            <span className="flex items-center gap-1">
              <i className="ri-user-line"></i> {vclass.students_count}/{vclass.max_students} participants
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              En direct
            </span>
          )}
          {isEnded && (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
              <i className="ri-check-line"></i> Terminée
            </span>
          )}
          {isScheduled && (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-teal-600/20 text-teal-400 rounded-full text-sm font-medium">
              <i className="ri-calendar-check-line"></i> Programmée
            </span>
          )}
          {vclass.room_link && (isLive || isScheduled) && (
            <a href={vclass.room_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap">
              <i className="ri-video-line mr-1"></i> Rejoindre
            </a>
          )}
          {vclass.recording_url && isEnded && (
            <a href={vclass.recording_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors whitespace-nowrap">
              <i className="ri-play-circle-line mr-1"></i> Replay
            </a>
          )}
        </div>
      </div>
      {vclass.instructor_notes ? (
        <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900/70 px-4 py-3 text-sm text-gray-300">
          <span className="font-medium text-white">Notes du formateur:</span> {vclass.instructor_notes}
        </div>
      ) : null}
      <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
        Cette page reste un <strong>viewer enrichi</strong> : acces au direct ou au replay, lecture du programme,
        progression de lecon cote serveur et questions asynchrones. Le chat temps reel, la presence live et la
        synchronisation de session en direct ne sont pas encore branches.
      </div>
    </div>
  );
}
