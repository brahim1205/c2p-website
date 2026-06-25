import { Navigate, type RouteObject } from 'react-router-dom';
import type { ElementType } from 'react';
import RouteWrapper from '@/components/base/RouteWrapper';
import type { UserRole } from '@/lib/roles';
import * as Pages from './route-pages';

type RouteLayout = 'public' | 'dashboard' | 'admin' | 'none';

interface WrappedRouteOptions {
  layout?: RouteLayout;
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  hideFooter?: boolean;
  redirectAuthenticated?: boolean;
}

function wrappedRoute(path: string, Page: ElementType, options: WrappedRouteOptions = {}): RouteObject {
  const { layout = 'dashboard', requireAuth, allowedRoles, hideFooter, redirectAuthenticated } = options;

  return {
    path,
    element: (
      <RouteWrapper
        layout={layout}
        requireAuth={requireAuth}
        allowedRoles={allowedRoles}
        hideFooter={hideFooter}
        redirectAuthenticated={redirectAuthenticated}
      >
        <Page />
      </RouteWrapper>
    ),
  };
}

const publicRoute = (path: string, Page: ElementType, hideFooter = false) => wrappedRoute(path, Page, { layout: 'public', hideFooter });
const plainRoute = (path: string, Page: ElementType) => wrappedRoute(path, Page, { layout: 'none' });
const authRoute = (path: string, Page: ElementType) => wrappedRoute(path, Page, { layout: 'public', hideFooter: true, redirectAuthenticated: true });
const onboardingRoute = (path: string, Page: ElementType) => wrappedRoute(path, Page, { layout: 'none', requireAuth: true });
const dashboardRoute = (path: string, Page: ElementType, allowedRoles?: UserRole[]) => wrappedRoute(path, Page, { layout: 'dashboard', requireAuth: true, allowedRoles });
const adminRoute = (path: string, Page: ElementType, allowedRoles: UserRole[] = ['admin', 'superadmin']) => wrappedRoute(path, Page, { layout: 'admin', requireAuth: true, allowedRoles });
const redirectRoute = (path: string, to: string): RouteObject => ({ path, element: <Navigate to={to} replace /> });

const publicRoutes: RouteObject[] = [
  publicRoute('/', Pages.HomePage),
  publicRoute('/a-propos', Pages.AboutPage),
  publicRoute('/contact', Pages.ContactPage),
  publicRoute('/tarifs', Pages.PricingPage),
  publicRoute('/abonnements', Pages.PricingPage),
  plainRoute('/mentions-legales', Pages.MentionsLegalesPage),
  plainRoute('/confidentialite', Pages.ConfidentialitePage),
  plainRoute('/cgu', Pages.CguPage),
  plainRoute('/cookies', Pages.CookiesPage),
  plainRoute('/certificats/verifier/:id', Pages.CertificateVerificationPage),
  publicRoute('/allopresta', Pages.AlloPrestaPage),
  publicRoute('/allopresta/prestataire/:id', Pages.PrestatairePage),
  publicRoute('/formateurs/:id', Pages.PublicInstructorProfilePage),
  publicRoute('/espace-numerique', Pages.EspaceNumeriquePage),
  publicRoute('/espace-numerique/formation/:id', Pages.FormationPage, true),
  publicRoute('/espace-numerique/mon-apprentissage', Pages.MonApprentissagePage),
  publicRoute('/espace-numerique/classe-virtuelle/:id', Pages.ClasseVirtuellePage),
  publicRoute('/project-center', Pages.ProjectCenterPage),
  publicRoute('/project-center/projet/:id', Pages.ProjetPage),
  publicRoute('/project-center/soumettre', Pages.SoumettreProjetPage),
];

const authRoutes: RouteObject[] = [
  authRoute('/auth/login', Pages.LoginPage),
  authRoute('/auth/register', Pages.RegisterPage),
  onboardingRoute('/auth/onboarding/profil', Pages.OnboardingProfilePage),
  onboardingRoute('/auth/onboarding/clauses', Pages.OnboardingClausesPage),
  onboardingRoute('/auth/onboarding/abonnement', Pages.OnboardingSubscriptionPage),
  authRoute('/forgot-password', Pages.ForgotPasswordPage),
  authRoute('/auth/forgot-password', Pages.ForgotPasswordPage),
  publicRoute('/auth/two-factor', Pages.TwoFactorPage, true),
];

