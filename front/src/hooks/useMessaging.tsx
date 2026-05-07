import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export interface Attachment {
  name: string;
  size: string;
  type: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  read: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  online: boolean;
  type: 'individual' | 'group';
  members?: number;
  participants: string[];
}

const STORAGE_KEY = 'c2p_messaging';
const LAST_READ_KEY = 'c2p_messaging_lastread';

// ─── FORMATEUR conversations (apprenants) ───────────────────────────────────
const mockFormateurConversations: Conversation[] = [
  {
    id: 'conv-f1',
    name: 'Ibrahim Touré',
    avatar: 'https://readdy.ai/api/search-image?query=young%20african%20man%20student%20casual%20portrait%20smiling%20confident%20university%20campus%20background&width=100&height=100&seq=form-ibrahim&orientation=squarish',
    role: 'Apprenant - Développement Web',
    lastMessage: 'Merci professeur, j\'ai bien reçu le cours !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    unreadCount: 1,
    online: true,
    type: 'individual',
    participants: ['usr-004', 'usr-003']
  },
  {
    id: 'conv-f2',
    name: 'Fatou Sow',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20student%20professional%20portrait%20confident%20smile%20modern%20classroom%20background&width=100&height=100&seq=form-fatou&orientation=squarish',
    role: 'Apprenante - Marketing Digital',
    lastMessage: 'Je n\'arrive pas à accéder au module 3, pouvez-vous m\'aider ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unreadCount: 2,
    online: true,
    type: 'individual',
    participants: ['usr-004', 'usr-003']
  },
  {
    id: 'conv-f3',
    name: 'Équipe Pédagogique C2P',
    avatar: 'https://readdy.ai/api/search-image?query=team%20education%20professionals%20diverse%20group%20icon%20modern%20simple%20background&width=100&height=100&seq=form-equipe&orientation=squarish',
    role: 'Groupe interne',
    lastMessage: 'Dr. Diallo: La prochaine session de formation est confirmée',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'group',
    members: 5,
    participants: ['usr-001', 'usr-003', 'usr-002']
  },
  {
    id: 'conv-f4',
    name: 'Aminata Diop',
    avatar: 'https://readdy.ai/api/search-image?query=african%20female%20student%20portrait%20university%20setting%20confident%20smile%20modern&width=100&height=100&seq=form-aminata&orientation=squarish',
    role: 'Apprenante - Comptabilité PME',
    lastMessage: 'Puis-je avoir un délai supplémentaire pour le devoir ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-004', 'usr-003']
  },
  {
    id: 'conv-f5',
    name: 'Support C2P',
    avatar: 'https://readdy.ai/api/search-image?query=customer%20support%20service%20icon%20professional%20modern%20simple%20background&width=100&height=100&seq=form-support&orientation=squarish',
    role: 'Assistance technique',
    lastMessage: 'Votre problème de vidéo a été résolu',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-001', 'usr-003']
  },
  {
    id: 'conv-f6',
    name: 'David Kouassi',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20student%20portrait%20university%20campus%20confident%20young%20modern&width=100&height=100&seq=form-david&orientation=squarish',
    role: 'Apprenant - Design UI/UX',
    lastMessage: 'J\'ai soumis mon projet final, merci pour tout !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-004', 'usr-003']
  }
];

