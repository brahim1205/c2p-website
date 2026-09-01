import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  notifyAdminPublicAlloPrestaRequest,
} from '@/hooks/useCreateNotification';
import {
  publishClientProviderDirectReview,
} from '@/lib/clientDashboardApi';
import { savePendingPrestationPayment } from '@/lib/paymentCheckoutStorage';
import { apiRequest } from '@/lib/api';
import { createConversation, sendConversationMessage } from '@/lib/messagingApi';
import {
  canAccessProviderProfile,
  fetchPublicProviderReviews,
  fetchPublicProvider,
  getProviderDisplayName,
  normalizeViewerAccessTier,
  type ProviderServiceItemRecord,
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
  const navigate = useNavigate();
  const providerId = String(id ?? '').trim();
  const viewerTier = normalizeViewerAccessTier(user);
  const [prestataire, setPrestataire] = useState<ProviderDetailRecord | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [requestMode, setRequestMode] = useState<'quote' | 'contact'>('quote');

  const [resForm, setResForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
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
    setRequestMode('quote');
    setShowReservationModal(true);
  };
  const contactProvider = () => {
    setRequestMode('contact');
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
            member_since: provider.created_at ? new Date(provider.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Non renseigné',
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
    if (requestMode === 'contact') {
      if (user?.id && prestataire?.user_id && prestataire.user_id !== user.id) {
        try {
          const conversation = await createConversation({
            name: displayName,
            role: prestataire.title || prestataire.category || 'Prestataire',
            avatar: prestataire.image ?? undefined,
            participants: [user.id, prestataire.user_id],
            type: 'individual',
            members: 2,
          });
          const message = [
            `Bonjour, je souhaite vous contacter depuis AlloPresta.`,
            `Service: ${resForm.service || prestataire.services[0] || 'Service général'}`,
            '',
            resForm.description,
          ].filter(Boolean).join('\n');
          await sendConversationMessage(conversation.id, message);
          setShowReservationModal(false);
          setResForm({ customerName: '', customerEmail: '', customerPhone: '', service: '', date: '', description: '', budget: '', address: '' });
          navigate(`/dashboard/messages?conversation=${encodeURIComponent(conversation.id)}`);
          return;
        } catch (err) {
          console.error(err);
          setFormSuccess('Impossible d’ouvrir la conversation. Votre message va être transmis à C2P.');
        }
      }
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          firstName: user?.firstName || 'Visiteur',
          lastName: user?.lastName || resForm.customerName || 'AlloPresta',
          email: user?.email || resForm.customerEmail,
          subject: `Contact prestataire - ${prestataire?.name || 'Prestataire C2P'}`,
          message: [
            `Demandeur: ${user ? `${user.firstName} ${user.lastName}` : resForm.customerName}`,
            `Email: ${user?.email || resForm.customerEmail}`,
            `Téléphone: ${user?.phone || resForm.customerPhone}`,
            `Prestataire: ${prestataire?.name || displayName}`,
            `Service: ${resForm.service || prestataire?.services[0] || 'Service général'}`,
            '',
            resForm.description,
          ].filter(Boolean).join('\n'),
        }),
      }, { retryOnAuth: false });
      await notifyAdminPublicAlloPrestaRequest(
        user ? `${user.firstName} ${user.lastName}` : 'Visiteur AlloPresta',
        prestataire?.name || 'un prestataire',
        user?.avatar,
      );
      setFormSuccess('Votre message a été transmis à C2P. L’équipe vous orientera vers le bon contact.');
      setShowReservationModal(false);
      setResForm({ customerName: '', customerEmail: '', customerPhone: '', service: '', date: '', description: '', budget: '', address: '' });
      setTimeout(() => setFormSuccess(null), 5000);
      return;
    }

    if (!user?.id) {
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          firstName: resForm.customerName || 'Visiteur',
          lastName: 'AlloPresta',
          email: resForm.customerEmail,
          subject: `Demande de devis - ${prestataire?.name || 'Prestataire C2P'}`,
          message: [
            `Demandeur: ${resForm.customerName}`,
            `Email: ${resForm.customerEmail}`,
            `Téléphone: ${resForm.customerPhone}`,
            `Prestataire: ${prestataire?.name || displayName}`,
            `Service: ${resForm.service || prestataire?.services[0] || 'Service général'}`,
            `Date souhaitée: ${resForm.date || 'Non renseignée'}`,
            `Adresse: ${resForm.address || 'Non renseignée'}`,
            `Budget: ${resForm.budget || 'Non renseigné'} FCFA`,
            '',
            resForm.description,
          ].filter(Boolean).join('\n'),
        }),
      }, { retryOnAuth: false });
      await notifyAdminPublicAlloPrestaRequest(
        'Visiteur devis AlloPresta',
        prestataire?.name || 'un prestataire',
        undefined,
      );
      setFormSuccess('Votre demande de devis a été transmise à C2P. L’équipe va vous recontacter.');
      setShowReservationModal(false);
      setResForm({ customerName: '', customerEmail: '', customerPhone: '', service: '', date: '', description: '', budget: '', address: '' });
      setTimeout(() => setFormSuccess(null), 5000);
      return;
    }
    try {
      const service = resForm.service || prestataire?.services[0] || 'Service général';
      savePendingPrestationPayment({
        user,
        requestedProviderId: providerId,
        service,
        description: resForm.description,
        bookingDate: resForm.date,
        bookingTime: '09:00',
        paymentMethod: 'wallet',
        address: resForm.address,
        requestType: 'quote',
        price: Number(resForm.budget) || prestataire?.price_per_hour || 0,
        returnTo: '/dashboard/client/reservations',
        label: 'Demande de devis',
      });
      await notifyAdminPublicAlloPrestaRequest(
        user ? `${user.firstName} ${user.lastName}` : 'Un visiteur',
        prestataire?.name || 'un prestataire',
        user?.avatar,
      );
      setFormSuccess('Votre demande est prête. Finalisez le paiement pour la transmettre à C2P.');
      setShowReservationModal(false);
      navigate(`/paiement?type=prestation&returnTo=${encodeURIComponent('/dashboard/client/reservations')}`);
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
  const serviceCards: ProviderServiceItemRecord[] = prestataire
    ? (
        prestataire.service_items.length
          ? prestataire.service_items.filter((item) => String(item.title ?? '').trim().length > 0)
          : visibleServiceOptions.map((service) => ({
              title: service,
              description: prestataire.bio || undefined,
              location: prestataire.location || undefined,
              image: prestataire.image || undefined,
              category: prestataire.category || undefined,
              price: prestataire.price_per_hour || undefined,
            }))
      )
    : [];
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
                  onContactProvider={contactProvider}
                  onOpenReservationFlow={openReservationFlow}
                />

                <AlloPrestaProviderServices
                  prestataire={prestataire}
                  serviceCards={serviceCards}
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
            mode={requestMode}
            providerName={prestataire.name}
            requesterRequired={!user?.id}
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
