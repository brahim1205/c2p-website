import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

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

  const filtered = activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;
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
          <div className="absolute right-0 top-12 w-[min(24rem,calc(100vw-2rem))] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-close-line text-gray-500"></i>
                  </div>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'unread' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Non lues ({unreadCount})
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
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
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-teal-50/40' : ''}`}
                      onClick={() => {
                        markAsRead(n.id);
                        setIsOpen(false);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {n.avatar ? (
                          <img src={n.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getColorByType(n.type)}`}>
                            <div className="w-5 h-5 flex items-center justify-center">
                              <i className={`${getIconByType(n.type)} text-sm`}></i>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
                            {!n.read && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5"></div>}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] text-gray-400">{n.timestamp}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                              className="text-[11px] text-red-500 hover:text-red-600"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">Les notifications récentes apparaissent ici.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