// ─── PRESTATAIRE conversations (clients) ────────────────────────────────────
const mockPrestataireConversations: Conversation[] = [
  {
    id: 'conv-p1',
    name: 'Jean-Pierre Mbarga',
    avatar: 'https://readdy.ai/api/search-image?query=african%20businessman%20client%20portrait%20confident%20smile%20modern%20office%20dakar%20senegal%20professional%20attire&width=100&height=100&seq=prest-jean&orientation=squarish',
    role: 'Client - Plomberie résidentielle',
    lastMessage: 'Bonjour, quand pouvez-vous intervenir pour la fuite ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unreadCount: 2,
    online: true,
    type: 'individual',
    participants: ['usr-002', 'client-1']
  },
  {
    id: 'conv-p2',
    name: 'Sophie Nkomo',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20client%20professional%20portrait%20confident%20smile%20modern%20background%20senegal&width=100&height=100&seq=prest-sophie&orientation=squarish',
    role: 'Cliente - Installation électrique',
    lastMessage: 'Merci pour l\'intervention, tout fonctionne parfaitement !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-002', 'client-2']
  },
  {
    id: 'conv-p3',
    name: 'Paul Essomba',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20client%20portrait%20professional%20confident%20modern%20office%20setting%20west%20africa&width=100&height=100&seq=prest-paul&orientation=squarish',
    role: 'Client - Rénovation salle de bain',
    lastMessage: 'Quel est votre tarif pour une rénovation complète ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unreadCount: 1,
    online: true,
    type: 'individual',
    participants: ['usr-002', 'client-3']
  },
  {
    id: 'conv-p4',
    name: 'Réseau Prestataires C2P',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20network%20group%20icon%20modern%20business%20simple%20background%20community&width=100&height=100&seq=prest-reseau&orientation=squarish',
    role: 'Groupe professionnel',
    lastMessage: 'Réunion mensuelle des prestataires ce vendredi à 15h',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    unreadCount: 3,
    online: false,
    type: 'group',
    members: 12,
    participants: ['usr-002', 'usr-001']
  },
  {
    id: 'conv-p5',
    name: 'Fatima Diallo',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20client%20portrait%20confident%20smile%20modern%20home%20background%20senegal&width=100&height=100&seq=prest-fatima&orientation=squarish',
    role: 'Cliente - Climatisation',
    lastMessage: 'Pouvez-vous venir demain matin pour l\'installation ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-002', 'client-4']
  },
  {
    id: 'conv-p6',
    name: 'Support C2P',
    avatar: 'https://readdy.ai/api/search-image?query=customer%20support%20service%20icon%20professional%20modern%20simple%20background&width=100&height=100&seq=prest-support&orientation=squarish',
    role: 'Assistance plateforme',
    lastMessage: 'Votre profil a été vérifié et validé',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-001', 'usr-002']
  }
];

// ─── APPRENANT conversations (formateurs) ───────────────────────────────────
const mockApprenantConversations: Conversation[] = [
  {
    id: 'conv-a1',
    name: 'Prof. Aminata Ndiaye',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20professor%20teacher%20portrait%20confident%20smile%20modern%20university%20classroom%20background&width=100&height=100&seq=app-aminata&orientation=squarish',
    role: 'Formatrice - Marketing Digital',
    lastMessage: 'Votre devoir a été corrigé, consultez vos notes !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    unreadCount: 1,
    online: true,
    type: 'individual',
    participants: ['usr-004', 'usr-003']
  },
  {
    id: 'conv-a2',
    name: 'Dr. Jean Mbarga',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20professor%20doctor%20portrait%20confident%20smile%20modern%20university%20office%20background&width=100&height=100&seq=app-jean&orientation=squarish',
    role: 'Formateur - Développement Web',
    lastMessage: 'N\'oubliez pas le projet final à rendre vendredi',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-004', 'formateur-2']
  },
  {
    id: 'conv-a3',
    name: 'Groupe - Développement Web',
    avatar: 'https://readdy.ai/api/search-image?query=students%20group%20study%20team%20collaboration%20modern%20university%20campus%20background&width=100&height=100&seq=app-groupe&orientation=squarish',
    role: 'Groupe de classe',
    lastMessage: 'Ibrahim: Quelqu\'un a compris l\'exercice 5 ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 5,
    online: false,
    type: 'group',
    members: 18,
    participants: ['usr-004', 'usr-003', 'formateur-2']
  },
  {
    id: 'conv-a4',
    name: 'Mme. Coumba Sarr',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20teacher%20instructor%20portrait%20confident%20smile%20modern%20classroom%20setting&width=100&height=100&seq=app-coumba&orientation=squarish',
    role: 'Formatrice - Comptabilité PME',
    lastMessage: 'Bonne chance pour l\'examen de demain !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-004', 'formateur-3']
  },
  {
    id: 'conv-a5',
    name: 'Support C2P',
    avatar: 'https://readdy.ai/api/search-image?query=customer%20support%20service%20icon%20professional%20modern%20simple%20background&width=100&height=100&seq=app-support&orientation=squarish',
    role: 'Assistance technique',
    lastMessage: 'Votre certificat est disponible en téléchargement',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-001', 'usr-004']
  }
];

