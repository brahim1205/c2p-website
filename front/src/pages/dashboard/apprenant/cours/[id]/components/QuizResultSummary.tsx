import { QuizAttempt, QuizQuestion } from '../types';
import { getAnswerLabel, getScoreBg, getScoreColor, getScoreMessage } from './quizTabModel';

interface QuizResultSummaryProps {
  questions: QuizQuestion[];
  answers: Record<number, number>;
  currentScore: number;
  pastScores: QuizAttempt[];
  showAnswerKey: Record<number, boolean>;
  onToggleAnswerKey: (questionId: number) => void;
  onRestart: () => void;
}

export default function QuizResultSummary({
  questions,
  answers,
  currentScore,
  pastScores,
  showAnswerKey,
  onToggleAnswerKey,
  onRestart,
}: QuizResultSummaryProps) {
  return (
    <div className="text-center py-6">
      <div className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 mx-auto mb-4 ${getScoreBg(currentScore, questions.length)}`}>
        <span className={`text-3xl font-bold ${getScoreColor(currentScore, questions.length)}`}>
          {currentScore}
        </span>
        <span className="text-xs text-gray-500">/{questions.length}</span>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">Quiz terminé !</h3>
      <p className={`text-sm font-medium mb-6 ${getScoreColor(currentScore, questions.length)}`}>
        {getScoreMessage(currentScore, questions.length)}
      </p>

      {pastScores.length > 1 && (
        <div className="bg-gray-50 rounded-lg p-3 mb-6 max-w-md mx-auto">
          <p className="text-xs text-gray-500 mb-2">Comparaison avec vos précédentes tentatives</p>
          <div className="flex items-end justify-center gap-2 h-20">
            {pastScores.map((attempt, idx) => {
              const heightPct = (attempt.score / attempt.total) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 rounded-t-md ${
                      idx === pastScores.length - 1 ? 'bg-teal-500' : 'bg-gray-300'
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
        {questions.map((question, idx) => {
          const selectedIndex = answers[question.id] ?? -1;
          const isCorrect = selectedIndex === question.correctIndex;
          return (
            <div
              key={question.id}
              className={`border rounded-xl p-4 ${
                isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
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
                    {question.question}
                  </p>
                  <div className="space-y-1">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedIndex === optionIndex;
                      const isCorrectAnswer = question.correctIndex === optionIndex;
                      return (
                        <div
                          key={optionIndex}
                          className={`text-xs px-3 py-1.5 rounded-md ${
                            isCorrectAnswer
                              ? 'bg-green-100 text-green-700 font-medium'
                              : isSelected && !isCorrectAnswer
                                ? 'bg-red-100 text-red-700'
                                : 'text-gray-500'
                          }`}
                        >
                          {getAnswerLabel(optionIndex)}. {option}
                          {isCorrectAnswer && <span className="ml-2 text-green-600"><i className="ri-check-line"></i> Bonne réponse</span>}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => onToggleAnswerKey(question.id)}
                    className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <i className={`ri-${showAnswerKey[question.id] ? 'eye-off' : 'eye'}-line`}></i>
                    {showAnswerKey[question.id] ? 'Masquer l\'analyse détaillée' : 'Voir l\'analyse détaillée'}
                  </button>

                  {showAnswerKey[question.id] && (
                    <div className="mt-2 space-y-2">
                      <div className={`p-3 rounded-lg text-xs ${isCorrect ? 'bg-teal-50 border border-teal-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <p className="font-semibold mb-1 flex items-center gap-1">
                          <i className={`ri-${isCorrect ? 'check-line' : 'error-warning-line'} ${isCorrect ? 'text-teal-600' : 'text-amber-600'}`}></i>
                          {isCorrect ? 'Votre réponse est correcte' : 'Votre réponse est incorrecte'}
                        </p>
                        <p className="text-gray-600 mb-1">
                          Vous avez choisi : <strong>{selectedIndex >= 0 ? `${getAnswerLabel(selectedIndex)}. ${question.options[selectedIndex]}` : 'Aucune réponse'}</strong>
                        </p>
                        <p className="text-gray-600">
                          Bonne réponse : <strong className="text-green-700">{getAnswerLabel(question.correctIndex)}. {question.options[question.correctIndex]}</strong>
                        </p>
                      </div>
                      {question.explanation && (
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 leading-relaxed">
                            <i className="ri-lightbulb-line mr-1 text-amber-500"></i>
                            <span className="font-medium text-gray-700">Explication : </span>
                            {question.explanation}
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
          onClick={onRestart}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-restart-line mr-1"></i>
          Recommencer
        </button>
      </div>
    </div>
  );
}
