import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarUpload from '@/components/base/AvatarUpload';
import { ROLE_LABELS, type UserRole } from '@/lib/roles';

interface Props {
  user: { firstName?: string; lastName?: string; role: UserRole; avatar?: string | null } | null;
  initials: string;
  profilePath: string;
  onLogout: () => void;
}

/** Avatar + name in the dashboard header, opening Mon profil / Paramètres / Déconnexion. */
export default function DashboardUserMenu({ user, initials, profilePath, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors';
  return (
    <div ref={root} className="relative ml-0.5 sm:ml-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center space-x-1 rounded-xl p-1 transition-all duration-200 hover:bg-gray-100/80 active:scale-95 sm:space-x-2 sm:p-1.5"
      >
        <AvatarUpload src={user?.avatar ?? null} initials={initials} size="sm" editable={false} />
        {user && (
          <div className="hidden text-left text-sm sm:block">
            <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
          </div>
        )}
        <i className={`ri-arrow-down-s-line hidden text-gray-500 transition-transform sm:block ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <Link role="menuitem" to={profilePath} onClick={() => setOpen(false)} className={`${item} text-gray-700 hover:bg-gray-50`}>
            <i className="ri-user-line text-lg" aria-hidden="true" />Mon profil
          </Link>
          <Link role="menuitem" to="/dashboard/parametres" onClick={() => setOpen(false)} className={`${item} text-gray-700 hover:bg-gray-50`}>
            <i className="ri-settings-3-line text-lg" aria-hidden="true" />Paramètres
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onLogout(); }} className={`${item} text-red-600 hover:bg-red-50`}>
            <i className="ri-logout-box-r-line text-lg" aria-hidden="true" />Déconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}
