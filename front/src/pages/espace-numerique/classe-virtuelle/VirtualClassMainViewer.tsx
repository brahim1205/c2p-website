import type { Lesson, VirtualClass } from './classeVirtuelleTypes';

interface VirtualClassMainViewerProps {
  canTrackProgress: boolean;
  currentLesson: Lesson | null;
  isLive: boolean;
  isReplayProcessing: boolean;
  isScheduled: boolean;
  notes: string;
  progressSaving: boolean;
  showNotes: boolean;
  vclass: VirtualClass;
  onChangeNotes: (value: string) => void;
  onMarkLessonComplete: () => void;
  onToggleNotes: () => void;
}

export default function VirtualClassMainViewer({
  canTrackProgress,
  currentLesson,
  isLive,
  isReplayProcessing,
  isScheduled,
  notes,
  progressSaving,
  showNotes,
  vclass,
  onChangeNotes,
  onMarkLessonComplete,
  onToggleNotes,
}: VirtualClassMainViewerProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 bg-black flex items-center justify-center">
        {isScheduled && !isLive ? (
          <div className="text-center px-6">
            <div className="w-20 h-20 flex items-center justify-center bg-teal-600 rounded-full mx-auto mb-4">
              <i className="ri-calendar-check-line text-4xl text-white"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{vclass.title}</h3>
            <p className="text-gray-400 mb-4">
              La classe commence le {new Date(vclass.class_date).toLocaleDateString('fr-FR')} à {vclass.class_time}
            </p>
            <p className="text-sm text-gray-500">Revenez à l&apos;heure prévue pour accéder au direct</p>
          </div>
        ) : isReplayProcessing ? (
          <div className="text-center px-6">
            <div className="w-20 h-20 flex items-center justify-center bg-amber-500 rounded-full mx-auto mb-4">
              <i className="ri-loader-4-line animate-spin text-4xl text-white"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Replay en préparation</h3>
            <p className="text-sm text-gray-400">Le formateur a terminé la session. L’enregistrement sera disponible ici dès qu’il sera prêt.</p>
          </div>
        ) : (
          <div className="text-center px-6">
            <div className="w-20 h-20 flex items-center justify-center bg-teal-600 rounded-full mx-auto mb-4">
              <i className="ri-play-fill text-4xl text-white"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{currentLesson?.title || vclass.title}</h3>
            <p className="text-sm text-gray-400">Durée: {currentLesson?.duration || vclass.duration}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap">
              <i className="ri-skip-back-line mr-2"></i>
              Leçon précédente
            </button>
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"><i className="ri-speed-line text-lg"></i></button>
              <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"><i className="ri-volume-up-line text-lg"></i></button>
              <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"><i className="ri-fullscreen-line text-lg"></i></button>
            </div>
            <button className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
              Leçon suivante
              <i className="ri-skip-forward-line ml-2"></i>
            </button>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto">
            <button onClick={onToggleNotes} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${showNotes ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              <i className="ri-file-text-line mr-2"></i>Notes locales
            </button>
            <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap">
              <i className="ri-download-line mr-2"></i>Ressources
            </button>
            <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg whitespace-nowrap">
              <i className="ri-question-line mr-2"></i>Questions async
            </button>
            <button
              onClick={onMarkLessonComplete}
              disabled={!canTrackProgress || !currentLesson || progressSaving || currentLesson.completed}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="ri-check-line mr-2"></i>
              {currentLesson?.completed ? 'Lecon terminee' : (progressSaving ? 'Enregistrement...' : 'Marquer terminee')}
            </button>
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-base font-bold text-white mb-1">Mes notes</h3>
            <p className="mb-3 text-xs text-gray-400">Brouillon local a cette session. Rien n est encore synchronise cote serveur.</p>
            <textarea
              value={notes}
              onChange={(event) => onChangeNotes(event.target.value)}
              placeholder="Prenez des notes pendant la leçon..."
              className="w-full h-32 px-4 py-3 bg-gray-700 text-white text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{notes.length}/500 caractères</span>
              <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg whitespace-nowrap">
                Conserver localement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
