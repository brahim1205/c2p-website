import type { ProviderCatalogRecord, ProviderViewerAccessTier } from '@/lib/providerApi';
import AlloPrestaProviderCard from './AlloPrestaProviderCard';

interface AlloPrestaResultsProps {
  loading: boolean;
  providers: ProviderCatalogRecord[];
  sortBy: string;
  viewerTier: ProviderViewerAccessTier;
  onSortChange: (value: string) => void;
  onQuoteRequest: (provider: ProviderCatalogRecord) => void;
  onResetFilters: () => void;
}

export function AlloPrestaResults({
  loading,
  providers,
  sortBy,
  viewerTier,
  onSortChange,
  onQuoteRequest,
  onResetFilters,
}: AlloPrestaResultsProps) {
  return (
    <div id="allopresta-results" className="min-w-0 flex-1">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black text-[#ff9f0a]">Services recommandés</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#08084f] sm:text-4xl">
            {providers.length} service{providers.length !== 1 ? 's' : ''} disponible{providers.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <select
          aria-label="Trier les prestataires"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="w-full cursor-pointer rounded-xl border border-[#f0d4a2] bg-[#fffaf2] px-4 py-3 text-sm font-bold text-[#08084f] outline-none focus:border-[#ffb41f] sm:w-auto"
        >
          <option value="rating">Mieux notés</option>
          <option value="price-low">Prix croissant</option>
          <option value="price-high">Prix décroissant</option>
          <option value="reviews">Plus d&apos;avis</option>
        </select>
      </div>

      {loading ? <AlloPrestaResultsSkeleton /> : null}
      {!loading && providers.length === 0 ? <AlloPrestaNoResults onResetFilters={onResetFilters} /> : null}
      {!loading && providers.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((prestataire) => (
            <AlloPrestaProviderCard
              key={prestataire.result_key ?? prestataire.id}
              prestataire={prestataire}
              viewerTier={viewerTier}
              onQuoteRequest={onQuoteRequest}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AlloPrestaResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-[22px] border border-[#e7d8c0] bg-[#fff7ec] shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
          <div className="h-44 bg-[#e9eef5] sm:h-64" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="h-5 w-3/4 rounded bg-[#e9eef5]" />
            <div className="h-4 w-1/2 rounded bg-[#e9eef5]" />
            <div className="h-4 w-1/4 rounded bg-[#e9eef5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlloPrestaNoResults({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#e7d8c0] bg-[#fff7ec] p-6 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
        <div className="flex h-8 w-8 items-center justify-center">
          <i className="ri-search-line text-2xl text-[#0f1c35]" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-black text-[#08084f]">Aucun service trouvé</h3>
      <p className="mb-4 text-sm text-[#626b7a]">Essayez d&apos;ajuster vos filtres pour voir plus de résultats</p>
      <button type="button" onClick={onResetFilters} className="w-full cursor-pointer rounded-xl bg-[#ffb41f] px-6 py-2 font-black text-[#08084f] sm:w-auto">
        Réinitialiser les filtres
      </button>
    </div>
  );
}
