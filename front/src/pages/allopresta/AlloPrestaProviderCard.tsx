import { Link } from 'react-router-dom';
import {
  getProviderDisplayName,
  getProviderTierLabel,
  getProviderVisibilityLabel,
  type ProviderCatalogRecord,
} from '@/lib/providerApi';

function isTechnicalTestServiceTitle(title: string) {
  return /^publication directe service\b/i.test(title.trim())
    || /^smoke service admin\b/i.test(title.trim());
}

export default function AlloPrestaProviderCard({
  prestataire,
  viewerTier,
  onQuoteRequest,
}: {
  prestataire: ProviderCatalogRecord;
  viewerTier: Parameters<typeof getProviderDisplayName>[1];
  onQuoteRequest: (prestataire: ProviderCatalogRecord) => void;
}) {
  const primaryService = prestataire.display_service ?? prestataire.services[0] ?? prestataire.title ?? 'Service professionnel';
  const secondaryServices = prestataire.services
    .filter((service) => service !== primaryService && !isTechnicalTestServiceTitle(service))
    .slice(0, 3);
  const remainingServicesCount = Math.max(prestataire.services.length - secondaryServices.length - 1, 0);
  const cardImage = prestataire.display_image || prestataire.image || '/images/brand/image7.jpeg';
  const cardLocation = prestataire.display_location || prestataire.location;
  const cardPrice = prestataire.display_price || prestataire.price_range;

  return (
    <article className="group overflow-hidden rounded-[24px] border border-[#d6dbe1] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#1a9a96]/40 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]">
      <div className="relative h-40 w-full overflow-hidden sm:h-64">
        <img
          src={cardImage}
          alt={primaryService}
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
              {primaryService}
            </h3>
            {prestataire.title && prestataire.title !== primaryService ? (
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-[#1a9a96]">
                {prestataire.title}
              </p>
            ) : null}
            <p className="text-sm text-[#64748b]">{getProviderDisplayName(prestataire, viewerTier)}</p>
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
          <span>{cardLocation}</span>
        </div>

        {secondaryServices.length > 0 || remainingServicesCount > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {secondaryServices.map((service) => (
              <span
                key={service}
                className="rounded-full border border-[#cde8e6] bg-[#f3fbfb] px-2.5 py-1 text-[11px] font-medium text-[#147f7b] sm:text-xs"
              >
                {service}
              </span>
            ))}
            {remainingServicesCount > 0 ? (
              <span className="rounded-full border border-[#d6dbe1] bg-[#f7f6f4] px-2.5 py-1 text-[11px] font-medium text-[#64748b] sm:text-xs">
                +{remainingServicesCount} autre{remainingServicesCount > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        ) : null}

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

        <div className="rounded-2xl border border-[#d9eeee] bg-[#f7fcfc] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#64748b]">Demande de devis</span>
            <span className="text-sm font-semibold text-[#0f1c35]">{cardPrice}</span>
          </div>
          <button
            type="button"
            onClick={() => onQuoteRequest(prestataire)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1a9a96] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#147f7b]"
          >
            Demander un devis
          </button>
        </div>

        <div className="mt-3 flex justify-end">
          <Link
            to={`/allopresta/prestataire/${prestataire.id}`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#cde8e6] px-4 py-2.5 text-sm font-medium text-[#1a9a96] transition-colors hover:bg-[#f3fbfb] sm:w-auto"
          >
            Voir le profil
          </Link>
        </div>
      </div>
    </article>
  );
}
