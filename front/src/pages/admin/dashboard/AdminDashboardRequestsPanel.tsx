import { formatShortCurrency } from '@/lib/formatters';
import type {
  Booking,
  ProviderOption,
} from './adminDashboardContentModel';

export function C2PRequestsPanel({
  assigningBookingId,
  getRequestedProviderLabel,
  getSuggestedProviderId,
  loading,
  onAssignProvider,
  onSelectProvider,
  pendingC2PRequests,
  providers,
}: {
  assigningBookingId: number | null;
  getRequestedProviderLabel: (booking: Booking) => string;
  getSuggestedProviderId: (booking: Booking) => string;
  loading: boolean;
  onAssignProvider: (booking: Booking) => void;
  onSelectProvider: (bookingId: number, providerId: string) => void;
  pendingC2PRequests: Booking[];
  providers: ProviderOption[];
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Demandes client via C2P</h2>
          <p className="text-sm text-gray-500">C2P reçoit, analyse puis attribue chaque mission à un prestataire.</p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          {pendingC2PRequests.length} en attente
        </span>
      </div>

      <div className="space-y-3">
        {loading ? <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Chargement des demandes...</p> : null}
        {!loading && pendingC2PRequests.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">Aucune demande client en attente d’assignation.</p>
        ) : null}
        {!loading && pendingC2PRequests.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-gray-200 px-4 py-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{booking.service || 'Mission client'}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {booking.client_name || 'Client'} · {booking.booking_date || 'Date à confirmer'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Préférence client : {getRequestedProviderLabel(booking)}
                </p>
                {booking.matching_candidates && booking.matching_candidates.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {booking.matching_candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectProvider(booking.id, String(candidate.id))}
                        aria-pressed={getSuggestedProviderId(booking) === String(candidate.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          getSuggestedProviderId(booking) === String(candidate.id)
                            ? 'border-teal-300 bg-teal-50 text-teal-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-teal-200'
                        }`}
                      >
                        {candidate.name} · score {candidate.score}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-gray-600">
                <div>{formatShortCurrency(Number(booking.price || 0))}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Commission {Number(booking.platform_fee_amount || 0).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center">
              <select
                value={getSuggestedProviderId(booking)}
                onChange={(event) => onSelectProvider(booking.id, event.target.value)}
                aria-label={`Choisir un prestataire pour ${booking.service || 'cette mission'}`}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Choisir un prestataire</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}{provider.category ? ` · ${provider.category}` : ''}{provider.verified ? ' · vérifié' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onAssignProvider(booking)}
                aria-label={`Assigner le prestataire sélectionné à ${booking.service || 'la mission'}`}
                disabled={assigningBookingId === booking.id}
                className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigningBookingId === booking.id ? 'Assignation...' : 'Assigner'}
              </button>
            </div>
            {booking.matching_candidates?.[0]?.reasons?.length ? (
              <p className="mt-3 text-xs text-gray-500">
                Suggestion IA C2P : {booking.matching_candidates[0].reasons?.join(' · ')}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
