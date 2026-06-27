import { Course, QuizAttempt } from '../types';
import { useState, useCallback, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '@/hooks/useToast';
import QuizHistoryBanner from './QuizHistoryBanner';
import QuizQuestionForm from './QuizQuestionForm';
import QuizResultSummary from './QuizResultSummary';
import { getScoreMessage } from './quizTabModel';

interface Props {
  course: Course;
  completedLessons: Set<EntityId>;
  bookmarkedLessons: Set<EntityId>;
  notes: Record<string, string>;
  onBadgesUnlocked?: (badgeIds: string[]) => void;
  onQuizComplete?: (score: number, total: number, answers: Record<number, number>) => void;
}

export default function QuizTab({ course, completedLessons, bookmarkedLessons, notes, onBadgesUnlocked, onQuizComplete }: Props) {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [showAnswerKey, setShowAnswerKey] = useState<Record<number, boolean>>({});
  const [pastScores, setPastScores] = useState<QuizAttempt[]>(() => course.quizAttempts ?? []);
  const [attemptNumber, setAttemptNumber] = useState(() => (course.quizAttempts?.length ?? 0) + 1);
  const { success, info } = useToast();

  const handleQuizSubmit = () => {
    setShowQuizConfirm(false);
    setQuizSubmitted(true);

    const correct = course.quiz.filter((q) => quizAnswers[q.id] === q.correctIndex).length;

    setPastScores((previous) => [...previous, {
      date: new Date().toISOString(),
      score: correct,
      total: course.quiz.length,
      answers: { ...quizAnswers },
    }]);

    setAttemptNumber((prev) => prev + 1);

    onBadgesUnlocked?.([]);

    if (onQuizComplete) {
      onQuizComplete(correct, course.quiz.length, quizAnswers);
    }

    success(
      'Quiz terminé',
      `${correct}/${course.quiz.length} réponses correctes. ${getScoreMessage(correct, course.quiz.length)}`,
    );
  };

  const toggleExplanation = useCallback((questionId: number) => {
    setShowExplanation((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const toggleAnswerKey = useCallback((questionId: number) => {
    setShowAnswerKey((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const handleRestart = () => {
    setQuizSubmitted(false);
    setQuizAnswers({});
    setShowExplanation({});
    setShowAnswerKey({});
    info('Nouvelle tentative', 'Bonne chance pour ce nouvel essai !');
  };

  const currentScore = quizSubmitted
    ? course.quiz.filter((q) => (quizAnswers[q.id] ?? -1) === q.correctIndex).length
    : 0;
  const bestScore = pastScores.length > 0
    ? Math.max(...pastScores.map((s) => s.score))
    : 0;

  useEffect(() => {
    setPastScores(course.quizAttempts ?? []);
    setAttemptNumber((course.quizAttempts?.length ?? 0) + 1);
  }, [course.id, course.quizAttempts]);

  if (course.quiz.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <i className="ri-question-line text-xl"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-950">Quiz indisponible</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Le formateur n'a pas encore publié de questions pour ce quiz. Vous pouvez continuer les autres leçons
          disponibles et revenir plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden space-y-8">
      {pastScores.length > 0 && !quizSubmitted && (
        <QuizHistoryBanner
          attempts={pastScores}
          bestScore={bestScore}
          totalQuestions={course.quiz.length}
        />
      )}

      {!quizSubmitted ? (
        <QuizQuestionForm
          title={course.title}
          questions={course.quiz}
          answers={quizAnswers}
          attemptNumber={attemptNumber}
          showExplanation={showExplanation}
          onAnswer={(questionId, optionIndex) => setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))}
          onToggleExplanation={toggleExplanation}
          onSubmitRequest={() => setShowQuizConfirm(true)}
        />
      ) : (
        <QuizResultSummary
          questions={course.quiz}
          answers={quizAnswers}
          currentScore={currentScore}
          pastScores={pastScores}
          showAnswerKey={showAnswerKey}
          onToggleAnswerKey={toggleAnswerKey}
          onRestart={handleRestart}
        />
      )}

      {showQuizConfirm && (
        <ConfirmModal
          answeredCount={Object.keys(quizAnswers).length}
          totalQuestions={course.quiz.length}
          onCancel={() => setShowQuizConfirm(false)}
          onConfirm={handleQuizSubmit}
        />
      )}
    </div>
  );
}
