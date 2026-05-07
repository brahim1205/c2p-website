import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LiveNotifications from './LiveNotifications';
import DarkModeToggle from '@/components/base/DarkModeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

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
  const { logout } = useAuth();
  const { notifications } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-layout h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <LiveNotifications notifications={notifications} />
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left: Logo + hamburger */}
          <div className="flex items-center space-x-3">
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-menu-line text-xl text-gray-600 dark:text-gray-300"></i>
              </div>
            </button>
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center">
                <span className="text-white font-bold text-sm">C2P</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">C2P Admin</span>
            </Link>
          </div>

          {/* Right: dark mode + settings + home + logout */}
          <div className="flex items-center space-x-1">
            <DarkModeToggle />
            <Link
              to="/admin/security"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-settings-3-line text-xl text-gray-600 dark:text-gray-300"></i>
              </div>
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-home-line text-xl text-gray-600 dark:text-gray-300"></i>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
              title="Se déconnecter"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-logout-box-r-line text-xl text-red-500"></i>
              </div>
            </button>
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
          className={`fixed top-16 left-0 bottom-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-0.5">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                        ${isActive
                          ? 'bg-[#14B8A6] text-white'
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
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
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
