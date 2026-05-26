import type { PrestataireBooking as Booking } from '@/lib/prestataireDashboardApi';
import {
  prestataireDemandStatusFilters,
  type getPrestataireDemandStats,
  type PrestataireDemandStatusFilter,
} from './prestataireDemandesModel';

export function PrestataireStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Analyse C2P',
    confirmed: 'Acceptée',
    in_progress: 'En cours',
    completed: 'Terminée',
    declined: 'Refusée',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

export function PrestataireRequestTypeBadge({ requestType }: { requestType?: Booking['request_type'] }) {
  const styles: Record<string, string> = {
    booking: 'bg-teal-100 text-teal-700',
    quote: 'bg-amber-100 text-amber-700',
    appointment: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    booking: 'Commande',
    quote: 'Devis',
    appointment: 'Rendez-vous',
  };
  const key = requestType || 'booking';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[key] || 'bg-gray-100 text-gray-700'}`}>
      {labels[key] || 'Commande'}
    </span>
  );
}

export function PrestataireDemandStatsCards({ stats }: { stats: ReturnType<typeof getPrestataireDemandStats> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {[
        { label: 'En attente', value: stats.pending, icon: 'ri-time-line', color: 'bg-amber-500' },
        { label: 'Acceptées', value: stats.confirmed, icon: 'ri-check-line', color: 'bg-blue-500' },
        { label: 'En cours', value: stats.in_progress, icon: 'ri-loader-4-line', color: 'bg-purple-500' },
        { label: 'Terminées', value: stats.completed, icon: 'ri-checkbox-circle-line', color: 'bg-green-500' },
        { label: 'Refusées', value: stats.declined, icon: 'ri-close-circle-line', color: 'bg-red-500' },
      ].map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${stat.icon} text-white text-sm`}></i>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrestataireDemandFilters(props: {
  statusFilter: PrestataireDemandStatusFilter;
  onStatusFilterChange: (filter: PrestataireDemandStatusFilter) => void;
}) {
  const { statusFilter, onStatusFilterChange } = props;
  return (
    <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto" role="group" aria-label="Filtrer les missions par statut">
      {prestataireDemandStatusFilters.map((filter) => (
        <button
          type="button"
          key={filter}
          onClick={() => onStatusFilterChange(filter)}
          aria-pressed={statusFilter === filter}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            statusFilter === filter ? 'bg-[#5fa6f3] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {filter === 'all' ? 'Toutes' : filter === 'pending' ? 'Analyse C2P' : filter === 'confirmed' ? 'Attribuées' : filter === 'in_progress' ? 'En cours' : filter === 'completed' ? 'Terminées' : 'Refusées'}
        </button>
      ))}
    </div>
  );
}

function PrestataireDemandActions(props: {
  request: Booking;
  compact?: boolean;
  onOpenDetail: (request: Booking) => void;
  onUpdateStatus: (id: number, status: Booking['status']) => void;
}) {
  const { request, compact, onOpenDetail, onUpdateStatus } = props;
  const buttonBase = compact
    ? 'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors'
    : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap';

  return (
    <div className={compact ? 'mt-4 flex flex-wrap gap-2' : 'flex items-center justify-end gap-2'}>
      {request.status === 'confirmed' && (
        <>
          <button
            type="button"
            onClick={() => onUpdateStatus(request.id, 'in_progress')}
            className={`${buttonBase} bg-purple-600 text-white hover:bg-purple-700`}
          >
            Démarrer
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(request.id, 'declined')}
            className={`${buttonBase} border border-red-200 text-red-600 hover:bg-red-50`}
          >
            Refuser
          </button>
        </>
      )}
      {request.status === 'in_progress' && (
        <button
          type="button"
          onClick={() => onUpdateStatus(request.id, 'completed')}
          className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
        >
          Terminer
        </button>
      )}
      <button
        type="button"
        onClick={() => onOpenDetail(request)}
        aria-label={`Voir les détails de la mission ${request.service} pour ${request.client_name}`}
        className={compact
          ? `${buttonBase} border border-gray-200 text-gray-700 hover:bg-gray-50`
          : 'w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors'}
        title="Détails"
      >
        {compact ? 'Détails' : <i className="ri-eye-line text-gray-600 text-sm"></i>}
      </button>
    </div>
  );
}

export function PrestataireRequestsList(props: {
  requests: Booking[];
  onOpenDetail: (request: Booking) => void;
  onUpdateStatus: (id: number, status: Booking['status']) => void;
}) {
  const { requests, onOpenDetail, onUpdateStatus } = props;
  return (
    <>
      <div className="space-y-4 p-4 md:hidden">
        {requests.map((request) => (
          <article key={request.id} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{request.client_name}</p>
                {request.client_email && <p className="text-xs text-gray-500">{request.client_email}</p>}
              </div>
              <PrestataireStatusBadge status={request.status} />
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <PrestataireRequestTypeBadge requestType={request.request_type} />
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{request.service}</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Budget</dt>
                <dd className="font-medium text-gray-900">{request.price ? `${Number(request.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Date</dt>
                <dd className="font-medium text-gray-900">{request.booking_date}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Localisation</dt>
                <dd className="font-medium text-gray-900">{request.address || 'Non précisé'}</dd>
              </div>
            </dl>
            <PrestataireDemandActions compact request={request} onOpenDetail={onOpenDetail} onUpdateStatus={onUpdateStatus} />
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Localisation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#5fa6f3]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#5fa6f3] font-medium text-sm">{request.client_name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{request.client_name}</p>
                      {request.client_email && <p className="text-xs text-gray-500">{request.client_email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">{request.service}</p>
                    <PrestataireRequestTypeBadge requestType={request.request_type} />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.price ? `${Number(request.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{request.address || 'Non précisé'}</td>
                <td className="px-4 py-3"><PrestataireStatusBadge status={request.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-600">{request.booking_date}</td>
                <td className="px-4 py-3">
                  <PrestataireDemandActions request={request} onOpenDetail={onOpenDetail} onUpdateStatus={onUpdateStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
