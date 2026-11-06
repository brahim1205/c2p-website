import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVirtualClassAttendance, markVirtualClassAttendance } from '@/lib/formateurDashboardApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { queryKeys } from '@/lib/queryKeys';

/** "Présences" button + attendance sheet of one session (self check-in or marked by the instructor). */
export default function AttendanceButton({ classId, title }: { classId: string | number; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
        <i className="ri-user-follow-line text-sm" />Présences
      </button>
      {open ? <AttendanceSheet classId={classId} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AttendanceSheet({ classId, title, onClose }: { classId: string | number; title: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { error } = useToast();
  const { user } = useAuth();
  const queryKey = queryKeys.formateur.attendance(user?.id, String(classId));
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchVirtualClassAttendance(classId) });
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = async (studentId: string, present: boolean) => {
    setSaving(studentId);
    try {
      await markVirtualClassAttendance(classId, studentId, present);
      await queryClient.invalidateQueries({ queryKey });
    } catch (reason) {
      error('Enregistrement impossible', reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : undefined);
    } finally {
      setSaving(null);
    }
  };

  const learners = data?.learners ?? [];
  const present = learners.filter((learner) => learner.present).length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attendance-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="attendance-title" className="text-lg font-bold text-gray-900">Feuille de présence</h2>
            <p className="text-sm text-gray-500">{title} · {present}/{learners.length} présent{present > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"><i className="ri-close-line" /></button>
        </div>
        <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Les apprenants qui rejoignent la salle depuis C2P sont pointés automatiquement. Cochez ou décochez pour une séance en présentiel.
        </p>
        {isLoading ? <p className="text-sm text-gray-500">Chargement…</p> : null}
        <ul className="divide-y divide-gray-100">
          {learners.map((learner) => (
            <li key={learner.student_id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                id={`att-${learner.student_id}`}
                checked={learner.present}
                disabled={saving === learner.student_id}
                onChange={(event) => void toggle(learner.student_id, event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600"
              />
              <label htmlFor={`att-${learner.student_id}`} className="flex-1 text-sm font-medium text-gray-900">{learner.student_name}</label>
              <span className="text-xs text-gray-500">
                {learner.present ? (learner.source === 'self' ? 'Connecté' : 'Pointé par vous') : 'Absent'}
              </span>
            </li>
          ))}
        </ul>
        {!isLoading && !learners.length ? <p className="py-6 text-center text-sm text-gray-500">Aucun inscrit à cette formation.</p> : null}
      </div>
    </div>
  );
}
