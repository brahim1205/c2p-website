import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import PublicLayout from '@/components/feature/PublicLayout';
import { useAuth } from '@/hooks/useAuth';


interface Provider {
  id: number;
  name: string;
  title: string;
  category: string;
  bio: string | null;
  rating: number;
  reviews: number;
  price_per_hour: number;
  location: string;
  verified: boolean;
  image: string | null;
  services: string[];
  languages: string[];
  completed_jobs: number;
  response_time: string | null;
  member_since: string;
  skills: string[];
}

interface ProviderReview {
  id: number;
  client_name: string;
  client_avatar: string | null;
  rating: number;
  comment: string;
  service: string;
  helpful: number;
  created_at: string;
}

export default function PrestataireDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const providerId = Number(id);
  const [prestataire, setPrestataire] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<typeof portfolio[0] | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const [resForm, setResForm] = useState({
    service: '',
    date: '',
    description: '',
    budget: '',
    address: ''
  });
  const [msgForm, setMsgForm] = useState({ subject: '', message: '' });
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [selectedReviewRating, setSelectedReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: pData } = await backendClient
          .from('providers')
          .select('*')
          .eq('id', providerId)
          .maybeSingle();
        if (pData) {
          const mapped: Provider = {
            ...pData,
            services: Array.isArray(pData.services) ? pData.services : [],
            languages: Array.isArray(pData.languages) ? pData.languages : [],
            skills: [],
            member_since: pData.created_at ? new Date(pData.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Janvier 2022'
          };
          setPrestataire(mapped);
        }

        const { data: rData } = await backendClient
          .from('provider_reviews')
          .select('*')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false });
        setReviews((rData || []) as ProviderReview[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) fetchData();
  }, [providerId]);

  const portfolio = [
    {
      id: 1,
      title: 'Plateforme E-learning',
      image: 'https://readdy.ai/api/search-image?query=modern%20e-learning%20platform%20interface%20on%20computer%20screen%20showing%20online%20courses%20and%20educational%20content%20with%20clean%20design%20and%20user-friendly%20layout&width=600&height=400&seq=portfolio1&orientation=landscape',
      category: 'Web',
      description: 'Conception et développement complet d\'une plateforme e-learning pour un centre de formation. Interface moderne, système de quiz interactif, suivi de progression et tableau de bord administrateur.',
      client: 'Centre de Formation Digitale',
      year: '2024'
    },
    {
      id: 2,
      title: 'Application Mobile Banking',
      image: 'https://readdy.ai/api/search-image?query=mobile%20banking%20app%20interface%20on%20smartphone%20screen%20showing%20financial%20dashboard%20and%20transaction%20features%20with%20modern%20design&width=600&height=400&seq=portfolio2&orientation=landscape',
      category: 'Mobile',
      description: 'Développement d\'une application mobile de services financiers avec authentification biométrique, virements instantanés et historique des transactions. Disponible sur iOS et Android.',
      client: 'Fintech Sénégal',
      year: '2024'
    },
    {
      id: 3,
      title: 'Site E-commerce Mode',
      image: 'https://readdy.ai/api/search-image?query=fashion%20e-commerce%20website%20on%20laptop%20screen%20showing%20product%20catalog%20and%20shopping%20cart%20with%20elegant%20design&width=600&height=400&seq=portfolio3&orientation=landscape',
      category: 'E-commerce',
      description: 'Création d\'une boutique en ligne complète pour une marque de mode africaine. Intégration de passerelles de paiement mobiles, gestion des stocks et système de livraison intégré.',
      client: 'Maison Dakar',
      year: '2023'
    }
  ];

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await backendClient.from('bookings').insert({
        client_id: user?.id ?? 'usr-client',
        client_name: user ? `${user.firstName} ${user.lastName}` : 'Awa Ndiaye',
        client_email: user?.email ?? 'client@c2p.sn',
        provider_id: providerId,
        service: resForm.service || prestataire?.services[0] || 'Service général',
        description: resForm.description,
        booking_date: resForm.date,
        booking_time: '09:00',
        status: 'pending',
        price: Number(resForm.budget) || prestataire?.price_per_hour || 0,
        address: resForm.address
      });
      if (error) throw error;
      setFormSuccess('Votre demande de réservation a été envoyée au prestataire. Vous serez notifié dès confirmation.');
      setShowReservationModal(false);
      setResForm({ service: '', date: '', description: '', budget: '', address: '' });
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      setFormSuccess('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess('Message envoyé avec succès !');
    setShowMessageModal(false);
    setMsgForm({ subject: '', message: '' });
    setTimeout(() => setFormSuccess(null), 5000);
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewRating || !reviewComment.trim() || !prestataire) return;
    try {
      const { error } = await backendClient.from('provider_reviews').insert({
        provider_id: providerId,
        client_id: user?.id ?? 'usr-client',
        client_name: user ? `${user.firstName} ${user.lastName}` : 'Awa Ndiaye',
        client_avatar: user?.avatar ?? null,
        rating: selectedReviewRating,
        comment: reviewComment,
        service: prestataire.services[0] || 'Service général',
        helpful: 0
      });
      if (error) throw error;
      setFormSuccess('Votre avis a été publié avec succès !');
      setShowReviewForm(false);
      setSelectedReviewRating(0);
      setReviewComment('');
      const { data: rData } = await backendClient
        .from('provider_reviews')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      setReviews((rData || []) as ProviderReview[]);
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const serviceOptions = prestataire?.services?.length
    ? prestataire.services
    : ['Service général'];

  if (loading) {
    return (
      <PublicLayout hideHeader>
        <div className="min-h-screen bg-[#f5f1e8] pt-24 px-4">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-xl p-8 h-48"></div>
                <div className="bg-white rounded-xl p-8 h-32"></div>
                <div className="bg-white rounded-xl p-8 h-40"></div>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 h-32"></div>
                <div className="bg-white rounded-xl p-6 h-40"></div>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!prestataire) {
    return (
      <PublicLayout hideHeader>
        <div className="min-h-screen bg-[#f5f1e8] pt-24 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-3xl text-gray-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prestataire introuvable</h2>
            <p className="text-gray-600 mb-4">Ce prestataire n\'existe pas ou a été supprimé.</p>
            <Link to="/allopresta" className="text-[#14B8A6] font-medium hover:underline">
              Retour à AlloPresta
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout hideHeader>
      <div className="min-h-screen bg-[#f5f1e8] pt-24">
        {/* Success Toast */}
        {formSuccess && (
          <div className="fixed top-6 right-6 z-50 max-w-md">
            <div className="bg-[#14B8A6] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-check-line"></i>
              </div>
              <span className="text-sm font-medium">{formSuccess}</span>
              <button onClick={() => setFormSuccess(null)} className="ml-2 w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded">
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-20 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-[#1a2b4a]">Accueil</Link>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-s-line"></i>
            </div>
            <Link to="/allopresta" className="hover:text-[#1a2b4a]">AlloPresta</Link>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-s-line"></i>
            </div>
            <span className="text-[#1a2b4a]">{prestataire.name}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-20 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-xl p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-xl">
                      <img
                        src={prestataire.image || 'https://readdy.ai/api/search-image?query=professional%20african%20person%20portrait%20neutral%20background%20confident%20modern&width=400&height=400&seq=presta-default&orientation=squarish'}
                        alt={prestataire.name}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-[#1a2b4a] font-bold text-2xl md:text-3xl">{prestataire.name}</h1>
                            {prestataire.verified && (
                              <div className="bg-[#14B8A6] text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                <i className="ri-verified-badge-fill"></i>
                                <span>Vérifié</span>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 text-lg mb-2">{prestataire.title}</p>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line"></i>
                            </div>
                            <span>{prestataire.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mb-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-star-fill text-yellow-400 text-lg"></i>
                          </div>
                          <span className="text-gray-900 font-bold text-lg">{prestataire.rating}</span>
                          <span className="text-gray-500 text-sm">({reviews.length} avis)</span>
                        </div>
                        <div className="text-gray-600 text-sm">
                          <strong>{prestataire.completed_jobs}</strong> prestations réalisées
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => setShowReservationModal(true)}
                          className="bg-[#1a2b4a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#14B8A6] transition-all whitespace-nowrap cursor-pointer"
                        >
                          Réserver une prestation
                        </button>
                        <button
                          onClick={() => setShowMessageModal(true)}
                          className="border-2 border-[#1a2b4a] text-[#1a2b4a] px-6 py-3 rounded-lg font-medium hover:bg-[#1a2b4a] hover:text-white transition-all whitespace-nowrap cursor-pointer"
                        >
                          Envoyer un message
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-[#1a2b4a] font-bold text-lg mb-3">À propos</h3>
                    <p className="text-gray-700 text-[15px] leading-relaxed">{prestataire.bio || 'Prestataire professionnel qualifié et vérifié sur la plateforme C2P.'}</p>
                  </div>
                </div>

                {/* Services */}
                <div className="bg-white rounded-xl p-6 md:p-8">
                  <h3 className="text-[#1a2b4a] font-bold text-2xl mb-6">Services Proposés</h3>
                  <div className="space-y-4">
                    {serviceOptions.map((service, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-6 hover:border-[#14B8A6] transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-3">
                          <div className="flex-1">
                            <h4 className="text-[#1a2b4a] font-bold text-lg mb-2">{service}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              Prestataire professionnel offrant des services de {service.toLowerCase()} de qualité.
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[#1a2b4a] font-bold text-2xl mb-1">
                              {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
                            </div>
                            <div className="text-gray-500 text-xs">par heure</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setResForm(s => ({ ...s, service }));
                            setShowReservationModal(true);
                          }}
                          className="w-full bg-[#1a2b4a] text-white py-3 rounded-lg font-medium hover:bg-[#14B8A6] transition-all whitespace-nowrap cursor-pointer"
                        >
                          Réserver ce service
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portfolio */}
                <div className="bg-white rounded-xl p-6 md:p-8">
                  <h3 className="text-[#1a2b4a] font-bold text-2xl mb-6">Portfolio</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolio.map((item) => (
                      <div
                        key={item.id}
                        className="group cursor-pointer"
                        onClick={() => {
                          setSelectedPortfolioItem(item);
                          setShowPortfolioModal(true);
                        }}
                      >
                        <div className="relative h-48 w-full overflow-hidden rounded-xl mb-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 flex items-center justify-center">
                              <i className="ri-eye-line text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                            </div>
                          </div>
                        </div>
                        <h4 className="text-[#1a2b4a] font-semibold text-sm mb-1">{item.title}</h4>
                        <span className="text-gray-500 text-xs">{item.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                <div className="bg-white rounded-xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[#1a2b4a] font-bold text-2xl">
                      Avis Clients ({reviews.length})
                    </h3>
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-star-line mr-1"></i>Donner mon avis
                    </button>
                  </div>

                  {showReviewForm && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Noter {prestataire.name}</h4>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setSelectedReviewRating(star)}
                            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <i className={`ri-star-fill text-xl ${star <= selectedReviewRating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Décrivez votre expérience..."
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{reviewComment.length}/500</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Publier l&apos;avis
                        </button>
                        <button
                          onClick={() => { setShowReviewForm(false); setSelectedReviewRating(0); setReviewComment(''); }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {review.client_avatar ? (
                              <img src={review.client_avatar} alt={review.client_name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 font-medium text-sm">{review.client_name.substring(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[#1a2b4a]">{review.client_name}</div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <i
                                    key={i}
                                    className={`ri-star-fill text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  ></i>
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-gray-500 text-sm">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed mb-2">{review.comment}</p>
                        <span className="text-gray-500 text-xs">Service: {review.service}</span>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                          <button className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                            <i className="ri-thumb-up-line"></i> Utile ({review.helpful})
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {reviews.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-[#1a2b4a] font-bold text-lg mb-4">Statistiques</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Temps de réponse</span>
                      <span className="text-[#1a2b4a] font-semibold">{prestataire.response_time || '2h'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Membre depuis</span>
                      <span className="text-[#1a2b4a] font-semibold">{prestataire.member_since}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Taux de satisfaction</span>
                      <span className="text-[#14B8A6] font-semibold">
                        {reviews.length > 0
                          ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
                          : 98}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-[#1a2b4a] font-bold text-lg mb-4">Langues</h3>
                  <div className="space-y-2">
                    {prestataire.languages.map((language, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700 text-sm">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-translate-2 text-[#14B8A6]"></i>
                        </div>
                        <span>{language}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services Tags */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-[#1a2b4a] font-bold text-lg mb-4">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {prestataire.services.map((service, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-[#1a2b4a] font-bold text-lg mb-4">Partager ce profil</h3>
                  <div className="flex gap-3">
                    <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 flex items-center justify-center mx-auto">
                        <i className="ri-facebook-fill text-xl text-gray-600"></i>
                      </div>
                    </button>
                    <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 flex items-center justify-center mx-auto">
                        <i className="ri-twitter-x-fill text-xl text-gray-600"></i>
                      </div>
                    </button>
                    <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 flex items-center justify-center mx-auto">
                        <i className="ri-linkedin-fill text-xl text-gray-600"></i>
                      </div>
                    </button>
                    <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 flex items-center justify-center mx-auto">
                        <i className="ri-link text-xl text-gray-600"></i>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reservation Modal */}
        {showReservationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[#1a2b4a] font-bold text-2xl">Réserver une prestation</h2>
                  <button
                    onClick={() => setShowReservationModal(false)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-close-line text-2xl text-gray-600"></i>
                    </div>
                  </button>
                </div>

                <form onSubmit={handleReservationSubmit} className="space-y-6">
                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">
                      Service souhaité
                    </label>
                    <select
                      value={resForm.service}
                      onChange={(e) => setResForm(s => ({ ...s, service: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] cursor-pointer text-sm"
                    >
                      {serviceOptions.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">
                      Date souhaitée
                    </label>
                    <input
                      type="date"
                      required
                      value={resForm.date}
                      onChange={(e) => setResForm(s => ({ ...s, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">
                      Adresse de l&apos;intervention
                    </label>
                    <input
                      type="text"
                      required
                      value={resForm.address}
                      onChange={(e) => setResForm(s => ({ ...s, address: e.target.value }))}
                      placeholder="Ex: Dakar, Almadies, Rue 12"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">
                      Description du projet
                    </label>
                    <textarea
                      rows={5}
                      value={resForm.description}
                      onChange={(e) => setResForm(s => ({ ...s, description: e.target.value }))}
                      placeholder="Décrivez votre projet en détail..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] resize-none text-sm"
                      maxLength={500}
                    ></textarea>
                    <div className="text-gray-500 text-xs mt-1">Maximum 500 caractères</div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">
                      Budget estimé (FCFA)
                    </label>
                    <input
                      type="number"
                      required
                      value={resForm.budget}
                      onChange={(e) => setResForm(s => ({ ...s, budget: e.target.value }))}
                      placeholder="Ex: 50000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowReservationModal(false)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#1a2b4a] text-white py-3 rounded-lg font-medium hover:bg-[#14B8A6] transition-all whitespace-nowrap cursor-pointer"
                    >
                      Envoyer la demande
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[#1a2b4a] font-bold text-2xl">Envoyer un message à {prestataire.name}</h2>
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-close-line text-2xl text-gray-600"></i>
                    </div>
                  </button>
                </div>

                <form onSubmit={handleMessageSubmit} className="space-y-6">
                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">Objet</label>
                    <input
                      type="text"
                      required
                      value={msgForm.subject}
                      onChange={(e) => setMsgForm(s => ({ ...s, subject: e.target.value }))}
                      placeholder="Sujet de votre message"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium text-sm mb-2">Message</label>
                    <textarea
                      rows={6}
                      required
                      value={msgForm.message}
                      onChange={(e) => setMsgForm(s => ({ ...s, message: e.target.value }))}
                      placeholder="Écrivez votre message..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#14B8A6] resize-none text-sm"
                      maxLength={500}
                    ></textarea>
                    <div className="text-gray-500 text-xs mt-1">Maximum 500 caractères</div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowMessageModal(false)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#1a2b4a] text-white py-3 rounded-lg font-medium hover:bg-[#14B8A6] transition-all whitespace-nowrap cursor-pointer"
                    >
                      Envoyer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Modal */}
        {showPortfolioModal && selectedPortfolioItem && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPortfolioModal(false);
              setSelectedPortfolioItem(null);
              setIsImageZoomed(false);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = portfolio.findIndex((p) => p.id === selectedPortfolioItem.id);
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : portfolio.length - 1;
                setSelectedPortfolioItem(portfolio[prevIndex]);
                setIsImageZoomed(false);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors z-10 cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-arrow-left-s-line text-white text-2xl"></i>
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = portfolio.findIndex((p) => p.id === selectedPortfolioItem.id);
                const nextIndex = currentIndex < portfolio.length - 1 ? currentIndex + 1 : 0;
                setSelectedPortfolioItem(portfolio[nextIndex]);
                setIsImageZoomed(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors z-10 cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-arrow-right-s-line text-white text-2xl"></i>
              </div>
            </button>

            <div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="inline-block bg-[#14B8A6]/10 text-[#14B8A6] px-3 py-1 rounded-full text-xs font-medium mb-2">
                      {selectedPortfolioItem.category}
                    </span>
                    <h2 className="text-[#1a2b4a] font-bold text-2xl">{selectedPortfolioItem.title}</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowPortfolioModal(false);
                      setSelectedPortfolioItem(null);
                      setIsImageZoomed(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-close-line text-2xl text-gray-600"></i>
                    </div>
                  </button>
                </div>

                <div
                  className={`rounded-xl overflow-hidden mb-6 transition-all duration-300 ${isImageZoomed ? 'fixed inset-4 z-50 flex items-center justify-center bg-black/90' : 'relative'}`}
                  onClick={() => setIsImageZoomed(!isImageZoomed)}
                >
                  <img
                    src={selectedPortfolioItem.image}
                    alt={selectedPortfolioItem.title}
                    className={`w-full transition-all duration-500 cursor-zoom-in ${isImageZoomed ? 'h-[85vh] object-contain cursor-zoom-out' : 'h-64 md:h-80 object-cover object-center'}`}
                  />
                  {isImageZoomed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsImageZoomed(false);
                      }}
                      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors"
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className="ri-close-line text-white text-2xl"></i>
                      </div>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">Client</div>
                    <div className="text-[#1a2b4a] font-semibold text-sm">{selectedPortfolioItem.client}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">Année</div>
                    <div className="text-[#1a2b4a] font-semibold text-sm">{selectedPortfolioItem.year}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-gray-500 text-xs mb-1">Catégorie</div>
                    <div className="text-[#1a2b4a] font-semibold text-sm">{selectedPortfolioItem.category}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-[#1a2b4a] font-bold text-lg mb-3">Description du projet</h3>
                  <p className="text-gray-700 text-[15px] leading-relaxed">{selectedPortfolioItem.description}</p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowPortfolioModal(false);
                      setIsImageZoomed(false);
                      setShowReservationModal(true);
                    }}
                    className="flex-1 bg-[#1a2b4a] text-white py-3 rounded-lg font-medium hover:bg-[#14B8A6] transition-all whitespace-nowrap cursor-pointer"
                  >
                    Démarrer un projet similaire
                  </button>
                  <button
                    onClick={() => {
                      setShowPortfolioModal(false);
                      setSelectedPortfolioItem(null);
                      setIsImageZoomed(false);
                    }}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
