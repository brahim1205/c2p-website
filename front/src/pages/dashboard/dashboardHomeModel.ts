export type DashboardHomeContent = {
  title: string;
  stats: { label: string; value: string; icon: string; color: string }[];
  quickActions: { label: string; icon: string; link: string; color: string }[];
  activities: { text: string; detail: string; time: string }[];
};

export type DashboardHomeRole = 'client' | 'prestataire' | 'formateur' | 'apprenant' | 'parent' | 'porteur' | 'partenaire';

export function createDashboardHomeContent(totalUnread: number): Record<DashboardHomeRole, DashboardHomeContent> {
  return {
    client: {
      title: 'Espace client',
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
      ],
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
      ],
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
      ],
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
      ],
    },
    parent: {
      title: 'Tableau de bord Parent',
      stats: [
        { label: 'Enfants suivis', value: '1', icon: 'ri-parent-line', color: 'bg-sky-600' },
        { label: 'Parcours actifs', value: '3', icon: 'ri-book-open-line', color: 'bg-teal-600' },
        { label: 'Certificats visibles', value: '1', icon: 'ri-award-line', color: 'bg-yellow-500' },
        { label: 'Messages non lus', value: String(totalUnread), icon: 'ri-message-3-line', color: 'bg-indigo-500' },
      ],
      quickActions: [
        { label: 'Suivi parent', icon: 'ri-dashboard-line', link: '/dashboard/parent', color: 'bg-sky-600' },
        { label: 'Messagerie C2P', icon: 'ri-message-3-line', link: '/dashboard/messages', color: 'bg-teal-600' },
        { label: 'Catalogue END', icon: 'ri-graduation-cap-line', link: '/espace-numerique', color: 'bg-indigo-600' },
        { label: 'Sécurité', icon: 'ri-shield-check-line', link: '/dashboard/securite', color: 'bg-emerald-600' },
        { label: 'Mon profil', icon: 'ri-user-line', link: '/dashboard/profile', color: 'bg-slate-600' },
      ],
      activities: [
        { text: 'Progression mise a jour', detail: 'Ibrahim Toure - Marketing digital avance', time: 'Il y a 2h' },
        { text: 'Certificat emis', detail: 'React et interfaces modernes', time: 'Il y a 1j' },
        { text: 'Message support', detail: 'C2P a confirme le rattachement parent', time: 'Il y a 2j' },
      ],
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
        { label: 'Soumettre un projet', icon: 'ri-add-circle-line', link: '/dashboard/porteur/mes-projets/soumettre', color: 'bg-teal-600' },
      ],
      activities: [
        { text: 'Jalon validé', detail: 'AgriTech Solutions - Business plan approuvé', time: 'Il y a 3h' },
        { text: 'Message du mentor', detail: 'Dr. Kouassi : Votre pitch deck est excellent', time: 'Il y a 5h' },
        { text: 'Partenaire intéressé', detail: 'CTIC Dakar souhaite investir dans votre projet', time: 'Il y a 1j' },
        { text: 'Réunion planifiée', detail: 'Comité d\'évaluation - 15 mai à 10h', time: 'Il y a 2j' },
      ],
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
      ],
    },
  };
}
