import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import {
  notifyAdminPublicAlloPrestaRequest,
  notifyClientManagedBookingReceipt,
} from '@/hooks/useCreateNotification';
import {
  canAccessProviderProfile,
  fetchPublicProvider,
  getProviderDisplayName,
  getProviderTierLabel,
  getProviderTierMessage,
  getProviderVisibilityPassHint,
  getProviderVisibilityPassLabel,
  normalizeViewerAccessTier,
  type ProviderCatalogRecord,
} from '@/lib/providerApi';

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
  const viewerTier = normalizeViewerAccessTier(user);
  const [prestataire, setPrestataire] = useState<(ProviderCatalogRecord & { member_since: string; skills: string[] }) | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);

  const [resForm, setResForm] = useState({
    service: '',
    date: '',
    description: '',
    budget: '',
    address: ''
  });
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [selectedReviewRating, setSelectedReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const openReservationFlow = () => {
    if (!user?.id) {
      setFormSuccess('Connectez-vous pour transmettre votre besoin à C2P.');
      setTimeout(() => setFormSuccess(null), 5000);
      return;
    }
    setShowReservationModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const provider = await fetchPublicProvider(providerId);
        if (provider) {
          const mapped = {
            ...provider,
            skills: [],
            member_since: provider.created_at ? new Date(provider.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Janvier 2022',
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

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setFormSuccess('Connectez-vous pour transmettre votre besoin à C2P.');
      setShowReservationModal(false);
      setTimeout(() => setFormSuccess(null), 5000);
      return;
    }
    try {
      const { error } = await backendClient.from('bookings').insert({
        client_id: user.id,
        client_name: `${user.firstName} ${user.lastName}`,
        client_email: user.email,
        requested_provider_id: providerId,
        provider_id: null,
        service: resForm.service || prestataire?.services[0] || 'Service général',
        description: resForm.description,
        booking_date: resForm.date,
        booking_time: '09:00',
        status: 'pending',
        price: Number(resForm.budget) || prestataire?.price_per_hour || 0,
        address: resForm.address,
        request_channel: 'c2p_managed',
        wallet_flow: 'escrow',
      });
      if (error) throw error;
      await notifyAdminPublicAlloPrestaRequest(
        user ? `${user.firstName} ${user.lastName}` : 'Un visiteur',
        prestataire?.name || 'un prestataire',
        user?.avatar,
      );
      if (user?.id) {
        await notifyClientManagedBookingReceipt(
          user.id,
          prestataire?.name || 'ce prestataire',
          user.avatar,
        );
      }
      setFormSuccess('Votre demande a été transmise à C2P. L’équipe va analyser le besoin et attribuer la mission.');
      setShowReservationModal(false);
      setResForm({ service: '', date: '', description: '', budget: '', address: '' });
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      setFormSuccess('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
  };

  const handleSubmitReview = async () => {
    if (!user?.id) {
      setFormSuccess('Connectez-vous pour publier un avis.');
      setShowReviewForm(false);
      setTimeout(() => setFormSuccess(null), 5000);
      return;
    }
    if (!selectedReviewRating || !reviewComment.trim() || !prestataire) return;
    try {
      const { error } = await backendClient.from('provider_reviews').insert({
        provider_id: providerId,
        client_id: user.id,
        client_name: `${user.firstName} ${user.lastName}`,
        client_avatar: user.avatar ?? null,
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
  const profileUnlocked = prestataire ? canAccessProviderProfile(viewerTier, prestataire.public_profile_level) : false;
  const displayName = prestataire ? getProviderDisplayName(prestataire, viewerTier) : 'Prestataire C2P';
  const visibleServiceOptions = profileUnlocked ? serviceOptions : serviceOptions.slice(0, 2);
  const lockedProfileAction = !user
    ? { to: '/auth/login', label: 'Me connecter à C2P' }
    : viewerTier === 'subscriber' && prestataire?.public_profile_level === 'verified'
      ? { to: '/dashboard/messages?support=1', label: 'Demander la vérification' }
      : { to: '/tarifs#senpresta-visibility', label: 'Voir les niveaux SenPresta' };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] pt-24 px-4">
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
    );
  }

  if (!prestataire) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] pt-24 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-3xl text-gray-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prestataire introuvable</h2>
            <p className="text-gray-600 mb-4">Ce prestataire n\'existe pas ou a été supprimé.</p>
            <Link to="/allopresta" className="text-[#1a9a96] font-medium hover:underline">
              Retour à AlloPresta
            </Link>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f4] pt-24">
        {/* Success Toast */}
        {formSuccess && (
          <div className="fixed top-6 right-6 z-50 max-w-md">
            <div role="status" aria-live="polite" className="bg-[#1a9a96] text-white px-5 py-3 rounded-xl shadow-[0_16px_34px_rgba(26,154,150,0.22)] flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-check-line"></i>
              </div>
              <span className="text-sm font-medium">{formSuccess}</span>
              <button type="button" aria-label="Fermer le message de confirmation" onClick={() => setFormSuccess(null)} className="ml-2 w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded">
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="bg-white border-b border-[#d6dbe1] px-4 sm:px-6 lg:px-20 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-[#64748b]">
            <Link to="/" className="hover:text-[#0f1c35]">Accueil</Link>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-s-line"></i>
            </div>
            <Link to="/allopresta" className="hover:text-[#0f1c35]">AlloPresta</Link>
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-s-line"></i>
            </div>
            <span className="text-[#0f1c35]">{displayName}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-20 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
                  <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:gap-6">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32">
                      <img
                        src={prestataire.image || '/images/brand/image1.jpeg'}
                        alt={displayName}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <h1 className="text-[#0f1c35] font-bold text-xl sm:text-2xl md:text-3xl">{displayName}</h1>
                            {prestataire.verified && (
                              <div className="flex items-center gap-1 rounded-full bg-[#1D9BF0] px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(29,155,240,0.28)] sm:px-3 sm:text-xs">
                                <i className="ri-verified-badge-fill"></i>
                                <span>Vérifié</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 rounded-full border border-[#d7e6fb] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#27346b] sm:px-3 sm:text-xs">
                              <i className="ri-lock-line"></i>
                              <span>{getProviderTierLabel(prestataire.public_profile_level)}</span>
                            </div>
                          </div>
                          <p className="mb-2 text-base text-gray-600 sm:text-lg">{prestataire.title}</p>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line"></i>
                            </div>
                            <span>{prestataire.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-star-fill text-yellow-400 text-lg"></i>
                          </div>
                          <span className="text-base font-bold text-gray-900 sm:text-lg">{prestataire.rating}</span>
                          <span className="text-gray-500 text-sm">({reviews.length} avis)</span>
                        </div>
                        <div className="text-gray-600 text-sm">{prestataire.completed_jobs} prestations réalisées</div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <button
                          type="button"
                          onClick={openReservationFlow}
                          aria-label={`Contacter ${displayName} via C2P`}
                          className="rounded-xl bg-[#1a9a96] px-5 py-3 text-sm font-medium leading-tight text-white shadow-[0_14px_34px_rgba(26,154,150,0.24)] transition-all hover:bg-[#147f7b] hover:shadow-[0_18px_42px_rgba(20,127,123,0.28)] cursor-pointer"
                        >
                          {profileUnlocked ? 'Contacter le prestataire' : 'Ouvrir le dossier avec C2P'}
                        </button>
                        <Link
                          to={user ? '/dashboard/messages?support=1' : '/contact'}
                          className="text-sm font-medium text-[#1a9a96] transition-colors hover:text-[#0f1c35]"
                        >
                          Parler à l’équipe C2P
                        </Link>
                      </div>

                    </div>
                  </div>

                  {!profileUnlocked ? (
                    <div className="mb-6 rounded-xl border border-[#d7e6fb] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[#31445f]">
                      <p className="font-semibold text-[#27346b]">{getProviderTierLabel(prestataire.public_profile_level)}</p>
                      <p className="mt-1">{getProviderTierMessage(prestataire.public_profile_level)}</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Link
                          to={lockedProfileAction.to}
                          className="inline-flex items-center justify-center rounded-xl bg-[#27346b] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#06053a]"
                        >
                          {lockedProfileAction.label}
                        </Link>
                        <Link
                          to="/tarifs#prestataire-plans"
                          className="inline-flex items-center justify-center rounded-xl border border-[#80bfdf] bg-white px-4 py-2.5 text-sm font-medium text-[#27346b] transition-colors hover:border-[#27346b]"
                        >
                          Consulter les offres SenPresta
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-[#0f1c35] font-bold text-lg mb-3">À propos</h3>
                    <p className="text-gray-700 text-[15px] leading-relaxed">
                      {profileUnlocked
                        ? (prestataire.bio || 'Professionnel qualifié et vérifié sur la plateforme C2P.')
                        : 'Profil résumé diffusé par C2P. Le détail complet, les signaux de fiabilité et la relation directe restent pilotés par l’équipe des opérations.'}
                    </p>
                  </div>
                </div>

                {/* Services */}
                <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
                  <h3 className="mb-5 text-[#0f1c35] text-xl font-bold sm:mb-6 sm:text-2xl">Services Proposés</h3>
                  <div className="space-y-4">
                    {visibleServiceOptions.map((service, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-[#d6dbe1] p-4 transition-all hover:border-[#1a9a96]/45 hover:shadow-[0_18px_44px_rgba(26,154,150,0.08)] sm:p-6"
                      >
                        <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row">
                          <div className="flex-1">
                            <h4 className="mb-2 text-base font-bold text-[#0f1c35] sm:text-lg">{service}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {profileUnlocked
                                ? `Intervention ${service.toLowerCase()} avec cadrage et suivi C2P.`
                                : 'Service présenté sous forme résumée. Le cadrage complet reste géré par C2P.'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="mb-1 text-xl font-bold text-[#0f1c35] sm:text-2xl">
                              {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
                            </div>
                            <div className="text-gray-500 text-xs">par heure</div>
                          </div>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setResForm(s => ({ ...s, service }));
                              openReservationFlow();
                            }}
                            aria-label={`Demander à C2P de cadrer le besoin ${service}`}
                            className="inline-flex w-full justify-center rounded-xl bg-[#1a9a96] px-4 py-3 text-sm font-medium leading-tight text-white shadow-[0_12px_28px_rgba(26,154,150,0.22)] transition-all hover:bg-[#147f7b] hover:shadow-[0_16px_36px_rgba(20,127,123,0.28)] cursor-pointer sm:w-auto sm:px-5"
                          >
                            Demander à C2P de cadrer ce besoin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
                  <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-[#0f1c35] font-bold text-2xl">
                      Avis Clients ({reviews.length})
                    </h3>
                    {profileUnlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!user?.id) {
                            setFormSuccess('Connectez-vous pour publier un avis.');
                            setTimeout(() => setFormSuccess(null), 5000);
                            return;
                          }
                          setShowReviewForm(true);
                        }}
                        className="px-4 py-2 bg-[#1a9a96] text-white rounded-lg text-sm font-medium hover:bg-[#147f7b] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-star-line mr-1"></i>Donner mon avis
                      </button>
                    ) : null}
                  </div>

                  {!profileUnlocked ? (
                    <div className="rounded-xl border border-dashed border-[#d6dbe1] bg-[#f7fbfb] p-5 text-sm leading-7 text-[#64748b]">
                      Les avis détaillés deviennent visibles une fois le niveau d’accès requis atteint. En attendant, C2P peut recevoir votre besoin et piloter la mise en relation.
                    </div>
                  ) : null}

                  {showReviewForm && profileUnlocked && (
                    <div className="mb-6 rounded-xl bg-gray-50 p-4 sm:p-6" role="group" aria-label="Formulaire d avis client">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Noter {displayName}</h4>
                      <div className="mb-3 flex gap-1" role="radiogroup" aria-label={`Attribuer une note à ${displayName}`}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSelectedReviewRating(star)}
                            aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                            aria-pressed={star <= selectedReviewRating}
                            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <i className={`ri-star-fill text-xl ${star <= selectedReviewRating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                          </button>
                        ))}
                      </div>
                      <label htmlFor="provider-review-comment" className="sr-only">Commentaire de votre avis</label>
                      <textarea
                        id="provider-review-comment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Décrivez votre expérience..."
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1a9a96] text-sm resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{reviewComment.length}/500</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-[#1a9a96] text-white rounded-lg text-sm font-medium hover:bg-[#147f7b] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Publier l&apos;avis
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowReviewForm(false); setSelectedReviewRating(0); setReviewComment(''); }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {profileUnlocked ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-5 last:border-0 sm:pb-6">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-3">
                            {review.client_avatar ? (
                              <img src={review.client_avatar} alt={review.client_name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 font-medium text-sm">{review.client_name.substring(0, 2).toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[#0f1c35]">{review.client_name}</div>
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
                          <button type="button" aria-label={`Marquer l avis de ${review.client_name} comme utile`} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                            <i className="ri-thumb-up-line"></i> Utile ({review.helpful})
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  ) : null}

                  {profileUnlocked && reviews.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aucun avis pour le moment.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-[#d6dbe1] p-4 sm:p-6">
                  <h3 className="text-[#0f1c35] font-bold text-lg mb-3">Intermédiation C2P</h3>
                  <p className="text-sm leading-6 text-gray-600">
                    Cette fiche présente un profil {profileUnlocked ? 'détaillé' : 'résumé'}. La prise en charge commerciale, la qualification du besoin et l&apos;attribution de mission passent par C2P.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-[#64748b]">
                    <div className="flex items-start gap-2">
                      <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
                      <span>Analyse du besoin par l&apos;équipe C2P</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
                      <span>Sélection et affectation du bon intervenant</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
                      <span>Suivi de mission et cadrage contractuel via C2P</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#d6dbe1] p-4 sm:p-6">
                  <h3 className="text-[#0f1c35] font-bold text-lg mb-3">Cadre SenPresta</h3>
                  <div className="space-y-2 text-sm leading-6 text-[#64748b]">
                    <p><strong className="text-[#0f1c35]">Niveau requis :</strong> {getProviderTierLabel(prestataire.public_profile_level)}</p>
                    <p><strong className="text-[#0f1c35]">Visibilité :</strong> {prestataire.visibility_tier === 'premium' ? 'Premium' : prestataire.visibility_tier === 'priority' ? 'Prioritaire' : 'Standard'}</p>
                    <p><strong className="text-[#0f1c35]">Billet :</strong> {getProviderVisibilityPassLabel(prestataire.visibility_tier)}</p>
                    <p><strong className="text-[#0f1c35]">Alertes :</strong> {prestataire.alerts_enabled ? 'Activées' : 'Pilotées par C2P'}</p>
                    <p><strong className="text-[#0f1c35]">Traitement :</strong> {prestataire.operations_managed ? 'Centre d’opération C2P' : 'Direct'}</p>
                    <p className="pt-2 text-xs text-[#64748b]">{getProviderVisibilityPassHint(prestataire.visibility_tier)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reservation Modal */}
        {showReservationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="allopresta-reservation-title" className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 sm:p-8">
                <div className="mb-5 flex items-center justify-between sm:mb-6">
                  <h2 id="allopresta-reservation-title" className="text-[#0f1c35] text-xl font-bold sm:text-2xl">Transmettre une demande à C2P</h2>
                  <button
                    type="button"
                    aria-label="Fermer la demande de prestation"
                    onClick={() => setShowReservationModal(false)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-close-line text-2xl text-gray-600"></i>
                    </div>
                  </button>
                </div>

                <form onSubmit={handleReservationSubmit} className="space-y-6">
                  <div className="rounded-xl border border-[#d6dbe1] bg-[#f7fbfb] px-4 py-3 text-sm text-[#64748b]">
                    Vous n&apos;envoyez pas un message direct. C2P reçoit votre besoin, vérifie le contexte, puis attribue la mission à l&apos;intervenant le plus adapté.
                  </div>
                  <div>
                    <label htmlFor="reservation-service" className="block text-gray-700 font-medium text-sm mb-2">
                      Service souhaité
                    </label>
                    <select
                      id="reservation-service"
                      value={resForm.service}
                      onChange={(e) => setResForm(s => ({ ...s, service: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#1a9a96] cursor-pointer text-sm"
                    >
                      {visibleServiceOptions.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="reservation-date" className="block text-gray-700 font-medium text-sm mb-2">
                      Date souhaitée
                    </label>
                    <input
                      id="reservation-date"
                      type="date"
                      required
                      value={resForm.date}
                      onChange={(e) => setResForm(s => ({ ...s, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#1a9a96] text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="reservation-address" className="block text-gray-700 font-medium text-sm mb-2">
                      Adresse de l&apos;intervention
                    </label>
                    <input
                      id="reservation-address"
                      type="text"
                      required
                      value={resForm.address}
                      onChange={(e) => setResForm(s => ({ ...s, address: e.target.value }))}
                      placeholder="Ex: Dakar, Almadies, Rue 12"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#1a9a96] text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="reservation-description" className="block text-gray-700 font-medium text-sm mb-2">
                      Description du projet
                    </label>
                    <textarea
                      id="reservation-description"
                      rows={5}
                      value={resForm.description}
                      onChange={(e) => setResForm(s => ({ ...s, description: e.target.value }))}
                      placeholder="Décrivez votre projet en détail..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#1a9a96] resize-none text-sm"
                      maxLength={500}
                    ></textarea>
                    <div className="text-gray-500 text-xs mt-1">Maximum 500 caractères</div>
                  </div>

                  <div>
                    <label htmlFor="reservation-budget" className="block text-gray-700 font-medium text-sm mb-2">
                      Budget estimé (FCFA)
                    </label>
                    <input
                      id="reservation-budget"
                      type="number"
                      required
                      value={resForm.budget}
                      onChange={(e) => setResForm(s => ({ ...s, budget: e.target.value }))}
                      placeholder="Ex: 50000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#1a9a96] text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setShowReservationModal(false)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-[#1a9a96] py-3 font-medium text-white shadow-[0_14px_34px_rgba(26,154,150,0.24)] transition-all hover:bg-[#147f7b] hover:shadow-[0_18px_42px_rgba(20,127,123,0.30)] whitespace-nowrap cursor-pointer"
                    >
                      Envoyer la demande à C2P
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
