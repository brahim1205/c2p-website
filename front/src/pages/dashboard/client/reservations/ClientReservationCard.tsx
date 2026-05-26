import { Link } from 'react-router-dom';
import { BOOKING_STATUS_META, REQUEST_TYPE_META, getPaymentMethodLabel } from '@/lib/clientDashboard';
import {
  getAssignedProvider,
  getBookingPriceLabel,
  getBookingProviderImage,
  getBookingProviderLabel,
  type Booking,
  type Provider,
} from './clientReservationsModel';

interface ReservationCardProps {
  booking: Booking;
  providers: Record<number, Provider>;
  reviewingId: number | null;
  reviewRating: number;
  reviewComment: string;
  setReviewingId: (id: number | null) => void;
  setReviewRating: (rating: number) => void;
  setReviewComment: (comment: string) => void;
  resetReview: () => void;
  onCancel: (id: number) => void;
  onDownloadSummary: (booking: Booking) => void;
  onReviewSubmit: () => void;
  onOpenProblemReport: (bookingId: number) => void;
}

export function ReservationCard({
  booking,
  providers,
  reviewingId,
  reviewRating,
  reviewComment,
  setReviewingId,
  setReviewRating,
  setReviewComment,
  resetReview,
  onCancel,
  onDownloadSummary,
  onReviewSubmit,
  onOpenProblemReport,
}: ReservationCardProps) {
  const status = BOOKING_STATUS_META[booking.status];
  const requestType = REQUEST_TYPE_META[booking.request_type || 'booking'];
  const provider = getAssignedProvider(booking, providers);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <img
            src={getBookingProviderImage(booking, providers) || '/images/brand/image1.jpeg'}
            alt={getBookingProviderLabel(booking, providers)}
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
            <p className="mb-2 text-sm text-gray-600">{getBookingProviderLabel(booking, providers)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><i className="ri-calendar-line"></i>{booking.booking_date}</span>
              <span className="flex items-center gap-1"><i className="ri-time-line"></i>{booking.booking_time}</span>
              <span className="flex items-center gap-1"><i className="ri-map-pin-line"></i>{booking.address}</span>
              <span className="flex items-center gap-1"><i className="ri-wallet-3-line"></i>{getPaymentMethodLabel(booking.payment_method)}</span>
              <span className="font-medium text-gray-700">{getBookingPriceLabel(booking)}</span>
            </div>
            {booking.description ? (
              <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{booking.description}</p>
            ) : null}
          </div>
        </div>

        <ReservationActions
          booking={booking}
          setReviewingId={setReviewingId}
          onCancel={onCancel}
          onDownloadSummary={onDownloadSummary}
          onOpenProblemReport={onOpenProblemReport}
        />
      </div>

      {reviewingId === booking.id ? (
        <ReservationReviewForm
          providerName={provider?.name || 'Prestataire assigné'}
          reviewRating={reviewRating}
          reviewComment={reviewComment}
          setReviewRating={setReviewRating}
          setReviewComment={setReviewComment}
          resetReview={resetReview}
          onReviewSubmit={onReviewSubmit}
        />
      ) : null}
    </div>
  );
}

function ReservationActions({
  booking,
  setReviewingId,
  onCancel,
  onDownloadSummary,
  onOpenProblemReport,
}: Pick<ReservationCardProps, 'setReviewingId' | 'onCancel' | 'onDownloadSummary' | 'onOpenProblemReport'> & { booking: Booking }) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      {(booking.status === 'confirmed' || booking.status === 'pending') ? (
        <button
          type="button"
          onClick={() => void onCancel(booking.id)}
          className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Annuler
        </button>
      ) : null}

      {booking.status === 'in_progress' ? (
        <button
          type="button"
          onClick={() => onOpenProblemReport(booking.id)}
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
        >
          Signaler un problème
        </button>
      ) : null}

      {(booking.status === 'completed' || booking.status === 'confirmed') ? (
        <button
          type="button"
          onClick={() => onDownloadSummary(booking)}
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
            onClick={() => onOpenProblemReport(booking.id)}
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
  );
}

function ReservationReviewForm({
  providerName,
  reviewRating,
  reviewComment,
  setReviewRating,
  setReviewComment,
  resetReview,
  onReviewSubmit,
}: Pick<ReservationCardProps, 'reviewRating' | 'reviewComment' | 'setReviewRating' | 'setReviewComment' | 'resetReview' | 'onReviewSubmit'> & { providerName: string }) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h4 className="mb-2 text-sm font-semibold text-gray-900">Noter {providerName}</h4>
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
          onClick={() => void onReviewSubmit()}
          className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600"
        >
          Publier l’avis
        </button>
        <button
          type="button"
          onClick={resetReview}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