// ─── PORTEUR conversations (mentors, partenaires) ───────────────────────────
const mockPorteurConversations: Conversation[] = [
  {
    id: 'conv-po1',
    name: 'Dr. Kouassi Mensah',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20mentor%20business%20advisor%20portrait%20confident%20smile%20modern%20office%20professional%20attire&width=100&height=100&seq=port-kouassi&orientation=squarish',
    role: 'Mentor - Agriculture durable',
    lastMessage: 'Votre pitch deck est excellent, quelques ajustements à faire',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    unreadCount: 2,
    online: true,
    type: 'individual',
    participants: ['usr-005', 'mentor-1']
  },
  {
    id: 'conv-po2',
    name: 'Mme. Aïssatou Diallo',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20business%20mentor%20advisor%20portrait%20confident%20smile%20modern%20office%20setting&width=100&height=100&seq=port-aissatou&orientation=squarish',
    role: 'Mentor - Business Development',
    lastMessage: 'Prêt pour la réunion avec les investisseurs demain ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 1,
    online: false,
    type: 'individual',
    participants: ['usr-005', 'mentor-2']
  },
  {
    id: 'conv-po3',
    name: 'Fonds d\'Investissement CTIC',
    avatar: 'https://readdy.ai/api/search-image?query=investment%20fund%20finance%20professional%20icon%20modern%20business%20simple%20background&width=100&height=100&seq=port-ctic&orientation=squarish',
    role: 'Partenaire financier',
    lastMessage: 'Nous sommes intéressés par votre projet AgriTech',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unreadCount: 3,
    online: false,
    type: 'individual',
    participants: ['usr-005', 'partenaire-1']
  },
  {
    id: 'conv-po4',
    name: 'Incubateur C2P',
    avatar: 'https://readdy.ai/api/search-image?query=incubator%20startup%20team%20group%20icon%20modern%20professional%20simple%20background&width=100&height=100&seq=port-incub&orientation=squarish',
    role: 'Équipe incubateur',
    lastMessage: 'Votre dossier d\'incubation a été validé !',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'group',
    members: 4,
    participants: ['usr-005', 'usr-001']
  },
  {
    id: 'conv-po5',
    name: 'Marie Faye',
    avatar: 'https://readdy.ai/api/search-image?query=african%20woman%20partner%20investor%20portrait%20confident%20smile%20modern%20office%20background&width=100&height=100&seq=port-marie&orientation=squarish',
    role: 'Partenaire technique',
    lastMessage: 'Je peux vous accompagner sur la partie technologique',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'individual',
    participants: ['usr-005', 'usr-006']
  }
];

// ─── PARTENAIRE conversations (porteurs, équipes) ───────────────────────────
const mockPartenaireConversations: Conversation[] = [
  {
    id: 'conv-pa1',
    name: 'Ibrahima Fall',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20entrepreneur%20startup%20founder%20portrait%20confident%20smile%20modern%20office%20background&width=100&height=100&seq=part-ibrahima&orientation=squarish',
    role: 'Porteur - AgriTech Solutions',
    lastMessage: 'Merci pour votre intérêt, quand pouvons-nous nous rencontrer ?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    unreadCount: 2,
    online: true,
    type: 'individual',
    participants: ['usr-006', 'usr-005']
  },
  {
    id: 'conv-pa2',
    name: 'Équipe EduConnect',
    avatar: 'https://readdy.ai/api/search-image?query=startup%20team%20education%20technology%20group%20icon%20modern%20professional%20background&width=100&height=100&seq=part-educonnect&orientation=squarish',
    role: 'Porteur - EduConnect Platform',
    lastMessage: 'Notre MVP est prêt pour la démonstration',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    unreadCount: 1,
    online: false,
    type: 'group',
    members: 3,
    participants: ['usr-006', 'porteur-2']
  },
  {
    id: 'conv-pa3',
    name: 'Réseau Partenaires C2P',
    avatar: 'https://readdy.ai/api/search-image?query=business%20partners%20network%20group%20icon%20modern%20professional%20simple%20background&width=100&height=100&seq=part-reseau&orientation=squarish',
    role: 'Groupe partenaires',
    lastMessage: 'Prochaine réunion du comité d\'évaluation : 15 mai',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unreadCount: 0,
    online: false,
    type: 'group',
    members: 8,
    participants: ['usr-006', 'usr-001']
  },
  {
    id: 'conv-pa4',
    name: 'Cheikh Diop',
    avatar: 'https://readdy.ai/api/search-image?query=african%20male%20entrepreneur%20fintech%20founder%20portrait%20confident%20smile%20modern%20office%20dakar&width=100&height=100&seq=part-cheikh&orientation=squarish',
    role: 'Porteur - Fintech Mobile',
    lastMessage: 'Notre application a déjà 500 utilisateurs en beta',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-006', 'porteur-3']
  },
  {
    id: 'conv-pa5',
    name: 'Admin C2P',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20admin%20manager%20portrait%20confident%20smile%20modern%20office%20background%20simple&width=100&height=100&seq=part-admin&orientation=squarish',
    role: 'Administration plateforme',
    lastMessage: 'Votre rapport d\'évaluation trimestriel est disponible',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 0,
    online: true,
    type: 'individual',
    participants: ['usr-001', 'usr-006']
  }
];

