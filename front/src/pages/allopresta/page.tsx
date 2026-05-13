import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPublicProviders,
  getProviderDisplayName,
  getProviderTierLabel,
  getProviderVisibilityPassHint,
  getProviderVisibilityPassLabel,
  getProviderVisibilityLabel,
  normalizeViewerAccessTier,
  type ProviderCatalogRecord,
  type ProviderProfileLevel,
} from '@/lib/providerApi';

export default function AlloPrestPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [profileFilter, setProfileFilter] = useState<'all' | ProviderProfileLevel>('all');
  const [priceRange, setPriceRange] = useState('all');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [providers, setProviders] = useState<ProviderCatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const viewerTier = normalizeViewerAccessTier(user);

  const categories = [
    { id: 'all', name: 'Toutes catégories', icon: 'ri-apps-line' },
    { id: 'informatique', name: 'Informatique', icon: 'ri-computer-line' },
    { id: 'artisanat', name: 'Artisanat', icon: 'ri-hammer-line' },
    { id: 'consulting', name: 'Consulting', icon: 'ri-briefcase-line' },
    { id: 'formation', name: 'Formation', icon: 'ri-book-open-line' },
    { id: 'technique', name: 'Technique', icon: 'ri-tools-line' },
    { id: 'design', name: 'Design', icon: 'ri-palette-line' },
    { id: 'marketing', name: 'Marketing', icon: 'ri-megaphone-line' },
    { id: 'juridique', name: 'Juridique', icon: 'ri-scales-line' }
  ];

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

    if (priceRange !== 'all') {
      result = result.filter((p) => {
        if (priceRange === '0-10000') return p.price_per_hour < 10000;
        if (priceRange === '10000-15000') return p.price_per_hour >= 10000 && p.price_per_hour <= 15000;
        if (priceRange === '15000-20000') return p.price_per_hour > 15000 && p.price_per_hour <= 20000;
        if (priceRange === '20000+') return p.price_per_hour > 20000;
        return true;
      });
    }

    if (minRating) {
      result = result.filter((p) => p.rating >= minRating);
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
  }, [providers, selectedCategory, profileFilter, searchQuery, priceRange, minRating, verifiedOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setProfileFilter('all');
    setPriceRange('all');
    setMinRating(null);
    setVerifiedOnly(false);
    setSearchQuery('');
    setSortBy('rating');
  };

  const hasActiveFilters = selectedCategory !== 'all' || profileFilter !== 'all' || priceRange !== 'all' || minRating !== null || verifiedOnly || searchQuery !== '';
  const accessAction = useMemo(() => {
    if (!user) {
      return {
        to: '/auth/register?role=client',
        label: 'Creer un compte C2P',
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
      label: 'Voir les offres SenPresta',
      helper: 'Les plans prestataire portent la visibilité, les alertes et le badge.',
    };
  }, [user, viewerTier]);
  const scrollToResults = () => {
    document.getElementById('allopresta-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-c2p-bg text-c2p-text">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#ffffff]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/brand/images9.jpeg"
              alt="AlloPresta"
              className="h-full w-full object-cover object-center opacity-24"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.94)_0%,rgba(247,248,252,0.78)_46%,rgba(247,248,252,0.36)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#27346b]">
                  SenPresta | AlloPresta by C2P
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#06053a] sm:text-5xl lg:text-7xl">
                  Offres et demandes de prestations avec cadrage C2P
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
                  SenPresta permet aux visiteurs de consulter les annonces, aux abonnés de recevoir des alertes et à C2P de piloter la mise en relation sensible.
                </p>
              </div>

              {/* Search Bar */}
              <div className="c2p-panel mt-12 max-w-4xl p-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white/82 px-4">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className="ri-search-line text-[#27346b] text-xl"></i>
                    </div>
                    <input
                      type="text"
                      aria-label="Rechercher un service ou un prestataire"
                      placeholder="Rechercher un service ou un prestataire..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="c2p-input flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={scrollToResults}
                    aria-label="Afficher les prestataires correspondant à la recherche"
                    className="c2p-btn-accent min-h-14 cursor-pointer whitespace-nowrap rounded-2xl px-10 py-4"
                  >
                    Rechercher
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#80bfdf] bg-[#80bfdf] sm:grid-cols-3">
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">{providers.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Prestataires actifs</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">5,000+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Prestations realisees</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/78 p-5">
                    <div className="mb-1 text-3xl font-semibold text-[#06053a]">4.8/5</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">Satisfaction client</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-6 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 overflow-x-auto pb-2" role="group" aria-label="Filtrer les prestataires par categorie">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all ${
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

        <section className="bg-[#f8fbff] px-4 py-5 sm:px-6 lg:px-20">
          <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3">
            {[
              { id: 'visitor', title: 'Visiteur', text: 'Consulte les annonces, le profil résumé et les services cadrés par C2P.' },
              { id: 'subscriber', title: 'Abonné', text: 'Compte C2P connecté : détail plus riche, alertes et orientation opérationnelle.' },
              { id: 'verified', title: 'Vérifié', text: 'Compte vérifié par C2P : accès complet aux profils sensibles et priorités premium.' },
            ].map((item) => (
              <div key={item.id} className={`rounded-2xl border px-4 py-4 text-sm shadow-sm ${viewerTier === item.id ? 'border-[#27346b]/25 bg-white text-[#172033]' : 'border-[#d7e6fb] bg-white/75 text-[#4b5b73]'}`}>
                <p className="font-semibold text-[#06053a]">{item.title}</p>
                <p className="mt-2 leading-6">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-3 rounded-2xl border border-[#d7e6fb] bg-white px-4 py-4 text-sm text-[#31445f] shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-[#06053a]">
                Niveau actuel : {viewerTier === 'visitor' ? 'Visiteur' : viewerTier === 'subscriber' ? 'Abonne' : 'Verifie'}
              </p>
              <p className="mt-1 leading-6">{accessAction.helper}</p>
            </div>
            <Link
              to={accessAction.to}
              className="inline-flex items-center justify-center rounded-xl bg-[#27346b] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#06053a]"
            >
              {accessAction.label}
            </Link>
          </div>
        </section>

        {/* Main Content */}
        <section className="px-4 py-10 sm:px-6 lg:px-20 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filters Sidebar */}
              <aside className="w-full lg:w-72 flex-shrink-0">
                <div className="c2p-card rounded-[24px] p-6 lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#06053a]">Filtres</h3>
                    <button
                      type="button"
                      aria-expanded={showFiltersMobile}
                      aria-controls="allopresta-mobile-filters"
                      aria-label={showFiltersMobile ? 'Masquer les filtres AlloPresta' : 'Afficher les filtres AlloPresta'}
                      className="lg:hidden w-8 h-8 flex items-center justify-center"
                      onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className={showFiltersMobile ? 'ri-arrow-up-s-line text-[#5fa6f3]' : 'ri-arrow-down-s-line text-[#5fa6f3]'}></i>
                      </div>
                    </button>
                  </div>

                  <div id="allopresta-mobile-filters" className={`${showFiltersMobile ? 'block' : 'hidden'} lg:block space-y-6`}>
                    <div>
                      <p className="mb-3 block text-sm font-medium text-[#27346b]">
                        Niveau de profil
                      </p>
                      <div className="space-y-2" role="group" aria-label="Filtrer par niveau de profil">
                        {[
                          { id: 'all', label: 'Tous les profils' },
                          { id: 'visitor', label: 'Ouverts aux visiteurs' },
                          { id: 'subscriber', label: 'Reserves abonnes' },
                          { id: 'verified', label: 'Reserves verifies' },
                        ].map((option) => (
                          <label key={option.id} htmlFor={`allopresta-profile-${option.id}`} className="flex cursor-pointer items-center gap-2">
                            <input
                              id={`allopresta-profile-${option.id}`}
                              type="radio"
                              name="profileFilter"
                              checked={profileFilter === option.id}
                              onChange={() => setProfileFilter(option.id as 'all' | ProviderProfileLevel)}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-[#27346b]">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label htmlFor="allopresta-price-range" className="mb-3 block text-sm font-medium text-[#27346b]">
                        Tarif horaire (FCFA)
                      </label>
                      <select
                        id="allopresta-price-range"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full cursor-pointer rounded-xl border border-[#80bfdf] bg-[#ffffff] px-4 py-2.5 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
                      >
                        <option value="all">Tous les tarifs</option>
                        <option value="0-10000">Moins de 10,000 FCFA</option>
                        <option value="10000-15000">10,000 - 15,000 FCFA</option>
                        <option value="15000-20000">15,000 - 20,000 FCFA</option>
                        <option value="20000+">Plus de 20,000 FCFA</option>
                      </select>
                    </div>

                    {/* Rating */}
                    <div>
                      <p className="mb-3 block text-sm font-medium text-[#27346b]">
                        Notation minimum
                      </p>
                      <div className="space-y-2">
                        {[5, 4.5, 4, 3.5].map((rating) => (
                          <label key={rating} htmlFor={`allopresta-rating-${rating}`} className="flex cursor-pointer items-center gap-2">
                            <input
                              id={`allopresta-rating-${rating}`}
                              type="radio"
                              name="rating"
                              checked={minRating === rating}
                              onChange={() => setMinRating(minRating === rating ? null : rating)}
                              className="cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-4 h-4 flex items-center justify-center">
                                  <i
                                    className={`ri-star-fill text-sm ${
                                      i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'
                                    }`}
                                  ></i>
                                </div>
                              ))}
                              <span className="ml-1 text-sm text-[#27346b]">{rating}+</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Verification */}
                    <div>
                      <label htmlFor="allopresta-verified-only" className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="allopresta-verified-only"
                          type="checkbox"
                          checked={verifiedOnly}
                          onChange={(e) => setVerifiedOnly(e.target.checked)}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-[#27346b]">Prestataires verifies uniquement</span>
                      </label>
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="w-full cursor-pointer whitespace-nowrap rounded-xl border border-[#80bfdf] bg-[#ffffff] py-2.5 text-sm font-medium text-[#27346b] transition-colors hover:border-[#27346b]/60 hover:text-[#06053a]"
                      >
                        Reinitialiser les filtres
                      </button>
                    )}
                  </div>
                </div>
              </aside>

              {/* Results */}
              <div id="allopresta-results" className="flex-1 min-w-0">
                {/* Sort Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                  <div className="text-sm text-[#27346b]">
                    <strong className="text-[#06053a]">{filteredPrestataires.length}</strong> prestataire{filteredPrestataires.length !== 1 ? 's' : ''} trouve{filteredPrestataires.length !== 1 ? 's' : ''}
                  </div>
                  <select
                    aria-label="Trier les prestataires"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="cursor-pointer rounded-xl border border-[#80bfdf] bg-white px-4 py-2 text-sm text-[#1f2937] outline-none focus:border-[#27346b]"
                  >
                    <option value="rating">Mieux notés</option>
                    <option value="price-low">Prix croissant</option>
                    <option value="price-high">Prix décroissant</option>
                    <option value="reviews">Plus d&apos;avis</option>
                  </select>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white animate-pulse shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
                        <div className="h-44 bg-[#e9eef5] sm:h-64"></div>
                        <div className="space-y-3 p-4 sm:p-5">
                          <div className="h-5 bg-[#e9eef5] rounded w-3/4"></div>
                          <div className="h-4 bg-[#e9eef5] rounded w-1/2"></div>
                          <div className="h-4 bg-[#e9eef5] rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPrestataires.length === 0 ? (
                  <div className="rounded-[24px] border border-[#80bfdf] bg-white p-12 text-center shadow-[0_18px_45px_rgba(12,14,58,0.05)]">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff]">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <i className="ri-search-line text-[#27346b] text-2xl"></i>
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-[#06053a]">Aucun prestataire trouve</h3>
                    <p className="mb-4 text-sm text-[#27346b]">Essayez d&apos;ajuster vos filtres pour voir plus de resultats</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="c2p-btn-accent cursor-pointer whitespace-nowrap px-6 py-2"
                    >
                      Reinitialiser les filtres
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    {filteredPrestataires.map((prestataire) => (
                      <Link
                        key={prestataire.id}
                        to={`/allopresta/prestataire/${prestataire.id}`}
                        className="group cursor-pointer overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#27346b]/45 hover:shadow-[0_24px_60px_rgba(12,14,58,0.10)]"
                      >
                        <div className="relative h-40 w-full overflow-hidden sm:h-64">
                          <img
                            src={prestataire.image || '/images/home/trust.jpg'}
                            alt={prestataire.name}
                            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent"></div>
                          {prestataire.verified && (
                            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#1D9BF0] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(29,155,240,0.28)] sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-verified-badge-fill"></i>
                              </div>
                              <span>Verifie</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 sm:p-5">
                          <div className="mb-2.5 flex items-start justify-between sm:mb-3">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-[#d7e6fb] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#27346b]">
                                  {getProviderTierLabel(prestataire.public_profile_level)}
                                </span>
                                <span className="rounded-full border border-[#dbad29]/25 bg-[#fff8e6] px-2.5 py-1 text-[11px] font-medium text-[#8a6511]">
                                  {getProviderVisibilityLabel(prestataire.visibility_tier)}
                                </span>
                              </div>
                              <h3 className="mb-1 text-base font-semibold text-[#06053a] sm:text-lg">
                                {getProviderDisplayName(prestataire, viewerTier)}
                              </h3>
                              <p className="text-sm text-[#27346b]">{prestataire.title}</p>
                            </div>
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-star-fill text-yellow-400 text-sm"></i>
                              </div>
                              <span className="text-sm font-semibold text-[#06053a]">
                                {prestataire.rating}
                              </span>
                            </div>
                            <span className="text-sm text-[#5fa6f3]">
                              ({prestataire.reviews} avis)
                            </span>
                            <span className="text-[#c6bfb2]">•</span>
                            <span className="text-sm text-[#5fa6f3]">{prestataire.completed_jobs} missions</span>
                          </div>

                          <div className="mb-3 flex items-center gap-2 text-sm text-[#27346b] sm:mb-4">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line"></i>
                            </div>
                            <span>{prestataire.location}</span>
                          </div>

                          <div className="mb-3 rounded-xl border border-[#d7e6fb] bg-[#f8fbff] px-3 py-3 text-xs leading-6 text-[#31445f] sm:mb-4">
                            <p className="font-semibold text-[#06053a]">{getProviderVisibilityPassLabel(prestataire.visibility_tier)}</p>
                            <p className="mt-1">{getProviderVisibilityPassHint(prestataire.visibility_tier)}</p>
                          </div>

                          <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
                            {prestataire.operations_managed ? (
                              <span className="rounded-full border border-[#dbad29]/25 bg-[#fff8e6] px-2.5 py-1 text-[11px] font-medium text-[#8a6511] sm:text-xs">
                                C2P gere la mise en relation
                              </span>
                            ) : null}
                            {prestataire.plan_name ? (
                              <span className="rounded-full border border-[#d7e6fb] bg-white px-2.5 py-1 text-[11px] font-medium text-[#27346b] sm:text-xs">
                                {prestataire.plan_name}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-end justify-between gap-3 border-t border-[#eee4d3] pt-3 sm:pt-4">
                            <div>
                              <div className="text-lg font-semibold text-[#27346b] sm:text-xl">
                                {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
                              </div>
                              <div className="text-xs text-[#94a3b8]">par heure</div>
                            </div>
                            <div className="flex max-w-[42%] items-center gap-1.5 text-right text-[11px] text-[#27346b] sm:max-w-none sm:gap-2 sm:text-xs">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-time-line"></i>
                              </div>
                              <span>Repond en {prestataire.response_time}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

    </div>
  );
}
