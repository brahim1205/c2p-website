import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';
import ServiceStatusBadge from './ServiceStatusBadge';

interface PrestataireServiceCardProps {
  service: Service;
  subscriptionAllowed: boolean;
  onDeleteRequest: (service: Service) => void;
  onEditRequest: (service: Service) => void;
  onToggleStatus: (service: Service) => void;
}

export default function PrestataireServiceCard({
  service,
  subscriptionAllowed,
  onDeleteRequest,
  onEditRequest,
  onToggleStatus,
}: PrestataireServiceCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-40 sm:h-44 overflow-hidden">
        <img src={service.image || '/images/home/mechanic-with-spanners-pockets-optimized.webp'} alt={service.title} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3">
          <ServiceStatusBadge status={service.status} />
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">{service.category}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-2">{service.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-900">{service.price}</span>
          <div className="flex items-center gap-1">
            {service.rating > 0 && (
              <>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-star-fill text-yellow-500 text-sm"></i>
                </div>
                <span className="text-sm font-medium text-gray-700">{service.rating}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <i className="ri-map-pin-line"></i>{service.location}
          </span>
          <span className="flex items-center gap-1">
            <i className="ri-calendar-check-line"></i>{service.bookings} réservations
          </span>
        </div>
        <div className="flex gap-2">
          {service.status !== 'pending' && (
            <button
              type="button"
              onClick={() => onToggleStatus(service)}
              aria-label={`${service.status === 'active' ? 'Mettre en pause' : 'Réactiver'} le service ${service.title}`}
              disabled={!subscriptionAllowed}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                !subscriptionAllowed
                  ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                  : service.status === 'active'
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              {service.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditRequest(service)}
            aria-label={`Modifier le service ${service.title}`}
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-edit-line"></i>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(service)}
            aria-label={`Supprimer le service ${service.title}`}
            className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-delete-bin-line"></i>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
