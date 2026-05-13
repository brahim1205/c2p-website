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

  const filteredNotifications = useMemo(() => {
    return filter === 'all'
      ? notifications
      : notifications.filter((item) => item.type === filter);
  }, [filter, notifications]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Notifications' }]} />

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications admin</h1>
            <p className="mt-1 text-sm text-gray-600">Suivi des alertes, messages et evenements de la plateforme.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="rounded-xl bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer les notifications admin">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === 'all' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Toutes ({notifications.length})
          </button>
          {(['message', 'system', 'paiement', 'projet', 'prestation'] as NotificationType[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === type ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {type} ({notifications.filter((item) => item.type === type).length})
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">Aucune notification pour ce filtre.</div>
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
