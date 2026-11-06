import type { Exam } from './evaluationModel';
import { getFieldClass } from './evaluationModel';

/** Pass mark, quiz attempts and quiz time limit of a new exam. */
export function ExamGradingFields({ newExam, updateNewExam }: {
  newExam: Partial<Exam>;
  updateNewExam: <K extends keyof Exam>(field: K, value: Exam[K] | undefined) => void;
}) {
  return (
    <>
    <div>
      <label htmlFor="new-exam-passing-grade" className="mb-1 block text-sm font-medium text-gray-700">Note de passage</label>
      <input
        id="new-exam-passing-grade"
        type="number"
        min={0}
        max={newExam.max_grade || 20}
        step="0.5"
        value={newExam.passing_grade ?? ''}
        placeholder={`Défaut : ${(newExam.max_grade || 20) / 2}`}
        onChange={(event) => updateNewExam('passing_grade', event.target.value === '' ? null : Math.min(Number(event.target.value), newExam.max_grade || 20))}
        className={getFieldClass(false)}
      />
      <p className="mt-1 text-xs text-gray-500">Note minimale pour valider l’épreuve et obtenir le certificat.</p>
    </div>
    {(newExam.type || 'quiz') === 'quiz' ? (
      <div>
        <label htmlFor="new-exam-max-attempts" className="mb-1 block text-sm font-medium text-gray-700">Tentatives autorisées</label>
        <input
          id="new-exam-max-attempts"
          type="number"
          min={1}
          max={10}
          value={newExam.max_attempts ?? 3}
          onChange={(event) => updateNewExam('max_attempts', Math.max(1, Math.min(10, parseInt(event.target.value, 10) || 1)))}
          className={getFieldClass(false)}
        />
        <p className="mt-1 text-xs text-gray-500">Un quiz échoué peut être repassé jusqu’à cette limite.</p>
      </div>
    ) : null}
    {(newExam.type || 'quiz') === 'quiz' ? (
      <div>
        <label htmlFor="new-exam-timer" className="mb-1 block text-sm font-medium text-gray-700">Durée limite (minutes)</label>
        <input
          id="new-exam-timer"
          type="number"
          min={0}
          max={300}
          value={newExam.timer_minutes ?? 0}
          onChange={(event) => updateNewExam('timer_minutes', Math.max(0, Math.min(300, parseInt(event.target.value, 10) || 0)))}
          className={getFieldClass(false)}
        />
        <p className="mt-1 text-xs text-gray-500">0 = sans limite. Le chronomètre démarre quand l’apprenant ouvre le quiz.</p>
      </div>
    ) : null}
    </>
  );
}