// ─── Initial messages per role ───────────────────────────────────────────────
const initialFormateurMessages: Record<string, Message[]> = {
  'conv-f1': [
    { id: 'm1', conversationId: 'conv-f1', content: 'Bonjour Professeur Ndiaye, j\'ai une question sur le module React Hooks.', senderId: 'usr-004', senderName: 'Ibrahim Touré', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true },
    { id: 'm2', conversationId: 'conv-f1', content: 'Bonjour Ibrahim, bien sûr ! De quoi s\'agit-il exactement ?', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), read: true },
    { id: 'm3', conversationId: 'conv-f1', content: 'Je ne comprends pas bien la différence entre useEffect et useLayoutEffect.', senderId: 'usr-004', senderName: 'Ibrahim Touré', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), read: true },
    { id: 'm4', conversationId: 'conv-f1', content: 'Excellente question ! useLayoutEffect s\'exécute de manière synchrone après les mutations DOM mais avant le rendu visuel. useEffect s\'exécute après le rendu. Je vous envoie un document explicatif.', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), read: true, attachments: [{ name: 'React_Hooks_Guide.pdf', size: '3.2 MB', type: 'pdf' }] },
    { id: 'm5', conversationId: 'conv-f1', content: 'Merci professeur, j\'ai bien reçu le cours !', senderId: 'usr-004', senderName: 'Ibrahim Touré', timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), read: false }
  ],
  'conv-f2': [
    { id: 'm6', conversationId: 'conv-f2', content: 'Bonjour madame Ndiaye, je suis bloquée au module 3 de Marketing Digital.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), read: true },
    { id: 'm7', conversationId: 'conv-f2', content: 'Bonjour Fatou, quel est le problème exactement ?', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(), read: true },
    { id: 'm8', conversationId: 'conv-f2', content: 'Je n\'arrive pas à accéder au module 3, pouvez-vous m\'aider ?', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), read: false }
  ],
  'conv-f3': [
    { id: 'm9', conversationId: 'conv-f3', content: 'Bonjour à tous, rappel de la réunion pédagogique demain à 10h.', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: true },
    { id: 'm10', conversationId: 'conv-f3', content: 'Présent !', senderId: 'usr-002', senderName: 'Moussa Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.8).toISOString(), read: true },
    { id: 'm11', conversationId: 'conv-f3', content: 'Présente aussi.', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), read: true },
    { id: 'm12', conversationId: 'conv-f3', content: 'Dr. Diallo: La prochaine session de formation est confirmée', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: true }
  ],
  'conv-f4': [
    { id: 'm13', conversationId: 'conv-f4', content: 'Bonjour Professeur, j\'ai des difficultés avec le devoir de comptabilité.', senderId: 'usr-004', senderName: 'Aminata Diop', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: true },
    { id: 'm14', conversationId: 'conv-f4', content: 'Puis-je avoir un délai supplémentaire pour le devoir ?', senderId: 'usr-004', senderName: 'Aminata Diop', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true }
  ],
  'conv-f5': [
    { id: 'm15', conversationId: 'conv-f5', content: 'Bonjour, j\'ai un problème avec le téléversement de vidéos sur ma formation.', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), read: true },
    { id: 'm16', conversationId: 'conv-f5', content: 'Nous avons identifié le problème. Pouvez-vous réessayer maintenant ?', senderId: 'usr-001', senderName: 'Support C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), read: true },
    { id: 'm17', conversationId: 'conv-f5', content: 'Votre problème de vidéo a été résolu', senderId: 'usr-001', senderName: 'Support C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: true }
  ],
  'conv-f6': [
    { id: 'm18', conversationId: 'conv-f6', content: 'Bonjour Professeur, voici mon projet final de Design UI/UX.', senderId: 'usr-004', senderName: 'David Kouassi', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), read: true, attachments: [{ name: 'Projet_Final_UIUX.fig', size: '12.5 MB', type: 'figma' }] },
    { id: 'm19', conversationId: 'conv-f6', content: 'Excellent travail David ! Vous avez bien progressé.', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), read: true },
    { id: 'm20', conversationId: 'conv-f6', content: 'J\'ai soumis mon projet final, merci pour tout !', senderId: 'usr-004', senderName: 'David Kouassi', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true }
  ]
};

