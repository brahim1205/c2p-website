export type DashboardNavItem = {
  label: string;
  icon: string;
  path: string;
};

export const baseNavItems: DashboardNavItem[] = [
  { label: 'Tableau de bord', icon: 'ri-dashboard-line', path: '/dashboard' },
  { label: 'Mon profil', icon: 'ri-user-line', path: '/dashboard/profile' },
  { label: 'Mes projets', icon: 'ri-folder-line', path: '/dashboard/mes-projets' },
  { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
  { label: 'Factures', icon: 'ri-file-list-line', path: '/dashboard/factures' },
  { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
];

export const roleNavOverrides: Record<string, DashboardNavItem[]> = {
  client: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/client' },
    { label: 'Trouver un prestataire', icon: 'ri-search-line', path: '/dashboard/client/prestataires' },
    { label: 'Mes réservations', icon: 'ri-calendar-check-line', path: '/dashboard/client/reservations' },
    { label: 'Mes commandes', icon: 'ri-shopping-bag-line', path: '/dashboard/client/commandes' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  prestataire: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/prestataire' },
    { label: 'Mes services', icon: 'ri-briefcase-line', path: '/dashboard/prestataire/services' },
    { label: 'Demandes', icon: 'ri-inbox-line', path: '/dashboard/prestataire/demandes' },
    { label: 'Avis clients', icon: 'ri-star-line', path: '/dashboard/prestataire/avis' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  formateur: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/formateur' },
    { label: 'Profil public', icon: 'ri-user-star-line', path: '/dashboard/formateur/profil-public' },
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/formateur/mes-cours' },
    { label: 'Classes virtuelles', icon: 'ri-video-line', path: '/dashboard/formateur/classes-virtuelles' },
    { label: 'Mes apprenants', icon: 'ri-group-line', path: '/dashboard/formateur/apprenants' },
    { label: 'Évaluations', icon: 'ri-file-list-3-line', path: '/dashboard/formateur/evaluations' },
    { label: 'Certificats', icon: 'ri-award-line', path: '/dashboard/formateur/certificats' },
    { label: 'Revenus', icon: 'ri-wallet-3-line', path: '/dashboard/formateur/revenus' },
    { label: 'Communauté', icon: 'ri-chat-3-line', path: '/dashboard/formateur/communaute' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
  ],
  apprenant: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/apprenant' },
    { label: 'Mes formations', icon: 'ri-book-open-line', path: '/dashboard/apprenant/mes-cours' },
    { label: 'Mes examens', icon: 'ri-file-list-3-line', path: '/dashboard/apprenant/examens' },
    { label: 'Mon historique', icon: 'ri-history-line', path: '/dashboard/apprenant/historique' },
    { label: 'Ma progression', icon: 'ri-bar-chart-grouped-line', path: '/dashboard/apprenant/progression' },
    { label: 'Mes certificats', icon: 'ri-award-line', path: '/dashboard/apprenant/certificats' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  parent: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/parent' },
    { label: 'Messagerie C2P', icon: 'ri-message-3-line', path: '/dashboard/messages' },
    { label: 'Profil public', icon: 'ri-user-star-line', path: '/dashboard/profile' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  porteur: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/porteur' },
    { label: 'Mes projets', icon: 'ri-folder-line', path: '/dashboard/porteur/mes-projets' },
    { label: 'Partenariats', icon: 'ri-team-line', path: '/dashboard/porteur/partenariats' },
    { label: 'Financements', icon: 'ri-funds-line', path: '/dashboard/porteur/financements' },
    { label: 'Profil public', icon: 'ri-user-star-line', path: '/dashboard/profile' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
  partenaire: [
    { label: 'Mon dashboard', icon: 'ri-dashboard-line', path: '/dashboard/partenaire' },
    { label: 'Opportunités', icon: 'ri-search-line', path: '/dashboard/partenaire/opportunites' },
    { label: 'Mes financements', icon: 'ri-funds-line', path: '/dashboard/partenaire/financements' },
    { label: 'Projets suivis', icon: 'ri-eye-line', path: '/dashboard/partenaire/projets-suivis' },
    { label: 'Collaborations', icon: 'ri-team-line', path: '/dashboard/partenaire/collaborations' },
    { label: 'Paiements', icon: 'ri-wallet-3-line', path: '/dashboard/paiements' },
    { label: 'Mon profil', icon: 'ri-user-line', path: '/dashboard/profile' },
    { label: 'Paramètres', icon: 'ri-settings-3-line', path: '/dashboard/parametres' },
  ],
};

export function getActiveNavPath(pathname: string, navItems: DashboardNavItem[]) {
  const exactMatch = navItems.find((item) => item.path === pathname);
  if (exactMatch) return exactMatch.path;

  return navItems
    .filter((item) => item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
}

export function getNavGapClass(navItemCount: number) {
  if (navItemCount >= 9) return 'gap-1';
  if (navItemCount >= 7) return 'gap-1.5';
  return 'gap-2';
}
