import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { downloadSimplePdf } from '@/lib/downloads';
import { BOOKING_STATUS_META, REQUEST_TYPE_META, getPaymentMethodLabel, type BookingRequestType, type BookingStatus } from '@/lib/clientDashboard';
import {
  cancelClientBooking,
  fetchClientBookingsWithProviders,
  publishClientProviderReview,
  submitClientIssueReport,
  type ClientDashboardBooking as Booking,
  type ClientDashboardProvider as Provider,
} from '@/lib/clientDashboardApi';

interface ReportForm {
  bookingId: number | null;
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export default function ClientReservationsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<number, Provider>>({});
  const [reportForm, setReportForm] = useState<ReportForm>({
    bookingId: null,
    reason: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setBookings([]);
        setProviders({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snapshot = await fetchClientBookingsWithProviders(user.id);
        setBookings(snapshot.bookings);
        setProviders(snapshot.providers);
      } catch (fetchError) {
        console.error(fetchError);
        error('Erreur', 'Impossible de charger vos réservations.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [error, user?.id]);

  const filtered = useMemo(() => (
    statusFilter === 'all' ? bookings : bookings.filter((booking) => booking.status === statusFilter)
  ), [bookings, statusFilter]);

  const getRequestedProvider = (booking: Booking) => {
    if (booking.requested_provider_id) {
      return providers[booking.requested_provider_id] || booking.requested_provider || null;
    }
    return booking.requested_provider || null;
  };

  const getAssignedProvider = (booking: Booking) => {
    if (booking.provider_id) {
      return providers[booking.provider_id] || booking.provider || null;
    }
    return booking.provider || null;
  };

  const getBookingProviderLabel = (booking: Booking) => {
    const assignedProvider = getAssignedProvider(booking);
    if (assignedProvider?.name) {
      return assignedProvider.name;
    }

    const requestedProvider = getRequestedProvider(booking);
    if (requestedProvider?.name || booking.requested_provider_name) {
      return `${requestedProvider?.name || booking.requested_provider_name} · demande transmise à C2P`;
    }

    return 'Assignation en cours par C2P';
  };

  const getBookingProviderImage = (booking: Booking) => {
    return getAssignedProvider(booking)?.image || getRequestedProvider(booking)?.image || null;
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelClientBooking(id);

      setBookings((current) => current.map((booking) => (
        booking.id === id ? { ...booking, status: 'cancelled' } : booking
      )));
      success('Réservation annulée', 'Votre réservation a été annulée.');
    } catch (cancelError) {
      console.error(cancelError);
      error('Erreur', 'Impossible d annuler cette réservation.');
    }
  };

  const handleDownloadSummary = (booking: Booking) => {
    const assignedProvider = getAssignedProvider(booking);
    const requestedProvider = getRequestedProvider(booking);
    const providerName = assignedProvider?.name || requestedProvider?.name || booking.requested_provider_name || 'Assignation C2P en cours';
    downloadSimplePdf(`reservation-${booking.id}.pdf`, {
      title: `Reservation #${booking.id}`,
      lines: [
        `Traitement : ${providerName}`,
        `Type : ${REQUEST_TYPE_META[booking.request_type || 'booking'].label}`,
        `Service : ${booking.service}`,
        `Date : ${booking.booking_date} à ${booking.booking_time}`,
        `Adresse : ${booking.address || 'Non précisée'}`,
        `Paiement : ${getPaymentMethodLabel(booking.payment_method)}`,
        `Montant : ${booking.price ? `${Number(booking.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}`,
        '',
        'Besoin prestateur :',
        booking.description || 'Aucun détail complémentaire.',
      ],
    });
    success('Récapitulatif téléchargé', `Le PDF de la réservation #${booking.id} est prêt.`);
  };

  const handleReview = async () => {
    if (reviewRating === 0 || !reviewComment.trim() || !reviewingId || !user) return;
    const booking = bookings.find((item) => item.id === reviewingId);
    if (!booking?.provider_id) {
      error('Avis indisponible', 'Aucun prestataire assigné sur cette prestation.');
      return;
    }
    const provider = providers[booking.provider_id];

    try {
      await publishClientProviderReview({
        booking,
        user,
        providerUserId: provider?.user_id,
        rating: reviewRating,
        comment: reviewComment,
      });

      success('Avis publié', 'Merci pour votre retour.');
      setReviewingId(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (reviewSubmitError) {
      console.error(reviewSubmitError);
      error('Erreur', 'Impossible de publier votre avis.');
    }
  };

  const openProblemReport = (bookingId: number) => {
    setReportForm({
      bookingId,
      reason: '',
      description: '',
      priority: 'medium',
    });
  };

  const submitProblemReport = async () => {
    if (!reportForm.bookingId || !reportForm.reason.trim() || !reportForm.description.trim() || !user) {
      error('Champs requis', 'Renseignez le motif et la description du problème.');
      return;
    }

    const booking = bookings.find((item) => item.id === reportForm.bookingId);
    if (!booking) return;
    const provider = booking.provider_id ? providers[booking.provider_id] : getRequestedProvider(booking);

    try {
      await submitClientIssueReport({
        user,
        targetId: booking.id,
        targetTable: 'bookings',
        targetLabel: provider?.name || booking.service,
        type: 'Prestation',
        reason: reportForm.reason,
        description: `${reportForm.description.trim()}\n\nRéservation #${booking.id} - ${booking.service}`,
        priority: reportForm.priority,
        adminMessage: `${user.firstName} ${user.lastName} a signalé un problème sur "${booking.service}".`,
        userMessage: `Votre signalement sur "${booking.service}" a bien été transmis à l’administration.`,
        userLink: '/dashboard/client/reservations',
      });

      success('Signalement envoyé', 'Le support a reçu votre signalement.');
      setReportForm({ bookingId: null, reason: '', description: '', priority: 'medium' });
    } catch (reportSubmitError) {
      console.error(reportSubmitError);
      error('Erreur', 'Impossible d envoyer le signalement.');
    }
  };

  const reportTarget = reportForm.bookingId ? bookings.find((item) => item.id === reportForm.bookingId) : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client / Prestateur', path: '/dashboard/client' }, { label: 'Mes réservations' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-600">Suivi prestateur</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Mes réservations</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
              Vos rendez-vous, devis et prestations sont regroupés dans une vue simple, avec des actions claires.
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Filtres de suivi</h2>
            <p className="text-sm text-gray-500">Choisissez un statut pour réduire la liste sans perdre la lecture globale.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          {(['all', 'confirmed', 'pending', 'in_progress', 'completed', 'declined', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${statusFilter === status ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'Toutes' : BOOKING_STATUS_META[status].label}
            </button>
          ))}
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={4} />
          </div>
        ) : (
          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Réservations visibles</h2>
                <p className="text-sm text-gray-500">Les informations essentielles restent visibles en premier, les actions suivent en bas de carte.</p>
              </div>
            </div>

            <div className="space-y-4">
            {filtered.map((booking) => {
              const status = BOOKING_STATUS_META[booking.status];
              const requestType = REQUEST_TYPE_META[booking.request_type || 'booking'];
              const provider = getAssignedProvider(booking);
              const priceStr = booking.price ? `${Number(booking.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis';
              return (
                <div key={booking.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 items-start gap-4">
                      <img
                        src={getBookingProviderImage(booking) || '/images/brand/image1.jpeg'}
                        alt={getBookingProviderLabel(booking)}
                        className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{booking.service}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${requestType.color}`}>
                            <i className={requestType.icon}></i>{requestType.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                            <i className={status.icon}></i>{status.label}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-gray-600">{getBookingProviderLabel(booking)}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><i className="ri-calendar-line"></i>{booking.booking_date}</span>
                          <span className="flex items-center gap-1"><i className="ri-time-line"></i>{booking.booking_time}</span>
                          <span className="flex items-center gap-1"><i className="ri-map-pin-line"></i>{booking.address}</span>
                          <span className="flex items-center gap-1"><i className="ri-wallet-3-line"></i>{getPaymentMethodLabel(booking.payment_method)}</span>
                          <span className="font-medium text-gray-700">{priceStr}</span>
                        </div>
                        {booking.description ? (
                          <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{booking.description}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {(booking.status === 'confirmed' || booking.status === 'pending') ? (
                        <button
                          type="button"
                          onClick={() => void handleCancel(booking.id)}
                          className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Annuler
                        </button>
                      ) : null}

                      {booking.status === 'in_progress' ? (
                        <button
                          type="button"
                          onClick={() => openProblemReport(booking.id)}
                          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
                        >
                          Signaler un problème
                        </button>
                      ) : null}

                      {(booking.status === 'completed' || booking.status === 'confirmed') ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadSummary(booking)}
                          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          Télécharger le récapitulatif
                        </button>
                      ) : null}

                      {booking.status === 'completed' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setReviewingId(booking.id)}
                            className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
                          >
                            Noter
                          </button>
                          <button
                            type="button"
                            onClick={() => openProblemReport(booking.id)}
                            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
                          >
                            Signaler un problème
                          </button>
                        </>
                      ) : null}

                      {(booking.status === 'cancelled' || booking.status === 'declined') ? (
                        <Link
                          to="/dashboard/client/prestataires"
                          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                        >
                          Rechercher un prestataire
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {reviewingId === booking.id ? (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900">Noter {provider?.name || 'Prestataire assigné'}</h4>
                      <div className="mb-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="flex h-8 w-8 items-center justify-center"
                          >
                            <i className={`ri-star-fill text-xl ${star <= reviewRating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Décrivez votre expérience..."
                        maxLength={500}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-yellow-500 focus:outline-none"
                        rows={3}
                      />
                      <p className="mt-1 text-right text-xs text-gray-400">{reviewComment.length}/500</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReview()}
                          className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600"
                        >
                          Publier l’avis
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReviewingId(null); setReviewRating(0); setReviewComment(''); }}
                          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
          </section>
        )}

        {!loading && filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ri-calendar-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucune réservation</h3>
            <Link to="/dashboard/client/prestataires" className="font-medium text-teal-600 hover:text-teal-700">
              Trouver un prestataire
            </Link>
          </div>
        ) : null}
      </div>

      {reportForm.bookingId && reportTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setReportForm({ bookingId: null, reason: '', description: '', priority: 'medium' })}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Signaler un problème</h3>
                <p className="text-sm text-gray-600">{reportTarget.service} · {getBookingProviderLabel(reportTarget)}</p>
              </div>
              <button onClick={() => setReportForm({ bookingId: null, reason: '', description: '', priority: 'medium' })} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500"></i>
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Motif</span>
                <input
                  type="text"
                  value={reportForm.reason}
                  onChange={(event) => setReportForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Retard, qualité, comportement..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Priorité</span>
                <select
                  value={reportForm.priority}
                  onChange={(event) => setReportForm((current) => ({ ...current, priority: event.target.value as ReportForm['priority'] }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm text-gray-600">
                <span>Description</span>
                <textarea
                  rows={5}
                  value={reportForm.description}
                  onChange={(event) => setReportForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Expliquez précisément le problème rencontré..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={() => void submitProblemReport()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
                Envoyer le signalement
              </button>
              <button onClick={() => setReportForm({ bookingId: null, reason: '', description: '', priority: 'medium' })} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