const initialPrestataireMessages: Record<string, Message[]> = {
  'conv-p1': [
    { id: 'pm1', conversationId: 'conv-p1', content: 'Bonjour, j\'ai une fuite d\'eau dans ma cuisine depuis ce matin.', senderId: 'client-1', senderName: 'Jean-Pierre Mbarga', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), read: true },
    { id: 'pm2', conversationId: 'conv-p1', content: 'Bonjour M. Mbarga, je peux intervenir aujourd\'hui en fin d\'après-midi. Quelle est votre adresse ?', senderId: 'usr-002', senderName: 'Moussa Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), read: true },
    { id: 'pm3', conversationId: 'conv-p1', content: 'Bonjour, quand pouvez-vous intervenir pour la fuite ?', senderId: 'client-1', senderName: 'Jean-Pierre Mbarga', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), read: false }
  ],
  'conv-p2': [
    { id: 'pm4', conversationId: 'conv-p2', content: 'Bonjour, l\'installation électrique est terminée. Tout fonctionne bien ?', senderId: 'usr-002', senderName: 'Moussa Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: true },
    { id: 'pm5', conversationId: 'conv-p2', content: 'Merci pour l\'intervention, tout fonctionne parfaitement !', senderId: 'client-2', senderName: 'Sophie Nkomo', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true }
  ],
  'conv-p3': [
    { id: 'pm6', conversationId: 'conv-p3', content: 'Bonjour, je souhaite rénover ma salle de bain complètement.', senderId: 'client-3', senderName: 'Paul Essomba', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true },
    { id: 'pm7', conversationId: 'conv-p3', content: 'Bonjour M. Essomba, je peux vous faire un devis gratuit. Quelle est la superficie ?', senderId: 'usr-002', senderName: 'Moussa Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(), read: true },
    { id: 'pm8', conversationId: 'conv-p3', content: 'Quel est votre tarif pour une rénovation complète ?', senderId: 'client-3', senderName: 'Paul Essomba', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false }
  ],
  'conv-p4': [
    { id: 'pm9', conversationId: 'conv-p4', content: 'Bonjour à tous les prestataires ! Rappel : réunion mensuelle ce vendredi.', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: true },
    { id: 'pm10', conversationId: 'conv-p4', content: 'Réunion mensuelle des prestataires ce vendredi à 15h', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), read: false }
  ],
  'conv-p5': [
    { id: 'pm11', conversationId: 'conv-p5', content: 'Bonjour, j\'ai besoin d\'installer une climatisation dans mon bureau.', senderId: 'client-4', senderName: 'Fatima Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), read: true },
    { id: 'pm12', conversationId: 'conv-p5', content: 'Pouvez-vous venir demain matin pour l\'installation ?', senderId: 'client-4', senderName: 'Fatima Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), read: true }
  ],
  'conv-p6': [
    { id: 'pm13', conversationId: 'conv-p6', content: 'Bonjour, votre profil a été soumis pour vérification.', senderId: 'usr-001', senderName: 'Support C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), read: true },
    { id: 'pm14', conversationId: 'conv-p6', content: 'Votre profil a été vérifié et validé', senderId: 'usr-001', senderName: 'Support C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true }
  ]
};

const initialApprenantMessages: Record<string, Message[]> = {
  'conv-a1': [
    { id: 'am1', conversationId: 'conv-a1', content: 'Bonjour Professeure Ndiaye, j\'ai soumis mon devoir sur le SEO.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: true },
    { id: 'am2', conversationId: 'conv-a1', content: 'Bonjour Fatou, je vais le corriger dans la journée.', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), read: true },
    { id: 'am3', conversationId: 'conv-a1', content: 'Votre devoir a été corrigé, consultez vos notes !', senderId: 'usr-003', senderName: 'Aminata Ndiaye', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), read: false }
  ],
  'conv-a2': [
    { id: 'am4', conversationId: 'conv-a2', content: 'Bonjour Dr. Mbarga, j\'ai une question sur le projet final.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: true },
    { id: 'am5', conversationId: 'conv-a2', content: 'Bien sûr, posez votre question.', senderId: 'formateur-2', senderName: 'Dr. Jean Mbarga', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), read: true },
    { id: 'am6', conversationId: 'conv-a2', content: 'N\'oubliez pas le projet final à rendre vendredi', senderId: 'formateur-2', senderName: 'Dr. Jean Mbarga', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), read: true }
  ],
  'conv-a3': [
    { id: 'am7', conversationId: 'conv-a3', content: 'Salut tout le monde ! Quelqu\'un a compris l\'exercice 5 ?', senderId: 'student-1', senderName: 'Ibrahim Touré', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), read: true },
    { id: 'am8', conversationId: 'conv-a3', content: 'Oui ! Il faut utiliser une boucle récursive pour parcourir l\'arbre.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.2).toISOString(), read: true },
    { id: 'am9', conversationId: 'conv-a3', content: 'Ibrahim: Quelqu\'un a compris l\'exercice 5 ?', senderId: 'student-1', senderName: 'Ibrahim Touré', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: false }
  ],
  'conv-a4': [
    { id: 'am10', conversationId: 'conv-a4', content: 'Bonjour Mme. Sarr, j\'ai du mal avec le bilan comptable.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: true },
    { id: 'am11', conversationId: 'conv-a4', content: 'Bonne chance pour l\'examen de demain !', senderId: 'formateur-3', senderName: 'Mme. Coumba Sarr', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true }
  ],
  'conv-a5': [
    { id: 'am12', conversationId: 'conv-a5', content: 'Bonjour, j\'ai terminé ma formation Marketing Digital.', senderId: 'usr-004', senderName: 'Fatou Sow', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), read: true },
    { id: 'am13', conversationId: 'conv-a5', content: 'Votre certificat est disponible en téléchargement', senderId: 'usr-001', senderName: 'Support C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), read: true }
  ]
};

const initialPorteurMessages: Record<string, Message[]> = {
  'conv-po1': [
    { id: 'pom1', conversationId: 'conv-po1', content: 'Bonjour Dr. Kouassi, j\'ai finalisé le pitch deck pour les investisseurs.', senderId: 'usr-005', senderName: 'Ibrahima Fall', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true },
    { id: 'pom2', conversationId: 'conv-po1', content: 'Excellent ! Je vais le relire ce soir. Quelques ajustements à faire sur la partie financière.', senderId: 'mentor-1', senderName: 'Dr. Kouassi Mensah', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), read: true },
    { id: 'pom3', conversationId: 'conv-po1', content: 'Votre pitch deck est excellent, quelques ajustements à faire', senderId: 'mentor-1', senderName: 'Dr. Kouassi Mensah', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), read: false }
  ],
  'conv-po2': [
    { id: 'pom4', conversationId: 'conv-po2', content: 'Bonjour Mme. Diallo, la réunion avec les investisseurs est confirmée pour demain.', senderId: 'usr-005', senderName: 'Ibrahima Fall', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: true },
    { id: 'pom5', conversationId: 'conv-po2', content: 'Prêt pour la réunion avec les investisseurs demain ?', senderId: 'mentor-2', senderName: 'Mme. Aïssatou Diallo', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: false }
  ],
  'conv-po3': [
    { id: 'pom6', conversationId: 'conv-po3', content: 'Bonjour, nous avons examiné votre dossier AgriTech Solutions.', senderId: 'partenaire-1', senderName: 'CTIC Dakar', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), read: true },
    { id: 'pom7', conversationId: 'conv-po3', content: 'Nous sommes intéressés par votre projet AgriTech', senderId: 'partenaire-1', senderName: 'CTIC Dakar', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false }
  ],
  'conv-po4': [
    { id: 'pom8', conversationId: 'conv-po4', content: 'Félicitations ! Votre dossier d\'incubation a été validé !', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: true }
  ],
  'conv-po5': [
    { id: 'pom9', conversationId: 'conv-po5', content: 'Bonjour, j\'ai vu votre projet sur la plateforme. Très intéressant !', senderId: 'usr-006', senderName: 'Marie Faye', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), read: true },
    { id: 'pom10', conversationId: 'conv-po5', content: 'Je peux vous accompagner sur la partie technologique', senderId: 'usr-006', senderName: 'Marie Faye', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true }
  ]
};

