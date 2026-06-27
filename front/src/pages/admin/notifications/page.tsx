import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useNotifications, type NotificationType } from '@/hooks/useNotifications';

function getIconByType(type: NotificationType) {
  switch (type) {
    case 'message':
      return 'ri-message-3-line';
    case 'paiement':
      return 'ri-money-dollar-circle-line';
    case 'projet':
      return 'ri-lightbulb-line';
    case 'formation':
      return 'ri-graduation-cap-line';
    case 'prestation':
      return 'ri-briefcase-line';
    case 'system':
      return 'ri-information-line';
    case 'collaboration':
      return 'ri-team-line';
    case 'evaluation':
      return 'ri-star-line';
    case 'booking':
      return 'ri-calendar-check-line';
    case 'review':
      return 'ri-chat-quote-line';
    default:
      return 'ri-notification-3-line';
  }
}

function getTone(type: NotificationType) {
  switch (type) {
    case 'message':
      return 'bg-blue-100 text-blue-700';
    case 'paiement':
      return 'bg-emerald-100 text-emerald-700';
    case 'system':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-teal-100 text-teal-700';
  }
}

export default function AdminNotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notifications
      .filter((item) => filter === 'all' || item.type === filter)
      .filter((item) => statusFilter === 'all' || !item.read)
      .filter((item) => {
        if (!query) return true;
        return `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(query);
      })
      .sort((a, b) => Number(a.read) - Number(b.read));
  }, [filter, notifications, searchQuery, statusFilter]);

  const typeFilters: Array<{ type: NotificationType; label: string }> = [
    { type: 'message', label: 'Messages' },
    { type: 'system', label: 'Système' },
    { type: 'paiement', label: 'Paiements' },
    { type: 'projet', label: 'Projets' },
    { type: 'prestation', label: 'Prestations' },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Notifications' }]} />

        <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
              <p className="text-sm font-semibold text-teal-600">Centre d'alertes</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Notifications admin</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Retrouvez les alertes importantes et ouvrez directement la page concernée.
              </p>
          </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <div className="rounded-2xl bg-teal-50 p-4">
                <p className="text-2xl font-bold text-teal-800">{unreadCount}</p>
                <p className="text-xs font-medium text-teal-700">Non lues</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
                <p className="text-xs font-medium text-slate-600">Total</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <i className="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une notification..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'unread' ? 'all' : 'unread')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${statusFilter === 'unread' ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Non lues
              </button>
              {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                  className="rounded-xl bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100"
              >
                Tout marquer comme lu
              </button>
            )}
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer les notifications admin">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === 'all' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Toutes ({notifications.length})
          </button>
          {typeFilters.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === type ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {label} ({notifications.filter((item) => item.type === type).length})
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <i className="ri-notification-off-line text-xl"></i>
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-900">Aucune notification</p>
              <p className="mt-1 text-sm text-gray-500">Modifiez le filtre ou la recherche.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className={`p-5 ${notification.read ? 'bg-white' : 'bg-teal-50/40'}`}>
                  <div className="flex items-start gap-4">
                    {notification.avatar ? (
                      <img src={notification.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getTone(notification.type)}`}>
                        <i className={`${getIconByType(notification.type)} text-lg`}></i>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">{notification.title}</h2>
                            {!notification.read && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-gray-400">{notification.timestamp}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getTone(notification.type)}`}>
                          {notification.type}
                        </span>
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => void markAsRead(notification.id)}
                            className="font-medium text-gray-600 hover:text-gray-900"
                          >
                            Marquer comme lu
                          </button>
                        )}
                        {notification.link && (
                          <Link to={notification.link} className="font-medium text-teal-700 hover:text-teal-800">
                            Ouvrir
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteNotification(notification.id)}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
