import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  notifyAdminPublicAlloPrestaRequest,
  notifyClientManagedBookingReceipt,
} from '@/hooks/useCreateNotification';
import { createClientManagedBooking } from '@/lib/clientDashboardApi';
import { usePageMeta } from '@/lib/usePageMeta';
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
  AlloPrestaHowItWorks,
  AlloPrestaResults,
} from './AlloPrestaSections';
import AlloPrestaProviderRequestModal from './prestataire/AlloPrestaProviderRequestModal';
import type { ReservationFormData } from './prestataire/providerDetailTypes';

function isTechnicalTestServiceTitle(title: string) {
  return /^publication directe service\b/i.test(title.trim())
    || /^smoke service admin\b/i.test(title.trim());
}

export default function AlloPrestPage() {
  usePageMeta({
    title: 'AlloPresta C2P | Trouver un prestataire professionnel',
    description: "La marketplace de services professionnels C2P pour trouver le bon prestataire ou proposer vos services en Afrique de l'Ouest.",
    path: '/allopresta',
    image: 'https://c2p.sn/images/brand/image2.jpeg',
  });

  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [profileFilter, setProfileFilter] = useState<'all' | ProviderProfileLevel>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [providers, setProviders] = useState<ProviderCatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [selectedQuoteProvider, setSelectedQuoteProvider] = useState<ProviderCatalogRecord | null>(null);
  const [quoteForm, setQuoteForm] = useState<ReservationFormData>({
    service: '',
    date: '',
    description: '',
    budget: '',
    address: '',
  });
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
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
    const q = searchQuery.trim().toLowerCase();

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (profileFilter !== 'all') {
      result = result.filter((p) => p.public_profile_level === profileFilter);
    }

    if (q) {
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

    const maxPriceValue = Number(maxPrice);
    if (Number.isFinite(maxPriceValue) && maxPrice.trim()) {
      result = result.filter((p) => Number(p.price_per_hour || 0) <= maxPriceValue);
    }

    if (locationFilter.trim()) {
      const q = locationFilter.toLowerCase();
      result = result.filter((p) => `${p.location ?? ''} ${p.city ?? ''}`.toLowerCase().includes(q));
    }

    const minRatingValue = Number(minRating);
    if (Number.isFinite(minRatingValue) && minRating.trim()) {
      result = result.filter((p) => Number(p.rating || 0) >= minRatingValue);
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-low') return a.price_per_hour - b.price_per_hour;
      if (sortBy === 'price-high') return b.price_per_hour - a.price_per_hour;
      if (sortBy === 'reviews') return b.reviews - a.reviews;
      return 0;
    });

    return result.flatMap((provider) => {
      const providerMatchesQuery = q
        ? provider.name.toLowerCase().includes(q)
          || provider.public_alias.toLowerCase().includes(q)
          || (provider.title || '').toLowerCase().includes(q)
        : true;
      const detailedServiceItems = provider.service_items;
      const detailedServiceTitles = new Set(
        detailedServiceItems
          .map((service) => String(service.title ?? '').trim().toLowerCase())
          .filter(Boolean),
      );
      const fallbackServiceItems = (provider.services.length ? provider.services : [provider.title || 'Service professionnel'])
        .filter((title) => !isTechnicalTestServiceTitle(String(title)))
        .filter((title) => !detailedServiceTitles.has(String(title).trim().toLowerCase()))
        .map((title) => ({ title }));
      const serviceItems = [...detailedServiceItems, ...fallbackServiceItems];
      const visibleServices = q && !providerMatchesQuery
        ? serviceItems.filter((service) => String(service.title ?? '').toLowerCase().includes(q))
        : serviceItems;

      return visibleServices
        .filter((service) => !isTechnicalTestServiceTitle(String(service.title ?? '')))
        .map((service, index) => {
        const title = String(service.title || provider.title || 'Service professionnel');
        const servicePrice = service.price ?? null;
        const serviceCategory = typeof service.category === 'string' && service.category.trim() ? service.category : provider.category;

        return {
        ...provider,
          category: serviceCategory,
          price_per_hour: servicePrice === null ? provider.price_per_hour : Number(String(servicePrice).replace(/\s|\u202f|\u00a0/g, '').replace(/[^\d.,-]/g, '').replace(',', '.')) || provider.price_per_hour,
          result_key: `${provider.id}-${String(service.id ?? index)}-${title}`,
          display_service: title,
          display_image: service.image || provider.image,
          display_price: servicePrice,
          display_location: service.location || provider.location,
          display_category: serviceCategory,
        };
      });
    });
  }, [providers, selectedCategory, profileFilter, searchQuery, verifiedOnly, maxPrice, locationFilter, minRating, sortBy]);

  const openQuoteRequest = (provider: ProviderCatalogRecord) => {
    if (!user?.id) {
      setQuoteMessage('Connectez-vous comme client pour demander un devis.');
      setTimeout(() => setQuoteMessage(null), 5000);
      return;
    }
    setSelectedQuoteProvider(provider);
    setQuoteForm({
      service: provider.display_service || provider.services[0] || 'Service général',
      date: '',
      description: '',
      budget: provider.display_price ? String(provider.display_price).replace(/[^\d]/g, '') : '',
      address: provider.display_location || provider.location || '',
    });
  };

  const updateQuoteField = <K extends keyof ReservationFormData>(field: K, value: ReservationFormData[K]) => {
    setQuoteForm((state) => ({ ...state, [field]: value }));
  };

  const submitQuoteRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || !selectedQuoteProvider) return;
    try {
      await createClientManagedBooking({
        user,
        requestedProviderId: selectedQuoteProvider.id,
        service: quoteForm.service || selectedQuoteProvider.display_service || 'Service général',
        description: quoteForm.description,
        bookingDate: quoteForm.date,
        bookingTime: '09:00',
        paymentMethod: 'wallet',
        address: quoteForm.address,
        requestType: 'quote',
        price: Number(quoteForm.budget) || selectedQuoteProvider.price_per_hour || null,
      });
      await notifyAdminPublicAlloPrestaRequest(
        `${user.firstName} ${user.lastName}`,
        selectedQuoteProvider.display_service || selectedQuoteProvider.name,
        user.avatar,
      );
      await notifyClientManagedBookingReceipt(
        user.id,
        selectedQuoteProvider.display_service || selectedQuoteProvider.name,
        user.avatar,
      );
      setSelectedQuoteProvider(null);
      setQuoteMessage('Votre demande de devis a été transmise à C2P.');
      setTimeout(() => setQuoteMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setQuoteMessage('Erreur lors de l’envoi du devis. Veuillez réessayer.');
      setTimeout(() => setQuoteMessage(null), 5000);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setProfileFilter('all');
    setVerifiedOnly(false);
    setMaxPrice('');
    setLocationFilter('');
    setMinRating('');
    setSearchQuery('');
    setSortBy('rating');
  };

  const hasActiveFilters = selectedCategory !== 'all'
    || profileFilter !== 'all'
    || verifiedOnly
    || maxPrice !== ''
    || locationFilter !== ''
    || minRating !== ''
    || searchQuery !== '';
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
          providersCount={providers.reduce((total, provider) => total + Math.max(provider.services.length, 1), 0)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onScrollToResults={scrollToResults}
        />

        <AlloPrestaHowItWorks />

        <AlloPrestaCategoriesBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <AlloPrestaAccessBanner viewerTier={viewerTier} accessAction={accessAction} />

        {/* Main Content */}
        <section className="bg-white px-4 pb-16 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-8">
              <AlloPrestaFiltersSidebar
                showFiltersMobile={showFiltersMobile}
                profileFilter={profileFilter}
                verifiedOnly={verifiedOnly}
                maxPrice={maxPrice}
                locationFilter={locationFilter}
                minRating={minRating}
                hasActiveFilters={hasActiveFilters}
                onToggleMobileFilters={() => setShowFiltersMobile(!showFiltersMobile)}
                onProfileFilterChange={setProfileFilter}
                onVerifiedOnlyChange={setVerifiedOnly}
                onMaxPriceChange={setMaxPrice}
                onLocationFilterChange={setLocationFilter}
                onMinRatingChange={setMinRating}
                onResetFilters={resetFilters}
              />

              <AlloPrestaResults
                loading={loading}
                providers={filteredPrestataires}
                sortBy={sortBy}
                viewerTier={viewerTier}
                onSortChange={setSortBy}
                onQuoteRequest={openQuoteRequest}
                onResetFilters={resetFilters}
              />
            </div>
          </div>
        </section>

        {quoteMessage ? (
          <div className="fixed bottom-5 left-1/2 z-[1100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#0f1c35] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(15,28,53,0.24)]">
            {quoteMessage}
          </div>
        ) : null}

        {selectedQuoteProvider ? (
          <AlloPrestaProviderRequestModal
            providerName={selectedQuoteProvider.name}
            resForm={quoteForm}
            visibleServiceOptions={[selectedQuoteProvider.display_service || selectedQuoteProvider.services[0] || 'Service général']}
            onClose={() => setSelectedQuoteProvider(null)}
            onFieldChange={updateQuoteField}
            onSubmit={submitQuoteRequest}
          />
        ) : null}

    </div>
  );
}
