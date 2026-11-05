import { Link } from 'react-router-dom';
import { cx } from '@/components/ui';
import type { FormateurVirtualClass } from '@/lib/formateurDashboardTypes';
import { plural } from '@/lib/formatters';
import { studioPath, type StudioCourse } from '../studioModel';
import { PanelHeader } from './PanelHeader';

const STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programmée', className: 'bg-c2p-surface-muted text-c2p-text' },
  live: { label: 'En direct', className: 'bg-c2p-danger-soft text-c2p-danger' },
  ended: { label: 'Terminée', className: 'bg-c2p-success-soft text-c2p-success' },
  cancelled: { label: 'Annulée', className: 'bg-c2p-surface-muted text-c2p-muted line-through' },
};

function sessionDate(session: FormateurVirtualClass) {
  const date = new Date(`${session.class_date}T${session.class_time || '00:00'}`);
  return Number.isNaN(date.getTime())
    ? `${session.class_date} ${session.class_time}`
    : (() => {
      const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    })();
}

export default function LiveSessionsPanel({ course, sessions, loading }: {
  course: StudioCourse; sessions: FormateurVirtualClass[]; loading: boolean;
}) {
  const planUrl = `/dashboard/formateur/classes-virtuelles/nouvelle?course=${encodeURIComponent(String(course.id))}&retour=${encodeURIComponent(studioPath(course.id, 'seances'))}`;
  const upcoming = sessions.filter((session) => session.status === 'scheduled' || session.status === 'live');

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Séances en direct"
        description="Planifiez des classes virtuelles pour ce cours : questions-réponses, ateliers, corrections. Les inscrits les rejoignent depuis leur espace, et vous pouvez ajouter le replay ensuite."
        action={<Link to={planUrl} className="c2p-btn-primary h-10 px-4 text-sm"><i className="ri-add-line" aria-hidden="true" /> Planifier une séance</Link>}
      />

      {course.delivery_mode !== 'online' && !upcoming.length ? (
        <p className="rounded-2xl bg-c2p-warning-soft px-4 py-3 text-sm text-c2p-text">
          Ce cours est {course.delivery_mode === 'hybrid' ? 'hybride' : 'en présentiel'} et n’a {sessions.length ? 'plus de séance à venir' : 'encore aucune séance'} : planifiez-en une pour que les apprenants sachent quand vous retrouver.
        </p>
      ) : null}

      {loading ? <p className="text-sm text-c2p-muted">Chargement des séances…</p> : null}

      {sessions.length ? (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const status = STATUS[session.status] ?? STATUS.scheduled;
            return (
              <li key={String(session.id)} className="flex flex-col gap-3 rounded-2xl border border-c2p-border bg-c2p-surface p-4 sm:flex-row sm:items-center">
                <i className="ri-live-line text-2xl text-c2p-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-c2p-text">{session.title}</p>
                  <p className="text-sm text-c2p-muted">
                    {sessionDate(session)}{session.duration ? ` · ${session.duration}` : ''} · {plural(session.students_count, 'participant(s)')} / {session.max_students}
                  </p>
                </div>
                <span className={cx('self-start rounded-full px-2.5 py-1 text-xs font-bold sm:self-center', status.className)}>{status.label}</span>
                {session.recording_url ? (
                  <a href={session.recording_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-c2p-primary hover:underline">Replay</a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : !loading ? (
        <div className="rounded-2xl border border-dashed border-c2p-border-strong px-6 py-10 text-center">
          <i className="ri-video-chat-line text-4xl text-c2p-primary" aria-hidden="true" />
          <p className="mt-3 font-bold text-c2p-text">Aucune séance pour ce cours</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-c2p-muted">La salle Jitsi est créée automatiquement : il suffit de choisir une date et une heure.</p>
        </div>
      ) : null}

      <p className="text-sm text-c2p-muted">
        Démarrer une séance, la terminer ou envoyer son replay se fait dans{' '}
        <Link to="/dashboard/formateur/classes-virtuelles" className="font-semibold text-c2p-primary hover:underline">Classes virtuelles</Link>.
      </p>
    </div>
  );
}
