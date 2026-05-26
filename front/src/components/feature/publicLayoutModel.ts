import type { MouseEvent as ReactMouseEvent } from 'react';

export interface PublicNavItem {
  href: string;
  label: string;
}

export interface FooterContactLink {
  href: string;
  label: string;
  icon: string;
  internal?: boolean;
}

export type PublicInternalLinkHandler = (
  path: string,
  closeMenu?: boolean,
) => (event: ReactMouseEvent<HTMLAnchorElement>) => void;

export const PUBLIC_NAV_ITEMS: PublicNavItem[] = [
  { href: '/', label: 'Accueil' },
  { href: '/allopresta', label: 'AlloPresta' },
  { href: '/espace-numerique', label: 'Espace Numérique' },
  { href: '/project-center', label: 'ProjectCenter' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
];

export const FOOTER_CONTACT_LINKS: FooterContactLink[] = [
  { href: 'https://wa.me/221784444346', label: 'WhatsApp', icon: 'ri-whatsapp-line' },
  { href: 'mailto:c2psenegal@gmail.com', label: 'Email', icon: 'ri-mail-line' },
  { href: 'tel:+221784444346', label: 'Telephone', icon: 'ri-phone-line' },
  { href: '/contact', label: 'Contact', icon: 'ri-map-pin-line', internal: true },
];

export function getPublicLinkClass(currentPath: string, path: string) {
  const isActive = path === '/'
    ? currentPath === path
    : currentPath === path || currentPath.startsWith(`${path}/`);

  return [
    'rounded-full px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-[#0f1c35] text-white shadow-[0_10px_24px_rgba(15,28,53,0.18)]'
      : 'text-[#0f1c35] hover:text-[#1a9a96]',
  ].join(' ');
}
