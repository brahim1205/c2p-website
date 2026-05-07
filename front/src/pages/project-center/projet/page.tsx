import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('apercu');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      user: 'Dr. Cheikh Fall',
      role: 'Mentor',
      avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20male%20mentor%20business%20advisor%20portrait%20confident%20smile%20modern%20office%20west%20africa&width=100&height=100&seq=pcd7&orientation=squarish',
      content: 'Excellent travail sur le partenariat avec la Fédération des Maraîchers ! Je recommande de préparer une stratégie de communication pour maximiser l\'impact de cette annonce.',
      date: '2024-05-16 14:30',
      replies: []
    },
    {
      id: 2,
      user: 'Marie Dupont',
      role: 'Mentor E-commerce',
      avatar: 'https://readdy.ai/api/search-image?query=professional%20european%20woman%20business%20mentor%20consultant%20portrait%20confident%20modern%20office&width=100&height=100&seq=pcd8&orientation=squarish',
      content: 'Vos chiffres de croissance sont impressionnants. Avez-vous envisagé d\'étendre votre modèle à d\'autres villes comme Thiès ou Saint-Louis ?',
      date: '2024-05-15 10:15',
      replies: [
        {
          id: 3,
          user: 'Aminata Diallo',
          role: 'CEO',
          avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20woman%20entrepreneur%20smiling%20confident%20business%20portrait%20modern%20office%20setting%20west%20africa%20successful%20female%20founder&width=100&height=100&seq=pcd1&orientation=squarish',
          content: 'Merci Marie ! Oui, l\'expansion vers Thiès est prévue pour Q4 2024. Nous préparons actuellement l\'étude de marché.',
          date: '2024-05-15 16:45'
        }
      ]
    },
    {
      id: 4,
      user: 'Investisseur Anonyme',
      role: 'Partenaire Financier',
      avatar: 'https://readdy.ai/api/search-image?query=professional%20business%20investor%20portrait%20confident%20modern%20office%20simple%20background&width=100&height=100&seq=pcd9&orientation=squarish',
      content: 'Projet très prometteur. J\'aimerais discuter des opportunités d\'investissement. Pouvez-vous partager vos projections financières détaillées ?',
      date: '2024-05-14 09:20',
      replies: []
    }
  ]);

  // Mock project data
  const project = {
    id: 1,
    title: 'AgriConnect - Plateforme de vente directe producteurs',
    category: 'Agriculture',
    stage: 'incubation',
    funding: 15000000,
    fundingGoal: 25000000,
    description: 'AgriConnect est une plateforme numérique innovante qui connecte directement les agriculteurs aux consommateurs urbains, éliminant les intermédiaires et garantissant des prix équitables pour tous. Notre solution permet aux producteurs de vendre leurs produits frais directement aux consommateurs via une application mobile intuitive.',
    entrepreneur: {
      name: 'Aminata Diallo',
      photo: 'https://readdy.ai/api/search-image?query=professional%20african%20woman%20entrepreneur%20smiling%20confident%20business%20portrait%20modern%20office%20setting%20west%20africa%20successful%20female%20founder&width=400&height=400&seq=pcd1&orientation=squarish',
      bio: 'Ingénieure agronome avec 8 ans d\'expérience dans le développement rural. Passionnée par l\'innovation agricole et l\'autonomisation des petits producteurs.',
      location: 'Dakar, Sénégal',
      email: 'aminata.diallo@agriconnect.sn'
    },
    location: 'Dakar, Sénégal',
    image: 'https://readdy.ai/api/search-image?query=african%20woman%20farmer%20using%20smartphone%20in%20agricultural%20field%20with%20fresh%20vegetables%20and%20modern%20technology%20digital%20platform%20connecting%20farmers%20to%20consumers%20in%20west%20africa&width=1200&height=600&seq=pcd2&orientation=landscape',
    team: 4,
    mentors: 2,
    progress: 65,
    tags: ['AgriTech', 'E-commerce', 'Impact social', 'Mobile Money'],
    startDate: '2023-06-15',
    businessModel: 'Commission de 8% sur chaque transaction + abonnement premium pour les producteurs (5000 FCFA/mois) offrant des fonctionnalités avancées de gestion et de marketing.',
    targetMarket: 'Consommateurs urbains de Dakar et sa banlieue (population cible : 500,000 ménages), avec expansion prévue vers Thiès et Saint-Louis.',
    competition: 'Marchés traditionnels, supermarchés, quelques initiatives locales de vente directe non digitalisées.',
    milestones: [
      { date: '2023-06', title: 'Lancement du projet', status: 'completed' },
      { date: '2023-09', title: 'Développement MVP', status: 'completed' },
      { date: '2023-12', title: 'Test pilote - 50 agriculteurs', status: 'completed' },
      { date: '2024-03', title: 'Lancement commercial', status: 'completed' },
      { date: '2024-06', title: 'Expansion 200 agriculteurs', status: 'in-progress' },
      { date: '2024-09', title: 'Levée de fonds Série A', status: 'upcoming' },
      { date: '2024-12', title: 'Expansion régionale', status: 'upcoming' }
    ],
    teamMembers: [
      { name: 'Aminata Diallo', role: 'CEO & Fondatrice', photo: 'https://readdy.ai/api/search-image?query=professional%20african%20woman%20entrepreneur%20smiling%20confident%20business%20portrait%20modern%20office%20setting%20west%20africa%20successful%20female%20founder&width=200&height=200&seq=pcd3&orientation=squarish' },
      { name: 'Mamadou Seck', role: 'CTO', photo: 'https://readdy.ai/api/search-image?query=african%20male%20software%20developer%20programmer%20working%20on%20laptop%20professional%20tech%20portrait%20modern%20office%20west%20africa&width=200&height=200&seq=pcd4&orientation=squarish' },
      { name: 'Fatou Ndiaye', role: 'Responsable Marketing', photo: 'https://readdy.ai/api/search-image?query=african%20woman%20marketing%20professional%20business%20portrait%20confident%20smile%20modern%20office%20setting%20west%20africa&width=200&height=200&seq=pcd5&orientation=squarish' },
      { name: 'Ousmane Ba', role: 'Responsable Opérations', photo: 'https://readdy.ai/api/search-image?query=african%20man%20operations%20manager%20professional%20business%20portrait%20modern%20office%20confident%20west%20africa&width=200&height=200&seq=pcd6&orientation=squarish' }
    ],
    mentorsList: [
      { name: 'Dr. Cheikh Fall', expertise: 'AgriTech & Innovation', company: 'ISRA Sénégal' },
      { name: 'Marie Dupont', expertise: 'E-commerce & Scaling', company: 'Jumia West Africa' }
    ],
    financialNeeds: [
      { category: 'Technologie & Développement', amount: 8000000, percentage: 32 },
      { category: 'Marketing & Acquisition', amount: 6000000, percentage: 24 },
      { category: 'Opérations & Logistique', amount: 5000000, percentage: 20 },
      { category: 'Équipe & Recrutement', amount: 4000000, percentage: 16 },
      { category: 'Fonds de roulement', amount: 2000000, percentage: 8 }
    ],
    documents: [
      { name: 'Business Plan 2024', type: 'PDF', size: '2.4 MB', icon: 'ri-file-text-line', uploadedBy: 'Aminata Diallo', date: '2024-05-15', access: 'Tous les partenaires' },
      { name: 'Pitch Deck', type: 'PDF', size: '5.1 MB', icon: 'ri-slideshow-line', uploadedBy: 'Fatou Ndiaye', date: '2024-05-10', access: 'Investisseurs uniquement' },
      { name: 'Étude de marché', type: 'PDF', size: '3.8 MB', icon: 'ri-bar-chart-line', uploadedBy: 'Mamadou Seck', date: '2024-05-08', access: 'Tous les partenaires' },
      { name: 'Projections financières', type: 'XLSX', size: '1.2 MB', icon: 'ri-file-excel-line', uploadedBy: 'Aminata Diallo', date: '2024-05-05', access: 'Investisseurs uniquement' }
    ],
    updates: [
      { date: '2024-05-15', title: 'Nouveau partenariat avec la Fédération des Maraîchers', content: 'Nous sommes ravis d\'annoncer notre partenariat avec la Fédération Nationale des Maraîchers du Sénégal, qui nous permettra d\'intégrer 150 nouveaux producteurs.' },
      { date: '2024-04-28', title: 'Atteinte de 10,000 commandes', content: 'Milestone important : nous avons traité notre 10,000ème commande ! Merci à nos agriculteurs et clients pour leur confiance.' },
      { date: '2024-04-10', title: 'Lancement du service de livraison express', content: 'Nouveau service : livraison en moins de 4h pour les zones urbaines de Dakar. Taux de satisfaction : 94%.' }
    ]
  };

  const stageLabels: Record<string, { label: string; color: string }> = {
    'pre-incubation': { label: 'Pré-incubation', color: 'bg-yellow-100 text-yellow-800' },
    'incubation': { label: 'Incubation', color: 'bg-blue-100 text-blue-800' },
    'acceleration': { label: 'Accélération', color: 'bg-green-100 text-green-800' }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        user: 'Utilisateur Actuel',
        role: 'Partenaire',
        avatar: 'https://readdy.ai/api/search-image?query=professional%20business%20person%20portrait%20confident%20modern%20office%20simple%20background&width=100&height=100&seq=pcd10&orientation=squarish',
        content: newComment,
        date: new Date().toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        replies: []
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative pt-24 pb-12">
        <div className="absolute inset-0 h-96">
          <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-gray-50"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="pt-32 pb-8">
            <div className="flex items-center space-x-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageLabels[project.stage].color}`}>
                {stageLabels[project.stage].label}
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                {project.category}
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">{project.title}</h1>
            <p className="text-xl text-white/90 max-w-3xl">{project.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('apercu')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'apercu'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Aperçu
                </button>
                <button
                  onClick={() => setActiveTab('equipe')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'equipe'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Équipe
                </button>
                <button
                  onClick={() => setActiveTab('financement')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'financement'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Financement
                </button>
                <button
                  onClick={() => setActiveTab('collaboration')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'collaboration'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Collaboration
                </button>
                <button
                  onClick={() => setActiveTab('actualites')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'actualites'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Actualités
                </button>
              </div>

              <div className="p-8">
                {/* Aperçu Tab */}
                {activeTab === 'apercu' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">À propos du projet</h3>
                      <p className="text-gray-700 leading-relaxed mb-6">{project.description}</p>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <i className="ri-lightbulb-line text-teal-500 mr-2"></i>
                            Modèle économique
                          </h4>
                          <p className="text-gray-700 text-sm">{project.businessModel}</p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <i className="ri-focus-3-line text-teal-500 mr-2"></i>
                            Marché cible
                          </h4>
                          <p className="text-gray-700 text-sm">{project.targetMarket}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Jalons du projet</h3>
                      <div className="space-y-4">
                        {project.milestones.map((milestone, index) => (
                          <div key={index} className="flex items-start space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              milestone.status === 'completed' ? 'bg-green-100' :
                              milestone.status === 'in-progress' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <i className={`${
                                milestone.status === 'completed' ? 'ri-check-line text-green-600' :
                                milestone.status === 'in-progress' ? 'ri-time-line text-blue-600' :
                                'ri-calendar-line text-gray-400'
                              } text-xl`}></i>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                                <span className="text-sm text-gray-500">{milestone.date}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                                milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {milestone.status === 'completed' ? 'Complété' :
                                 milestone.status === 'in-progress' ? 'En cours' : 'À venir'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Documents</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {project.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                <i className={`${doc.icon} text-teal-600 text-xl`}></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 text-sm">{doc.name}</h4>
                                <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                              </div>
                            </div>
                            <i className="ri-download-line text-gray-400 text-xl"></i>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Équipe Tab */}
                {activeTab === 'equipe' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">Membres de l'équipe</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        {project.teamMembers.map((member, index) => (
                          <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                            <img src={member.photo} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                            <div>
                              <h4 className="font-semibold text-gray-900">{member.name}</h4>
                              <p className="text-sm text-teal-600 mb-2">{member.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">Mentors</h3>
                      <div className="space-y-4">
                        {project.mentorsList.map((mentor, index) => (
                          <div key={index} className="flex items-start justify-between p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">{mentor.name}</h4>
                              <p className="text-teal-600 text-sm mb-1">{mentor.expertise}</p>
                              <p className="text-gray-600 text-sm">{mentor.company}</p>
                            </div>
                            <i className="ri-user-star-line text-teal-500 text-2xl"></i>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Financement Tab */}
                {activeTab === 'financement' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">Répartition des besoins financiers</h3>
                      <div className="space-y-4">
                        {project.financialNeeds.map((need, index) => (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{need.category}</span>
                              <span className="text-teal-600 font-semibold">
                                {(need.amount / 1000000).toFixed(1)}M FCFA ({need.percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
                                style={{ width: `${need.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Opportunité d'investissement</h3>
                      <p className="text-gray-700 mb-6">
                        Nous recherchons des partenaires financiers pour accélérer notre croissance et étendre notre impact. 
                        Votre investissement nous permettra de toucher 50,000 agriculteurs supplémentaires d'ici 2025.
                      </p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <div className="text-3xl font-bold text-teal-600 mb-1">3.2x</div>
                          <div className="text-sm text-gray-600">ROI projeté (3 ans)</div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <div className="text-3xl font-bold text-teal-600 mb-1">18 mois</div>
                          <div className="text-sm text-gray-600">Break-even prévu</div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <div className="text-3xl font-bold text-teal-600 mb-1">250K+</div>
                          <div className="text-sm text-gray-600">Bénéficiaires directs</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaboration Tab */}
                {activeTab === 'collaboration' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Espace de collaboration</h3>
                      <button
                        onClick={() => setShowDocumentModal(true)}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-upload-line mr-2"></i>
                        Partager un document
                      </button>
                    </div>

                    {/* Documents partagés */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                        <i className="ri-folder-line text-teal-500 mr-2"></i>
                        Documents partagés
                      </h4>
                      <div className="space-y-3">
                        {project.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-500 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                <i className={`${doc.icon} text-teal-600 text-xl`}></i>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 text-sm">{doc.name}</h5>
                                <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                  <span>{doc.type} • {doc.size}</span>
                                  <span>•</span>
                                  <span>Par {doc.uploadedBy}</span>
                                  <span>•</span>
                                  <span>{doc.date}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <i className="ri-lock-line text-xs text-gray-400 mr-1"></i>
                                  <span className="text-xs text-gray-500">{doc.access}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                                <i className="ri-download-line text-gray-600"></i>
                              </button>
                              <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                                <i className="ri-share-line text-gray-600"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Commentaires et discussions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                        <i className="ri-chat-3-line text-teal-500 mr-2"></i>
                        Discussions ({comments.length})
                      </h4>

                      {/* Ajouter un commentaire */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Partagez vos idées, questions ou suggestions..."
                          rows={3}
                          maxLength={500}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                        ></textarea>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">{newComment.length}/500 caractères</span>
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                              newComment.trim()
                                ? 'bg-teal-500 text-white hover:bg-teal-600'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <i className="ri-send-plane-line mr-2"></i>
                            Publier
                          </button>
                        </div>
                      </div>

                      {/* Liste des commentaires */}
                      <div className="space-y-6">
                        {comments.map((comment) => (
                          <div key={comment.id} className="space-y-4">
                            <div className="flex items-start space-x-3">
                              <img
                                src={comment.avatar}
                                alt={comment.user}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <span className="font-semibold text-gray-900">{comment.user}</span>
                                      <span className="text-sm text-teal-600 ml-2">• {comment.role}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{comment.date}</span>
                                  </div>
                                  <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                                </div>
                                <div className="flex items-center space-x-4 mt-2 ml-4">
                                  <button className="text-xs text-gray-600 hover:text-teal-600 transition-colors">
                                    <i className="ri-reply-line mr-1"></i>
                                    Répondre
                                  </button>
                                  <button className="text-xs text-gray-600 hover:text-teal-600 transition-colors">
                                    <i className="ri-thumb-up-line mr-1"></i>
                                    Utile
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Réponses */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="ml-12 space-y-4">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex items-start space-x-3">
                                    <img
                                      src={reply.avatar}
                                      alt={reply.user}
                                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                      <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div>
                                            <span className="font-semibold text-gray-900 text-sm">{reply.user}</span>
                                            <span className="text-xs text-teal-600 ml-2">• {reply.role}</span>
                                          </div>
                                          <span className="text-xs text-gray-500">{reply.date}</span>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed">{reply.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actualités Tab */}
                {activeTab === 'actualites' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Dernières actualités</h3>
                    {project.updates.map((update, index) => (
                      <div key={index} className="border-l-4 border-teal-500 pl-6 py-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm text-gray-500">{update.date}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <h4 className="font-semibold text-gray-900">{update.title}</h4>
                        </div>
                        <p className="text-gray-700">{update.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Funding Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {(project.funding / 1000000).toFixed(1)}M
                  </span>
                  <span className="text-gray-500">/ {(project.fundingGoal / 1000000).toFixed(1)}M FCFA</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
                    style={{ width: `${(project.funding / project.fundingGoal) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {Math.round((project.funding / project.fundingGoal) * 100)}% de l'objectif atteint
                </p>
              </div>

              <button
                onClick={() => setShowFundingModal(true)}
                className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors mb-3 whitespace-nowrap"
              >
                <i className="ri-hand-coin-line mr-2"></i>
                Financer ce projet
              </button>
              
              <button
                onClick={() => setShowPartnerModal(true)}
                className="w-full px-6 py-3 bg-white text-teal-600 border-2 border-teal-500 rounded-lg font-semibold hover:bg-teal-50 transition-colors whitespace-nowrap"
              >
                <i className="ri-team-line mr-2"></i>
                Devenir partenaire
              </button>
            </div>

            {/* Entrepreneur Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Porteur de projet</h3>
              <div className="flex items-start space-x-4 mb-4">
                <img
                  src={project.entrepreneur.photo}
                  alt={project.entrepreneur.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{project.entrepreneur.name}</h4>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <i className="ri-map-pin-line mr-1"></i>
                    {project.entrepreneur.location}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">{project.entrepreneur.bio}</p>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap">
                <i className="ri-mail-line mr-2"></i>
                Contacter
              </button>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
              <h3 className="font-bold mb-4">Statistiques du projet</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Membres d'équipe</span>
                  <span className="font-bold text-lg">{project.team}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Mentors actifs</span>
                  <span className="font-bold text-lg">{project.mentors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Progression</span>
                  <span className="font-bold text-lg">{project.progress}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Durée incubation</span>
                  <span className="font-bold text-lg">12 mois</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Devenir partenaire</h2>
                <button
                  onClick={() => setShowPartnerModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="ri-close-line text-2xl text-gray-500"></i>
                </button>
              </div>

              <p className="text-gray-600 mb-8">
                Rejoignez-nous en tant que partenaire technique, mentor ou partenaire stratégique pour accompagner ce projet vers le succès.
              </p>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organisation</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="Nom de votre organisation"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de partenariat *</label>
                  <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                    <option value="">Sélectionnez un type</option>
                    <option value="technique">Partenaire technique</option>
                    <option value="mentor">Mentorat</option>
                    <option value="strategique">Partenaire stratégique</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domaine d'expertise *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Ex: Marketing digital, Développement logiciel..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    required
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    placeholder="Décrivez comment vous souhaitez contribuer au projet..."
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap"
                >
                  Envoyer ma proposition
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Funding Modal */}
      {showFundingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Financer ce projet</h2>
                <button
                  onClick={() => setShowFundingModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="ri-close-line text-2xl text-gray-500"></i>
                </button>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-gray-900 mb-2">{project.title}</h3>
                <p className="text-sm text-gray-600">
                  Objectif: {(project.fundingGoal / 1000000).toFixed(1)}M FCFA • 
                  Collecté: {(project.funding / 1000000).toFixed(1)}M FCFA
                </p>
              </div>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type d'investisseur</label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                      <option value="individuel">Investisseur individuel</option>
                      <option value="institutionnel">Investisseur institutionnel</option>
                      <option value="entreprise">Entreprise</option>
                      <option value="fondation">Fondation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant du financement (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="100000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Ex: 5000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Montant minimum: 100,000 FCFA</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de financement *</label>
                  <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                    <option value="">Sélectionnez un type</option>
                    <option value="don">Don</option>
                    <option value="pret">Prêt</option>
                    <option value="equity">Prise de participation (Equity)</option>
                    <option value="subvention">Subvention</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message (optionnel)</label>
                  <textarea
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    placeholder="Partagez vos motivations ou conditions..."
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Maximum 500 caractères</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <i className="ri-information-line text-yellow-600 text-xl flex-shrink-0 mt-0.5"></i>
                    <p className="text-sm text-yellow-800">
                      Votre demande sera examinée par notre équipe. Vous serez contacté sous 48h pour finaliser les modalités de financement.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap"
                >
                  Soumettre ma proposition de financement
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Partager un document</h2>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="ri-close-line text-2xl text-gray-500"></i>
                </button>
              </div>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du document *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Ex: Rapport d'avancement Q2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier *</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                    <i className="ri-upload-cloud-line text-5xl text-gray-400 mb-3"></i>
                    <p className="text-gray-700 font-medium mb-1">Cliquez pour sélectionner un fichier</p>
                    <p className="text-sm text-gray-500">PDF, DOCX, XLSX, PPTX (max 10 MB)</p>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions d'accès *</label>
                  <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                    <option value="">Sélectionnez les permissions</option>
                    <option value="all">Tous les partenaires</option>
                    <option value="mentors">Mentors uniquement</option>
                    <option value="investors">Investisseurs uniquement</option>
                    <option value="team">Équipe du projet uniquement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    placeholder="Décrivez brièvement le contenu du document..."
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Maximum 300 caractères</p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDocumentModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-upload-line mr-2"></i>
                    Partager
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}