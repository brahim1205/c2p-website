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
}: {
  prestataire: ProviderCatalogRecord;
  viewerTier: Parameters<typeof getProviderDisplayName>[1];
}) {
  const primaryService = prestataire.display_service ?? prestataire.services[0] ?? prestataire.title ?? 'Service professionnel';
  const secondaryServices = prestataire.services
    .filter((service) => service !== primaryService && !isTechnicalTestServiceTitle(service))
    .slice(0, 3);
  const remainingServicesCount = Math.max(prestataire.services.length - secondaryServices.length - 1, 0);
  const cardImage = prestataire.display_image || prestataire.image || '/images/brand/image7.jpeg';
  const cardLocation = prestataire.display_location || prestataire.location;
  const profilePath = `/allopresta/prestataire/${prestataire.id}`;

  return (
    <Link
      to={profilePath}
      aria-label={`Voir le profil ${getProviderDisplayName(prestataire, viewerTier)}`}
      className="group block overflow-hidden rounded-[22px] border border-[#e5e7eb] bg-white text-inherit transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,28,53,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1a9a96]/20"
    >
      <article>
      <div className="relative h-32 w-full overflow-hidden sm:h-56">
        <img
          src={cardImage}
          alt={primaryService}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent"></div>
        {prestataire.verified && (
          <div className="absolute right-4 top-6 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#0f766e] shadow-sm">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-verified-badge-fill"></i>
            </div>
            <span>Vérifié</span>
          </div>
        )}
      </div>

      <div className="px-3 pb-4 pt-4 text-center sm:px-5 sm:pb-6 sm:pt-6">
        <div className="mb-3 flex flex-wrap justify-center gap-1.5 sm:gap-2">
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-[#0f1c35]">
                {getProviderTierLabel(prestataire.public_profile_level)}
              </span>
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-[#626b7a]">
                {getProviderVisibilityLabel(prestataire.visibility_tier)}
              </span>
            </div>

        <h3 className="mx-auto min-h-[48px] max-w-sm text-base font-black uppercase leading-tight text-[#111827] sm:min-h-[56px] sm:text-xl">
              {primaryService}
        </h3>
            {prestataire.title && prestataire.title !== primaryService ? (
          <p className="mt-2 text-sm font-bold text-[#0f766e] sm:text-base">
                {prestataire.title}
              </p>
            ) : null}
        <p className="mt-2 line-clamp-2 text-xs font-medium text-[#626b7a] sm:text-sm">{getProviderDisplayName(prestataire, viewerTier)}</p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-[#626b7a] sm:mt-4 sm:gap-2 sm:text-sm">
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

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#626b7a] sm:text-sm">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-map-pin-line"></i>
          </div>
          <span>{cardLocation}</span>
        </div>

        {secondaryServices.length > 0 || remainingServicesCount > 0 ? (
          <div className="mt-3 hidden flex-wrap justify-center gap-2 sm:mt-4 sm:flex">
            {secondaryServices.map((service) => (
              <span
                key={service}
                className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-bold text-[#0f1c35]"
              >
                {service}
              </span>
            ))}
            {remainingServicesCount > 0 ? (
              <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-bold text-[#626b7a]">
                +{remainingServicesCount} autre{remainingServicesCount > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-4 sm:gap-2">
          {prestataire.operations_managed ? (
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-bold text-[#0f766e]">
              C2P gère la mise en relation
            </span>
          ) : null}
          {prestataire.plan_name ? (
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-bold text-[#626b7a]">
              {prestataire.plan_name}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center sm:mt-6">
          <span className="inline-flex w-full items-center justify-center rounded-full bg-[#0f1c35] px-4 py-2 text-xs font-black uppercase text-white transition-colors group-hover:bg-[#172b50] sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm">
            Voir le profil
          </span>
        </div>
      </div>
    </article>
    </Link>
  );
}
