import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LiveNotifications from './LiveNotifications';
import BrandLogo from '@/components/base/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchPublicContactSubmissions } from '@/lib/communicationsApi';
import GlobalSearch from '@/pages/dashboard/components/GlobalSearch';

const adminNavItems = [
  { label: 'Tableau de bord', icon: 'ri-dashboard-line', path: '/admin/dashboard' },
  { label: 'Utilisateurs', icon: 'ri-user-line', path: '/admin/users' },
  { label: 'Contenus', icon: 'ri-file-list-line', path: '/admin/content' },
  { label: 'Paiements', icon: 'ri-money-dollar-circle-line', path: '/admin/payments' },
  { label: 'Accréditations', icon: 'ri-shield-check-line', path: '/admin/accreditations' },
  { label: 'Signalements', icon: 'ri-alert-line', path: '/admin/reports' },
  { label: 'Statistiques', icon: 'ri-bar-chart-line', path: '/admin/analytics' },
  { label: 'Communications', icon: 'ri-mail-send-line', path: '/admin/communications' },
  { label: 'Paramétrage', icon: 'ri-settings-3-line', path: '/admin/settings' },
  { label: 'Sécurité', icon: 'ri-shield-keyhole-line', path: '/admin/security' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount: notificationUnreadCount } = useNotifications();
  const { totalUnread: messageUnreadCount } = useBackendMessaging();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const loadSupportUnread = async () => {
      try {
        const submissions = await fetchPublicContactSubmissions();
        setSupportUnreadCount(submissions.filter((entry) => entry.status === 'new').length);
      } catch {
        setSupportUnreadCount(0);
      }
    };

    if (user?.role !== 'admin') {
      setSupportUnreadCount(0);
      return;
    }

    const handleSupportUpdated = () => {
      void loadSupportUnread();
    };

    void loadSupportUnread();
    const intervalId = window.setInterval(() => {
      void loadSupportUnread();
    }, 20000);
    window.addEventListener('c2p:admin-support-updated', handleSupportUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('c2p:admin-support-updated', handleSupportUpdated);
    };
  }, [user?.role]);

  const topbarMessageCount = messageUnreadCount + supportUnreadCount;
  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim().toUpperCase() || 'AD';

  return (
    <div className="admin-layout h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <LiveNotifications notifications={notifications} />
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-menu-line text-xl text-gray-600 dark:text-gray-300"></i>
              </div>
            </button>
            <BrandLogo
              to="/admin/dashboard"
              className="flex items-center gap-3"
              imageClassName="h-9 w-auto object-contain sm:h-10"
              subtitle="Administration"
              title="Centre C2P"
              textWrapperClassName="hidden min-w-0 sm:block"
              subtitleClassName="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700"
              titleClassName="text-base font-bold text-gray-900 dark:text-white"
            />
          </div>

          <div className="hidden max-w-3xl flex-1 md:block">
            <GlobalSearch
              context="admin"
              variant="inline"
              placeholder="Rechercher un utilisateur, un contenu, un paiement..."
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/admin/messages"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              title="Messages support"
            >
              <i className="ri-mail-line text-lg text-gray-600 dark:text-gray-300"></i>
              {topbarMessageCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {topbarMessageCount > 9 ? '9+' : topbarMessageCount}
                </span>
              )}
            </Link>

            <Link
              to="/admin/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              title="Notifications"
            >
              <i className="ri-notification-3-line text-lg text-gray-600 dark:text-gray-300"></i>
              {notificationUnreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                </span>
              )}
            </Link>

            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="hidden rounded-2xl border border-teal-500 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none lg:block"
              aria-label="Année active"
            >
              {['2024', '2025', '2026', '2027'].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <Link
              to="/admin/profile"
              className="flex items-center gap-3 rounded-2xl bg-white px-2 py-1.5 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              title="Profil"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                {userInitials}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{`${user?.firstName || 'Admin'} ${user?.lastName || ''}`.trim()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrateur</p>
              </div>
              <i className="ri-arrow-down-s-line text-lg text-gray-400"></i>
            </Link>
          </div>
        </div>
      </nav>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="h-full pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 bottom-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors cursor-pointer
                        ${isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center mr-3">
                        <i className={`${item.icon} text-base`}></i>
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar footer - logout */}
          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-logout-box-line text-base"></i>
              </div>
              <span>Se déconnecter</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className="h-full min-w-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] lg:ml-64"
        >
          <div className="min-h-full p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
