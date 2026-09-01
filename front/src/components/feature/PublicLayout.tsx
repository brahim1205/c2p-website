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

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navBg = isScrolled
    ? 'border-b border-[#d6dbe1]/90 bg-white/95 shadow-[0_18px_55px_rgba(15,28,53,0.10)] backdrop-blur-xl'
    : 'border-b border-[#e5e7eb] bg-white shadow-[0_10px_34px_rgba(15,28,53,0.06)]';
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

      <main className={`flex-1 ${hideFooter ? 'bg-[#e8f5d8]' : 'bg-white'}`}>{children}</main>

      {!hideFooter && (
        <PublicLayoutFooter onInternalLinkClick={handleInternalLinkClick} />
      )}
    </div>
  );
}
