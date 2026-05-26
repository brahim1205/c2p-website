import DashboardLayout from '../../components/DashboardLayout';
import {
  ClientReservationsHeader,
  ClientReservationsList,
  ProblemReportModal,
} from './ClientReservationsPanels';
import { useClientReservationsSession } from './useClientReservationsSession';

export default function ClientReservationsPage() {
  const session = useClientReservationsSession();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <ClientReservationsHeader
          statusFilter={session.statusFilter}
          onStatusFilterChange={session.setStatusFilter}
        />

        <ClientReservationsList
          loading={session.loading}
          bookings={session.filteredBookings}
          providers={session.providers}
          reviewingId={session.reviewingId}
          reviewRating={session.reviewRating}
          reviewComment={session.reviewComment}
          setReviewingId={session.setReviewingId}
          setReviewRating={session.setReviewRating}
          setReviewComment={session.setReviewComment}
          resetReview={session.resetReview}
          onCancel={session.handleCancel}
          onDownloadSummary={session.handleDownloadSummary}
          onReviewSubmit={session.handleReview}
          onOpenProblemReport={session.openProblemReport}
        />
      </div>

      <ProblemReportModal
        reportForm={session.reportForm}
        reportTarget={session.reportTarget}
        providers={session.providers}
        setReportForm={session.setReportForm}
        onClose={session.closeProblemReport}
        onSubmit={session.submitProblemReport}
      />
    </DashboardLayout>
  );
}
