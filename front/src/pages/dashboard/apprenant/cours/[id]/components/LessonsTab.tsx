import { Course, Lesson } from '../types';
import { useState } from 'react';
import { createApprenantLessonComment } from '@/lib/apprenantDashboardApi';
import ChapterQuizPrompt from './ChapterQuizPrompt';
import LessonArticle from './LessonArticle';
import LessonExerciseBox from './LessonExerciseBox';
import LessonResources from './LessonResources';
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
  onSelectLesson: (lesson: Lesson) => void;
  getInitialVideoTime: (lessonId: number) => number;
  onVideoProgress: (lessonId: number, seconds: number) => void;
}

function getActiveModule(course: Course, lessonId: number) {
  return course.modules.find((module) => module.lessons.some((lesson) => lesson.id === lessonId)) ?? null;
}

function getNextQuizInModule(course: Course, activeLesson: Lesson) {
  const module = getActiveModule(course, activeLesson.id);
  if (!module || activeLesson.type === 'quiz') return null;

  const activeIndex = module.lessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const nextQuiz = module.lessons.slice(activeIndex + 1).find((lesson) => lesson.type === 'quiz');
  const nextContentBeforeQuiz = module.lessons
    .slice(activeIndex + 1)
    .find((lesson) => lesson.type !== 'quiz');

  if (!nextQuiz || nextContentBeforeQuiz) return null;
  return nextQuiz;
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
  onSelectLesson,
  getInitialVideoTime,
  onVideoProgress,
}: Props) {
  const [instructorQuestion, setInstructorQuestion] = useState('');
  const [showInstructorQuestion, setShowInstructorQuestion] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [questionSubmitting, setQuestionSubmitting] = useState(false);

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
  const nextQuiz = getNextQuizInModule(course, activeLesson);
  const articleBlocks = activeLesson.contentBlocks ?? [];
  const lessonResources = activeLesson.resources ?? [];

  const submitInstructorQuestion = async () => {
    const question = instructorQuestion.trim();
    if (!question) return;

    setQuestionSubmitting(true);
    setQuestionError('');
    try {
      await createApprenantLessonComment(activeLesson.id, question);
      setInstructorQuestion('');
      setQuestionSent(true);
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : 'Impossible d envoyer la question.');
    } finally {
      setQuestionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeLesson.type === 'video' && (
        <VideoPlayer
          key={activeLesson.id}
          duration={activeLesson.duration}
          title={activeLesson.title}
          isCompleted={isCompleted}
          onComplete={() => onToggleComplete(activeLesson.id)}
          chapters={activeLesson.chapters}
          thumbnail={activeLesson.thumbnail}
          initialTime={getInitialVideoTime(activeLesson.id)}
          onProgress={(seconds) => onVideoProgress(activeLesson.id, seconds)}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 px-6 pt-6">
            <div className="w-11 h-11 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className={`${typeIcons[activeLesson.type]} text-white text-lg`}></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold leading-tight text-slate-950">{activeLesson.title}</h1>
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
          <div className="flex items-center gap-1 flex-shrink-0 px-6 pt-6">
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

        <div className="px-6 pb-6">
          <p className="mx-auto max-w-4xl text-lg leading-8 text-slate-700">{activeLesson.description}</p>
        </div>

        {activeLesson.type !== 'quiz' && (
          <div className="border-t border-gray-100 px-6 py-8">
        {articleBlocks.length > 0 ? (
          <LessonArticle blocks={articleBlocks} />
        ) : (
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            Aucun contenu textuel n'a encore ete publie pour cette lecon.
          </div>
        )}
          </div>
        )}

        <LessonResources resources={lessonResources} />

        {activeLesson.type === 'exercise' && (
          <LessonExerciseBox />
        )}

        <ChapterQuizPrompt
          nextQuiz={nextQuiz}
          showInstructorQuestion={showInstructorQuestion}
          instructorQuestion={instructorQuestion}
          questionSent={questionSent}
          questionError={questionError}
          questionSubmitting={questionSubmitting}
          onToggleInstructorQuestion={() => setShowInstructorQuestion((value) => !value)}
          onInstructorQuestionChange={(value) => {
            setInstructorQuestion(value);
            setQuestionSent(false);
            setQuestionError('');
          }}
          onSubmitInstructorQuestion={submitInstructorQuestion}
          onSelectLesson={onSelectLesson}
        />

        <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-5">
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
