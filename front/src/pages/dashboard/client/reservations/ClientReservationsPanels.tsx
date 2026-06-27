import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '@/components/base/Breadcrumb';
import { SkeletonList } from '@/components/base/Skeleton';
import { BOOKING_STATUS_META } from '@/lib/clientDashboard';
import {
  CLIENT_RESERVATION_STATUS_FILTERS,
  getBookingProviderLabel,
  type Booking,
  type Provider,
  type ReportForm,
  type ReservationStatusFilter,
} from './clientReservationsModel';
import { ReservationCard } from './ClientReservationCard';

interface ReservationsHeaderProps {
  statusFilter: ReservationStatusFilter;
  onStatusFilterChange: (status: ReservationStatusFilter) => void;
}

interface ReservationsListProps {
  loading: boolean;
  bookings: Booking[];
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

interface ProblemReportModalProps {
  reportForm: ReportForm;
  reportTarget: Booking | null | undefined;
  providers: Record<number, Provider>;
  setReportForm: Dispatch<SetStateAction<ReportForm>>;
  onClose: () => void;
  onSubmit: () => void;
}

export function ClientReservationsHeader({ statusFilter, onStatusFilterChange }: ReservationsHeaderProps) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard/client' }, { label: 'Mes réservations' }]} />

      <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-600">Suivi client</p>
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
          {CLIENT_RESERVATION_STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${statusFilter === status ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'Toutes' : BOOKING_STATUS_META[status].label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export function ClientReservationsList({
  loading,
  bookings,
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
}: ReservationsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonList count={4} />
      </div>
    );
  }

  if (bookings.length === 0) {
    return <EmptyReservationsState />;
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Réservations visibles</h2>
          <p className="text-sm text-gray-500">Les informations essentielles restent visibles en premier, les actions suivent en bas de carte.</p>
        </div>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <ReservationCard
            key={booking.id}
            booking={booking}
            providers={providers}
            reviewingId={reviewingId}
            reviewRating={reviewRating}
            reviewComment={reviewComment}
            setReviewingId={setReviewingId}
            setReviewRating={setReviewRating}
            setReviewComment={setReviewComment}
            resetReview={resetReview}
            onCancel={onCancel}
            onDownloadSummary={onDownloadSummary}
            onReviewSubmit={onReviewSubmit}
            onOpenProblemReport={onOpenProblemReport}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyReservationsState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <i className="ri-calendar-line text-2xl text-gray-400"></i>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucune réservation</h3>
      <Link to="/dashboard/client/prestataires" className="font-medium text-teal-600 hover:text-teal-700">
        Trouver un prestataire
      </Link>
    </div>
  );
}

export function ProblemReportModal({
  reportForm,
  reportTarget,
  providers,
  setReportForm,
  onClose,
  onSubmit,
}: ProblemReportModalProps) {
  if (!reportForm.bookingId || !reportTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer le signalement"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Signaler un problème</h3>
            <p className="text-sm text-gray-600">{reportTarget.service} · {getBookingProviderLabel(reportTarget, providers)}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
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
          <button onClick={() => void onSubmit()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
            Envoyer le signalement
          </button>
          <button onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