const dashboardRoutes: RouteObject[] = [
  dashboardRoute('/dashboard', Pages.DashboardPage),
  dashboardRoute('/dashboard/prestataire', Pages.PrestataireDashboardPage, ['prestataire']),
  dashboardRoute('/dashboard/formateur', Pages.FormateurDashboardPage, ['formateur']),
  dashboardRoute('/dashboard/apprenant', Pages.ApprenantDashboardPage, ['apprenant']),
  dashboardRoute('/dashboard/parent', Pages.ParentDashboardPage, ['parent']),
  dashboardRoute('/dashboard/porteur', Pages.PorteurDashboardPage, ['porteur']),
  dashboardRoute('/dashboard/partenaire', Pages.PartenaireDashboardPage, ['partenaire']),
  dashboardRoute('/dashboard/partenaire/opportunites/:id/financer', Pages.PartenaireFinancerProjetPage, ['partenaire']),
  dashboardRoute('/dashboard/partenaire/financements', Pages.PartenaireFinancementsPage, ['partenaire']),
  dashboardRoute('/compte', Pages.ProfilePage, ['client']),
  dashboardRoute('/compte/messages', Pages.DashboardMessagesPage, ['client']),
  redirectRoute('/compte/notifications', '/dashboard/client'),
  dashboardRoute('/compte/paiements', Pages.DashboardPaiementsPage, ['client']),
  dashboardRoute('/compte/factures', Pages.DashboardFacturesPage, ['client']),
  dashboardRoute('/compte/securite', Pages.DashboardSecurityPage, ['client']),
  dashboardRoute('/dashboard/profile', Pages.ProfilePage),
  dashboardRoute('/dashboard/parametres', Pages.DashboardParametresPage),
  dashboardRoute('/dashboard/mes-projets', Pages.MesProjetsPage),
  dashboardRoute('/dashboard/mes-projets/:id', Pages.ProjetDetailPage),
  dashboardRoute('/dashboard/messages', Pages.DashboardMessagesPage),
  redirectRoute('/dashboard/notifications', '/dashboard'),
  dashboardRoute('/dashboard/paiements', Pages.DashboardPaiementsPage),
  dashboardRoute('/dashboard/factures', Pages.DashboardFacturesPage),
  dashboardRoute('/dashboard/securite', Pages.DashboardSecurityPage),
];

