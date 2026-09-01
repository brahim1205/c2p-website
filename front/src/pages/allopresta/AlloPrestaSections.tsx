import { Link } from 'react-router-dom';
import {
  type ProviderProfileLevel,
  type ProviderViewerAccessTier,
} from '@/lib/providerApi';
import { alloprestaCategories } from './alloprestaPageModel';
export { AlloPrestaHero } from './AlloPrestaHeroSection';
export { AlloPrestaResults } from './AlloPrestaResultsSection';

interface AccessAction {
  to: string;
  label: string;
  helper: string;
}

interface AlloPrestaCategoriesBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

interface AlloPrestaAccessBannerProps {
  viewerTier: ProviderViewerAccessTier;
  accessAction: AccessAction;
}

interface AlloPrestaFiltersSidebarProps {
  showFiltersMobile: boolean;
  profileFilter: 'all' | ProviderProfileLevel;
  verifiedOnly: boolean;
  maxPrice: string;
  locationFilter: string;
  minRating: string;
  hasActiveFilters: boolean;
  onToggleMobileFilters: () => void;
  onProfileFilterChange: (value: 'all' | ProviderProfileLevel) => void;
  onVerifiedOnlyChange: (value: boolean) => void;
  onMaxPriceChange: (value: string) => void;
  onLocationFilterChange: (value: string) => void;
  onMinRatingChange: (value: string) => void;
  onResetFilters: () => void;
}

