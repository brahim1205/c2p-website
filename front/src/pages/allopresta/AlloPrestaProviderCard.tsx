import { Link } from 'react-router-dom';
import {
  getProviderDisplayName,
  getProviderTierLabel,
  getProviderVisibilityLabel,
  type ProviderCatalogRecord,
} from '@/lib/providerApi';

export default function AlloPrestaProviderCard({
  prestataire,
  viewerTier,
}: {
  prestataire: ProviderCatalogRecord;
  viewerTier: Parameters<typeof getProviderDisplayName>[1];
}) {
  return (
    <Link
      to={`/allopresta/prestataire/${prestataire.id}`}
      className="group cursor-pointer overflow-hidden rounded-[24px] border border-[#d6dbe1] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#1a9a96]/40 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]"
    >
      <div className="relative h-40 w-full overflow-hidden sm:h-64">
        <img
          src={prestataire.image || '/images/home/trust.jpg'}
          alt={prestataire.name}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent"></div>
        {prestataire.verified && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#1D9BF0] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(29,155,240,0.28)] sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-verified-badge-fill"></i>
            </div>
            <span>Verifie</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-2.5 flex items-start justify-between sm:mb-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d7e6fb] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#27346b]">
                {getProviderTierLabel(prestataire.public_profile_level)}
              </span>
              <span className="rounded-full border border-[#d6dbe1] bg-[#f7f6f4] px-2.5 py-1 text-[11px] font-medium text-[#64748b]">
                {getProviderVisibilityLabel(prestataire.visibility_tier)}
              </span>
            </div>
            <h3 className="mb-1 text-base font-semibold text-[#0f1c35] sm:text-lg">
              {getProviderDisplayName(prestataire, viewerTier)}
            </h3>
            <p className="text-sm text-[#64748b]">{prestataire.title}</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-star-fill text-yellow-400 text-sm"></i>
            </div>
            <span className="text-sm font-semibold text-[#0f1c35]">
              {prestataire.rating}
            </span>
          </div>
          <span className="text-sm text-[#64748b]">
            ({prestataire.reviews} avis)
          </span>
          <span className="text-[#c6bfb2]">•</span>
          <span className="text-sm text-[#64748b]">{prestataire.completed_jobs} missions</span>
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm text-[#64748b]">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-map-pin-line"></i>
          </div>
          <span>{prestataire.location}</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {prestataire.operations_managed ? (
            <span className="rounded-full border border-[#d6dbe1] bg-[#f7fbfb] px-2.5 py-1 text-[11px] font-medium text-[#1a9a96] sm:text-xs">
              C2P gère la mise en relation
            </span>
          ) : null}
          {prestataire.plan_name ? (
            <span className="rounded-full border border-[#d6dbe1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#64748b] sm:text-xs">
              {prestataire.plan_name}
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-[#eceff3] pt-3 sm:pt-4">
          <div>
            <div className="text-lg font-semibold text-[#0f1c35] sm:text-xl">
              {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
            </div>
            <div className="text-xs text-[#94a3b8]">par heure</div>
          </div>
          <div className="text-right text-sm font-medium text-[#1a9a96]">
            Voir le profil
          </div>
        </div>
      </div>
    </Link>
  );
}