const initialPartenaireMessages: Record<string, Message[]> = {
  'conv-pa1': [
    { id: 'pam1', conversationId: 'conv-pa1', content: 'Bonjour M. Fall, nous avons examiné votre projet AgriTech et nous sommes très intéressés.', senderId: 'usr-006', senderName: 'Marie Faye', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true },
    { id: 'pam2', conversationId: 'conv-pa1', content: 'Merci pour votre intérêt, quand pouvons-nous nous rencontrer ?', senderId: 'usr-005', senderName: 'Ibrahima Fall', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), read: false }
  ],
  'conv-pa2': [
    { id: 'pam3', conversationId: 'conv-pa2', content: 'Bonjour, nous cherchons un partenaire technique pour notre plateforme éducative.', senderId: 'porteur-2', senderName: 'Équipe EduConnect', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true },
    { id: 'pam4', conversationId: 'conv-pa2', content: 'Notre MVP est prêt pour la démonstration', senderId: 'porteur-2', senderName: 'Équipe EduConnect', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: false }
  ],
  'conv-pa3': [
    { id: 'pam5', conversationId: 'conv-pa3', content: 'Bonjour à tous, le prochain comité d\'évaluation est fixé au 15 mai.', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), read: true },
    { id: 'pam6', conversationId: 'conv-pa3', content: 'Prochaine réunion du comité d\'évaluation : 15 mai', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true }
  ],
  'conv-pa4': [
    { id: 'pam7', conversationId: 'conv-pa4', content: 'Bonjour, je cherche un partenaire financier pour notre app fintech.', senderId: 'porteur-3', senderName: 'Cheikh Diop', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), read: true },
    { id: 'pam8', conversationId: 'conv-pa4', content: 'Notre application a déjà 500 utilisateurs en beta', senderId: 'porteur-3', senderName: 'Cheikh Diop', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), read: true }
  ],
  'conv-pa5': [
    { id: 'pam9', conversationId: 'conv-pa5', content: 'Bonjour Mme. Faye, votre rapport d\'évaluation trimestriel est disponible.', senderId: 'usr-001', senderName: 'Admin C2P', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true }
  ]
};

