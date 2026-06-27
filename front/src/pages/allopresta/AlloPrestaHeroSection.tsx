import { Link } from 'react-router-dom';

interface AlloPrestaHeroProps {
  providersCount: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onScrollToResults: () => void;
}

export function AlloPrestaHero({
  providersCount,
  searchQuery,
  onSearchQueryChange,
  onScrollToResults,
}: AlloPrestaHeroProps) {
  return (
    <section className="bg-[#fff4e3]">
      <div className="mx-auto max-w-7xl overflow-hidden px-5 py-10 sm:px-8 lg:px-14 lg:py-16">
        <div className="grid min-h-[590px] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffb41f]/40 bg-white/85 px-4 py-2 text-xs font-black text-[#0b0b4f] shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffb41f] text-[#0b0b4f]">
                <i className="ri-briefcase-4-line" />
              </span>
              Services vérifiés par C2P
            </div>
            <h1 className="text-[2.45rem] font-black leading-[1.02] tracking-tight text-[#08084f] sm:text-5xl lg:text-6xl">
              Trouvez le bon service, au bon prix, sans perdre de temps.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-[#5d6474]">
              Décrivez votre besoin, comparez les prestataires, puis demandez un devis directement depuis la carte du service.
            </p>

            <div className="mt-8 max-w-xl rounded-2xl border border-white/80 bg-white p-2 shadow-[0_20px_55px_rgba(255,180,31,0.15)]">
              <div className="flex min-h-12 items-center gap-3 rounded-xl bg-[#fffaf2] px-4">
                <i className="ri-search-line text-lg text-[#ff9f0a]" />
                <input
                  type="text"
                  aria-label="Rechercher un service ou un prestataire"
                  placeholder="Rechercher un service..."
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[#08084f] outline-none placeholder:text-[#8b8f9c]"
                />
                <button
                  type="button"
                  onClick={onScrollToResults}
                  aria-label="Afficher les services correspondant à la recherche"
                  className="hidden h-9 w-9 items-center justify-center rounded-lg bg-[#ffb41f] text-[#08084f] sm:flex"
                >
                  <i className="ri-arrow-right-line" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register?role=prestataire"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#08084f] px-6 py-3 text-sm font-black text-white transition hover:bg-[#111177]"
              >
                <i className="ri-briefcase-line text-lg" />
                Devenir prestataire
              </Link>
              <button
                type="button"
                onClick={onScrollToResults}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#f2d7a6] bg-white px-6 py-3 text-sm font-black text-[#08084f] transition hover:border-[#ffb41f]"
              >
                Voir les services
              </button>
            </div>
          </div>

          <div className="relative min-h-[390px] lg:min-h-[520px]">
            <div className="absolute right-3 top-5 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)]">
              <p className="text-sm font-black text-[#08084f]">4.8 <i className="ri-star-fill text-[#ffb41f]" /></p>
              <p className="text-[11px] font-medium text-[#6b7280]">avis clients</p>
            </div>

            <div className="absolute left-4 top-20 z-10 rounded-2xl bg-[#ffb41f] px-5 py-4 text-center text-[#08084f] shadow-[0_18px_40px_rgba(255,180,31,0.30)] sm:left-10">
              <i className="ri-service-line text-xl" />
              <p className="mt-1 text-2xl font-black leading-none">{providersCount || 19}+</p>
              <p className="text-[11px] font-black">services visibles</p>
            </div>

            <div className="absolute bottom-8 left-3 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)] sm:left-10">
              <p className="text-xs font-bold text-[#08084f]">Prix • localisation • avis</p>
              <p className="mt-1 text-[11px] text-[#6b7280]">C2P cadre la mise en relation</p>
            </div>

            <div className="absolute inset-x-8 bottom-2 h-[72%] rounded-t-full bg-[#ffcf63]" />
            <img
              src="/images/home/pesta.png"
              alt="Services professionnels AlloPresta"
              className="absolute bottom-10 right-0 h-[78%] w-full rounded-[28px] object-cover object-center shadow-[0_24px_70px_rgba(15,28,53,0.12)] lg:w-[86%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
