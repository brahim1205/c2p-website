import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { updateFormateurExam } from '@/lib/formateurDashboardApi';
import type { Exam } from './evaluationModel';

interface Props {
  exam: Exam;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function errorText(reason: unknown) {
  return reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Enregistrement impossible.';
}

/** Edit an existing exam without losing its submissions. */
export default function EditExamModal({ exam, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: exam.title,
    instructions: exam.instructions ?? '',
    exam_date: (exam.exam_date ?? '').slice(0, 10),
    max_grade: String(exam.max_grade ?? 20),
    passing_grade: exam.passing_grade == null ? '' : String(exam.passing_grade),
    max_attempts: String(exam.max_attempts ?? 3),
    timer_minutes: String(exam.timer_minutes ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const isQuiz = exam.type === 'quiz';
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      await updateFormateurExam(exam.id, {
        title: form.title.trim(),
        instructions: form.instructions.trim() || null,
        exam_date: form.exam_date,
        max_grade: Number(form.max_grade),
        passing_grade: form.passing_grade === '' ? null : Number(form.passing_grade),
        ...(isQuiz ? { max_attempts: Number(form.max_attempts), timer_minutes: Number(form.timer_minutes) } : {}),
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setFailure(errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  const field = 'c2p-input h-11 px-3 text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-exam-title">
      <form className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <h2 id="edit-exam-title" className="text-xl font-bold text-gray-900">Modifier l’évaluation</h2>
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Titre</span>
          <input required value={form.title} onChange={set('title')} className={field} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Consignes</span>
          <textarea rows={4} maxLength={1500} value={form.instructions} onChange={set('instructions')} className="c2p-input w-full px-3 py-2 text-sm" /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Date limite</span>
            <input type="date" required value={form.exam_date} onChange={set('exam_date')} className={field} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Barème</span>
            <input type="number" min={1} max={100} value={form.max_grade} onChange={set('max_grade')} className={field} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Note de passage</span>
            <input type="number" min={0} max={Number(form.max_grade) || 20} step="0.5" placeholder="Seuil du cours" value={form.passing_grade} onChange={set('passing_grade')} className={field} /></label>
        </div>
        {isQuiz ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Tentatives autorisées</span>
              <input type="number" min={1} max={10} value={form.max_attempts} onChange={set('max_attempts')} className={field} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Durée limite (minutes)</span>
              <input type="number" min={0} max={300} value={form.timer_minutes} onChange={set('timer_minutes')} className={field} />
              <span className="mt-1 block text-xs text-gray-500">0 = sans limite. Le chronomètre démarre à l’ouverture du quiz par l’apprenant.</span></label>
          </div>
        ) : null}
        <p className="text-xs text-gray-500">Les copies déjà rendues sont conservées. Le barème ne peut plus changer une fois des copies notées.</p>
        {failure ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{failure}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={saving}>Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
