import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  notifyAdminPublicAlloPrestaRequest,
  notifyClientManagedBookingReceipt,
} from '@/hooks/useCreateNotification';
import {
  createClientManagedBooking,
  publishClientProviderDirectReview,
} from '@/lib/clientDashboardApi';
import {
  canAccessProviderProfile,
  fetchPublicProviderReviews,
  fetchPublicProvider,
  getProviderDisplayName,
  normalizeViewerAccessTier,
} from '@/lib/providerApi';
import {
  ProviderBreadcrumb,
  ProviderLoadingState,
  ProviderNotFoundState,
  ProviderSuccessToast,
} from './AlloPrestaProviderFeedback';
import AlloPrestaProviderRequestModal from './AlloPrestaProviderRequestModal';
import AlloPrestaProviderProfileCard from './AlloPrestaProviderProfileCard';
import AlloPrestaProviderReviews from './AlloPrestaProviderReviews';
import AlloPrestaProviderServices from './AlloPrestaProviderServices';
import AlloPrestaProviderSidebar from './AlloPrestaProviderSidebar';
import type { ProviderDetailRecord, ProviderReview, ReservationFormData } from './providerDetailTypes';

export default function PrestataireDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const providerId = Number(id);
  const viewerTier = normalizeViewerAccessTier(user);
  const [prestataire, setPrestataire] = useState<ProviderDetailRecord | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);

  const [resForm, setResForm] = useState({
    service: '',
    date: '',
    description: '',
    budget: '',
    address: ''
  } satisfies ReservationFormData);
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
  const updateReservationField = <K extends keyof ReservationFormData>(field: K, value: ReservationFormData[K]) => {
    setResForm((state) => ({ ...state, [field]: value }));
  };
  const cancelReview = () => {
    setShowReviewForm(false);
    setSelectedReviewRating(0);
    setReviewComment('');
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

        const providerReviews = await fetchPublicProviderReviews(providerId);
        setReviews(providerReviews as ProviderReview[]);
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
      await createClientManagedBooking({
        user,
        requestedProviderId: providerId,
        service: resForm.service || prestataire?.services[0] || 'Service général',
        description: resForm.description,
        bookingDate: resForm.date,
        bookingTime: '09:00',
        paymentMethod: 'wallet',
        address: resForm.address,
        requestType: 'quote',
        price: Number(resForm.budget) || prestataire?.price_per_hour || 0,
      });
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
      setFormSuccess('Votre demande de devis a été transmise à C2P. L’équipe va analyser le besoin et vous répondre.');
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
      await publishClientProviderDirectReview({
        providerId,
        user,
        rating: selectedReviewRating,
        comment: reviewComment,
        service: prestataire.services[0] || 'Service général',
      });
      setFormSuccess('Votre avis a été publié avec succès !');
      setShowReviewForm(false);
      setSelectedReviewRating(0);
      setReviewComment('');
      const providerReviews = await fetchPublicProviderReviews(providerId);
      setReviews(providerReviews as ProviderReview[]);
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
  if (loading) {
    return <ProviderLoadingState />;
  }

  if (!prestataire) {
    return <ProviderNotFoundState />;
  }

  return (
    <div className="public-premium-page min-h-screen bg-[#f7f6f4] pt-24">
        {formSuccess && (
          <ProviderSuccessToast message={formSuccess} onClose={() => setFormSuccess(null)} />
        )}

        <ProviderBreadcrumb displayName={displayName} />

        {/* Main Content */}
        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-20 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <AlloPrestaProviderProfileCard
                  displayName={displayName}
                  prestataire={prestataire}
                  profileUnlocked={profileUnlocked}
                  reviewsCount={reviews.length}
                  onOpenReservationFlow={openReservationFlow}
                />

                <AlloPrestaProviderServices
                  prestataire={prestataire}
                  profileUnlocked={profileUnlocked}
                  visibleServiceOptions={visibleServiceOptions}
                  onSelectService={(service) => {
                    setResForm((state) => ({ ...state, service }));
                    openReservationFlow();
                  }}
                />

                <AlloPrestaProviderReviews
                  displayName={displayName}
                  profileUnlocked={profileUnlocked}
                  reviewComment={reviewComment}
                  reviews={reviews}
                  selectedReviewRating={selectedReviewRating}
                  showReviewForm={showReviewForm}
                  onCancelReview={cancelReview}
                  onChangeComment={setReviewComment}
                  onChangeRating={setSelectedReviewRating}
                  onStartReview={() => {
                    if (!user?.id) {
                      setFormSuccess('Connectez-vous pour publier un avis.');
                      setTimeout(() => setFormSuccess(null), 5000);
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                  onSubmitReview={handleSubmitReview}
                />
              </div>

              <AlloPrestaProviderSidebar prestataire={prestataire} profileUnlocked={profileUnlocked} />
            </div>
          </div>
        </div>

        {showReservationModal && (
          <AlloPrestaProviderRequestModal
            providerName={prestataire.name}
            resForm={resForm}
            visibleServiceOptions={visibleServiceOptions}
            onClose={() => setShowReservationModal(false)}
            onFieldChange={updateReservationField}
            onSubmit={handleReservationSubmit}
          />
        )}

      </div>
  );
}
