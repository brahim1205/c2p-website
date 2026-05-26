import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPublicProviders,
  normalizeViewerAccessTier,
  type ProviderCatalogRecord,
  type ProviderProfileLevel,
} from '@/lib/providerApi';
import {
  AlloPrestaAccessBanner,
  AlloPrestaCategoriesBar,
  AlloPrestaFiltersSidebar,
  AlloPrestaHero,
  AlloPrestaResults,
} from './AlloPrestaSections';

export default function AlloPrestPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [profileFilter, setProfileFilter] = useState<'all' | ProviderProfileLevel>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [providers, setProviders] = useState<ProviderCatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const viewerTier = normalizeViewerAccessTier(user);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        setProviders(await fetchPublicProviders());
      } catch (err) {
        console.error(err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const filteredPrestataires = useMemo(() => {
    let result = [...providers];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (profileFilter !== 'all') {
      result = result.filter((p) => p.public_profile_level === profileFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.public_alias.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          p.services.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (verifiedOnly) {
      result = result.filter((p) => p.verified);
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-low') return a.price_per_hour - b.price_per_hour;
      if (sortBy === 'price-high') return b.price_per_hour - a.price_per_hour;
      if (sortBy === 'reviews') return b.reviews - a.reviews;
      return 0;
    });

    return result;
  }, [providers, selectedCategory, profileFilter, searchQuery, verifiedOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setProfileFilter('all');
    setVerifiedOnly(false);
    setSearchQuery('');
    setSortBy('rating');
  };

  const hasActiveFilters = selectedCategory !== 'all' || profileFilter !== 'all' || verifiedOnly || searchQuery !== '';
  const accessAction = useMemo(() => {
    if (!user) {
      return {
        to: '/auth/register?role=client',
        label: 'Créer un compte C2P',
        helper: 'Pour recevoir les alertes et sortir du mode visiteur.',
      };
    }
    if (viewerTier === 'subscriber') {
      return {
        to: '/dashboard/messages?support=1',
        label: 'Demander la vérification',
        helper: 'C2P peut ouvrir les profils vérifiés et cadrer votre demande.',
      };
    }
    return {
      to: '/tarifs#prestataire-plans',
      label: 'Voir les offres AlloPresta',
      helper: 'Les plans prestataire portent la visibilité, les alertes et le badge.',
    };
  }, [user, viewerTier]);
  const scrollToResults = () => {
    document.getElementById('allopresta-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
        <AlloPrestaHero
          providersCount={providers.length}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onScrollToResults={scrollToResults}
        />

        <AlloPrestaCategoriesBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <AlloPrestaAccessBanner viewerTier={viewerTier} accessAction={accessAction} />

        {/* Main Content */}
        <section className="px-4 py-10 sm:px-6 lg:px-20 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-8">
              <AlloPrestaFiltersSidebar
                showFiltersMobile={showFiltersMobile}
                profileFilter={profileFilter}
                verifiedOnly={verifiedOnly}
                hasActiveFilters={hasActiveFilters}
                onToggleMobileFilters={() => setShowFiltersMobile(!showFiltersMobile)}
                onProfileFilterChange={setProfileFilter}
                onVerifiedOnlyChange={setVerifiedOnly}
                onResetFilters={resetFilters}
              />

              <AlloPrestaResults
                loading={loading}
                providers={filteredPrestataires}
                sortBy={sortBy}
                viewerTier={viewerTier}
                onSortChange={setSortBy}
                onResetFilters={resetFilters}
              />
            </div>
          </div>
        </section>

    </div>
  );
}
