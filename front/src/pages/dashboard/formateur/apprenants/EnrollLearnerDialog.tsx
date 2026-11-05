import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { enrollFormateurLearner } from '@/lib/formateurEngagementApi';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseOption } from './apprenantsModel';

/**
 * Adds an existing learner account to a published course (class / cohort enrolment, no payment).
 * Like a purchase, it opens the learner's certificate for certifying courses.
 */
export default function EnrollLearnerDialog({ courses, onClose }: { courses: CourseOption[]; onClose: () => void }) {
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const published = courses.filter((course) => course.status === 'published');
  const [courseId, setCourseId] = useState(published[0] ? String(published[0].id) : '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await enrollFormateurLearner(courseId, email);
      const course = published.find((entry) => String(entry.id) === courseId);
      success('Apprenant inscrit', `${email.trim()} a accès à « ${course?.title ?? 'la formation'} » et a été notifié.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.formateur.root(user?.id) });
      onClose();
    } catch (reason) {
      setFailure(reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="enroll-learner-title">
      <form
        className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
      >
        <div>
          <h2 id="enroll-learner-title" className="text-xl font-bold text-gray-900">Inscrire un apprenant</h2>
          <p className="mt-1 text-sm text-gray-600">
            Pour une classe ou un groupe : l’apprenant accède à la formation sans paiement. Si elle est certifiante, son certificat s’ouvre immédiatement.
          </p>
        </div>
        {published.length ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Formation</span>
              <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="c2p-input h-11 px-3 text-sm">
                {published.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-800">Email du compte apprenant</span>
              <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@exemple.com" className="c2p-input h-11 px-4 text-sm" />
              <span className="mt-1 block text-xs text-gray-500">L’apprenant doit déjà avoir un compte C2P.</span>
            </label>
          </>
        ) : (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Vous n’avez pas encore de formation publiée.</p>
        )}
        {failure ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{failure}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={busy} disabled={!published.length || !courseId || !email.includes('@')}>Inscrire</Button>
        </div>
      </form>
    </div>
  );
}
