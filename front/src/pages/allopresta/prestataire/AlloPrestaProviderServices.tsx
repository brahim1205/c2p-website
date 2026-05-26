import type { ProviderDetailRecord } from './providerDetailTypes';

export default function AlloPrestaProviderServices({
  prestataire,
  profileUnlocked,
  visibleServiceOptions,
  onSelectService,
}: {
  prestataire: ProviderDetailRecord;
  profileUnlocked: boolean;
  visibleServiceOptions: string[];
  onSelectService: (service: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[#0f1c35] text-xl font-bold sm:text-2xl">Services proposés</h3>
          <p className="mt-1 text-sm text-[#64748b]">Choisissez un besoin, C2P s’occupe du cadrage et de l’affectation.</p>
        </div>
      </div>
      <div className="grid gap-3">
        {visibleServiceOptions.map((service, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-xl border border-[#d6dbe1] p-4 transition-all hover:border-[#1a9a96]/45 hover:bg-[#fbfefe] sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-base font-bold text-[#0f1c35] sm:text-lg">{service}</h4>
                <span className="rounded-full bg-[#eefcfb] px-3 py-1 text-xs font-semibold text-[#147f7b]">
                  Cadrage inclus
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
                {profileUnlocked
                  ? `Intervention ${service.toLowerCase()} avec cadrage et suivi C2P.`
                  : 'Service présenté sous forme résumée. Le cadrage complet reste géré par C2P.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold text-[#0f1c35]">
                  {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-xs text-gray-500">par heure</div>
              </div>
              <button
                type="button"
                onClick={() => onSelectService(service)}
                aria-label={`Demander à C2P de cadrer le besoin ${service}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a9a96] px-4 py-2.5 text-sm font-semibold leading-tight text-white transition-all hover:bg-[#147f7b] cursor-pointer sm:w-auto"
              >
                <i className="ri-send-plane-line text-base"></i>
                Demander
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
