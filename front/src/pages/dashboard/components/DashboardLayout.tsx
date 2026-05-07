import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/roles';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { useNotifications } from '@/hooks/useNotifications';
import LiveNotifications from '@/components/feature/LiveNotifications';
import AvatarUpload from '@/components/base/AvatarUpload';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// ... existing nav items ...

const baseNavItems = [
  { label: 'Tableau de bord', icon: 'ri-dashboard-line', path: '/dashboard' },
  { label: 'Mon profil', icon: 'ri-user-line', path: '/dashboard/profile' },
  { label: 'Mes projets', icon: 'ri-folder-line', path: '/dashboard/mes-projets' },
  { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
  { label: 'Factures', icon: 'ri-file-list-line', path: '/dashboard/factures' },
  { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
  { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
];

// ... existing roleNavOverrides ...

const roleNavOverrides: Record<string, { label: string; icon: string; path: string }[]> = {
  client: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/client' },
    { label: 'Trouver un prestataire', icon: 'ri-search-line', path: '/dashboard/client/prestataires' },
    { label: 'Mes réservations', icon: 'ri-calendar-check-line', path: '/dashboard/client/reservations' },
    { label: 'Mes commandes', icon: 'ri-shopping-bag-line', path: '/dashboard/client/commandes' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  prestataire: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/prestataire' },
    { label: 'Mes services', icon: 'ri-briefcase-line', path: '/dashboard/prestataire/services' },
    { label: 'Demandes', icon: 'ri-inbox-line', path: '/dashboard/prestataire/demandes' },
    { label: 'Avis clients', icon: 'ri-star-line', path: '/dashboard/prestataire/avis' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  formateur: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/formateur' },
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/formateur/mes-cours' },
    { label: 'Classes virtuelles', icon: 'ri-video-line', path: '/dashboard/formateur/classes-virtuelles' },
    { label: 'Mes apprenants', icon: 'ri-group-line', path: '/dashboard/formateur/apprenants' },
    { label: 'Évaluations', icon: 'ri-file-list-3-line', path: '/dashboard/formateur/evaluations' },
    { label: 'Certificats', icon: 'ri-award-line', path: '/dashboard/formateur/certificats' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  apprenant: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/apprenant' },
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/apprenant/mes-cours' },
    { label: 'Mes examens', icon: 'ri-file-list-3-line', path: '/dashboard/apprenant/examens' },
    { label: 'Mon historique', icon: 'ri-history-line', path: '/dashboard/apprenant/historique' },
    { label: 'Classement', icon: 'ri-trophy-line', path: '/dashboard/apprenant/leaderboard' },
    { label: 'Défis quotidiens', icon: 'ri-flag-line', path: '/dashboard/apprenant/defis' },
    { label: 'Ma progression', icon: 'ri-bar-chart-grouped-line', path: '/dashboard/apprenant/progression' },
    { label: 'Mes certificats', icon: 'ri-award-line', path: '/dashboard/apprenant/certificats' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  porteur: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/porteur' },
    { label: 'Mes projets', icon: 'ri-folder-line', path: '/dashboard/porteur/mes-projets' },
    { label: 'Partenariats', icon: 'ri-team-line', path: '/dashboard/porteur/partenariats' },
    { label: 'Financements', icon: 'ri-funds-line', path: '/dashboard/porteur/financements' },
    { label: 'Mon profil', icon: 'ri-user-line', path: '/dashboard/profile' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  partenaire: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/partenaire' },
    { label: 'Opportunités', icon: 'ri-search-line', path: '/dashboard/partenaire/opportunites' },
    { label: 'Projets suivis', icon: 'ri-eye-line', path: '/dashboard/partenaire/projets-suivis' },
    { label: 'Collaborations', icon: 'ri-team-line', path: '/dashboard/partenaire/collaborations' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Mon profil', icon: 'ri-user-line', path: '/dashboard/profile' },
    { label: 'Sécurité', icon: 'ri-shield-check-line', path: '/dashboard/securite' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
};

const getActiveNavPath = (
  pathname: string,
  navItems: { label: string; icon: string; path: string }[],
) => {
  const exactMatch = navItems.find((item) => item.path === pathname);

  if (exactMatch) {
    return exactMatch.path;
  }

  return navItems
    .filter((item) => item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { totalUnread: messageUnread } = useBackendMessaging();
  const { unreadCount: notifUnread } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user && roleNavOverrides[user.role]
    ? roleNavOverrides[user.role]
    : baseNavItems;
  const activeNavPath = getActiveNavPath(location.pathname, navItems);
  const navGapClass = navItems.length >= 9 ? 'gap-1' : navItems.length >= 7 ? 'gap-1.5' : 'gap-2';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAvatarChange = (dataUrl: string) => {
    updateUser({ avatar: dataUrl });
  };

  const userInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  // Desktop sidebar width
  const sidebarWidth = 'w-64';

  return (
    <div className="dashboard-layout h-screen overflow-hidden bg-[#f8f9fa]">
      <LiveNotifications />
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
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-sm">C2P</span>
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">C2P</span>
            </Link>
          </div>

          {/* Right: messages + notifications + user */}
          <div className="ml-auto flex items-center space-x-1">
            {/* Messages */}
            <Link
              to="/dashboard/messages"
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-message-3-line text-lg text-gray-600"></i>
              </div>
              {messageUnread > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {messageUnread > 9 ? '9+' : messageUnread}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link
              to="/dashboard/notifications"
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-notification-3-line text-lg text-gray-600"></i>
              </div>
              {notifUnread > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </Link>

            {/* User profile */}
            <Link to="/dashboard/profile" className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-100/80 active:scale-95 transition-all duration-200 ml-1">
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
                          ? 'bg-[#14B8A6]/10 text-[#14B8A6] shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                        }`}
                    >
                      <div className="flex min-w-0 items-center space-x-3">
                        <div className={`w-5 h-5 flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                          <i className={`${item.icon} text-base ${isActive ? 'text-[#14B8A6]' : 'text-gray-500 group-hover:text-gray-700'}`}></i>
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
          className="h-full min-w-0 overflow-y-auto overscroll-contain lg:ml-64"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="min-h-full p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