export function AlloPrestaCategoriesBar({ selectedCategory, onSelectCategory }: AlloPrestaCategoriesBarProps) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black text-[#08084f] sm:text-3xl">Catégories de services</h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#ffb41f]" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Filtrer les prestataires par categorie">
          {alloprestaCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex min-h-[92px] cursor-pointer flex-col items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition-all sm:min-h-0 sm:flex-row sm:items-center ${
                selectedCategory === category.id
                  ? 'border-[#ffb41f] bg-[#fff4e3] text-[#08084f] shadow-sm'
                  : 'border-[#f0e2ca] bg-[#fffaf2] text-[#626b7a] hover:border-[#ffb41f]/70 hover:bg-white'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#ff9f0a]">
                <i className={`${category.icon} text-xl`} />
              </span>
              <span className="leading-5">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AlloPrestaAccessBanner({ viewerTier, accessAction }: AlloPrestaAccessBannerProps) {
  return (
    <section className="bg-white px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[24px] border border-[#f0e2ca] bg-[#fffaf2] px-5 py-5 text-sm text-[#626b7a] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-[#08084f]">
            Niveau actuel : {viewerTier === 'visitor' ? 'Visiteur' : viewerTier === 'subscriber' ? 'Abonné' : 'Vérifié'}
          </p>
          <p className="mt-1 leading-6">
            Les profils sensibles et les mises en relation complètes restent pilotés par C2P.
          </p>
        </div>
        <Link
          to={accessAction.to}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#08084f] px-4 py-3 text-center text-sm font-black text-white transition-colors hover:bg-[#111177] md:w-auto"
        >
          {accessAction.label}
        </Link>
      </div>
    </section>
  );
}

export function AlloPrestaHowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Décrivez votre tâche',
      text: 'Indiquez le service recherché, votre localisation et votre budget indicatif.',
    },
    {
      number: '02',
      title: 'Choisissez le bon service',
      text: 'Comparez les prix, les notes, les zones d’intervention et les profils visibles.',
    },
    {
      number: '03',
      title: 'Recevez votre devis',
      text: 'Envoyez votre demande, C2P cadre la mise en relation et le suivi.',
    },
  ];

  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#ffb41f] px-4 py-2 text-sm font-black text-[#08084f]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffb41f]">
              <i className="ri-route-line" />
            </span>
            Comment ça marche
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-[#08084f] sm:text-5xl">
            Comment fonctionne AlloPresta
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className={`relative rounded-[28px] border border-[#eef2f7] bg-white p-4 text-center shadow-sm ${index === steps.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
              {index < steps.length - 1 ? (
                <div className="pointer-events-none absolute left-[62%] top-16 hidden h-px w-[76%] border-t-2 border-dashed border-[#9ca3af] lg:block" />
              ) : null}
              <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-[#08084f]/45 bg-white sm:h-28 sm:w-28">
                <div className="flex h-16 w-16 rotate-45 items-center justify-center rounded-2xl bg-[#ffb41f] text-[#08084f] sm:h-20 sm:w-20">
                  <div className="-rotate-45 text-center">
                    <p className="text-[10px] font-black sm:text-sm">ÉTAPE</p>
                    <p className="text-lg font-black sm:text-xl">{step.number}</p>
                  </div>
                </div>
              </div>
              <h3 className="mt-5 text-lg font-black text-[#141827] sm:text-2xl">{step.title}</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#6b7280] sm:text-base sm:leading-7">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AlloPrestaFiltersSidebar({
  showFiltersMobile,
  profileFilter,
  verifiedOnly,
  maxPrice,
  locationFilter,
  minRating,
  hasActiveFilters,
  onToggleMobileFilters,
  onProfileFilterChange,
  onVerifiedOnlyChange,
  onMaxPriceChange,
  onLocationFilterChange,
  onMinRatingChange,
  onResetFilters,
}: AlloPrestaFiltersSidebarProps) {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="rounded-[22px] border border-[#f0e2ca] bg-[#fffaf2] p-5 shadow-[0_18px_44px_rgba(15,28,53,0.05)] lg:sticky lg:top-24">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-black text-[#08084f]">Affiner</h3>
          <button
            type="button"
            aria-expanded={showFiltersMobile}
            aria-controls="allopresta-mobile-filters"
            aria-label={showFiltersMobile ? 'Masquer les filtres AlloPresta' : 'Afficher les filtres AlloPresta'}
            className="lg:hidden w-8 h-8 flex items-center justify-center"
            onClick={onToggleMobileFilters}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className={showFiltersMobile ? 'ri-arrow-up-s-line text-[#5fa6f3]' : 'ri-arrow-down-s-line text-[#5fa6f3]'}></i>
            </div>
          </button>
        </div>

        <div id="allopresta-mobile-filters" className={`${showFiltersMobile ? 'block' : 'hidden'} space-y-5 lg:block`}>
          <div>
            <p className="mb-3 block text-sm font-black text-[#08084f]">Niveau de profil</p>
            <div className="space-y-2" role="group" aria-label="Filtrer par niveau de profil">
              {[
                { id: 'all', label: 'Tous les profils' },
                { id: 'visitor', label: 'Ouverts aux visiteurs' },
                { id: 'subscriber', label: 'Réservés aux abonnés' },
                { id: 'verified', label: 'Réservés vérifiés' },
              ].map((option) => (
                <label key={option.id} htmlFor={`allopresta-profile-${option.id}`} className="flex cursor-pointer items-center gap-2">
                  <input
                    id={`allopresta-profile-${option.id}`}
                    type="radio"
                    name="profileFilter"
                    checked={profileFilter === option.id}
                    onChange={() => onProfileFilterChange(option.id as 'all' | ProviderProfileLevel)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm text-[#626b7a]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="allopresta-verified-only" className="flex items-center gap-2 cursor-pointer">
              <input
                id="allopresta-verified-only"
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => onVerifiedOnlyChange(event.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-sm text-[#626b7a]">Prestataires vérifiés uniquement</span>
            </label>
          </div>

          <div>
            <label htmlFor="allopresta-max-price" className="mb-2 block text-sm font-black text-[#08084f]">Prix maximum</label>
            <input
              id="allopresta-max-price"
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              placeholder="Ex: 15000"
              className="w-full rounded-xl border border-[#f0d4a2] bg-white px-3 py-2 text-sm text-[#08084f] outline-none focus:border-[#ffb41f]"
            />
            <p className="mt-1 text-xs text-[#64748b]">Filtre sur le prix horaire ou indicatif.</p>
          </div>

          <div>
            <label htmlFor="allopresta-location" className="mb-2 block text-sm font-black text-[#08084f]">Localisation</label>
            <input
              id="allopresta-location"
              type="search"
              value={locationFilter}
              onChange={(event) => onLocationFilterChange(event.target.value)}
              placeholder="Dakar, Thiès, Keur Massar..."
              className="w-full rounded-xl border border-[#f0d4a2] bg-white px-3 py-2 text-sm text-[#08084f] outline-none focus:border-[#ffb41f]"
            />
          </div>

          <div>
            <label htmlFor="allopresta-min-rating" className="mb-2 block text-sm font-black text-[#08084f]">Note minimale</label>
            <select
              id="allopresta-min-rating"
              value={minRating}
              onChange={(event) => onMinRatingChange(event.target.value)}
              className="w-full rounded-xl border border-[#f0d4a2] bg-white px-3 py-2 text-sm text-[#08084f] outline-none focus:border-[#ffb41f]"
            >
              <option value="">Toutes les notes</option>
              <option value="4">4 étoiles et plus</option>
              <option value="3">3 étoiles et plus</option>
              <option value="2">2 étoiles et plus</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="w-full cursor-pointer whitespace-nowrap rounded-xl border border-[#ffb41f] bg-white py-2.5 text-sm font-black text-[#08084f] transition-colors hover:bg-[#fff4e3]"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