// ─── Role-based data mapping ─────────────────────────────────────────────────
type RoleConvKey = 'formateur' | 'prestataire' | 'apprenant' | 'porteur' | 'partenaire';

const ROLE_CONVERSATIONS: Record<RoleConvKey, Conversation[]> = {
  formateur: mockFormateurConversations,
  prestataire: mockPrestataireConversations,
  apprenant: mockApprenantConversations,
  porteur: mockPorteurConversations,
  partenaire: mockPartenaireConversations,
};

const ROLE_MESSAGES: Record<RoleConvKey, Record<string, Message[]>> = {
  formateur: initialFormateurMessages,
  prestataire: initialPrestataireMessages,
  apprenant: initialApprenantMessages,
  porteur: initialPorteurMessages,
  partenaire: initialPartenaireMessages,
};

// Incoming message templates per role
const INCOMING_TEMPLATES: Record<RoleConvKey, { content: string; sender: string }[]> = {
  formateur: [
    { content: 'Merci pour votre aide, j\'ai compris !', sender: 'Ibrahim Touré' },
    { content: 'Pouvez-vous me corriger cet exercice ?', sender: 'Fatou Sow' },
    { content: 'J\'ai une question sur le dernier quiz', sender: 'Aminata Diop' },
    { content: 'Quand est la prochaine session de classe virtuelle ?', sender: 'David Kouassi' },
  ],
  prestataire: [
    { content: 'Bonjour, êtes-vous disponible ce week-end ?', sender: 'Jean-Pierre Mbarga' },
    { content: 'Pouvez-vous me faire un devis rapidement ?', sender: 'Paul Essomba' },
    { content: 'Merci pour votre intervention, excellent travail !', sender: 'Sophie Nkomo' },
    { content: 'J\'ai besoin d\'une intervention urgente', sender: 'Fatima Diallo' },
  ],
  apprenant: [
    { content: 'Votre devoir a été noté, consultez vos résultats', sender: 'Prof. Aminata Ndiaye' },
    { content: 'N\'oubliez pas le quiz de demain !', sender: 'Dr. Jean Mbarga' },
    { content: 'Quelqu\'un peut m\'expliquer l\'exercice 3 ?', sender: 'Ibrahim Touré' },
    { content: 'Bonne chance pour l\'examen !', sender: 'Mme. Coumba Sarr' },
  ],
  porteur: [
    { content: 'J\'ai relu votre business plan, très prometteur !', sender: 'Dr. Kouassi Mensah' },
    { content: 'Nous souhaitons investir dans votre projet', sender: 'CTIC Dakar' },
    { content: 'Votre jalon a été validé par le comité', sender: 'Admin C2P' },
    { content: 'Pouvons-nous organiser une réunion cette semaine ?', sender: 'Mme. Aïssatou Diallo' },
  ],
  partenaire: [
    { content: 'Notre MVP est prêt pour la démonstration !', sender: 'Ibrahima Fall' },
    { content: 'Nous cherchons un partenaire technique', sender: 'Équipe EduConnect' },
    { content: 'Votre rapport d\'évaluation est disponible', sender: 'Admin C2P' },
    { content: 'Intéressé par un partenariat stratégique', sender: 'Cheikh Diop' },
  ],
};

