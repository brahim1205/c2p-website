import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { createFormateurAnnouncement, fetchFormateurAnnouncements } from '@/lib/formateurEngagementApi';
import { plural } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

const TITLE_MAX = 120;
const MESSAGE_MAX = 2000;

export default function FormateurAnnouncementsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.formateur.announcements(user?.id);
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: fetchFormateurAnnouncements, enabled: Boolean(user?.id) });
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const courses = data?.courses ?? [];
  const selected = courses.find((course) => String(course.id) === courseId);
  const canSend = Boolean(selected && selected.learners > 0 && title.trim() && message.trim());

  const send = async () => {
    if (!selected || !canSend) return;
    if (!window.confirm(`Envoyer cette annonce aux ${plural(selected.learners, 'apprenant(s) inscrit(s)')} à « ${selected.title} » ?`)) return;
    setSending(true);
    try {
      const created = await createFormateurAnnouncement(selected.id, { title: title.trim(), message: message.trim() });
      success('Annonce envoyée', `${plural(created.delivered_count ?? created.recipients_count, 'apprenant(s) notifié(s)')}.`);
      setTitle('');
      setMessage('');
      await queryClient.invalidateQueries({ queryKey });
    } catch (reason) {
      error('Envoi impossible', reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Réessayez dans un instant.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Annonces' }]} />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-c2p-text">Annonces</h1>
          <p className="mt-2 text-c2p-muted">
            Prévenez tous les inscrits d’une formation : nouvelle leçon, séance en direct, conseil… Ils reçoivent une notification avec un lien vers le cours.
          </p>
        </div>
        {isLoading ? <p className="text-c2p-muted">Chargement…</p> : null}
        {isError ? <p className="rounded-xl bg-c2p-danger-soft px-4 py-3 text-sm text-c2p-text">Impossible de charger les annonces.</p> : null}

        {data ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="space-y-4 rounded-2xl border border-c2p-border bg-c2p-surface p-5 sm:p-6">
              <h2 className="text-lg font-bold text-c2p-text">Nouvelle annonce</h2>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-c2p-text">Formation</span>
                <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="c2p-input h-11 px-3 text-sm">
                  <option value="">Choisir une formation…</option>
                  {courses.map((course) => (
                    <option key={String(course.id)} value={String(course.id)} disabled={course.learners === 0}>
                      {course.title} — {course.learners ? plural(course.learners, 'inscrit(s)') : 'aucun inscrit'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-sm font-bold text-c2p-text">Titre <span className="font-normal tabular-nums text-c2p-soft">{TITLE_MAX - title.length}</span></span>
                <input value={title} maxLength={TITLE_MAX} onChange={(event) => setTitle(event.target.value)} placeholder="Exemple : Nouvelle section disponible" className="c2p-input h-11 px-4 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-sm font-bold text-c2p-text">Message <span className="font-normal tabular-nums text-c2p-soft">{MESSAGE_MAX - message.length}</span></span>
                <textarea rows={7} value={message} maxLength={MESSAGE_MAX} onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ce que vous voulez dire à vos apprenants." className="c2p-input w-full px-4 py-3 text-sm" />
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-c2p-muted">{selected ? `Destinataires : ${plural(selected.learners, 'apprenant(s)')}` : 'Les apprenants désinscrits ne reçoivent rien.'}</p>
                <Button icon="ri-send-plane-line" loading={sending} disabled={!canSend} onClick={() => void send()}>Envoyer</Button>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-c2p-text">Annonces envoyées</h2>
              {data.announcements.length ? (
                <ul className="space-y-3">
                  {data.announcements.map((announcement) => (
                    <li key={String(announcement.id)} className="rounded-2xl border border-c2p-border bg-c2p-surface p-4">
                      <p className="text-xs text-c2p-muted">
                        {announcement.course_name} · {new Date(announcement.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      <p className="mt-1 font-bold text-c2p-text">{announcement.title}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-c2p-text">{announcement.message}</p>
                      <p className="mt-2 text-xs font-semibold text-c2p-muted"><i className="ri-group-line" aria-hidden="true" /> {plural(announcement.recipients_count, 'destinataire(s)')}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-c2p-border px-6 py-12 text-center text-sm text-c2p-muted">Aucune annonce envoyée pour l’instant.</p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
