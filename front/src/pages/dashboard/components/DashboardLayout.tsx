import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/roles';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import BrandLogo from '@/components/base/BrandLogo';
import AvatarUpload from '@/components/base/AvatarUpload';
import { DashboardMessagesMenu } from './DashboardMessagesMenu';
import NotificationBell from './NotificationBell';
import DashboardUserMenu from './DashboardUserMenu';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const navItems = user && roleNavOverrides[user.role]
    ? roleNavOverrides[user.role]
    : baseNavItems;
  const activeNavPath = getActiveNavPath(location.pathname, navItems);
  const navGapClass = getNavGapClass(navItems.length);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const isApprenant = user?.role === 'apprenant';
  // Formateurs edit their public profile inside the settings page.
  const profileTarget = user?.role === 'formateur'
    ? '/dashboard/parametres?onglet=profil-public'
    : isApprenant ? '/dashboard/parametres' : '/dashboard/profile';
  const recentConversations = messageConversations.slice(0, 5);

  // Desktop sidebar width
  const sidebarWidth = 'w-64';

  return (
    <div className="dashboard-layout h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Top Bar - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-gray-200/60 bg-white/[0.92] px-3 backdrop-blur-md lg:h-16 lg:px-6">
        <div className="flex items-center justify-between w-full">
          {/* Left: Logo + hamburger */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:bg-gray-100/80 active:scale-95 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-menu-line text-xl text-gray-600"></i>
              </div>
            </button>
            <BrandLogo
              to="/"
              className="flex items-center group"
              imageClassName="h-8 w-auto object-contain transition-all duration-300 group-hover:scale-[1.02] lg:h-10"
            />
          </div>

          {/* Right: messages + notifications + user */}
          <div className="ml-auto flex items-center space-x-0.5 sm:space-x-1">
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

            {/* User menu: Mon profil / Paramètres / Déconnexion */}
            <DashboardUserMenu user={user} initials={userInitials} profilePath={profileTarget} onLogout={() => void handleLogout()} />
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
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
