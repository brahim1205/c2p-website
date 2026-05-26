import { Link } from 'react-router-dom';
import type {
  PrestataireProvider,
  PrestataireReview,
} from '@/lib/prestataireDashboardApi';

export function PrestataireReputationPanel({
  provider,
  pendingRequestsCount,
}: {
  provider: PrestataireProvider | null;
  pendingRequestsCount: number;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Réputation</h2>
        <Link to="/dashboard/prestataire/avis" className="text-sm font-medium text-teal-600 hover:text-teal-700">
          Gérer les avis
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ReputationMetric label="Note moyenne" value={provider?.rating?.toFixed(1) || '0.0'} />
        <ReputationMetric label="Avis reçus" value={provider?.reviews_count || 0} />
        <ReputationMetric label="Prestations clôturées" value={provider?.completed_jobs || 0} />
        <ReputationMetric label="En attente" value={pendingRequestsCount} />
      </div>
    </section>
  );
}

export function PrestataireReviewsPanel({
  loading,
  provider,
  reviews,
}: {
  loading: boolean;
  provider: PrestataireProvider | null;
  reviews: PrestataireReview[];
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Avis récents</h2>
        <span className="text-sm text-gray-500">{provider?.reviews_count || 0} avis</span>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-sm text-gray-500">Chargement des avis...</p>}
        {!loading && reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-900">{review.client_name}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <i key={index} className={`ri-star-fill text-sm ${index < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReputationMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
