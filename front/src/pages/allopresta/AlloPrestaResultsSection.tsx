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
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="text-sm text-[#64748b]">
          <strong className="text-[#0f1c35]">{providers.length}</strong> service{providers.length !== 1 ? 's' : ''} trouvé{providers.length !== 1 ? 's' : ''}
        </div>
        <select
          aria-label="Trier les prestataires"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="w-full cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-4 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b] sm:w-auto"
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-[24px] border border-[#d6dbe1] bg-white shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
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
    <div className="rounded-[24px] border border-[#d6dbe1] bg-white p-6 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)] sm:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
        <div className="flex h-8 w-8 items-center justify-center">
          <i className="ri-search-line text-2xl text-[#0f1c35]" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#0f1c35]">Aucun service trouvé</h3>
      <p className="mb-4 text-sm text-[#64748b]">Essayez d&apos;ajuster vos filtres pour voir plus de résultats</p>
      <button type="button" onClick={onResetFilters} className="c2p-btn-accent w-full cursor-pointer px-6 py-2 sm:w-auto">
        Réinitialiser les filtres
      </button>
    </div>
  );
}
