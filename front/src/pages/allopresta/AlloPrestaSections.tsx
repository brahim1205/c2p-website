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
    <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-4 sm:px-6 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les prestataires par categorie">
          {alloprestaCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'border-[#27346b] bg-[#27346b] text-white'
                  : 'border-[#80bfdf] bg-white text-[#27346b] hover:border-[#27346b]/60 hover:text-[#06053a]'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${category.icon} text-lg`}></i>
              </div>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AlloPrestaAccessBanner({ viewerTier, accessAction }: AlloPrestaAccessBannerProps) {
  return (
    <section className="bg-[#f7f6f4] px-4 py-5 sm:px-6 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-[#d6dbe1] bg-white px-4 py-4 text-sm text-[#64748b] shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[#0f1c35]">
            Niveau actuel : {viewerTier === 'visitor' ? 'Visiteur' : viewerTier === 'subscriber' ? 'Abonné' : 'Vérifié'}
          </p>
          <p className="mt-1 leading-6">
            Les profils sensibles et les mises en relation complètes restent pilotés par C2P.
          </p>
        </div>
        <Link
          to={accessAction.to}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f1c35] px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#16284a] md:w-auto"
        >
          {accessAction.label}
        </Link>
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
      <div className="c2p-card rounded-[22px] p-5 lg:sticky lg:top-24">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#06053a]">Affiner</h3>
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
            <p className="mb-3 block text-sm font-medium text-[#27346b]">Niveau de profil</p>
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
                  <span className="text-sm text-[#27346b]">{option.label}</span>
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
              <span className="text-sm text-[#27346b]">Prestataires vérifiés uniquement</span>
            </label>
          </div>

          <div>
            <label htmlFor="allopresta-max-price" className="mb-2 block text-sm font-medium text-[#27346b]">Prix maximum</label>
            <input
              id="allopresta-max-price"
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              placeholder="Ex: 15000"
              className="w-full rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#27346b] outline-none focus:border-[#27346b]"
            />
            <p className="mt-1 text-xs text-[#64748b]">Filtre sur le prix horaire ou indicatif.</p>
          </div>

          <div>
            <label htmlFor="allopresta-location" className="mb-2 block text-sm font-medium text-[#27346b]">Localisation</label>
            <input
              id="allopresta-location"
              type="search"
              value={locationFilter}
              onChange={(event) => onLocationFilterChange(event.target.value)}
              placeholder="Dakar, Thiès, Keur Massar..."
              className="w-full rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#27346b] outline-none focus:border-[#27346b]"
            />
          </div>

          <div>
            <label htmlFor="allopresta-min-rating" className="mb-2 block text-sm font-medium text-[#27346b]">Note minimale</label>
            <select
              id="allopresta-min-rating"
              value={minRating}
              onChange={(event) => onMinRatingChange(event.target.value)}
              className="w-full rounded-xl border border-[#80bfdf] bg-white px-3 py-2 text-sm text-[#27346b] outline-none focus:border-[#27346b]"
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
              className="w-full cursor-pointer whitespace-nowrap rounded-xl border border-[#80bfdf] bg-[#ffffff] py-2.5 text-sm font-medium text-[#27346b] transition-colors hover:border-[#27346b]/60 hover:text-[#06053a]"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
