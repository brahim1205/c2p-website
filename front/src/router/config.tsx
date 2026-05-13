import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import RouteWrapper from '@/components/base/RouteWrapper';

// Lazy load pages
const HomePage = lazy(() => import('../pages/home/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const ContactPage = lazy(() => import('../pages/contact/page'));
const MentionsLegalesPage = lazy(() => import('../pages/legal/mentions-legales/page'));
const ConfidentialitePage = lazy(() => import('../pages/legal/confidentialite/page'));
const CguPage = lazy(() => import('../pages/legal/cgu/page'));
const CookiesPage = lazy(() => import('../pages/legal/cookies/page'));
const AlloPrestaPage = lazy(() => import('../pages/allopresta/page'));
const PrestatairePage = lazy(() => import('../pages/allopresta/prestataire/page'));
const PublicInstructorProfilePage = lazy(() => import('../pages/formateurs/[id]/page'));
const EspaceNumeriquePage = lazy(() => import('../pages/espace-numerique/page'));
const FormationPage = lazy(() => import('../pages/espace-numerique/formation/page'));
const MonApprentissagePage = lazy(() => import('../pages/espace-numerique/mon-apprentissage/page'));
const ClasseVirtuellePage = lazy(() => import('../pages/espace-numerique/classe-virtuelle/page'));
const ProjectCenterPage = lazy(() => import('../pages/project-center/page'));
const ProjetPage = lazy(() => import('../pages/project-center/projet/page'));
const SoumettreProjetPage = lazy(() => import('../pages/project-center/soumettre/page'));
const LoginPage = lazy(() => import('../pages/auth/login/page'));
const RegisterPage = lazy(() => import('../pages/auth/register/page'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/forgot-password/page'));
const TwoFactorPage = lazy(() => import('../pages/auth/two-factor/page'));
const PricingPage = lazy(() => import('../pages/tarifs/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const PrestataireDashboardPage = lazy(() => import('../pages/dashboard/prestataire/page'));
const FormateurDashboardPage = lazy(() => import('../pages/dashboard/formateur/page'));
const ApprenantDashboardPage = lazy(() => import('../pages/dashboard/apprenant/page'));
const ParentDashboardPage = lazy(() => import('../pages/dashboard/parent/page'));
const PorteurDashboardPage = lazy(() => import('../pages/dashboard/porteur/page'));
const PartenaireDashboardPage = lazy(() => import('../pages/dashboard/partenaire/page'));
const ProfilePage = lazy(() => import('../pages/dashboard/profile/page'));
const MesProjetsPage = lazy(() => import('../pages/dashboard/mes-projets/page'));
const ProjetDetailPage = lazy(() => import('../pages/dashboard/mes-projets/[id]/page'));
const DashboardMessagesPage = lazy(() => import('../pages/dashboard/messages/page'));
const DashboardNotificationsPage = lazy(() => import('../pages/dashboard/notifications/page'));
const DashboardPaiementsPage = lazy(() => import('../pages/dashboard/paiements/page'));
const DashboardFacturesPage = lazy(() => import('../pages/dashboard/factures/page'));
const DashboardSecurityPage = lazy(() => import('../pages/dashboard/securite/page'));
const AdminDashboardPage = lazy(() => import('../pages/admin/dashboard/page'));
const AdminUsersPage = lazy(() => import('../pages/admin/users/page'));
const AdminContentPage = lazy(() => import('../pages/admin/content/page'));
const AdminAccreditationsPage = lazy(() => import('../pages/admin/accreditations/page'));
const AdminPaymentsPage = lazy(() => import('../pages/admin/payments/page'));
const AdminReportsPage = lazy(() => import('../pages/admin/reports/page'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/analytics/page'));
const AdminSecurityPage = lazy(() => import('../pages/admin/security/page'));
const AdminProfilePage = lazy(() => import('../pages/admin/profile/page'));
const AdminMessagesPage = lazy(() => import('../pages/admin/messages/page'));
const AdminNotificationsPage = lazy(() => import('../pages/admin/notifications/page'));
const AdminCommunicationsPage = lazy(() => import('../pages/admin/communications/page'));
const AdminSettingsPage = lazy(() => import('../pages/admin/settings/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

// Formateur pages
const FormateurCoursPage = lazy(() => import('../pages/dashboard/formateur/mes-cours/page'));
const FormateurCourseProgramPage = lazy(() => import('../pages/dashboard/formateur/mes-cours/[id]/programme/page'));
const FormateurClassesPage = lazy(() => import('../pages/dashboard/formateur/classes-virtuelles/page'));
const FormateurApprenantsPage = lazy(() => import('../pages/dashboard/formateur/apprenants/page'));
const FormateurEvaluationsPage = lazy(() => import('../pages/dashboard/formateur/evaluations/page'));
const FormateurCertificatsPage = lazy(() => import('../pages/dashboard/formateur/certificats/page'));
const FormateurPublicProfilePage = lazy(() => import('../pages/dashboard/formateur/profil-public/page'));
const FormateurRevenuePage = lazy(() => import('../pages/dashboard/formateur/revenus/page'));
const FormateurAnalyticsPage = lazy(() => import('../pages/dashboard/formateur/analytics/page'));
const FormateurCommunityPage = lazy(() => import('../pages/dashboard/formateur/communaute/page'));

// Prestataire pages
const PrestataireServicesPage = lazy(() => import('../pages/dashboard/prestataire/services/page'));
const PrestataireDemandesPage = lazy(() => import('../pages/dashboard/prestataire/demandes/page'));
const PrestataireAvisPage = lazy(() => import('../pages/dashboard/prestataire/avis/page'));

// Apprenant pages
const ApprenantCoursPage = lazy(() => import('../pages/dashboard/apprenant/mes-cours/page'));
const ApprenantProgressionPage = lazy(() => import('../pages/dashboard/apprenant/progression/page'));
const ApprenantCertificatsPage = lazy(() => import('../pages/dashboard/apprenant/certificats/page'));
// Apprenant examens page
const ApprenantExamensPage = lazy(() => import('../pages/dashboard/apprenant/examens/page'));

// Porteur pages
const PorteurMesProjetsPage = lazy(() => import('../pages/dashboard/porteur/mes-projets/page'));
const PorteurProjetDetailPage = lazy(() => import('../pages/dashboard/porteur/mes-projets/[id]/page'));
const PorteurPartenariatsPage = lazy(() => import('../pages/dashboard/porteur/partenariats/page'));
const PorteurFinancementsPage = lazy(() => import('../pages/dashboard/porteur/financements/page'));

// Partenaire pages
const PartenaireOpportunitesPage = lazy(() => import('../pages/dashboard/partenaire/opportunites/page'));
const PartenaireProjetsSuivisPage = lazy(() => import('../pages/dashboard/partenaire/projets-suivis/page'));
const PartenaireCollaborationsPage = lazy(() => import('../pages/dashboard/partenaire/collaborations/page'));

// Client pages
const ClientDashboardPage = lazy(() => import('../pages/dashboard/client/page'));
const ClientPrestatairesPage = lazy(() => import('../pages/dashboard/client/prestataires/page'));
const ClientReservationsPage = lazy(() => import('../pages/dashboard/client/reservations/page'));
const ClientCommandesPage = lazy(() => import('../pages/dashboard/client/commandes/page'));

// Apprenant course detail page
const ApprenantCoursDetailPage = lazy(() => import('../pages/dashboard/apprenant/cours/[id]/page'));
const ApprenantHistoriquePage = lazy(() => import('../pages/dashboard/apprenant/historique/page'));
const ApprenantLeaderboardPage = lazy(() => import('../pages/dashboard/apprenant/leaderboard/page'));
const ApprenantDefisPage = lazy(() => import('../pages/dashboard/apprenant/defis/page'));

// Partenaire detail pages
const PartenaireProjetDetailPage = lazy(() => import('../pages/dashboard/partenaire/projets-suivis/[id]/page'));

// Porteur financement detail page
const PorteurFinancementDetailPage = lazy(() => import('../pages/dashboard/porteur/financements/[id]/page'));

const routes: RouteObject[] = [
  // Public routes
  {
    path: '/',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <HomePage />
      </RouteWrapper>
    )
  },
  {
    path: '/a-propos',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <AboutPage />
      </RouteWrapper>
    )
  },
  {
    path: '/contact',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <ContactPage />
      </RouteWrapper>
    )
  },
  {
    path: '/tarifs',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <PricingPage />
      </RouteWrapper>
    )
  },
  {
    path: '/abonnements',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <PricingPage />
      </RouteWrapper>
    )
  },
  {
    path: '/mentions-legales',
    element: (
      <RouteWrapper layout="none">
        <MentionsLegalesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/confidentialite',
    element: (
      <RouteWrapper layout="none">
        <ConfidentialitePage />
      </RouteWrapper>
    )
  },
  {
    path: '/cgu',
    element: (
      <RouteWrapper layout="none">
        <CguPage />
      </RouteWrapper>
    )
  },
  {
    path: '/cookies',
    element: (
      <RouteWrapper layout="none">
        <CookiesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/allopresta',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <AlloPrestaPage />
      </RouteWrapper>
    )
  },
  {
    path: '/allopresta/prestataire/:id',
    element: (
      <RouteWrapper layout="public" hideFooter={false} hideHeader={true}>
        <PrestatairePage />
      </RouteWrapper>
    )
  },
  {
    path: '/formateurs/:id',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <PublicInstructorProfilePage />
      </RouteWrapper>
    )
  },
  {
    path: '/espace-numerique',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <EspaceNumeriquePage />
      </RouteWrapper>
    )
  },
  {
    path: '/espace-numerique/formation/:id',
    element: (
      <RouteWrapper layout="public" hideFooter={true}>
        <FormationPage />
      </RouteWrapper>
    )
  },
  {
    path: '/espace-numerique/mon-apprentissage',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <MonApprentissagePage />
      </RouteWrapper>
    )
  },
  {
    path: '/espace-numerique/classe-virtuelle/:id',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <ClasseVirtuellePage />
      </RouteWrapper>
    )
  },
  {
    path: '/project-center',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <ProjectCenterPage />
      </RouteWrapper>
    )
  },
  {
    path: '/project-center/projet/:id',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <ProjetPage />
      </RouteWrapper>
    )
  },
  {
    path: '/project-center/soumettre',
    element: (
      <RouteWrapper layout="public" hideFooter={false}>
        <SoumettreProjetPage />
      </RouteWrapper>
    )
  },
  // Auth routes (redirect if already logged in)
  {
    path: '/auth/login',
    element: (
      <RouteWrapper layout="public" hideFooter={true} redirectAuthenticated={true}>
        <LoginPage />
      </RouteWrapper>
    )
  },
  {
    path: '/auth/register',
    element: (
      <RouteWrapper layout="public" hideFooter={true} redirectAuthenticated={true}>
        <RegisterPage />
      </RouteWrapper>
    )
  },
  {
    path: '/forgot-password',
    element: (
      <RouteWrapper layout="public" hideFooter={true} redirectAuthenticated={true}>
        <ForgotPasswordPage />
      </RouteWrapper>
    )
  },
  {
    path: '/auth/forgot-password',
    element: (
      <RouteWrapper layout="public" hideFooter={true} redirectAuthenticated={true}>
        <ForgotPasswordPage />
      </RouteWrapper>
    )
  },
  {
    path: '/auth/two-factor',
    element: (
      <RouteWrapper layout="public" hideFooter={true}>
        <TwoFactorPage />
      </RouteWrapper>
    )
  },
  // Dashboard routes with role-based access
  {
    path: '/dashboard',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/prestataire',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['prestataire']}>
        <PrestataireDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['formateur']}>
        <FormateurDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['apprenant']}>
        <ApprenantDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/parent',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['parent']}>
        <ParentDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/porteur',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['porteur']}>
        <PorteurDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/partenaire',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['partenaire']}>
        <PartenaireDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/profile',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <ProfilePage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/parametres',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <ProfilePage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/mes-projets',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <MesProjetsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/mes-projets/:id',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <ProjetDetailPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/messages',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardMessagesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/notifications',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardNotificationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/paiements',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardPaiementsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/factures',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardFacturesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/securite',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true}>
        <DashboardSecurityPage />
      </RouteWrapper>
    )
  },
  // Formateur specific pages
  {
    path: '/dashboard/formateur/mes-cours',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurCoursPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/mes-cours/:id/programme',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurCourseProgramPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/classes-virtuelles',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurClassesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/apprenants',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurApprenantsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/evaluations',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurEvaluationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/certificats',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurCertificatsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/profil-public',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurPublicProfilePage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/revenus',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurRevenuePage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/analytics',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurAnalyticsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/formateur/communaute',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["formateur"]}>
        <FormateurCommunityPage />
      </RouteWrapper>
    )
  },
  // Prestataire specific pages
  {
    path: '/dashboard/prestataire/services',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["prestataire"]}>
        <PrestataireServicesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/prestataire/demandes',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["prestataire"]}>
        <PrestataireDemandesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/prestataire/avis',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["prestataire"]}>
        <PrestataireAvisPage />
      </RouteWrapper>
    )
  },
  // Apprenant specific pages
  {
    path: '/dashboard/apprenant/mes-cours',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantCoursPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/progression',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantProgressionPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/certificats',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantCertificatsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/examens',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantExamensPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/historique',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantHistoriquePage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/leaderboard',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantLeaderboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/defis',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantDefisPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/apprenant/cours/:id',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["apprenant"]}>
        <ApprenantCoursDetailPage />
      </RouteWrapper>
    )
  },
  // Porteur specific pages
  {
    path: '/dashboard/porteur/mes-projets',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["porteur"]}>
        <PorteurMesProjetsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/porteur/mes-projets/:id',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["porteur"]}>
        <PorteurProjetDetailPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/porteur/partenariats',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["porteur"]}>
        <PorteurPartenariatsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/porteur/financements',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["porteur"]}>
        <PorteurFinancementsPage />
      </RouteWrapper>
    )
  },
  // Partenaire specific pages
  {
    path: '/dashboard/partenaire/opportunites',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["partenaire"]}>
        <PartenaireOpportunitesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/partenaire/projets-suivis',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["partenaire"]}>
        <PartenaireProjetsSuivisPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/partenaire/collaborations',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["partenaire"]}>
        <PartenaireCollaborationsPage />
      </RouteWrapper>
    )
  },
  // Client specific pages
  {
    path: '/dashboard/client',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={['client']}>
        <ClientDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/client/prestataires',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["client"]}>
        <ClientPrestatairesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/client/reservations',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["client"]}>
        <ClientReservationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/client/commandes',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["client"]}>
        <ClientCommandesPage />
      </RouteWrapper>
    )
  },
  // Admin routes (require auth + admin role)
  {
    path: '/admin/dashboard',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminDashboardPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/users',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminUsersPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/content',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminContentPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/accreditations',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminAccreditationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/payments',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminPaymentsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/reports',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminReportsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/analytics',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminAnalyticsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/security',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminSecurityPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/profile',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminProfilePage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/messages',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminMessagesPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/notifications',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminNotificationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/communications',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminCommunicationsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/admin/settings',
    element: (
      <RouteWrapper layout="admin" requireAuth={true} allowedRoles={['admin']}>
        <AdminSettingsPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/partenaire/projets-suivis/:id',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["partenaire"]}>
        <PartenaireProjetDetailPage />
      </RouteWrapper>
    )
  },
  {
    path: '/dashboard/porteur/financements/:id',
    element: (
      <RouteWrapper layout="dashboard" requireAuth={true} allowedRoles={["porteur"]}>
        <PorteurFinancementDetailPage />
      </RouteWrapper>
    )
  },
  // 404
  {
    path: '*',
    element: <NotFoundPage />
  }
];

export default routes;
