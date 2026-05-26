import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadSimplePdf } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import {
  cancelClientBooking,
  fetchClientBookingsWithProviders,
  publishClientProviderReview,
  submitClientIssueReport,
} from '@/lib/clientDashboardApi';
import {
  EMPTY_REPORT_FORM,
  buildBookingSummaryLines,
  getRequestedProvider,
  type Booking,
  type Provider,
  type ReportForm,
  type ReservationStatusFilter,
} from './clientReservationsModel';

export function useClientReservationsSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>('all');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reportForm, setReportForm] = useState<ReportForm>(EMPTY_REPORT_FORM);

  const reservationsQuery = useQuery({
    queryKey: queryKeys.client.reservations(user?.id),
    queryFn: () => fetchClientBookingsWithProviders(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (reservationsQuery.isError) {
      console.error(reservationsQuery.error);
      error('Erreur', 'Impossible de charger vos réservations.');
    }
  }, [error, reservationsQuery.error, reservationsQuery.isError]);

  const bookings: Booking[] = useMemo(() => reservationsQuery.data?.bookings ?? [], [reservationsQuery.data?.bookings]);
  const providers: Record<number, Provider> = useMemo(() => reservationsQuery.data?.providers ?? {}, [reservationsQuery.data?.providers]);

  const filteredBookings = useMemo(
    () => (statusFilter === 'all' ? bookings : bookings.filter((booking) => booking.status === statusFilter)),
    [bookings, statusFilter],
  );

  const reportTarget = reportForm.bookingId ? bookings.find((item) => item.id === reportForm.bookingId) : null;

  const resetReview = () => {
    setReviewingId(null);
    setReviewRating(0);
    setReviewComment('');
  };

  const closeProblemReport = () => {
    setReportForm(EMPTY_REPORT_FORM);
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelClientBooking(id);

      await queryClient.invalidateQueries({ queryKey: queryKeys.client.reservations(user?.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.client.dashboard(user?.id) });
      success('Réservation annulée', 'Votre réservation a été annulée.');
    } catch (cancelError) {
      console.error(cancelError);
      error('Erreur', 'Impossible d annuler cette réservation.');
    }
  };

  const handleDownloadSummary = (booking: Booking) => {
    downloadSimplePdf(`reservation-${booking.id}.pdf`, {
      title: `Reservation #${booking.id}`,
      lines: buildBookingSummaryLines(booking, providers),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.client.reservations(user.id) });
      resetReview();
    } catch (reviewSubmitError) {
      console.error(reviewSubmitError);
      error('Erreur', 'Impossible de publier votre avis.');
    }
  };

  const openProblemReport = (bookingId: number) => {
    setReportForm({
      ...EMPTY_REPORT_FORM,
      bookingId,
    });
  };

  const submitProblemReport = async () => {
    if (!reportForm.bookingId || !reportForm.reason.trim() || !reportForm.description.trim() || !user) {
      error('Champs requis', 'Renseignez le motif et la description du problème.');
      return;
    }

    const booking = bookings.find((item) => item.id === reportForm.bookingId);
    if (!booking) return;
    const provider = booking.provider_id ? providers[booking.provider_id] : getRequestedProvider(booking, providers);

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
      closeProblemReport();
    } catch (reportSubmitError) {
      console.error(reportSubmitError);
      error('Erreur', 'Impossible d envoyer le signalement.');
    }
  };

  return {
    loading: reservationsQuery.isLoading,
    statusFilter,
    setStatusFilter,
    bookings,
    filteredBookings,
    providers,
    reviewingId,
    setReviewingId,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    reportForm,
    setReportForm,
    reportTarget,
    resetReview,
    closeProblemReport,
    handleCancel,
    handleDownloadSummary,
    handleReview,
    openProblemReport,
    submitProblemReport,
  };
}
