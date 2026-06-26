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
    <section className="relative min-h-[520px] w-full overflow-hidden bg-[#ffffff]">
      <div className="absolute inset-0">
        <img
          src="/images/brand/image2.jpeg"
          alt="AlloPresta"
          className="h-full w-full object-cover object-center opacity-[0.36]"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.82)_48%,rgba(248,250,252,0.48)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent" />

      <div className="relative z-10 flex min-h-[520px] items-center px-4 pt-24 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="c2p-eyebrow mb-5">AlloPresta by C2P</p>
            <h1 className="mb-5 text-4xl font-semibold leading-tight text-[#0f1c35] sm:text-5xl">
              La marketplace de services professionnels la plus complète d'Afrique de l'Ouest.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[#64748b] sm:text-lg">
              Trouvez le bon prestataire ou proposez vos services en quelques clics.
            </p>
          </div>

          <div className="c2p-panel mt-10 max-w-4xl p-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white/82 px-4">
                <div className="flex h-6 w-6 items-center justify-center">
                  <i className="ri-search-line text-xl text-[#27346b]" />
                </div>
                <input
                  type="text"
                  aria-label="Rechercher un service ou un prestataire"
                  placeholder="Rechercher un service ou un prestataire..."
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  className="c2p-input flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0"
                />
              </div>
              <button
                type="button"
                onClick={onScrollToResults}
                aria-label="Afficher les services correspondant à la recherche"
                className="c2p-btn-accent inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-8 py-4 text-center"
              >
                <i className="ri-search-line text-lg" />
                Chercher service
              </button>
              <Link
                to="/auth/register?role=prestataire"
                className="c2p-btn-secondary inline-flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-8 py-4 text-center"
              >
                <i className="ri-briefcase-line text-lg" />
                Devenir prestataire
              </Link>
            </div>
          </div>

          <p className="mt-5 text-sm text-[#64748b]">
            {providersCount > 0 ? `${providersCount}+ services visibles` : 'Des services visibles'}, avec une mise en relation cadrée par C2P.
          </p>
        </div>
      </div>
    </section>
  );
}
