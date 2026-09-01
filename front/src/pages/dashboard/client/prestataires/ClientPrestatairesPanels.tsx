import { SkeletonCard } from '@/components/base/Skeleton';
import type { BookingRequestType } from '@/lib/clientDashboard';
import type { ClientPrestataire as Prestataire } from '@/lib/clientDashboardApi';
import { ClientProviderCard } from './ClientProviderCard';
export { ClientProviderRequestModal } from './ClientProviderRequestModal';

interface SearchFiltersProps {
  allCategories: string[];
  categoryFilter: string;
  filteredCount: number;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  search: string;
  setCategoryFilter: (value: string) => void;
  setSearch: (value: string) => void;
}

interface ProvidersListProps {
  favoriteIds: Set<number>;
  filtered: Prestataire[];
  loading: boolean;
  openRequestModal: (provider: Prestataire, requestType: BookingRequestType) => void;
  toggleFavorite: (provider: Prestataire) => void | Promise<void>;
}

export function ClientPrestatairesHero() {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-teal-600">Recherche prestataire</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Trouver un prestataire</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
          Comparez les profils, puis soumettez votre besoin à C2P. L équipe sélectionne et assigne le bon prestataire.
        </p>
      </div>
    </section>
  );
}

export function ClientPrestatairesFilters({
  allCategories,
  categoryFilter,
  filteredCount,
  hasActiveFilters,
  resetFilters,
  search,
  setCategoryFilter,
  setSearch,
}: SearchFiltersProps) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Filtres de recherche</h2>
          <p className="mt-1 text-sm text-gray-500">Affinez la liste avec les critères utiles pour choisir vite.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
            <i className="ri-radar-line text-base"></i>
            {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <label className="grid gap-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">Recherche</span>
            <span className="relative block">
              <i className="ri-search-line pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-base text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, service, localisation ou catégorie"
                className="h-12 w-full rounded-2xl border border-gray-300 bg-white !pl-16 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-50"
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">Catégorie</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-50"
            >
              {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {search.trim() ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Recherche : {search.trim()}</span>
            ) : null}
            {hasActiveFilters ? (
              <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-teal-700">Filtres actifs</span>
            ) : (
              <span>Aucun filtre actif</span>
            )}
          </div>
          <p className="text-xs text-gray-400">Les résultats se mettent à jour automatiquement.</p>
        </div>
      </div>
    </section>
  );
}

export function ClientPrestatairesList({
  favoriteIds,
  filtered,
  loading,
  openRequestModal,
  toggleFavorite,
}: ProvidersListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SkeletonCard count={6} />
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Services disponibles</h2>
          <p className="text-sm text-gray-500">Chaque fiche correspond à un service publié par un prestataire.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {filtered.map((provider) => (
          <ClientProviderCard
            key={provider.resultKey ?? provider.id}
            isFavorite={favoriteIds.has(provider.id)}
            openRequestModal={openRequestModal}
            provider={provider}
            toggleFavorite={toggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

export function ClientPrestatairesEmptyState({ loading, resultCount }: { loading: boolean; resultCount: number }) {
  if (loading || resultCount > 0) return null;

  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <i className="ri-search-line text-2xl text-gray-400"></i>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun prestataire trouvé</h3>
      <p className="text-gray-600">Essayez une autre recherche ou une autre catégorie.</p>
    </div>
  );
}
