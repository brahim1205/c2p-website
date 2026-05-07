import { Course, Lesson } from '../types';
import VideoPlayer from './VideoPlayer';

const typeIcons: Record<string, string> = {
  video: 'ri-play-circle-line',
  quiz: 'ri-question-line',
  reading: 'ri-book-open-line',
  exercise: 'ri-code-s-slash-line',
};

const typeLabels: Record<string, string> = {
  video: 'Vidéo',
  quiz: 'Quiz',
  reading: 'Lecture',
  exercise: 'Exercice',
};

interface Props {
  course: Course;
  completedLessons: Set<number>;
  bookmarkedLessons: Set<number>;
  activeLesson: Lesson | null;
  notes: Record<number, string>;
  onOpenNotes: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: number) => void;
  onToggleBookmark: (lessonId: number) => void;
}

export default function LessonsTab({
  course,
  completedLessons,
  bookmarkedLessons,
  activeLesson,
  notes,
  onOpenNotes,
  onToggleComplete,
  onToggleBookmark,
}: Props) {
  if (!activeLesson) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <i className="ri-book-open-line text-xl text-gray-400"></i>
        </div>
        <p className="text-sm text-gray-500">Sélectionnez une leçon dans la liste pour commencer.</p>
      </div>
    );
  }

  const isCompleted = completedLessons.has(activeLesson.id);
  const isBookmarked = bookmarkedLessons.has(activeLesson.id);
  const hasNote = !!notes[activeLesson.id]?.trim();

  return (
    <div className="space-y-4">
      {/* Video player for video lessons */}
      {activeLesson.type === 'video' && (
        <VideoPlayer
          duration={activeLesson.duration}
          title={activeLesson.title}
          isCompleted={isCompleted}
          onComplete={() => onToggleComplete(activeLesson.id)}
          chapters={activeLesson.chapters}
          thumbnail={activeLesson.thumbnail}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className={`${typeIcons[activeLesson.type]} text-white text-lg`}></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{activeLesson.title}</h3>
              <p className="text-xs text-gray-500">
                {typeLabels[activeLesson.type]} · {activeLesson.duration}
                {isCompleted && (
                  <span className="ml-2 text-emerald-600 font-medium">
                    <i className="ri-check-double-line mr-0.5"></i>
                    Complétée
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasNote && (
              <div className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500" title="Note enregistrée">
                <i className="ri-sticky-note-fill text-sm"></i>
              </div>
            )}
            <button
              onClick={() => onOpenNotes(activeLesson)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
              title="Ajouter / éditer mes notes"
            >
              <i className="ri-sticky-note-line text-sm"></i>
            </button>
            <button
              onClick={() => onToggleBookmark(activeLesson.id)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isBookmarked ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400'
              }`}
              title={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <i className={`${isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'} text-sm`}></i>
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">{activeLesson.description}</p>

        {activeLesson.type === 'reading' && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="text-sm leading-relaxed">
                Ce contenu de lecture couvre les fondamentaux théoriques de cette leçon.
                Prenez des notes personnelles en cliquant sur l&apos;icône de note pour retenir les points clés.
              </p>
              <ul className="text-sm mt-3 space-y-1.5 list-disc list-inside text-gray-600">
                <li>Comprendre les concepts fondamentaux présentés</li>
                <li>Relier cette leçon aux modules précédents</li>
                <li>Appliquer les principes dans les exercices pratiques</li>
                <li>Poser des questions dans l&apos;onglet Discussions si besoin</li>
              </ul>
            </div>
          </div>
        )}

        {activeLesson.type === 'exercise' && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
            <p className="text-sm text-gray-700 mb-3 font-medium">Instructions de l&apos;exercice :</p>
            <div className="bg-white rounded-lg p-3 font-mono text-xs text-gray-700 border border-gray-200">
              {/* Simulated exercise content */}
              <p className="mb-2">// Objectif : Appliquez les concepts de cette leçon</p>
              <p className="mb-2">// Étape 1 : Lisez attentivement l&apos;énoncé</p>
              <p className="mb-2">// Étape 2 : Réalisez l&apos;exercice dans votre environnement</p>
              <p>// Étape 3 : Soumettez votre solution pour évaluation</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors cursor-pointer">
                Télécharger le sujet
              </button>
              <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                Voir la correction
              </button>
            </div>
          </div>
        )}

        {activeLesson.type === 'quiz' && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
            <p className="text-sm text-amber-800">
              <i className="ri-question-line mr-1"></i>
              Ce quiz évalue vos connaissances sur ce module. Rendez-vous dans l&apos;onglet
              <strong> Quiz</strong> pour le passer.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => onToggleComplete(activeLesson.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              isCompleted
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {isCompleted ? (
              <>
                <i className="ri-check-line mr-1"></i>
                Leçon complétée
              </>
            ) : (
              <>
                <i className="ri-check-line mr-1"></i>
                Marquer comme terminée
              </>
            )}
          </button>

          {!isCompleted && (
            <button
              onClick={() => onOpenNotes(activeLesson)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-sticky-note-line mr-1"></i>
              Prendre des notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