const formateurRoutes: RouteObject[] = [
  dashboardRoute('/dashboard/formateur/mes-cours', Pages.FormateurCoursPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/mes-cours/:id/programme', Pages.FormateurCourseProgramPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/classes-virtuelles', Pages.FormateurClassesPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/classes-virtuelles/nouvelle', Pages.FormateurCreateVirtualClassPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/apprenants', Pages.FormateurApprenantsPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/evaluations', Pages.FormateurEvaluationsPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/certificats', Pages.FormateurCertificatsPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/profil-public', Pages.FormateurPublicProfilePage, ['formateur']),
  dashboardRoute('/dashboard/formateur/revenus', Pages.FormateurRevenuePage, ['formateur']),
  dashboardRoute('/dashboard/formateur/analytics', Pages.FormateurAnalyticsPage, ['formateur']),
  dashboardRoute('/dashboard/formateur/communaute', Pages.FormateurCommunityPage, ['formateur']),
];

const roleSpecificRoutes: RouteObject[] = [
  ...formateurRoutes,
  dashboardRoute('/dashboard/prestataire/services', Pages.PrestataireServicesPage, ['prestataire']),
  dashboardRoute('/dashboard/prestataire/agenda', Pages.PrestataireAgendaPage, ['prestataire']),
  dashboardRoute('/dashboard/prestataire/demandes', Pages.PrestataireDemandesPage, ['prestataire']),
  dashboardRoute('/dashboard/prestataire/avis', Pages.PrestataireAvisPage, ['prestataire']),
  dashboardRoute('/dashboard/apprenant/mes-cours', Pages.ApprenantCoursPage, ['apprenant']),
  dashboardRoute('/dashboard/apprenant/progression', Pages.ApprenantProgressionPage, ['apprenant']),
  dashboardRoute('/dashboard/apprenant/certificats', Pages.ApprenantCertificatsPage, ['apprenant']),
  dashboardRoute('/dashboard/apprenant/examens', Pages.ApprenantExamensPage, ['apprenant']),
  dashboardRoute('/dashboard/apprenant/historique', Pages.ApprenantHistoriquePage, ['apprenant']),
  redirectRoute('/dashboard/apprenant/leaderboard', '/dashboard/apprenant'),
  redirectRoute('/dashboard/apprenant/defis', '/dashboard/apprenant'),
  dashboardRoute('/dashboard/apprenant/cours/:id', Pages.ApprenantCoursDetailPage, ['apprenant']),
  dashboardRoute('/dashboard/porteur/mes-projets', Pages.PorteurMesProjetsPage, ['porteur']),
  dashboardRoute('/dashboard/porteur/mes-projets/soumettre', Pages.SoumettreProjetPage, ['porteur']),
  dashboardRoute('/dashboard/porteur/mes-projets/:id', Pages.PorteurProjetDetailPage, ['porteur']),
  dashboardRoute('/dashboard/porteur/partenariats', Pages.PorteurPartenariatsPage, ['porteur']),
  dashboardRoute('/dashboard/porteur/financements', Pages.PorteurFinancementsPage, ['porteur']),
  dashboardRoute('/dashboard/partenaire/opportunites', Pages.PartenaireOpportunitesPage, ['partenaire']),
  dashboardRoute('/dashboard/partenaire/projets-suivis', Pages.PartenaireProjetsSuivisPage, ['partenaire']),
  dashboardRoute('/dashboard/partenaire/collaborations', Pages.PartenaireCollaborationsPage, ['partenaire']),
  dashboardRoute('/dashboard/client', Pages.ClientDashboardPage, ['client']),
  dashboardRoute('/compte/prestataires', Pages.ClientPrestatairesPage, ['client']),
  dashboardRoute('/compte/reservations', Pages.ClientReservationsPage, ['client']),
  dashboardRoute('/compte/commandes', Pages.ClientCommandesPage, ['client']),
  dashboardRoute('/dashboard/client/prestataires', Pages.ClientPrestatairesPage, ['client']),
  dashboardRoute('/dashboard/client/reservations', Pages.ClientReservationsPage, ['client']),
  dashboardRoute('/dashboard/client/commandes', Pages.ClientCommandesPage, ['client']),
  dashboardRoute('/dashboard/partenaire/projets-suivis/:id', Pages.PartenaireProjetDetailPage, ['partenaire']),
  dashboardRoute('/dashboard/porteur/financements/:id', Pages.PorteurFinancementDetailPage, ['porteur']),
];

const adminRoutes: RouteObject[] = [
  adminRoute('/admin/dashboard', Pages.AdminDashboardPage),
  adminRoute('/admin/users', Pages.AdminUsersPage),
  adminRoute('/admin/operations', Pages.AdminOperationsPage),
  adminRoute('/admin/project-financing', Pages.AdminProjectFinancingPage),
  adminRoute('/admin/content', Pages.AdminContentPage),
  adminRoute('/admin/accreditations', Pages.AdminAccreditationsPage),
  adminRoute('/admin/payments', Pages.AdminPaymentsPage),
  adminRoute('/admin/reports', Pages.AdminReportsPage),
  adminRoute('/admin/analytics', Pages.AdminAnalyticsPage),
  adminRoute('/admin/security', Pages.AdminSecurityPage, ['superadmin']),
  adminRoute('/superadmin/dashboard', Pages.SuperAdminDashboardPage, ['superadmin']),
  adminRoute('/superadmin/governance', Pages.SuperAdminGovernancePage, ['superadmin']),
  adminRoute('/superadmin/operations', Pages.SuperAdminOperationsPage, ['superadmin']),
  adminRoute('/superadmin/finance', Pages.SuperAdminFinancePage, ['superadmin']),
  adminRoute('/admin/profile', Pages.AdminProfilePage),
  adminRoute('/admin/messages', Pages.AdminMessagesPage),
  adminRoute('/admin/notifications', Pages.AdminNotificationsPage),
  adminRoute('/admin/communications', Pages.AdminCommunicationsPage),
  adminRoute('/admin/settings', Pages.AdminSettingsPage),
];

const routes: RouteObject[] = [
  ...publicRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...roleSpecificRoutes,
  ...adminRoutes,
  { path: '*', element: <Pages.NotFoundPage /> },
];

export default routes;
