import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import NotificationCenter from './components/NotificationCenter';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import StatCard from '@/components/base/StatCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { totalUnread } = useBackendMessaging();
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const userType = (user?.role ?? 'client') as 'client' | 'prestataire' | 'formateur' | 'apprenant' | 'porteur' | 'partenaire';

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const dashboardContent: Record<string, {
    title: string;
    stats: { label: string; value: string; icon: string; color: string }[];
    quickActions: { label: string; icon: string; link: string; color: string }[];
    activities: { text: string; detail: string; time: string }[];
  }> = {
    client: {
      title: 'Tableau de bord Client',
      stats: [
        { label: 'Réservations actives', value: '3', icon: 'ri-calendar-check-line', color: 'bg-teal-600' },
        { label: 'Formations suivies', value: '5', icon: 'ri-book-open-line', color: 'bg-teal-600' },
        { label: 'Commandes en cours', value: '2', icon: 'ri-shopping-bag-line', color: 'bg-orange-500' },
        { label: 'Messages non lus', value: String(totalUnread), icon: 'ri-message-3-line', color: 'bg-teal-500' },
      ],
      quickActions: [
        { label: 'Trouver un prestataire', icon: 'ri-search-line', link: '/dashboard/client/prestataires', color: 'bg-teal-600' },
        { label: 'Mes réservations', icon: 'ri-calendar-check-line', link: '/dashboard/client/reservations', color: 'bg-teal-600' },
        { label: 'Mes commandes', icon: 'ri-shopping-bag-line', link: '/dashboard/client/commandes', color: 'bg-orange-600' },
        { label: 'Explorer les formations', icon: 'ri-graduation-cap-line', link: '/espace-numerique', color: 'bg-teal-600' },
        { label: 'Découvrir les projets', icon: 'ri-lightbulb-line', link: '/project-center', color: 'bg-green-600' },
      ],
      activities: [
        { text: 'Réservation confirmée', detail: 'Moussa Diallo - Plomberie résidentielle', time: 'Il y a 2h' },
        { text: 'Nouveau cours disponible', detail: 'Marketing Digital Avancé - Sophie Nkomo', time: 'Il y a 5h' },
        { text: 'Commande expédiée', detail: 'Commande #100044 - Livraison en cours', time: 'Il y a 1j' },
        { text: 'Message reçu', detail: 'Fatou Ndiaye : Bonjour, je suis disponible demain', time: 'Il y a 1j' },
      ]
    },
    prestataire: {
      title: 'Tableau de bord Prestataire',
      stats: [
        { label: 'Demandes reçues', value: '15', icon: 'ri-inbox-line', color: 'bg-teal-600' },
        { label: 'Prestations en cours', value: '7', icon: 'ri-time-line', color: 'bg-teal-500' },
        { label: 'Prestations terminées', value: '42', icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
        { label: 'Note moyenne', value: '4.8', icon: 'ri-star-line', color: 'bg-yellow-500' },
      ],
      quickActions: [
        { label: 'Mes services', icon: 'ri-briefcase-line', link: '/dashboard/prestataire/services', color: 'bg-teal-600' },
        { label: 'Demandes', icon: 'ri-inbox-line', link: '/dashboard/prestataire/demandes', color: 'bg-teal-600' },
        { label: 'Avis clients', icon: 'ri-star-line', link: '/dashboard/prestataire/avis', color: 'bg-yellow-600' },
        { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', color: 'bg-green-600' },
        { label: 'Mes revenus', icon: 'ri-wallet-3-line', link: '/dashboard/paiements', color: 'bg-teal-600' },
      ],
      activities: [
        { text: 'Nouvelle demande', detail: 'Jean Mbarga - Plomberie résidentielle', time: 'Il y a 15 min' },
        { text: 'Prestation terminée', detail: 'Réparation fuite - Sophie Nkomo', time: 'Il y a 3h' },
        { text: 'Avis 5 étoiles', detail: 'Fatima Diallo : Excellente prestation !', time: 'Il y a 1j' },
        { text: 'Paiement reçu', detail: '25,000 FCFA - Jean Mbarga', time: 'Il y a 2j' },
      ]
    },
    formateur: {
      title: 'Tableau de bord Formateur',
      stats: [
        { label: 'Formations actives', value: '8', icon: 'ri-presentation-line', color: 'bg-teal-600' },
        { label: 'Apprenants inscrits', value: '234', icon: 'ri-group-line', color: 'bg-teal-500' },
        { label: 'Taux de complétion', value: '87%', icon: 'ri-bar-chart-line', color: 'bg-green-500' },
        { label: 'Note moyenne', value: '4.9', icon: 'ri-star-line', color: 'bg-yellow-500' },
      ],
      quickActions: [
        { label: 'Mes formations', icon: 'ri-book-open-line', link: '/dashboard/formateur/mes-cours', color: 'bg-teal-600' },
        { label: 'Classes virtuelles', icon: 'ri-video-line', link: '/dashboard/formateur/classes-virtuelles', color: 'bg-teal-600' },
        { label: 'Mes apprenants', icon: 'ri-group-line', link: '/dashboard/formateur/apprenants', color: 'bg-green-600' },
        { label: 'Évaluations', icon: 'ri-file-list-3-line', link: '/dashboard/formateur/evaluations', color: 'bg-amber-600' },
        { label: 'Certificats', icon: 'ri-award-line', link: '/dashboard/formateur/certificats', color: 'bg-teal-600' },
      ],
      activities: [
        { text: 'Nouvel apprenant inscrit', detail: 'Ibrahim Touré - Développement Web React', time: 'Il y a 30 min' },
        { text: 'Devoir soumis', detail: 'Fatou Sow - Module 4 Marketing Digital', time: 'Il y a 2h' },
        { text: 'Classe virtuelle planifiée', detail: 'Session React Hooks - 15 mai 15h', time: 'Il y a 5h' },
        { text: 'Certificat délivré', detail: 'Aminata Diop - Comptabilité PME', time: 'Il y a 1j' },
      ]
    },
    apprenant: {
      title: 'Tableau de bord Apprenant',
      stats: [
        { label: 'Formations en cours', value: '5', icon: 'ri-book-open-line', color: 'bg-teal-500' },
        { label: 'Formations terminées', value: '12', icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
        { label: 'Certificats obtenus', value: '8', icon: 'ri-award-line', color: 'bg-yellow-500' },
        { label: 'Heures d\'apprentissage', value: '156', icon: 'ri-time-line', color: 'bg-teal-600' },
      ],
      quickActions: [
        { label: 'Mes formations', icon: 'ri-book-open-line', link: '/dashboard/apprenant/mes-cours', color: 'bg-teal-600' },
        { label: 'Ma progression', icon: 'ri-bar-chart-grouped-line', link: '/dashboard/apprenant/progression', color: 'bg-green-600' },
        { label: 'Mes certificats', icon: 'ri-award-line', link: '/dashboard/apprenant/certificats', color: 'bg-yellow-600' },
        { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', color: 'bg-teal-600' },
        { label: 'Explorer le catalogue', icon: 'ri-compass-line', link: '/espace-numerique', color: 'bg-teal-600' },
      ],
      activities: [
        { text: 'Cours complété', detail: 'Module 3 - Marketing Digital Avancé', time: 'Il y a 1h' },
        { text: 'Nouveau quiz disponible', detail: 'SEO avancé - 15 questions', time: 'Il y a 3h' },
        { text: 'Message du formateur', detail: 'Prof. Ndiaye : Votre devoir a été corrigé', time: 'Il y a 5h' },
        { text: 'Certificat obtenu', detail: 'Bases du Marketing Digital', time: 'Il y a 2j' },
      ]
    },
    porteur: {
      title: 'Tableau de bord Porteur de projet',
      stats: [
        { label: 'Projets soumis', value: '2', icon: 'ri-file-list-line', color: 'bg-green-500' },
        { label: 'En incubation', value: '1', icon: 'ri-seedling-line', color: 'bg-teal-500' },
        { label: 'Mentors assignés', value: '3', icon: 'ri-user-star-line', color: 'bg-teal-600' },
        { label: 'Financement obtenu', value: '45%', icon: 'ri-funds-line', color: 'bg-teal-500' },
      ],
      quickActions: [
        { label: 'Mes projets', icon: 'ri-folder-line', link: '/dashboard/porteur/mes-projets', color: 'bg-green-600' },
        { label: 'Partenariats', icon: 'ri-team-line', link: '/dashboard/porteur/partenariats', color: 'bg-teal-600' },
        { label: 'Financements', icon: 'ri-funds-line', link: '/dashboard/porteur/financements', color: 'bg-yellow-600' },
        { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', color: 'bg-teal-600' },
        { label: 'Soumettre un projet', icon: 'ri-add-circle-line', link: '/project-center/soumettre', color: 'bg-teal-600' },
      ],
      activities: [
        { text: 'Jalon validé', detail: 'AgriTech Solutions - Business plan approuvé', time: 'Il y a 3h' },
        { text: 'Message du mentor', detail: 'Dr. Kouassi : Votre pitch deck est excellent', time: 'Il y a 5h' },
        { text: 'Partenaire intéressé', detail: 'CTIC Dakar souhaite investir dans votre projet', time: 'Il y a 1j' },
        { text: 'Réunion planifiée', detail: 'Comité d\'évaluation - 15 mai à 10h', time: 'Il y a 2j' },
      ]
    },
    partenaire: {
      title: 'Tableau de bord Partenaire',
      stats: [
        { label: 'Projets financés', value: '8', icon: 'ri-hand-coin-line', color: 'bg-teal-500' },
        { label: 'Montant investi', value: '12M', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
        { label: 'Projets suivis', value: '15', icon: 'ri-eye-line', color: 'bg-teal-500' },
        { label: 'Taux de réussite', value: '78%', icon: 'ri-line-chart-line', color: 'bg-teal-500' },
      ],
      quickActions: [
        { label: 'Opportunités', icon: 'ri-search-line', link: '/dashboard/partenaire/opportunites', color: 'bg-teal-600' },
        { label: 'Projets suivis', icon: 'ri-eye-line', link: '/dashboard/partenaire/projets-suivis', color: 'bg-teal-600' },
        { label: 'Collaborations', icon: 'ri-team-line', link: '/dashboard/partenaire/collaborations', color: 'bg-green-600' },
        { label: 'Mes investissements', icon: 'ri-wallet-line', link: '/dashboard/paiements', color: 'bg-pink-600' },
        { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', color: 'bg-yellow-600' },
      ],
      activities: [
        { text: 'Nouveau projet disponible', detail: 'Fintech Mobile - Recherche 5M FCFA', time: 'Il y a 1h' },
        { text: 'Rapport d\'évaluation', detail: 'AgriTech Solutions - Jalon 3 validé', time: 'Il y a 4h' },
        { text: 'Message du porteur', detail: 'Ibrahima Fall : Merci pour votre accompagnement', time: 'Il y a 1j' },
        { text: 'Réunion du comité', detail: 'Évaluation trimestrielle - 15 mai', time: 'Il y a 2j' },
      ]
    },
  };

  const content = dashboardContent[userType] ?? dashboardContent.client;

  return (
    <DashboardLayout>
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Header */}
      <div className="mb-8">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }]} />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-gray-600">Bienvenue sur votre espace personnel</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonCard count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {content.stats.map((stat, index) => (
            <StatCard key={index} {...stat} valueClassName="text-3xl" />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {content.quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`${action.color} text-white rounded-lg p-5 hover:opacity-90 transition-opacity text-center`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className={`${action.icon} text-xl text-white`}></i>
                </div>
              </div>
              <p className="font-medium text-sm">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Activité récente</h2>
        {loading ? (
          <SkeletonList count={4} />
        ) : (
          <div className="space-y-4">
            {content.activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-notification-3-line text-base text-teal-600"></i>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-sm text-gray-600 mt-1">{activity.detail}</p>
                  <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