function getStorageKey(role: string) {
  return `${STORAGE_KEY}_${role}`;
}

function loadFromStorage(role: string): { conversations: Conversation[]; messages: Record<string, Message[]> } {
  const key = getStorageKey(role);
  const roleKey = role as RoleConvKey;
  const defaultConvs = ROLE_CONVERSATIONS[roleKey] ?? mockFormateurConversations;
  const defaultMsgs = ROLE_MESSAGES[roleKey] ?? initialFormateurMessages;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        conversations: parsed.conversations || defaultConvs,
        messages: parsed.messages || defaultMsgs
      };
    }
  } catch {
    // ignore
  }
  return { conversations: defaultConvs, messages: defaultMsgs };
}

function saveToStorage(role: string, conversations: Conversation[], messages: Record<string, Message[]>) {
  try {
    localStorage.setItem(getStorageKey(role), JSON.stringify({ conversations, messages }));
  } catch {
    // ignore
  }
}

export function useMessaging() {
  const { user } = useAuth();
  const role = (user?.role ?? 'formateur') as RoleConvKey;
  const stored = loadFromStorage(role);

  const [conversations, setConversations] = useState<Conversation[]>(stored.conversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>(stored.messages);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist changes per role
  useEffect(() => {
    saveToStorage(role, conversations, messages);
  }, [role, conversations, messages]);

  // Simulate incoming messages (real-time feel)
  useEffect(() => {
    const templates = INCOMING_TEMPLATES[role] ?? INCOMING_TEMPLATES.formateur;
    intervalRef.current = setInterval(() => {
      if (Math.random() > 0.7) return;

      const convIds = Object.keys(messages);
      if (convIds.length === 0) return;
      const randomConvId = convIds[Math.floor(Math.random() * convIds.length)];
      const template = templates[Math.floor(Math.random() * templates.length)];

      const newMessage: Message = {
        id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        conversationId: randomConvId,
        content: template.content,
        senderId: 'external',
        senderName: template.sender,
        timestamp: new Date().toISOString(),
        read: false
      };

      setMessages(prev => ({
        ...prev,
        [randomConvId]: [...(prev[randomConvId] || []), newMessage]
      }));

      setConversations(prev => prev.map(c => {
        if (c.id === randomConvId) {
          return {
            ...c,
            lastMessage: template.content,
            lastMessageAt: new Date().toISOString(),
            unreadCount: c.id === activeConversationId ? 0 : c.unreadCount + 1
          };
        }
        return c;
      }));
    }, 45000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [role, messages, activeConversationId]);

  const getConversationMessages = useCallback((conversationId: string): Message[] => {
    return messages[conversationId] || [];
  }, [messages]);

  const sendMessage = useCallback((conversationId: string, content: string, attachments?: Attachment[]) => {
    if (!user || !content.trim()) return;

    const newMessage: Message = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      content: content.trim(),
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      senderAvatar: user.avatar,
      timestamp: new Date().toISOString(),
      read: true,
      attachments
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: content.trim(),
          lastMessageAt: new Date().toISOString()
        };
      }
      return c;
    }));
  }, [user]);

  const markAsRead = useCallback((conversationId: string) => {
    setMessages(prev => {
      const convMessages = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: convMessages.map(m => ({ ...m, read: true }))
      };
    });

    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ));

    try {
      const lastRead = JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}');
      lastRead[conversationId] = new Date().toISOString();
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastRead));
    } catch {
      // ignore
    }
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    getConversationMessages,
    sendMessage,
    markAsRead,
    totalUnread
  };
}
