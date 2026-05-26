import { Link } from 'react-router-dom';
import type { BookingRequestType } from '@/lib/clientDashboard';
import type { ClientPrestataire as Prestataire } from '@/lib/clientDashboardApi';
import { formatAvailability } from './clientPrestatairesModel';

export function ClientProviderCard({
  isFavorite,
  openRequestModal,
  provider,
  toggleFavorite,
}: {
  isFavorite: boolean;
  openRequestModal: (provider: Prestataire, requestType: BookingRequestType) => void;
  provider: Prestataire;
  toggleFavorite: (provider: Prestataire) => void | Promise<void>;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <img src={provider.avatar} alt={provider.name} className="h-44 w-full object-cover object-top" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {provider.verified ? (
            <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
              <i className="ri-shield-check-line mr-1"></i>
              Vérifié
            </span>
          ) : null}
          {provider.distanceKm !== null ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700">
              <i className="ri-map-pin-range-line mr-1"></i>
              {provider.distanceKm} km
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void toggleFavorite(provider)}
          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
            isFavorite ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-white/70 bg-white/90 text-gray-500 hover:text-pink-600'
          }`}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <i className={`${isFavorite ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`}></i>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
            <p className="text-sm text-gray-500">{provider.title}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${provider.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {formatAvailability(provider)}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <i className="ri-star-fill text-yellow-500"></i>
            <strong className="text-gray-900">{provider.rating.toFixed(1)}</strong> ({provider.reviews} avis)
          </span>
          <span className="flex items-center gap-1">
            <i className="ri-map-pin-line"></i>
            {provider.location}
          </span>
        </div>

        <p className="mb-3 text-sm text-gray-700">{provider.service}</p>

        <div className="mb-3 flex flex-wrap gap-2">
          {provider.categories.slice(0, 3).map((category) => (
            <span key={category} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{category}</span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <Link to={`/allopresta/prestataire/${provider.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
            Voir le profil
          </Link>
          <button
            type="button"
            onClick={() => openRequestModal(provider, 'booking')}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Contacter
          </button>
        </div>
      </div>
    </article>
  );
}
