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
    <article className="group overflow-hidden rounded-[22px] border border-[#e7d8c0] bg-[#fff7ec] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,28,53,0.10)]">
      <div className="relative h-56 w-full overflow-hidden">
        <img
          src={cardImage}
          alt={primaryService}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent"></div>
        <div className="absolute left-6 top-6 rounded-full bg-[#ffb41f] px-5 py-2 text-sm font-black text-[#08084f] shadow-sm">
          {cardPrice}
        </div>
        {prestataire.verified && (
          <div className="absolute right-4 top-6 flex items-center gap-1 rounded-full bg-[#87ff37] px-3 py-1.5 text-[11px] font-black text-[#08084f] shadow-sm">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-verified-badge-fill"></i>
            </div>
            <span>Vérifié</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-6 pt-6 text-center">
        <div className="mb-3 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#08084f]">
                {getProviderTierLabel(prestataire.public_profile_level)}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#626b7a]">
                {getProviderVisibilityLabel(prestataire.visibility_tier)}
              </span>
            </div>

        <h3 className="mx-auto min-h-[56px] max-w-sm text-xl font-black uppercase leading-tight text-[#141827]">
              {primaryService}
        </h3>
            {prestataire.title && prestataire.title !== primaryService ? (
          <p className="mt-2 text-base font-bold text-[#ff9f0a]">
                {prestataire.title}
              </p>
            ) : null}
        <p className="mt-2 text-sm font-medium text-[#626b7a]">{getProviderDisplayName(prestataire, viewerTier)}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-[#626b7a]">
          <div className="flex items-center gap-1 font-bold">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-star-fill text-[#141827] text-sm"></i>
            </div>
            <span>
              {prestataire.rating}
            </span>
          </div>
          <span>
            ({prestataire.reviews} avis)
          </span>
          <span className="text-[#d2c3ad]">•</span>
          <span>{prestataire.completed_jobs} missions</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#626b7a]">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-map-pin-line"></i>
          </div>
          <span>{cardLocation}</span>
        </div>

        {secondaryServices.length > 0 || remainingServicesCount > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {secondaryServices.map((service) => (
              <span
                key={service}
                className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#08084f]"
              >
                {service}
              </span>
            ))}
            {remainingServicesCount > 0 ? (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#626b7a]">
                +{remainingServicesCount} autre{remainingServicesCount > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {prestataire.operations_managed ? (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#147f7b]">
              C2P gère la mise en relation
            </span>
          ) : null}
          {prestataire.plan_name ? (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#626b7a]">
              {prestataire.plan_name}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onQuoteRequest(prestataire)}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#08084f] px-4 py-2.5 text-sm font-black uppercase text-white transition-colors hover:bg-[#111177]"
          >
            Demande de devis
          </button>
          <Link
            to={`/allopresta/prestataire/${prestataire.id}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#ffb41f] px-4 py-2.5 text-sm font-black uppercase text-[#08084f] transition-colors hover:bg-[#ffc44c]"
          >
            Voir le profil
          </Link>
        </div>
      </div>
    </article>
  );
}
