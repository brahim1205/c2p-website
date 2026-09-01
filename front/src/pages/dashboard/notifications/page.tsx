import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const notificationMeta: Record<string, { icon: string; tone: string; label: string }> = {
  message: { icon: 'ri-message-3-line', tone: 'bg-teal-50 text-teal-700', label: 'Message' },
  prestation: { icon: 'ri-briefcase-line', tone: 'bg-sky-50 text-sky-700', label: 'Prestation' },
  booking: { icon: 'ri-calendar-check-line', tone: 'bg-sky-50 text-sky-700', label: 'Réservation' },
  review: { icon: 'ri-star-line', tone: 'bg-amber-50 text-amber-700', label: 'Avis' },
  formation: { icon: 'ri-graduation-cap-line', tone: 'bg-violet-50 text-violet-700', label: 'Formation' },
  projet: { icon: 'ri-lightbulb-line', tone: 'bg-emerald-50 text-emerald-700', label: 'Projet' },
  paiement: { icon: 'ri-wallet-3-line', tone: 'bg-yellow-50 text-yellow-700', label: 'Paiement' },
  collaboration: { icon: 'ri-team-line', tone: 'bg-green-50 text-green-700', label: 'Collaboration' },
  evaluation: { icon: 'ri-file-list-3-line', tone: 'bg-indigo-50 text-indigo-700', label: 'Évaluation' },
  rendezvous: { icon: 'ri-calendar-line', tone: 'bg-pink-50 text-pink-700', label: 'Rendez-vous' },
  system: { icon: 'ri-information-line', tone: 'bg-gray-100 text-gray-700', label: 'Système' },
};

export default function DashboardNotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isLoading,
    refresh,
  } = useNotifications();

  const unreadNotifications = notifications.filter((notification) => !notification.read);

  const openNotification = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-[#27346b] p-5 text-white shadow-lg md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Centre d'alertes</p>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Notifications</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                Suivez les messages, demandes, paiements, formations et opportunités liés à votre compte.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:flex">
              <Metric label="Total" value={notifications.length} />
              <Metric label="Non lues" value={unreadCount} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Boîte de notifications</h2>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} notification(s) à traiter.` : 'Aucune notification non lue.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void refresh()} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Actualiser
            </button>
            <button onClick={() => void markAllAsRead()} disabled={unreadCount === 0} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
              Tout marquer lu
            </button>
            <button onClick={() => void clearAll()} disabled={notifications.length === 0} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300">
              Vider
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <i className="ri-notification-off-line text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Aucune notification</h3>
            <p className="mt-2 text-sm text-gray-500">Les nouvelles activités apparaîtront ici automatiquement.</p>
          </div>
        ) : unreadNotifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <i className="ri-mail-check-line text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Toutes les notifications ont été traitées</h3>
            <p className="mt-2 text-sm text-gray-500">Les notifications lues disparaissent automatiquement de cette file.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <SectionTitle title="À traiter" count={unreadNotifications.length} />
            {unreadNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onDelete={deleteNotification}
                onOpen={openNotification}
              />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
          Besoin d'échanger avec un utilisateur ? <Link to="/dashboard/messages" className="font-bold underline">Ouvrir la messagerie</Link>.
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-5 py-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-500">{title}</h3>
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{count}</span>
    </div>
  );
}

function NotificationCard({
  notification,
  onDelete,
  onOpen,
}: {
  notification: Notification;
  onDelete: (id: string) => Promise<void>;
  onOpen: (notification: Notification) => Promise<void>;
}) {
  const meta = notificationMeta[notification.type] ?? notificationMeta.system;

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md ${notification.read ? 'border-gray-200' : 'border-teal-200 ring-1 ring-teal-100'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <button type="button" onClick={() => void onOpen(notification)} className="flex flex-1 gap-4 text-left">
          {notification.avatar ? (
            <img src={notification.avatar} alt="" className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover" />
          ) : (
            <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
              <i className={`${meta.icon} text-xl`}></i>
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-900">{notification.title}</span>
              {!notification.read && <span className="h-2 w-2 rounded-full bg-teal-500" />}
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
            </span>
            <span className="mt-1 block text-sm leading-6 text-gray-600">{notification.message}</span>
            <span className="mt-2 block text-xs font-medium text-gray-400">{notification.timestamp}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void onDelete(notification.id)}
          className="self-start rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>
    </article>
  );
}
