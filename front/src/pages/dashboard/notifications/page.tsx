import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

interface NotificationPreferences {
  email: Record<NotificationType, boolean>;
  sms: Record<NotificationType, boolean>;
  push: Record<NotificationType, boolean>;
  inApp: Record<NotificationType, boolean>;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'history' | 'preferences'>('history');
  const [filterType, setFilterType] = useState<'all' | NotificationType>('all');
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      message: true,
      prestation: true,
      formation: true,
      projet: true,
      paiement: true,
      system: false,
      rendezvous: true,
      collaboration: true,
      evaluation: true,
      booking: true,
      review: true,
    },
    sms: {
      message: false,
      prestation: true,
      formation: false,
      projet: true,
      paiement: true,
      system: false,
      rendezvous: true,
      collaboration: false,
      evaluation: false,
      booking: true,
      review: false,
    },
    push: {
      message: true,
      prestation: true,
      formation: true,
      projet: true,
      paiement: true,
      system: true,
      rendezvous: true,
      collaboration: true,
      evaluation: true,
      booking: true,
      review: true,
    },
    inApp: {
      message: true,
      prestation: true,
      formation: true,
      projet: true,
      paiement: true,
      system: true,
      rendezvous: true,
      collaboration: true,
      evaluation: true,
      booking: true,
      review: true,
    },
  });

  const getIconByType = (type: string) => {
    switch (type) {
      case 'message': return 'ri-message-3-line';
      case 'prestation': return 'ri-briefcase-line';
      case 'formation': return 'ri-graduation-cap-line';
      case 'projet': return 'ri-lightbulb-line';
      case 'paiement': return 'ri-money-dollar-circle-line';
      case 'system': return 'ri-information-line';
      case 'rendezvous': return 'ri-calendar-check-line';
      case 'collaboration': return 'ri-team-line';
      case 'evaluation': return 'ri-star-line';
      default: return 'ri-notification-3-line';
    }
  };

  const getColorByType = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-100 text-blue-600';
      case 'prestation': return 'bg-teal-100 text-teal-600';
      case 'formation': return 'bg-purple-100 text-purple-600';
      case 'projet': return 'bg-green-100 text-green-600';
      case 'paiement': return 'bg-yellow-100 text-yellow-600';
      case 'system': return 'bg-gray-100 text-gray-600';
      case 'rendezvous': return 'bg-orange-100 text-orange-600';
      case 'collaboration': return 'bg-indigo-100 text-indigo-600';
      case 'evaluation': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getLabelByType = (type: string) => {
    switch (type) {
      case 'message': return 'Messages';
      case 'prestation': return 'Prestations';
      case 'formation': return 'Formations';
      case 'projet': return 'Projets';
      case 'paiement': return 'Paiements';
      case 'system': return 'Système';
      case 'rendezvous': return 'Rendez-vous';
      case 'collaboration': return 'Collaborations';
      case 'evaluation': return 'Évaluations';
      default: return 'Autre';
    }
  };

  const togglePreference = (channel: keyof NotificationPreferences, type: NotificationType) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type],
      },
    }));
  };

  const savePreferences = () => {
    success('Préférences enregistrées', 'Vos préférences de notification ont été mises à jour.');
  };

  const filteredNotifications = filterType === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filterType);

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Notifications' }]} />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-1">Gérez vos notifications et préférences</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">{unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-4 mt-6">
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <i className="ri-history-line mr-2"></i>Historique
          </button>
          <button onClick={() => setActiveTab('preferences')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'preferences' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <i className="ri-settings-3-line mr-2"></i>Préférences
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Toutes ({notifications.length})
                </button>
                {(['message', 'prestation', 'formation', 'projet', 'paiement', 'system'] as NotificationType[]).map((type) => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === type ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {getLabelByType(type)} ({notifications.filter((n) => n.type === type).length})
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="px-4 py-2 bg-teal-50 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors whitespace-nowrap">
                    <i className="ri-check-double-line mr-2"></i>Tout marquer comme lu
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors whitespace-nowrap">
                    <i className="ri-delete-bin-line mr-2"></i>Tout effacer
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-notification-off-line text-4xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune notification</h3>
                <p className="text-gray-600">Vous n&apos;avez aucune notification pour le moment</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-teal-50/30' : ''}`}>
                    <div className="flex items-start space-x-4">
                      {notification.avatar ? (
                        <img src={notification.avatar} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getColorByType(notification.type)}`}>
                          <i className={`${getIconByType(notification.type)} text-xl`}></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                              {!notification.read && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></div>}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <div className="flex items-center space-x-4">
                              <span className="text-xs text-gray-500"><i className="ri-time-line mr-1"></i>{notification.timestamp}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getColorByType(notification.type)}`}>{getLabelByType(notification.type)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 mt-3">
                          {!notification.read && (
                            <button onClick={() => markAsRead(notification.id)} className="text-sm text-gray-600 hover:text-gray-700 font-medium whitespace-nowrap">
                              <i className="ri-check-line mr-1"></i>Marquer comme lu
                            </button>
                          )}
                          {notification.link && (
                            <Link to={notification.link} className="text-sm text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap">
                              <i className="ri-arrow-right-line mr-1"></i>Voir
                            </Link>
                          )}
                          <button onClick={() => deleteNotification(notification.id)} className="text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap">
                            <i className="ri-delete-bin-line mr-1"></i>Supprimer
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
      )}

      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type de notification</th>
                    {(['email', 'sms', 'push', 'inApp'] as const).map((ch) => (
                      <th key={ch} className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <i className={`${ch === 'email' ? 'ri-mail-line' : ch === 'sms' ? 'ri-message-2-line' : ch === 'push' ? 'ri-smartphone-line' : 'ri-notification-3-line'} text-xl text-gray-600 mb-1`}></i>
                          <span className="text-sm font-semibold text-gray-900">{ch === 'email' ? 'Email' : ch === 'sms' ? 'SMS' : ch === 'push' ? 'Push Mobile' : 'In-App'}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(['message', 'prestation', 'formation', 'projet', 'paiement', 'system'] as NotificationType[]).map((type) => (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorByType(type)}`}>
                            <i className={`${getIconByType(type)} text-lg`}></i>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{getLabelByType(type)}</span>
                        </div>
                      </td>
                      {(['email', 'sms', 'push', 'inApp'] as const).map((channel) => (
                        <td key={channel} className="px-6 py-4 text-center">
                          <button onClick={() => togglePreference(channel, type)} className={`w-12 h-6 rounded-full transition-colors relative ${preferences[channel][type] ? 'bg-teal-500' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${preferences[channel][type] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={savePreferences} className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors whitespace-nowrap cursor-pointer">
              <i className="ri-save-line mr-2"></i>Enregistrer les préférences
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
