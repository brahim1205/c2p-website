import { useState } from 'react';

interface NotificationItem {
  id: number;
  type: 'message' | 'prestation' | 'formation' | 'projet' | 'paiement' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  link?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'message',
      title: 'Nouveau message de Dr. Cheikh Fall',
      message: 'Excellent travail sur le partenariat !',
      timestamp: 'Il y a 5 minutes',
      read: false,
      avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20mentor%20business%20advisor%20portrait%20confident%20smile%20modern%20office%20west%20africa&width=100&height=100&seq=notif1&orientation=squarish',
      link: '/dashboard/messages'
    },
    {
      id: 2,
      type: 'projet',
      title: 'Mise à jour de projet',
      message: 'Votre projet AgriConnect a été approuvé pour l\'incubation',
      timestamp: 'Il y a 1 heure',
      read: false,
      link: '/dashboard/mes-projets/1'
    },
    {
      id: 3,
      type: 'formation',
      title: 'Nouvelle formation disponible',
      message: 'Marketing Digital Avancé est maintenant disponible',
      timestamp: 'Il y a 2 heures',
      read: true,
      link: '/espace-numerique'
    },
    {
      id: 4,
      type: 'paiement',
      title: 'Paiement reçu',
      message: 'Vous avez reçu un paiement de 50 000 FCFA',
      timestamp: 'Il y a 3 heures',
      read: true,
      link: '/dashboard/payments'
    },
    {
      id: 5,
      type: 'prestation',
      title: 'Nouvelle demande de prestation',
      message: 'Un client souhaite réserver vos services',
      timestamp: 'Hier',
      read: true,
      link: '/dashboard/requests'
    },
    {
      id: 6,
      type: 'system',
      title: 'Mise à jour de la plateforme',
      message: 'De nouvelles fonctionnalités sont disponibles',
      timestamp: 'Il y a 2 jours',
      read: true
    }
  ]);

  const getIconByType = (type: string) => {
    switch (type) {
      case 'message':
        return 'ri-message-3-line';
      case 'prestation':
        return 'ri-briefcase-line';
      case 'formation':
        return 'ri-graduation-cap-line';
      case 'projet':
        return 'ri-lightbulb-line';
      case 'paiement':
        return 'ri-money-dollar-circle-line';
      case 'system':
        return 'ri-information-line';
      default:
        return 'ri-notification-3-line';
    }
  };

  const getColorByType = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-teal-100 text-teal-600';
      case 'prestation':
        return 'bg-teal-100 text-teal-600';
      case 'formation':
        return 'bg-teal-100 text-teal-600';
      case 'projet':
        return 'bg-green-100 text-green-600';
      case 'paiement':
        return 'bg-yellow-100 text-yellow-600';
      case 'system':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      ></div>

      {/* Notification Panel */}
      <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className="ri-close-line text-xl text-gray-600"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'unread'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Tout marquer comme lu
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-notification-off-line text-3xl text-gray-400"></i>
              </div>
              <p className="text-gray-600 text-sm">
                {activeTab === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-teal-50/30' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon or Avatar */}
                    {notification.avatar ? (
                      <img
                        src={notification.avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColorByType(notification.type)}`}>
                        <i className={`${getIconByType(notification.type)} text-lg`}></i>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 pr-2">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{notification.timestamp}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
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

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button 
            onClick={() => window.location.href = '/dashboard/notifications'}
            className="w-full py-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Voir toutes les notifications
          </button>
        </div>
      </div>
    </>
  );
}