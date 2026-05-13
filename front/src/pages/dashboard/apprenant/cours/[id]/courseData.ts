import { Course } from './types';

export const courseData: Record<string, Course> = {
  '1': {
    id: 1,
    title: 'Marketing Digital Avancé',
    instructor: 'Sophie Nkomo',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Marketing',
    level: 'Avancé',
    duration: '24h',
    thumbnail: '/images/home/academy.jpg',
    description: 'Maîtrisez les stratégies avancées de marketing digital : SEO, SEA, réseaux sociaux, email marketing et analytics. Cette formation vous prépare à piloter des campagnes performantes sur le marché africain.',
    progress: 78,
    totalLessons: 24,
    completedLessons: 19,
    modules: [
      {
        id: 1,
        title: 'Fondamentaux du Marketing Digital',
        lessons: [
          { id: 101, title: 'Introduction au marketing digital', duration: '45 min', type: 'video', completed: true, description: 'Vue d\'ensemble du marketing digital et de son évolution.', chapters: [{ time: 0, label: 'Début' }, { time: 180, label: 'Historique' }, { time: 420, label: 'Outils clés' }, { time: 720, label: 'Tendances 2026' }, { time: 2100, label: 'Conclusion' }], thumbnail: '/images/home/academy.jpg' },
          { id: 102, title: 'Écosystème digital africain', duration: '30 min', type: 'video', completed: true, description: 'Comprendre les spécificités du marché digital africain.' },
          { id: 103, title: 'Funnel de conversion', duration: '40 min', type: 'reading', completed: true, description: 'Construire un funnel de conversion efficace.' },
          { id: 104, title: 'Quiz : Fondamentaux', duration: '15 min', type: 'quiz', completed: true, description: 'Testez vos connaissances sur les bases.' },
        ]
      },
      {
        id: 2,
        title: 'SEO et Content Marketing',
        lessons: [
          { id: 201, title: 'SEO on-page avancé', duration: '1h', type: 'video', completed: true, description: 'Techniques avancées d\'optimisation on-page.', chapters: [{ time: 0, label: 'Intro' }, { time: 300, label: 'Méta-tags' }, { time: 900, label: 'Structure URL' }, { time: 1800, label: 'Balisage sémantique' }, { time: 2700, label: 'Récap' }], thumbnail: '/images/home/academy.jpg' },
          { id: 202, title: 'Stratégie de contenu', duration: '50 min', type: 'video', completed: true, description: 'Créer un calendrier éditorial performant.', thumbnail: '/images/home/academy.jpg' },
          { id: 203, title: 'Link building', duration: '45 min', type: 'video', completed: true, description: 'Construire un profil de backlinks de qualité.', thumbnail: '/images/home/academy.jpg' },
          { id: 204, title: 'SEO local et mobile', duration: '35 min', type: 'video', completed: false, description: 'Optimiser pour la recherche locale et mobile.' },
          { id: 205, title: 'Exercice pratique SEO', duration: '1h', type: 'exercise', completed: false, description: 'Audit SEO complet d\'un site web.' },
        ]
      },
      {
        id: 3,
        title: 'Social Media Marketing',
        lessons: [
          { id: 301, title: 'Stratégie multi-plateformes', duration: '1h', type: 'video', completed: true, description: 'Aligner votre présence sur Facebook, Instagram, LinkedIn et TikTok.', thumbnail: '/images/home/academy.jpg' },
          { id: 302, title: 'Création de contenu viral', duration: '45 min', type: 'video', completed: true, description: 'Techniques de création de contenu engageant.' },
          { id: 303, title: 'Publicités sociales', duration: '1h 15min', type: 'video', completed: true, description: 'Créer et optimiser des campagnes publicitaires sociales.' },
          { id: 304, title: 'Influence marketing', duration: '40 min', type: 'reading', completed: false, description: 'Collaborer efficacement avec des influenceurs.' },
          { id: 305, title: 'Quiz : Social Media', duration: '15 min', type: 'quiz', completed: false, description: 'Testez vos connaissances sur le social media.' },
        ]
      },
      {
        id: 4,
        title: 'Analytics et ROI',
        lessons: [
          { id: 401, title: 'Google Analytics 4', duration: '1h 30min', type: 'video', completed: false, description: 'Maîtriser GA4 pour suivre vos performances.' },
          { id: 402, title: 'Tableaux de bord personnalisés', duration: '1h', type: 'exercise', completed: false, description: 'Créer des dashboards avec Looker Studio.' },
          { id: 403, title: 'A/B Testing', duration: '45 min', type: 'video', completed: false, description: 'Méthodologie et outils de test A/B.' },
          { id: 404, title: 'Projet final', duration: '2h', type: 'exercise', completed: false, description: 'Concevoir une campagne complète de A à Z.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Quel est le principal facteur de classement Google en 2026 ?', options: ['La densité de mots-clés', 'La qualité du contenu et l\'expérience utilisateur', 'Le nombre de backlinks', 'La vitesse du serveur seule'], correctIndex: 1, explanation: 'Google privilégie depuis plusieurs années la qualité du contenu et l\'expérience utilisateur (Core Web Vitals, E-E-A-T) plutôt que des métriques techniques isolées.' },
      { id: 2, question: 'Quel taux d\'engagement est considéré comme excellent sur Instagram ?', options: ['0.5%', '1-3%', '5-10%', '15%+'], correctIndex: 1 },
      { id: 3, question: 'Le CAC (Customer Acquisition Cost) doit idéalement être :', options: ['Égal au LTV', 'Inférieur au LTV', 'Supérieur au LTV', 'Non lié au LTV'], correctIndex: 1 },
      { id: 4, question: 'Quel format de contenu génère le plus d\'engagement sur TikTok en Afrique ?', options: ['Carrousels éducatifs', 'Vidéos courtes et authentiques', 'Publicités traditionnelles', 'Articles longs'], correctIndex: 1 },
      { id: 5, question: 'Dans GA4, quel événement mesure la qualité de l\'engagement ?', options: ['page_view', 'session_start', 'engagement_time', 'first_visit'], correctIndex: 2 },
    ],
    resources: [
      { id: 1, title: 'Guide SEO 2026', type: 'PDF', size: '2.4 MB', icon: 'ri-file-pdf-line' },
      { id: 2, title: 'Template calendrier éditorial', type: 'XLSX', size: '450 KB', icon: 'ri-file-excel-line' },
      { id: 3, title: 'Checklist campagne social media', type: 'PDF', size: '1.1 MB', icon: 'ri-file-pdf-line' },
      { id: 4, title: 'Script GA4 personnalisé', type: 'JS', size: '12 KB', icon: 'ri-code-s-slash-line' },
      { id: 5, title: 'Exemples de campagnes réussies', type: 'PDF', size: '3.2 MB', icon: 'ri-file-pdf-line' },
    ],
    comments: [
      { id: 1, user: 'Ibrahim Touré', avatar: '/images/brand/image3.jpeg', content: 'Le module sur le SEO local est incroyablement pertinent pour le marché africain. Merci Mme Nkomo !', date: 'Il y a 2 jours', likes: 8 },
      { id: 2, user: 'Fatou Sow', avatar: '/images/brand/image3.jpeg', content: 'Les templates fournis m\'ont fait gagner un temps fou. La formation vaut vraiment le coup.', date: 'Il y a 5 jours', likes: 12 },
      { id: 3, user: 'Aminata Diop', avatar: '/images/brand/image3.jpeg', content: 'J\'applique déjà les techniques enseignées sur mon business. Résultats visibles en 3 semaines.', date: 'Il y a 1 semaine', likes: 5 },
    ]
  },
  '2': {
    id: 2,
    title: 'Développement Web React',
    instructor: 'Jean Mbarga',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Tech',
    level: 'Intermédiaire',
    duration: '30h',
    thumbnail: '/images/home/academy.jpg',
    description: 'Devenez développeur React complet. Apprenez les hooks, le state management, les tests et le déploiement. Projet final : une application web complète.',
    progress: 45,
    totalLessons: 30,
    completedLessons: 14,
    modules: [
      {
        id: 1,
        title: 'Fondamentaux React',
        lessons: [
          { id: 101, title: 'Introduction à React', duration: '45 min', type: 'video', completed: true, description: 'Pourquoi React domine le développement frontend.', thumbnail: '/images/home/academy.jpg' },
          { id: 102, title: 'JSX et Components', duration: '1h', type: 'video', completed: true, description: 'Créer des composants réutilisables avec JSX.', thumbnail: '/images/home/academy.jpg' },
          { id: 103, title: 'Props et State', duration: '50 min', type: 'video', completed: true, description: 'Gérer les données dans vos composants.', thumbnail: '/images/home/academy.jpg' },
          { id: 104, title: 'Exercice : Todo List', duration: '1h 30min', type: 'exercise', completed: true, description: 'Créer une todo list fonctionnelle.' },
        ]
      },
      {
        id: 2,
        title: 'Hooks avancés',
        lessons: [
          { id: 201, title: 'useEffect et useMemo', duration: '1h 15min', type: 'video', completed: true, description: 'Maîtriser les effets de bord et la mémoisation.', thumbnail: '/images/home/academy.jpg' },
          { id: 202, title: 'Custom Hooks', duration: '1h', type: 'video', completed: false, description: 'Créer vos propres hooks réutilisables.' },
          { id: 203, title: 'useReducer et useContext', duration: '1h 10min', type: 'video', completed: false, description: 'Gestion d\'état avancée sans librairie externe.' },
          { id: 204, title: 'Quiz : Hooks', duration: '20 min', type: 'quiz', completed: false, description: 'Testez vos connaissances sur les hooks.' },
        ]
      },
      {
        id: 3,
        title: 'Routing et API',
        lessons: [
          { id: 301, title: 'React Router v7', duration: '1h', type: 'video', completed: false, description: 'Navigation SPA avec React Router.', thumbnail: '/images/home/academy.jpg' },
          { id: 302, title: 'Fetch et Axios', duration: '45 min', type: 'video', completed: false, description: 'Consommer des APIs REST.' },
          { id: 303, title: 'Authentification JWT', duration: '1h 30min', type: 'video', completed: false, description: 'Sécuriser votre application.' },
          { id: 304, title: 'Projet API', duration: '2h', type: 'exercise', completed: false, description: 'Connecter votre app à une API réelle.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Quelle est la différence entre props et state ?', options: ['Props sont mutables, state immuable', 'Props viennent du parent, state est local', 'State est global, props est local', 'Il n\'y a pas de différence'], correctIndex: 1 },
      { id: 2, question: 'useEffect s\'exécute après chaque rendu si le tableau de dépendances est :', options: ['Vide []', 'Non fourni', '[count]', 'Toutes les réponses'], correctIndex: 1 },
      { id: 3, question: 'Quel hook permet de mémoriser une fonction ?', options: ['useMemo', 'useCallback', 'useRef', 'useState'], correctIndex: 1 },
      { id: 4, question: 'React Router utilise quel composant pour la navigation ?', options: ['<Navigate>', '<Link>', '<Route>', '<Router>'], correctIndex: 1 },
      { id: 5, question: 'Dans quel ordre les hooks doivent être appelés ?', options: ['Dans des conditions', 'Toujours au top level', 'Dans des boucles', 'Dans des fonctions internes'], correctIndex: 1 },
    ],
    resources: [
      { id: 1, title: 'Cheat Sheet React Hooks', type: 'PDF', size: '850 KB', icon: 'ri-file-pdf-line' },
      { id: 2, title: 'Starter projet React', type: 'ZIP', size: '2.1 MB', icon: 'ri-folder-zip-line' },
      { id: 3, title: 'Guide testing React', type: 'PDF', size: '1.5 MB', icon: 'ri-file-pdf-line' },
    ],
    comments: [
      { id: 1, user: 'Mamadou Seck', avatar: '/images/brand/image3.jpeg', content: 'Les explications sur les custom hooks sont les meilleures que j\'ai trouvées. Clair et concis.', date: 'Il y a 3 jours', likes: 7 },
      { id: 2, user: 'Khadija Mbaye', avatar: '/images/brand/image3.jpeg', content: 'J\'ai réussi mon premier entretien technique grâce à cette formation. Merci !', date: 'Il y a 1 semaine', likes: 15 },
    ]
  },
  '3': {
    id: 3,
    title: 'Comptabilité pour PME',
    instructor: 'Fatima Diallo',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Finance',
    level: 'Débutant',
    duration: '18h',
    thumbnail: '/images/home/academy.jpg',
    description: 'Apprenez à gérer la comptabilité de votre PME de A à Z. Facturation, TVA, bilan, trésorerie et conformité fiscale au Sénégal.',
    progress: 92,
    totalLessons: 18,
    completedLessons: 17,
    modules: [
      {
        id: 1,
        title: 'Bases de la comptabilité',
        lessons: [
          { id: 101, title: 'Principes fondamentaux', duration: '45 min', type: 'video', completed: true, description: 'Le système de la partie double.' },
          { id: 102, title: 'Plan comptable sénégalais', duration: '1h', type: 'reading', completed: true, description: 'Structure du SYSCOHADA révisé.' },
          { id: 103, title: 'Enregistrement des opérations', duration: '50 min', type: 'video', completed: true, description: 'Journal, grand livre, balance.' },
        ]
      },
      {
        id: 2,
        title: 'Gestion financière',
        lessons: [
          { id: 201, title: 'Tableau de trésorerie', duration: '1h', type: 'video', completed: true, description: 'Anticiper les besoins de trésorerie.' },
          { id: 202, title: 'Bilan et résultat', duration: '1h 15min', type: 'video', completed: true, description: 'Construire et analyser les états financiers.' },
          { id: 203, title: 'Quiz : État financier', duration: '15 min', type: 'quiz', completed: true, description: 'Testez vos connaissances.' },
        ]
      },
      {
        id: 3,
        title: 'Fiscalité',
        lessons: [
          { id: 301, title: 'TVA sénégalaise', duration: '1h', type: 'video', completed: true, description: 'Taux, déductions, déclarations.' },
          { id: 302, title: 'IS et IR', duration: '1h', type: 'video', completed: true, description: 'Impôts sur les sociétés et revenus.' },
          { id: 303, title: 'Exercice fiscal complet', duration: '1h 30min', type: 'exercise', completed: false, description: 'Cas pratique de fiscalité annuelle.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Dans le SYSCOHADA, la TVA au Sénégal est de :', options: ['16%', '18%', '20%', '15%'], correctIndex: 1 },
      { id: 2, question: 'Le bilan se compose de :', options: ['Actif + Passif', 'Actif = Passif', 'Actif - Passif', 'Actif x Passif'], correctIndex: 1 },
      { id: 3, question: 'L\'IS (Impôt sur les Sociétés) au Sénégal est de :', options: ['25%', '30%', '35%', '20%'], correctIndex: 1 },
    ],
    resources: [
      { id: 1, title: 'Plan comptable SYSCOHADA', type: 'PDF', size: '3.1 MB', icon: 'ri-file-pdf-line' },
      { id: 2, title: 'Modèle tableau trésorerie', type: 'XLSX', size: '320 KB', icon: 'ri-file-excel-line' },
      { id: 3, title: 'Guide fiscalité Sénégal 2026', type: 'PDF', size: '1.8 MB', icon: 'ri-file-pdf-line' },
    ],
    comments: [
      { id: 1, user: 'Ousmane Ba', avatar: '/images/brand/image3.jpeg', content: 'Enfin une formation comptabilité adaptée au contexte sénégalais. Excellente pédagogie.', date: 'Il y a 4 jours', likes: 9 },
    ]
  },
  '4': {
    id: 4,
    title: 'Design UI/UX Fondamentaux',
    instructor: 'David Kouassi',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Design',
    level: 'Débutant',
    duration: '20h',
    thumbnail: '/images/home/academy.jpg',
    description: 'Apprenez les principes du design d\'interface et de l\'expérience utilisateur. Wireframes, prototypes, design systems et tests utilisateurs.',
    progress: 100,
    totalLessons: 20,
    completedLessons: 20,
    modules: [
      {
        id: 1,
        title: 'Principes de design',
        lessons: [
          { id: 101, title: 'Hiérarchie visuelle', duration: '45 min', type: 'video', completed: true, description: 'Organiser l\'information visuellement.' },
          { id: 102, title: 'Couleurs et typographie', duration: '1h', type: 'video', completed: true, description: 'Créer des palettes et choisir des polices.' },
          { id: 103, title: 'Grid et espacement', duration: '40 min', type: 'video', completed: true, description: 'Utiliser les grids pour structurer vos designs.' },
        ]
      },
      {
        id: 2,
        title: 'UX Research',
        lessons: [
          { id: 201, title: 'Personas et user journeys', duration: '1h', type: 'video', completed: true, description: 'Comprendre vos utilisateurs.' },
          { id: 202, title: 'Wireframing', duration: '1h 30min', type: 'exercise', completed: true, description: 'Créer des wireframes basse fidélité.' },
          { id: 203, title: 'Prototypage', duration: '1h', type: 'exercise', completed: true, description: 'Prototypes interactifs avec Figma.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Quel principe de Gestalt décrit la tendance à percevoir des éléments proches comme un groupe ?', options: ['Similarité', 'Proximité', 'Continuité', 'Fermeture'], correctIndex: 1 },
      { id: 2, question: 'Le ratio de contraste minimum recommandé pour l\'accessibilité WCAG AA est de :', options: ['3:1', '4.5:1', '7:1', '2:1'], correctIndex: 1 },
    ],
    resources: [
      { id: 1, title: 'Kit UI complet Figma', type: 'FIG', size: '5.2 MB', icon: 'ri-palette-line' },
      { id: 2, title: 'Guide accessibilité WCAG', type: 'PDF', size: '1.4 MB', icon: 'ri-file-pdf-line' },
    ],
    comments: [
      { id: 1, user: 'Sophie Kamga', avatar: '/images/brand/image3.jpeg', content: 'J\'ai utilisé les principes enseignés pour refaire le site de mon agence. Les clients adorent !', date: 'Il y a 2 semaines', likes: 11 },
    ]
  },
  '5': {
    id: 5,
    title: 'Gestion de Projet Agile',
    instructor: 'Aminata Sow',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Management',
    level: 'Intermédiaire',
    duration: '15h',
    thumbnail: '/images/home/academy.jpg',
    description: 'Maîtrisez Scrum, Kanban et les méthodes agiles. Gérez vos équipes et livrez des projets dans les délais et le budget.',
    progress: 0,
    totalLessons: 15,
    completedLessons: 0,
    modules: [
      {
        id: 1,
        title: 'Fondamentaux agiles',
        lessons: [
          { id: 101, title: 'Manifeste agile', duration: '30 min', type: 'video', completed: false, description: 'Les 4 valeurs et 12 principes.' },
          { id: 102, title: 'Scrum vs Kanban', duration: '45 min', type: 'video', completed: false, description: 'Choisir la bonne méthode.' },
          { id: 103, title: 'Rôles Scrum', duration: '40 min', type: 'reading', completed: false, description: 'Product Owner, Scrum Master, Équipe.' },
        ]
      },
      {
        id: 2,
        title: 'Mise en pratique',
        lessons: [
          { id: 201, title: 'Sprint planning', duration: '1h', type: 'video', completed: false, description: 'Planifier un sprint efficace.' },
          { id: 202, title: 'User stories', duration: '50 min', type: 'video', completed: false, description: 'Rédiger des user stories de qualité.' },
          { id: 203, title: 'Exercice : Simulation sprint', duration: '2h', type: 'exercise', completed: false, description: 'Simulation complète d\'un sprint.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Quelle est la durée idéale d\'un sprint Scrum ?', options: ['1 semaine', '2-4 semaines', '1 mois', '3 mois'], correctIndex: 1 },
      { id: 2, question: 'Le Product Owner est responsable de :', options: ['La qualité technique', 'Le backlog produit', 'La facilitation', 'Les tests'], correctIndex: 1 },
    ],
    resources: [
      { id: 1, title: 'Template backlog produit', type: 'XLSX', size: '280 KB', icon: 'ri-file-excel-line' },
      { id: 2, title: 'Guide facilitation rétrospective', type: 'PDF', size: '900 KB', icon: 'ri-file-pdf-line' },
    ],
    comments: [
      { id: 1, user: 'Jean Mbarga', avatar: '/images/brand/image3.jpeg', content: 'Hâte de commencer cette formation. Mon équipe en a vraiment besoin.', date: 'Il y a 1 jour', likes: 3 },
    ]
  },
  '6': {
    id: 6,
    title: 'Analyse de Données avec Python',
    instructor: 'Ibrahim Touré',
    instructorAvatar: '/images/brand/image3.jpeg',
    category: 'Data',
    level: 'Avancé',
    duration: '28h',
    thumbnail: '/images/home/academy.jpg',
    description: 'De la collecte de données à la visualisation. Maîtrisez Pandas, NumPy, Matplotlib et les bases du Machine Learning.',
    progress: 12,
    totalLessons: 28,
    completedLessons: 3,
    modules: [
      {
        id: 1,
        title: 'Python pour la data',
        lessons: [
          { id: 101, title: 'Révision Python', duration: '1h', type: 'video', completed: true, description: 'Bases nécessaires pour la data science.' },
          { id: 102, title: 'NumPy arrays', duration: '1h 15min', type: 'video', completed: true, description: 'Manipulation de tableaux numériques.' },
          { id: 103, title: 'Pandas DataFrames', duration: '1h 30min', type: 'video', completed: true, description: 'Analyse de données tabulaires.' },
        ]
      },
      {
        id: 2,
        title: 'Visualisation',
        lessons: [
          { id: 201, title: 'Matplotlib et Seaborn', duration: '1h', type: 'video', completed: false, description: 'Créer des graphiques professionnels.' },
          { id: 202, title: 'Dashboards interactifs', duration: '1h 30min', type: 'exercise', completed: false, description: 'Créer un dashboard avec Plotly.' },
          { id: 203, title: 'Quiz : Visualisation', duration: '15 min', type: 'quiz', completed: false, description: 'Testez vos connaissances.' },
        ]
      }
    ],
    quiz: [
      { id: 1, question: 'Quelle méthode Pandas permet de gérer les valeurs manquantes ?', options: ['drop()', 'fillna()', 'merge()', 'groupby()'], correctIndex: 1 },
      { id: 2, question: 'NumPy est optimisé grâce à :', options: ['Le threading', 'Le vectorization C', 'Le garbage collection', 'La compilation JIT'], correctIndex: 1 },
    ],
    resources: [
      { id: 1, title: 'Jupyter Notebook démarrage', type: 'IPYNB', size: '150 KB', icon: 'ri-booklet-line' },
      { id: 2, title: 'Dataset pratique Sénégal', type: 'CSV', size: '2.8 MB', icon: 'ri-table-line' },
    ],
    comments: [
      { id: 1, user: 'Fatou Sow', avatar: '/images/brand/image3.jpeg', content: 'Les datasets sur le Sénégal sont super pour s\'entraîner sur des données réelles.', date: 'Il y a 6 jours', likes: 6 },
    ]
  }
};