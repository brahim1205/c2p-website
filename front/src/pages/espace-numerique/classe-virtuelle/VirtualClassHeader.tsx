import { useAuth } from '@/hooks/useAuth';
import { downloadIcs } from '@/lib/calendar';
import { checkInVirtualClass } from '@/lib/espaceNumeriqueApi';
import type { Course, VirtualClass } from './classeVirtuelleTypes';

interface VirtualClassHeaderProps {
  course: Course | null;
  isEnded: boolean;
  isLive: boolean;
  isScheduled: boolean;
  vclass: VirtualClass;
}

export default function VirtualClassHeader({ course, isEnded, isLive, isScheduled, vclass }: VirtualClassHeaderProps) {
  const { user } = useAuth();
  // Joining the room counts as attendance (used for hybrid / on-site certificates).
  const join = () => {
    if (user?.role === 'apprenant') void checkInVirtualClass(vclass.id).catch(() => undefined);
  };
  const addToCalendar = () => downloadIcs(`live-${vclass.id}.ics`, {
    uid: `virtual-class-${vclass.id}`,
    title: `${vclass.title} — C2P`,
    description: `${vclass.course_name || course?.title || 'Formation C2P'}\n${window.location.href}`,
    date: String(vclass.class_date).slice(0, 10),
    time: vclass.class_time,
    duration: vclass.duration,
    url: window.location.href,
  });
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
          {isScheduled && (
            <button type="button" onClick={addToCalendar} className="px-4 py-2 border border-gray-600 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors whitespace-nowrap">
              <i className="ri-calendar-event-line mr-1"></i> Ajouter à mon agenda
            </button>
          )}
          {vclass.room_link && (isLive || isScheduled) && (
            <a href={vclass.room_link} onClick={join} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap">
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
        Rejoignez la salle depuis le bouton « Rejoindre » : votre présence est enregistrée automatiquement (à partir de
        15 minutes avant le début). Vous recevez un rappel la veille et une heure avant chaque séance.
      </div>
    </div>
  );
}
