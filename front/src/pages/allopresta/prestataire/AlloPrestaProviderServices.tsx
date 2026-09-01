import type { ProviderServiceItemRecord } from '@/lib/providerApi';
import type { ProviderDetailRecord } from './providerDetailTypes';

export default function AlloPrestaProviderServices({
  prestataire,
  serviceCards,
  onSelectService,
}: {
  prestataire: ProviderDetailRecord;
  serviceCards: ProviderServiceItemRecord[];
  onSelectService: (service: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[#0f1c35] text-xl font-bold sm:text-2xl">Services proposés</h3>
          <p className="mt-1 text-sm text-[#64748b]">Touchez un service pour préremplir la demande avec les informations réellement publiées.</p>
        </div>
      </div>
      <div className="grid gap-4">
        {serviceCards.map((service, index) => {
          const serviceTitle = String(service.title || prestataire.services[index] || prestataire.title || 'Service professionnel');
          const priceValue = service.price ?? prestataire.price_per_hour ?? null;
          const priceLabel = typeof priceValue === 'number'
            ? `${priceValue.toLocaleString('fr-FR')} FCFA`
            : typeof priceValue === 'string' && priceValue.trim()
              ? priceValue
              : null;

          return (
          <button
            type="button"
            key={index}
            onClick={() => onSelectService(serviceTitle)}
            aria-label={`Préremplir la demande avec le service ${serviceTitle}`}
            className="grid w-full gap-4 rounded-2xl border border-[#d6dbe1] p-4 text-left transition-all hover:border-[#1a9a96]/45 hover:bg-[#fbfefe] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9a96] focus-visible:ring-offset-2 md:grid-cols-[160px_1fr_auto] md:items-start"
          >
            <div className="overflow-hidden rounded-xl bg-[#f5f7fb]">
              <img
                src={service.image || prestataire.image || '/images/brand/image7.jpeg'}
                alt={serviceTitle}
                className="h-32 w-full object-cover object-center md:h-full"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-base font-bold text-[#0f1c35] sm:text-lg">{serviceTitle}</h4>
                {service.category ? (
                  <span className="rounded-full bg-[#eefcfb] px-3 py-1 text-xs font-semibold text-[#147f7b]">
                    {service.category}
                  </span>
                ) : null}
              </div>
              {service.description ? (
                <p className="max-w-2xl text-sm leading-6 text-[#64748b]">{service.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 text-xs text-[#64748b]">
                {service.location || prestataire.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-map-pin-line"></i>
                    {service.location || prestataire.location}
                  </span>
                ) : null}
                {service.status ? (
                  <span className="inline-flex items-center gap-1.5">
                    <i className="ri-information-line"></i>
                    {service.status}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              {priceLabel ? (
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold text-[#0f1c35]">{priceLabel}</div>
                  {service.price_type ? (
                    <div className="text-xs text-gray-500">{service.price_type}</div>
                  ) : null}
                </div>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#147f7b]">
                Préremplir la demande
                <i className="ri-arrow-right-line text-sm"></i>
              </span>
            </div>
          </button>
        );
        })}
      </div>
    </div>
  );
}
