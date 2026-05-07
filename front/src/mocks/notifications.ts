export const notificationsData = [
  {
    id: 1,
    type: 'message' as const,
    title: 'Nouveau message de Dr. Cheikh Fall',
    message: 'Excellent travail sur le partenariat !',
    timestamp: 'Il y a 5 minutes',
    read: false,
    avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20mentor%20business%20advisor%20portrait%20confident%20smile%20modern%20office%20west%20africa&width=100&height=100&seq=notif1&orientation=squarish',
    link: '/dashboard/messages'
  },
  {
    id: 2,
    type: 'projet' as const,
    title: 'Mise à jour de projet',
    message: 'Votre projet AgriConnect a été approuvé pour l\'incubation',
    timestamp: 'Il y a 1 heure',
    read: false,
    link: '/dashboard/mes-projets/1'
  },
  {
    id: 3,
    type: 'formation' as const,
    title: 'Nouvelle formation disponible',
    message: 'Marketing Digital Avancé est maintenant disponible',
    timestamp: 'Il y a 2 heures',
    read: true,
    link: '/espace-numerique'
  },
  {
    id: 4,
    type: 'paiement' as const,
    title: 'Paiement reçu',
    message: 'Vous avez reçu un paiement de 50 000 FCFA',
    timestamp: 'Il y a 3 heures',
    read: true,
    link: '/dashboard/payments'
  },
  {
    id: 5,
    type: 'prestation' as const,
    title: 'Nouvelle demande de prestation',
    message: 'Un client souhaite réserver vos services',
    timestamp: 'Hier',
    read: true,
    link: '/dashboard/requests'
  },
  {
    id: 6,
    type: 'system' as const,
    title: 'Mise à jour de la plateforme',
    message: 'De nouvelles fonctionnalités sont disponibles',
    timestamp: 'Il y a 2 jours',
    read: true
  },
  {
    id: 7,
    type: 'message' as const,
    title: 'Message de l\'équipe AgriConnect',
    message: 'Réunion d\'équipe demain à 14h',
    timestamp: 'Il y a 4 heures',
    read: false,
    link: '/dashboard/messages'
  },
  {
    id: 8,
    type: 'formation' as const,
    title: 'Certificat disponible',
    message: 'Votre certificat de formation est prêt à être téléchargé',
    timestamp: 'Hier',
    read: false,
    link: '/dashboard/certificates'
  },
  {
    id: 9,
    type: 'projet' as const,
    title: 'Nouveau mentor assigné',
    message: 'Dr. Cheikh Fall a été assigné comme mentor pour votre projet',
    timestamp: 'Il y a 2 jours',
    read: true,
    link: '/dashboard/mes-projets/1'
  },
  {
    id: 10,
    type: 'prestation' as const,
    title: 'Prestation terminée',
    message: 'Le client a confirmé la fin de la prestation',
    timestamp: 'Il y a 3 jours',
    read: true,
    link: '/dashboard/prestations'
  }
];