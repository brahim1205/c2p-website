import type { PrestataireBooking as Booking } from '@/lib/prestataireDashboardApi';
import { PrestataireStatusBadge } from './PrestataireDemandesPanels';

export function PrestataireBookingDetailModal(props: {
  request: Booking;
  onClose: () => void;
  onUpdateStatus: (id: number, status: Booking['status']) => void;
}) {
  const { request, onClose, onUpdateStatus } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" role="dialog" aria-modal="true" aria-labelledby="prestataire-booking-detail-title">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-[#5fa6f3]/10 rounded-full flex items-center justify-center">
            <span className="text-[#5fa6f3] font-bold">{request.client_name.substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h3 id="prestataire-booking-detail-title" className="text-lg font-bold text-gray-900">{request.client_name}</h3>
            <p className="text-sm text-gray-600">{request.service}</p>
            <PrestataireStatusBadge status={request.status} />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-900">{request.description || 'Aucune description'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Budget</p>
              <p className="text-sm font-medium text-gray-900">{request.price ? `${Number(request.price).toLocaleString('fr-FR')} FCFA` : 'Sur devis'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Localisation</p>
              <p className="text-sm font-medium text-gray-900">{request.address || 'Non précisé'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Date de demande</p>
              <p className="text-sm font-medium text-gray-900">{request.booking_date} à {request.booking_time}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Contact</p>
              <p className="text-sm font-medium text-gray-900">{request.client_email || 'Non renseigné'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fermer
          </button>
          {request.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateStatus(request.id, 'confirmed')}
                className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b] transition-colors"
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(request.id, 'declined')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Refuser
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
