import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/roles';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useNotifications } from '@/hooks/useNotifications';
import BrandLogo from '@/components/base/BrandLogo';
import LiveNotifications from '@/components/feature/LiveNotifications';
import AvatarUpload from '@/components/base/AvatarUpload';
import { DashboardMessagesMenu } from './DashboardMessagesMenu';
import NotificationBell from './NotificationBell';
import {
  baseNavItems,
  getActiveNavPath,
  getNavGapClass,
  roleNavOverrides,
} from './dashboardLayoutNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideMainScrollbar?: boolean;
}

export default function DashboardLayout({ children, hideMainScrollbar = false }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    conversations: messageConversations,
    totalUnread: messageUnread,
    loading: messagesLoading,
    markAsRead,
  } = useBackendMessaging();
  const { notifications } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const navItems = user && roleNavOverrides[user.role]
    ? roleNavOverrides[user.role]
    : baseNavItems;
  const activeNavPath = getActiveNavPath(location.pathname, navItems);
  const navGapClass = getNavGapClass(navItems.length);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const isApprenant = user?.role === 'apprenant';
  const profileTarget = isApprenant ? '/dashboard/parametres' : '/dashboard/profile';
  const recentConversations = messageConversations.slice(0, 5);

  // Desktop sidebar width
  const sidebarWidth = 'w-64';

  return (
    <div className="dashboard-layout h-screen overflow-hidden bg-[#f8f9fa]">
      <LiveNotifications notifications={notifications} />
      {/* Top Bar - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/60 h-16 flex items-center px-4 lg:px-6">
        <div className="flex items-center justify-between w-full">
          {/* Left: Logo + hamburger */}
          <div className="flex items-center space-x-3">
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200 cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-menu-line text-xl text-gray-600"></i>
              </div>
            </button>
            <BrandLogo
              to="/"
              className="flex items-center group"
              imageClassName="h-10 w-auto object-contain transition-all duration-300 group-hover:scale-[1.02]"
            />
          </div>

          {/* Right: messages + notifications + user */}
          <div className="ml-auto flex items-center space-x-1">
            <DashboardMessagesMenu
              isApprenant={isApprenant}
              loading={messagesLoading}
              markAsRead={markAsRead}
              messagesOpen={messagesOpen}
              recentConversations={recentConversations}
              setMessagesOpen={setMessagesOpen}
              unreadCount={messageUnread}
            />

            {/* Notifications */}
            <NotificationBell />

            {/* User profile */}
            <Link to={profileTarget} className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200 ml-1">
              <AvatarUpload
                src={user?.avatar ?? null}
                initials={userInitials}
                size="sm"
                editable={false}
              />
              {user && (
                <div className="hidden sm:block text-sm">
                  <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="h-full pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 bottom-0 z-30 ${sidebarWidth} bg-white/95 backdrop-blur-sm border-r border-gray-200/60 flex flex-col transition-transform duration-200 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Navigation</p>
            <ul className={`flex min-h-[calc(100%-1.75rem)] flex-col ${navGapClass}`}>
              {navItems.map((item) => {
                const isActive = activeNavPath === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex min-h-11 w-full items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer
                        ${isActive
                          ? 'bg-[#5fa6f3]/10 text-[#5fa6f3] shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                        }`}
                    >
                      <div className="flex min-w-0 items-center space-x-3">
                        <div className={`w-5 h-5 flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                          <i className={`${item.icon} text-base ${isActive ? 'text-[#5fa6f3]' : 'text-gray-500 group-hover:text-gray-700'}`}></i>
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="shrink-0 border-t border-gray-200/60 bg-white/95 p-3">
            <button
              onClick={handleLogout}
              className="group flex min-h-11 w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 transition-all duration-300 hover:bg-red-50/80 active:bg-red-100 cursor-pointer"
            >
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-logout-box-line text-base"></i>
              </div>
              <span>Se déconnecter</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`h-full min-w-0 overflow-y-auto overscroll-contain lg:ml-64 ${
            hideMainScrollbar
              ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : '[scrollbar-gutter:stable]'
          }`}
        >
          <div className="min-h-full p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
