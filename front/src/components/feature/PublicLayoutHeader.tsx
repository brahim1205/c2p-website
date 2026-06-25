import { Link } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { PUBLIC_NAV_ITEMS, getPublicLinkClass, type PublicInternalLinkHandler } from './publicLayoutModel';

interface PublicLayoutHeaderUser {
  avatar?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface PublicLayoutHeaderProps {
  accountInitials: string;
  accountLabel: string;
  accountPath: string;
  currentPath: string;
  isAuthenticated: boolean;
  mobileMenuOpen: boolean;
  navBg: string;
  onAccountLogout: () => void;
  onInternalLinkClick: PublicInternalLinkHandler;
  onToggleMobileMenu: () => void;
  user?: PublicLayoutHeaderUser | null;
}

function AccountAvatar({ accountInitials, user, size = 'sm' }: {
  accountInitials: string;
  size?: 'sm' | 'md';
  user?: PublicLayoutHeaderUser | null;
}) {
  const className = size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs';

  if (user?.avatar) {
    return <img src={user.avatar} alt="" className={`${className} rounded-full object-cover`} />;
  }

  return (
    <span className={`flex ${className} items-center justify-center rounded-full bg-[#0f1c35] font-bold text-white`}>
      {accountInitials}
    </span>
  );
}

export default function PublicLayoutHeader({
  accountInitials,
  accountLabel,
  accountPath,
  currentPath,
  isAuthenticated,
  mobileMenuOpen,
  navBg,
  onAccountLogout,
  onInternalLinkClick,
  onToggleMobileMenu,
  user,
}: PublicLayoutHeaderProps) {
  return (
    <nav aria-label="Navigation publique principale" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <BrandLogo to="/" className="flex items-center" imageClassName="h-10 w-auto object-contain" />

          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link key={item.href} to={item.href} onClick={onInternalLinkClick(item.href)} className={getPublicLinkClass(currentPath, item.href)}>
                {item.label}
              </Link>
            ))}

            {isAuthenticated && user ? (
              <details className="group relative">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full bg-[#f7f8fc] px-3 py-2 text-sm font-medium text-[#0f1c35] transition-colors hover:bg-[#edf2f7] [&::-webkit-details-marker]:hidden">
                  <AccountAvatar accountInitials={accountInitials} user={user} />
                  <span className="max-w-36 truncate">{accountLabel}</span>
                  <i className="ri-arrow-down-s-line text-base text-[#64748b] transition-transform group-open:rotate-180"></i>
                </summary>

                <div role="menu" className="absolute right-0 top-[calc(100%+14px)] w-80 rounded-2xl border border-[#d6dbe1] bg-white p-4 text-[#0f1c35] shadow-[0_24px_70px_rgba(15,28,53,0.16)]">
                  <div className="absolute -top-2 right-7 h-4 w-4 rotate-45 border-l border-t border-[#d6dbe1] bg-white"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 pb-4">
                      <AccountAvatar accountInitials={accountInitials} user={user} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">Bonjour, {user.firstName || accountLabel}</p>
                        <p className="truncate text-xs text-[#64748b]">{user.email}</p>
                      </div>
                    </div>
                    <div className="border-t border-[#e5e7eb] py-2">
                      <Link to={accountPath} onClick={onInternalLinkClick(accountPath)} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Tableau de bord</Link>
                      <Link to="/compte" onClick={onInternalLinkClick('/compte')} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Compte</Link>
                      <Link to="/compte/commandes" onClick={onInternalLinkClick('/compte/commandes')} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Commandes</Link>
                      <Link to="/compte/reservations" onClick={onInternalLinkClick('/compte/reservations')} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Réservations</Link>
                      <Link to="/compte/messages" onClick={onInternalLinkClick('/compte/messages')} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Messages</Link>
                      <Link to="/compte/prestataires" onClick={onInternalLinkClick('/compte/prestataires')} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[#f7f8fc]" role="menuitem">Trouver un prestataire</Link>
                    </div>
                    <div className="border-t border-[#e5e7eb] pt-2">
                      <button type="button" onClick={onAccountLogout} className="block w-full rounded-xl px-2 py-2.5 text-left text-sm text-red-600 hover:bg-red-50" role="menuitem">
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            ) : (
              <Link to="/auth/login" onClick={onInternalLinkClick('/auth/login')} className={getPublicLinkClass(currentPath, '/auth/login')}>
                Connexion
              </Link>
            )}
          </div>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-menu"
            aria-label={mobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-[#f7f6f4]"
            onClick={onToggleMobileMenu}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line text-xl text-[#0f1c35]`}></i>
            </div>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="public-mobile-menu" className="md:hidden max-h-[calc(100svh-80px)] overflow-y-auto border-t border-[#d6dbe1] bg-[#ffffff]/96 shadow-[0_24px_80px_rgba(15,28,53,0.08)] backdrop-blur-md">
          <div className="space-y-3 px-4 py-4">
            <div className="grid gap-2">
              <Link to="/auth/register" onClick={onInternalLinkClick('/auth/register', true)} className="flex min-h-12 items-center justify-center rounded-xl bg-[#0f1c35] px-4 py-3 text-sm font-bold text-white">
                Créer mon compte
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/allopresta" onClick={onInternalLinkClick('/allopresta', true)} className="flex min-h-11 items-center justify-center rounded-xl border border-[#d6dbe1] bg-white px-3 py-2 text-center text-xs font-bold text-[#0f1c35]">
                  Prestataire
                </Link>
                <Link to="/espace-numerique" onClick={onInternalLinkClick('/espace-numerique', true)} className="flex min-h-11 items-center justify-center rounded-xl border border-[#d6dbe1] bg-white px-3 py-2 text-center text-xs font-bold text-[#0f1c35]">
                  Formation
                </Link>
              </div>
            </div>
            <div className="border-t border-[#d6dbe1] pt-2">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link key={item.href} to={item.href} onClick={onInternalLinkClick(item.href, true)} className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]">
                {item.label}
              </Link>
            ))}
            </div>
            <div className="my-2 border-t border-[#d6dbe1]"></div>
            {isAuthenticated && user ? (
              <Link to={accountPath} onClick={onInternalLinkClick(accountPath, true)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#0f1c35] hover:bg-[#ffffff]">
                <AccountAvatar accountInitials={accountInitials} user={user} size="md" />
                <span>{accountLabel}</span>
              </Link>
            ) : (
              <Link to="/auth/login" onClick={onInternalLinkClick('/auth/login', true)} className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]">
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
