import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, getDashboardPathForRole } from '@/hooks/useAuth';
import PublicLayoutFooter from './PublicLayoutFooter';
import PublicLayoutHeader from './PublicLayoutHeader';

interface PublicLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export default function PublicLayout({ children, hideFooter = false, hideHeader = false }: PublicLayoutProps) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    scrollToPageTop();
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navBg = isScrolled
    ? 'border-b border-[#d6dbe1]/80 bg-white/92 shadow-[0_18px_55px_rgba(15,28,53,0.10)] backdrop-blur-xl'
    : 'border-b border-white/60 bg-white/82 shadow-[0_14px_40px_rgba(15,28,53,0.08)] backdrop-blur-xl';
  const accountPath = getDashboardPathForRole(user?.role || 'client');
  const accountLabel = user ? `${user.firstName || 'Mon'} ${user.lastName || 'profil'}`.trim() : 'Mon profil';
  const accountInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'CP'
    : 'CP';

  const handleInternalLinkClick = (path: string, closeMenu = false) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (closeMenu) {
      setMobileMenuOpen(false);
    }

    if (location.pathname === path) {
      event.preventDefault();
      scrollToPageTop();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {!hideHeader && (
        <PublicLayoutHeader
          accountInitials={accountInitials}
          accountLabel={accountLabel}
          accountPath={accountPath}
          currentPath={location.pathname}
          isAuthenticated={isAuthenticated}
          mobileMenuOpen={mobileMenuOpen}
          navBg={navBg}
          onAccountLogout={() => void logout()}
          onInternalLinkClick={handleInternalLinkClick}
          onToggleMobileMenu={() => setMobileMenuOpen((value) => !value)}
          user={user}
        />
      )}

      <main className="flex-1 bg-white">{children}</main>

      {!hideFooter && (
        <PublicLayoutFooter onInternalLinkClick={handleInternalLinkClick} />
      )}
    </div>
  );
}
