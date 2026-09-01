import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(unreadCount > 0 ? 'unread' : 'all');
    }
  }, [isOpen, unreadCount]);

  const getIconByType = (type: string) => {
    switch (type) {
      case 'message': return 'ri-message-3-line';
      case 'prestation': return 'ri-briefcase-line';
      case 'formation': return 'ri-graduation-cap-line';
      case 'projet': return 'ri-lightbulb-line';
      case 'paiement': return 'ri-money-dollar-circle-line';
      case 'system': return 'ri-information-line';
      default: return 'ri-notification-3-line';
    }
  };

  const getColorByType = (type: string) => {
    switch (type) {
      case 'message': return 'bg-teal-100 text-teal-600';
      case 'prestation': return 'bg-teal-100 text-teal-600';
      case 'formation': return 'bg-teal-100 text-teal-600';
      case 'projet': return 'bg-green-100 text-green-600';
      case 'paiement': return 'bg-yellow-100 text-yellow-600';
      case 'system': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const filtered = activeTab === 'unread' ? unreadNotifications : unreadNotifications;
  const recent = filtered.slice(0, 6);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ouvrir les notifications"
        aria-expanded={isOpen}
        className={`relative w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all duration-200 ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-100/80'}`}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <i className="ri-notification-3-line text-xl text-gray-600"></i>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer les notifications"
            className="fixed inset-0 bg-black/10 z-30"
            onClick={() => setIsOpen(false)}
          ></button>
          <div className="fixed left-3 right-3 top-[4.7rem] z-40 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[24rem] sm:max-h-[520px]">
            <div className="border-b border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <button onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-close-line text-gray-500"></i>
                  </div>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Toutes ({unreadNotifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'unread' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Non lues ({unreadCount})
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllAsRead()}
                  className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className="ri-notification-off-line text-gray-400 text-lg"></i>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recent.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className={`w-full cursor-pointer p-3 text-left transition-colors hover:bg-gray-50 ${!n.read ? 'bg-teal-50/40' : ''}`}
                    onClick={() => {
                        void markAsRead(n.id);
                        setIsOpen(false);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {n.avatar ? (
                          <img src={n.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center ${getColorByType(n.type)}`}>
                            <div className="w-5 h-5 flex items-center justify-center">
                              <i className={`${getIconByType(n.type)} text-sm`}></i>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="pr-1 text-sm font-semibold leading-snug text-gray-900">{n.title}</p>
                            {!n.read && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-teal-500"></div>}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-[11px] text-gray-400">{n.timestamp}</span>
                            <div className="flex items-center gap-3">
                              {!n.read ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void markAsRead(n.id);
                                  }}
                                  className="text-[11px] font-medium text-teal-600 hover:text-teal-700"
                                >
                                  Marquer lu
                                </button>
                              ) : null}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteNotification(n.id);
                                }}
                                className="text-[11px] font-medium text-red-500 hover:text-red-600"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/dashboard/notifications');
                }}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Voir toutes les notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
