export const messagesData = [
  {
    id: 1,
    conversationId: 1,
    content: 'Bonjour Aminata, j\'ai examiné votre dernier rapport d\'avancement. Très impressionnant !',
    sender: 'other',
    timestamp: '10:15',
    read: true
  },
  {
    id: 2,
    conversationId: 1,
    content: 'Merci beaucoup Dr. Fall ! Vos conseils ont été précieux pour structurer notre approche.',
    sender: 'me',
    timestamp: '10:18',
    read: true
  },
  {
    id: 3,
    conversationId: 1,
    content: 'Je vous recommande de préparer une stratégie de communication pour maximiser l\'impact de l\'annonce du partenariat avec la Fédération des Maraîchers.',
    sender: 'other',
    timestamp: '10:25',
    read: true
  },
  {
    id: 4,
    conversationId: 1,
    content: 'Excellent travail sur le partenariat ! Voici quelques documents qui pourraient vous être utiles.',
    sender: 'other',
    timestamp: '10:30',
    read: false,
    attachments: [
      { name: 'Strategie_Communication.pdf', size: '2.4 MB', type: 'pdf' },
      { name: 'Checklist_Partenariat.docx', size: '156 KB', type: 'docx' }
    ]
  },
  {
    id: 5,
    conversationId: 2,
    content: 'Bonjour à tous ! Réunion d\'équipe demain à 14h pour discuter de la nouvelle fonctionnalité.',
    sender: 'other',
    timestamp: '08:30',
    read: true
  },
  {
    id: 6,
    conversationId: 2,
    content: 'Parfait, je serai là !',
    sender: 'me',
    timestamp: '08:35',
    read: true
  },
  {
    id: 7,
    conversationId: 2,
    content: 'La nouvelle version est prête pour les tests. J\'ai mis à jour le repo GitHub.',
    sender: 'other',
    timestamp: '09:15',
    read: false
  },
  {
    id: 8,
    conversationId: 3,
    content: 'Bonjour, j\'ai quelques questions concernant la stratégie marketing pour le lancement.',
    sender: 'me',
    timestamp: 'Hier 15:30',
    read: true
  },
  {
    id: 9,
    conversationId: 3,
    content: 'Avez-vous reçu le document que je vous ai envoyé hier ?',
    sender: 'other',
    timestamp: 'Hier 16:45',
    read: true
  },
  {
    id: 10,
    conversationId: 4,
    content: 'Bonjour, j\'ai examiné votre projet AgriConnect et je suis très intéressé par votre approche innovante.',
    sender: 'other',
    timestamp: 'Hier 11:20',
    read: true
  },
  {
    id: 11,
    conversationId: 4,
    content: 'Intéressé par votre projet. Pouvons-nous organiser une réunion pour discuter d\'un éventuel financement ?',
    sender: 'other',
    timestamp: 'Hier 14:00',
    read: false
  },
  {
    id: 12,
    conversationId: 5,
    content: 'Bonjour Fatou, merci pour votre aide sur la campagne de communication.',
    sender: 'me',
    timestamp: '15 Mai 10:00',
    read: true
  },
  {
    id: 13,
    conversationId: 5,
    content: 'La campagne est lancée ! Les premiers retours sont très positifs.',
    sender: 'other',
    timestamp: '15 Mai 16:30',
    read: true
  },
  {
    id: 14,
    conversationId: 6,
    content: 'Bonjour, j\'ai besoin d\'aide pour configurer mon profil prestataire.',
    sender: 'me',
    timestamp: '14 Mai 09:00',
    read: true
  },
  {
    id: 15,
    conversationId: 6,
    content: 'Comment puis-je vous aider ? Je suis là pour répondre à toutes vos questions.',
    sender: 'other',
    timestamp: '14 Mai 09:05',
    read: true
  }
];

export const conversationsData = [
  {
    id: 1,
    name: 'Dr. Cheikh Fall',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20mentor%20business%20advisor%20portrait%20confident%20smile%20modern%20office%20west%20africa&width=100&height=100&seq=msg1&orientation=squarish',
    role: 'Mentor AgriTech',
    lastMessage: 'Excellent travail sur le partenariat !',
    timestamp: '10:30',
    unread: 2,
    online: true,
    type: 'individual' as const
  },
  {
    id: 2,
    name: 'Équipe AgriConnect',
    avatar: 'https://readdy.ai/api/search-image?query=team%20collaboration%20group%20icon%20modern%20professional%20business%20simple%20background&width=100&height=100&seq=msg2&orientation=squarish',
    role: 'Groupe de projet',
    lastMessage: 'Mamadou: La nouvelle version est prête',
    timestamp: '09:15',
    unread: 5,
    online: false,
    type: 'group' as const,
    members: 4
  },
  {
    id: 3,
    name: 'Marie Dupont',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20european%20woman%20business%20mentor%20consultant%20portrait%20confident%20modern%20office&width=100&height=100&seq=msg3&orientation=squarish',
    role: 'Mentor E-commerce',
    lastMessage: 'Avez-vous reçu le document ?',
    timestamp: 'Hier',
    unread: 0,
    online: false,
    type: 'individual' as const
  },
  {
    id: 4,
    name: 'Investisseur Anonyme',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20business%20investor%20portrait%20confident%20modern%20office%20simple%20background&width=100&height=100&seq=msg4&orientation=squarish',
    role: 'Partenaire Financier',
    lastMessage: 'Intéressé par votre projet',
    timestamp: 'Hier',
    unread: 1,
    online: true,
    type: 'individual' as const
  },
  {
    id: 5,
    name: 'Fatou Ndiaye',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20marketing%20professional%20business%20portrait%20confident%20smile%20modern%20office%20setting%20west%20africa&width=100&height=100&seq=msg5&orientation=squarish',
    role: 'Responsable Marketing',
    lastMessage: 'La campagne est lancée !',
    timestamp: '15 Mai',
    unread: 0,
    online: false,
    type: 'individual' as const
  },
  {
    id: 6,
    name: 'Support C2P',
    avatar: 'https://readdy.ai/api/search-image?query=customer%20support%20service%20icon%20professional%20modern%20simple%20background&width=100&height=100&seq=msg6&orientation=squarish',
    role: 'Assistance technique',
    lastMessage: 'Comment puis-je vous aider ?',
    timestamp: '14 Mai',
    unread: 0,
    online: true,
    type: 'individual' as const
  }
];