import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { Button, cx } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchFormateurReviews, respondToFormateurReview, type FormateurReview } from '@/lib/formateurEngagementApi';
import { plural } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

type ResponseFilter = 'all' | 'unanswered' | 'answered';

function Stars({ value, size = 'text-sm' }: { value: number; size?: string }) {
  return (
    <span className={cx('inline-flex text-c2p-gold', size)} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <i key={index} className={index <= Math.round(value) ? 'ri-star-fill' : 'ri-star-line'} aria-hidden="true" />
      ))}
    </span>
  );
}

function errorText(reason: unknown) {
  return reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Réessayez dans un instant.';
}

function ReviewCard({ review, onSaved }: { review: FormateurReview; onSaved: () => void }) {
  const { success, error } = useToast();
  const [editing, setEditing] = useState(!review.instructor_response);
  const [draft, setDraft] = useState(review.instructor_response ?? '');
  const [saving, setSaving] = useState(false);
  const save = async (text: string) => {
    setSaving(true);
    try {
      await respondToFormateurReview(review.id, text);
      success(text ? 'Réponse publiée' : 'Réponse retirée', text ? 'Elle est visible sur la page du cours.' : undefined);
      setEditing(!text);
      onSaved();
    } catch (reason) {
      error('Enregistrement impossible', errorText(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-c2p-border bg-c2p-surface p-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-c2p-surface-muted text-sm font-bold text-c2p-muted">
          {review.student_avatar ? <img src={review.student_avatar} alt="" className="h-full w-full object-cover" /> : (review.student_name ?? '?').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-c2p-text">{review.student_name ?? 'Apprenant'}</p>
          <p className="text-xs text-c2p-muted">
            {review.course_name ?? 'Formation'} · {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Stars value={review.rating} />
      </header>
      {review.comment ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-c2p-text">{review.comment}</p> : <p className="mt-3 text-sm italic text-c2p-muted">Note sans commentaire.</p>}

      {review.instructor_response && !editing ? (
        <div className="mt-4 rounded-xl border-l-4 border-c2p-primary bg-c2p-surface-muted px-4 py-3">
          <p className="text-xs font-bold text-c2p-primary">Votre réponse</p>
          <p className="mt-1 whitespace-pre-line text-sm text-c2p-text">{review.instructor_response}</p>
          <div className="mt-2 flex gap-3 text-xs font-semibold">
            <button type="button" className="text-c2p-text hover:underline" onClick={() => setEditing(true)}>Modifier</button>
            <button type="button" className="text-c2p-danger hover:underline" disabled={saving} onClick={() => void save('')}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <label className="sr-only" htmlFor={`review-response-${review.id}`}>Votre réponse à {review.student_name ?? 'cet apprenant'}</label>
          <textarea
            id={`review-response-${review.id}`}
            rows={3}
            maxLength={1000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Remerciez l'apprenant, répondez à sa remarque… Votre réponse sera publique."
            className="c2p-input w-full px-4 py-3 text-sm"
          />
          <div className="flex justify-end gap-2">
            {review.instructor_response ? <Button variant="ghost" size="sm" onClick={() => { setDraft(review.instructor_response ?? ''); setEditing(false); }}>Annuler</Button> : null}
            <Button size="sm" loading={saving} disabled={!draft.trim()} onClick={() => void save(draft.trim())}>Publier la réponse</Button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function FormateurReviewsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.formateur.reviews(user?.id);
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: fetchFormateurReviews, enabled: Boolean(user?.id) });
  const [courseFilter, setCourseFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');

  const reviews = useMemo(() => data?.reviews ?? [], [data?.reviews]);
  const scoped = reviews.filter((review) => courseFilter === 'all' || String(review.course_id) === courseFilter);
  const average = scoped.length ? scoped.reduce((total, review) => total + Number(review.rating || 0), 0) / scoped.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: scoped.filter((review) => Math.round(review.rating) === stars).length }));
  const unanswered = scoped.filter((review) => !review.instructor_response).length;
  const visible = scoped
    .filter((review) => !ratingFilter || Math.round(review.rating) === ratingFilter)
    .filter((review) => responseFilter === 'all' || (responseFilter === 'answered') === Boolean(review.instructor_response));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb items={[{ label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Avis' }]} />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-c2p-text">Avis des apprenants</h1>
          <p className="mt-2 text-c2p-muted">Répondez aux avis : votre réponse est publique sur la page du cours et l'apprenant est notifié.</p>
        </div>

        {isLoading ? <p className="text-c2p-muted">Chargement des avis…</p> : null}
        {isError ? <p className="rounded-xl bg-c2p-danger-soft px-4 py-3 text-sm text-c2p-text">Impossible de charger les avis.</p> : null}

        {data ? (
          <>
            <section className="mb-6 grid gap-4 rounded-2xl border border-c2p-border bg-c2p-surface p-5 sm:grid-cols-[180px_1fr_auto] sm:items-center">
              <div>
                <p className="text-5xl font-black tabular-nums text-c2p-text">{scoped.length ? average.toFixed(1).replace('.', ',') : '–'}</p>
                <Stars value={average} size="text-base" />
                <p className="mt-1 text-xs text-c2p-muted">{plural(scoped.length, 'avis', { withCount: true })}</p>
              </div>
              <ul className="space-y-1.5">
                {distribution.map(({ stars, count }) => (
                  <li key={stars}>
                    <button type="button" onClick={() => setRatingFilter(ratingFilter === stars ? 0 : stars)}
                      className={cx('flex w-full items-center gap-3 rounded-lg px-1 text-left text-xs', ratingFilter === stars && 'bg-c2p-surface-muted')}>
                      <span className="w-14 shrink-0 text-c2p-muted">{stars} étoile{stars > 1 ? 's' : ''}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-c2p-surface-muted">
                        <span className="block h-full rounded-full bg-c2p-gold" style={{ width: `${scoped.length ? (count / scoped.length) * 100 : 0}%` }} />
                      </span>
                      <span className="w-6 text-right tabular-nums text-c2p-muted">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-c2p-surface-muted px-4 py-3 text-center">
                <p className="text-2xl font-black tabular-nums text-c2p-text">{unanswered}</p>
                <p className="text-xs text-c2p-muted">sans réponse</p>
              </div>
            </section>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} aria-label="Filtrer par formation" className="c2p-input h-11 px-3 text-sm sm:max-w-xs">
                <option value="all">Toutes les formations</option>
                {data.courses.map((course) => <option key={String(course.id)} value={String(course.id)}>{course.title}</option>)}
              </select>
              <div className="flex gap-2" role="group" aria-label="Filtrer par réponse">
                {([['all', 'Tous'], ['unanswered', 'Sans réponse'], ['answered', 'Répondus']] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={responseFilter === value} onClick={() => setResponseFilter(value)}
                    className={cx('h-11 rounded-full px-4 text-sm font-semibold transition', responseFilter === value ? 'bg-c2p-primary text-white' : 'bg-c2p-surface text-c2p-muted hover:text-c2p-text')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {visible.map((review) => (
                <ReviewCard key={String(review.id)} review={review} onSaved={() => void queryClient.invalidateQueries({ queryKey })} />
              ))}
              {!visible.length ? (
                <p className="rounded-2xl border border-dashed border-c2p-border px-6 py-12 text-center text-sm text-c2p-muted">
                  {reviews.length ? 'Aucun avis ne correspond à ces filtres.' : 'Vos formations n’ont pas encore reçu d’avis. Ils apparaîtront ici dès qu’un apprenant notera un cours.'}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
