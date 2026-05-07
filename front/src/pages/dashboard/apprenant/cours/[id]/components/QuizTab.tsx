import { Course, QuizQuestion } from '../types';
import { useState, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '@/hooks/useToast';
import {
  loadQuizScores,
  saveQuizScore,
  checkAndAwardBadges,
  BADGES,
} from '../storage';

interface Props {
  course: Course;
  completedLessons: Set<number>;
  bookmarkedLessons: Set<number>;
  notes: Record<number, string>;
  onBadgesUnlocked?: (badgeIds: string[]) => void;
  onQuizComplete?: (score: number, total: number) => void;
}

function getScoreMessage(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct === 100) return 'Parfait ! Vous maîtrisez ce sujet.';
  if (pct >= 80) return 'Excellent travail ! Presque parfait.';
  if (pct >= 60) return 'Bon score. Quelques révisions nécessaires.';
  if (pct >= 40) return 'Score moyen. Continuez à réviser.';
  return 'À retravailler. Ne vous découragez pas !';
}

function getScoreColor(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct === 100) return 'text-emerald-600';
  if (pct >= 80) return 'text-teal-600';
  if (pct >= 60) return 'text-amber-600';
  if (pct >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreBg(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct === 100) return 'bg-emerald-50 border-emerald-200';
  if (pct >= 80) return 'bg-teal-50 border-teal-200';
  if (pct >= 60) return 'bg-amber-50 border-amber-200';
  if (pct >= 40) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

export default function QuizTab({ course, completedLessons, bookmarkedLessons, notes, onBadgesUnlocked, onQuizComplete }: Props) {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [showAnswerKey, setShowAnswerKey] = useState<Record<number, boolean>>({});
  const [attemptNumber, setAttemptNumber] = useState(() => loadQuizScores(course.id).length + 1);
  const { success, info } = useToast();

  const handleQuizSubmit = () => {
    setShowQuizConfirm(false);
    setQuizSubmitted(true);

    const correct = course.quiz.filter((q) => quizAnswers[q.id] === q.correctIndex).length;

    saveQuizScore(course.id, {
      date: new Date().toISOString(),
      score: correct,
      total: course.quiz.length,
      answers: { ...quizAnswers },
    });

    setAttemptNumber((prev) => prev + 1);

    const newlyUnlocked = checkAndAwardBadges(
      course.id,
      completedLessons,
      bookmarkedLessons,
      notes,
      { score: correct, total: course.quiz.length },
    );

    if (newlyUnlocked.length > 0 && onBadgesUnlocked) {
      onBadgesUnlocked(newlyUnlocked);
    }

    if (onQuizComplete) {
      onQuizComplete(correct, course.quiz.length);
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

  const pastScores = loadQuizScores(course.id);
  const currentScore = quizSubmitted
    ? course.quiz.filter((q) => (quizAnswers[q.id] ?? -1) === q.correctIndex).length
    : 0;
  const bestScore = pastScores.length > 0
    ? Math.max(...pastScores.map((s) => s.score))
    : 0;

  return (
    <div className="space-y-6">
      {/* Score history banner */}
      {pastScores.length > 0 && !quizSubmitted && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <i className="ri-bar-chart-line text-teal-600 text-lg"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Historique des tentatives</p>
                <p className="text-xs text-gray-500">
                  {pastScores.length} tentative{pastScores.length > 1 ? 's' : ''} · Meilleur score : {bestScore}/{course.quiz.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {pastScores.slice(-3).map((s, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    (s.score / s.total) * 100 >= 80
                      ? 'bg-emerald-100 text-emerald-700'
                      : (s.score / s.total) * 100 >= 60
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {s.score}/{s.total}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!quizSubmitted ? (
        <>
          <div className="bg-teal-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-teal-800">
              <i className="ri-information-line mr-1"></i>
              Tentative #{attemptNumber} · {course.quiz.length} questions · Répondez à toutes les questions pour valider.
            </p>
          </div>
          {course.quiz.map((q, idx) => (
            <div key={q.id} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-teal-600 font-bold text-sm mt-0.5">{idx + 1}.</span>
                <p className="text-sm font-semibold text-gray-900">{q.question}</p>
              </div>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                      quizAnswers[q.id] === optIdx
                        ? 'bg-teal-100 border-2 border-teal-300 text-teal-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][optIdx]}.</span>
                    {opt}
                  </button>
                ))}
              </div>
              {q.explanation && (
                <button
                  onClick={() => toggleExplanation(q.id)}
                  className="mt-2 text-xs text-gray-400 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <i className={`ri-${showExplanation[q.id] ? 'eye-off' : 'eye'}-line`}></i>
                  {showExplanation[q.id] ? 'Masquer l\'indice' : 'Afficher un indice'}
                </button>
              )}
              {showExplanation[q.id] && q.explanation && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <i className="ri-lightbulb-line mr-1 text-amber-600"></i>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {Object.keys(quizAnswers).length}/{course.quiz.length} questions répondues
            </p>
            <button
              onClick={() => setShowQuizConfirm(true)}
              disabled={Object.keys(quizAnswers).length < course.quiz.length}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                Object.keys(quizAnswers).length < course.quiz.length
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              Soumettre le quiz
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          {/* Score circle */}
          <div className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 mx-auto mb-4 ${getScoreBg(currentScore, course.quiz.length)}`}>
            <span className={`text-3xl font-bold ${getScoreColor(currentScore, course.quiz.length)}`}>
              {currentScore}
            </span>
            <span className="text-xs text-gray-500">/{course.quiz.length}</span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-1">Quiz terminé !</h3>
          <p className={`text-sm font-medium mb-6 ${getScoreColor(currentScore, course.quiz.length)}`}>
            {getScoreMessage(currentScore, course.quiz.length)}
          </p>

          {/* Attempt comparison */}
          {pastScores.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-6 max-w-md mx-auto">
              <p className="text-xs text-gray-500 mb-2">Comparaison avec vos précédentes tentatives</p>
              <div className="flex items-end justify-center gap-2 h-20">
                {pastScores.map((s, idx) => {
                  const heightPct = (s.score / s.total) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-6 rounded-t-md ${
                          idx === pastScores.length - 1
                            ? 'bg-teal-500'
                            : 'bg-gray-300'
                        }`}
                        style={{ height: `${Math.max(heightPct, 10)}%` }}
                      ></div>
                      <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 max-w-lg mx-auto text-left">
            {course.quiz.map((q, idx) => {
              const isCorrect = (quizAnswers[q.id] ?? -1) === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className={`border rounded-xl p-4 ${
                    isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i
                        className={`${
                          isCorrect
                            ? 'ri-check-line text-green-600 bg-green-100'
                            : 'ri-close-line text-red-600 bg-red-100'
                        } w-7 h-7 flex items-center justify-center rounded-full text-sm`}
                      ></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        <span className="text-gray-500 mr-1">{idx + 1}.</span>
                        {q.question}
                      </p>
                      <div className="space-y-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[q.id] === optIdx;
                          const isCorrectAnswer = q.correctIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`text-xs px-3 py-1.5 rounded-md ${
                                isCorrectAnswer
                                  ? 'bg-green-100 text-green-700 font-medium'
                                  : isSelected && !isCorrectAnswer
                                    ? 'bg-red-100 text-red-700'
                                    : 'text-gray-500'
                              }`}
                            >
                              {['A', 'B', 'C', 'D'][optIdx]}. {opt}
                              {isCorrectAnswer && <span className="ml-2 text-green-600"><i className="ri-check-line"></i> Bonne réponse</span>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Answer Key Toggle */}
                      <button
                        onClick={() => toggleAnswerKey(q.id)}
                        className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <i className={`ri-${showAnswerKey[q.id] ? 'eye-off' : 'eye'}-line`}></i>
                        {showAnswerKey[q.id] ? 'Masquer l\'analyse détaillée' : 'Voir l\'analyse détaillée'}
                      </button>

                      {showAnswerKey[q.id] && (
                        <div className="mt-2 space-y-2">
                          <div className={`p-3 rounded-lg text-xs ${isCorrect ? 'bg-teal-50 border border-teal-200' : 'bg-amber-50 border border-amber-200'}`}>
                            <p className="font-semibold mb-1 flex items-center gap-1">
                              <i className={`ri-${isCorrect ? 'check-line' : 'error-warning-line'} ${isCorrect ? 'text-teal-600' : 'text-amber-600'}`}></i>
                              {isCorrect ? 'Votre réponse est correcte' : 'Votre réponse est incorrecte'}
                            </p>
                            <p className="text-gray-600 mb-1">
                              Vous avez choisi : <strong>{['A', 'B', 'C', 'D'][quizAnswers[q.id]]}. {q.options[quizAnswers[q.id]]}</strong>
                            </p>
                            <p className="text-gray-600">
                              Bonne réponse : <strong className="text-green-700">{['A', 'B', 'C', 'D'][q.correctIndex]}. {q.options[q.correctIndex]}</strong>
                            </p>
                          </div>
                          {q.explanation && (
                            <div className="p-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-xs text-gray-600 leading-relaxed">
                                <i className="ri-lightbulb-line mr-1 text-amber-500"></i>
                                <span className="font-medium text-gray-700">Explication : </span>
                                {q.explanation}
                              </p>
                            </div>
                          )}
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-xs text-gray-500 leading-relaxed">
                              <i className="ri-book-open-line mr-1 text-gray-400"></i>
                              <span className="font-medium text-gray-700">Conseil : </span>
                              {isCorrect
                                ? 'Vous avez bien compris ce concept. Essayez de l\'appliquer dans les exercices pratiques.'
                                : 'Revenez à la leçon associée pour réviser ce concept. La pratique régulière est la clé.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={handleRestart}
              className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-restart-line mr-1"></i>
              Recommencer
            </button>
          </div>
        </div>
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
