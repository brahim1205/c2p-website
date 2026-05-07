import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import PublicLayout from '@/components/feature/PublicLayout';


interface Provider {
  id: number;
  name: string;
  title: string;
  category: string;
  rating: number;
  reviews: number;
  price_per_hour: number;
  location: string;
  verified: boolean;
  image: string | null;
  services: string[];
  languages: string[];
  completed_jobs: number;
  response_time: string;
}

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const normalizeProvider = (provider: Record<string, unknown>): Provider => {
  const hourlyPrice = provider.price_per_hour ?? provider.price ?? provider.hourly_rate ?? provider.hourlyRate;
  const completedJobs = provider.completed_jobs ?? provider.completedJobs ?? provider.missions ?? provider.jobs;
  const responseTime = provider.response_time ?? provider.responseTime;

  return {
    id: toNumber(provider.id),
    name: String(provider.name ?? provider.full_name ?? 'Prestataire C2P'),
    title: String(provider.title ?? provider.profession ?? provider.category ?? 'Prestataire professionnel'),
    category: String(provider.category ?? 'consulting'),
    rating: toNumber(provider.rating, 0),
    reviews: toNumber(provider.reviews, 0),
    price_per_hour: toNumber(hourlyPrice, 0),
    location: String(provider.location ?? provider.city ?? 'Dakar'),
    verified: Boolean(provider.verified),
    image: typeof provider.image === 'string' ? provider.image : null,
    services: toStringArray(provider.services),
    languages: toStringArray(provider.languages),
    completed_jobs: toNumber(completedJobs, 0),
    response_time: String(responseTime ?? '24h'),
  };
};

export default function AlloPrestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

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
        const { data, error: err } = await backendClient
          .from('providers')
          .select('*')
          .order('rating', { ascending: false });
        if (err) throw err;
        const mapped: Provider[] = (data || []).map((p) => normalizeProvider(p as Record<string, unknown>));
        setProviders(mapped);
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
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
  }, [providers, selectedCategory, searchQuery, priceRange, minRating, verifiedOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setPriceRange('all');
    setMinRating(null);
    setVerifiedOnly(false);
    setSearchQuery('');
    setSortBy('rating');
  };

  const hasActiveFilters = selectedCategory !== 'all' || priceRange !== 'all' || minRating !== null || verifiedOnly || searchQuery !== '';

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        {/* Hero Section */}
        <section className="relative min-h-[680px] w-full overflow-hidden bg-[#090909]">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/home/service.jpg"
              alt="AlloPresta"
              className="h-full w-full object-cover object-center opacity-45"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.94)_0%,rgba(7,7,7,0.76)_46%,rgba(7,7,7,0.34)_100%)]"></div>
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

          <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
            <div className="mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">
                  AlloPresta by C2P
                </p>
                <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-white sm:text-5xl lg:text-7xl">
                  Des prestataires verifies pour vos missions exigeantes
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                  Selectionnez des professionnels qualifies, comparez les expertises et lancez vos demandes de prestation depuis un espace clair, fiable et accompagne.
                </p>
              </div>

              {/* Search Bar */}
              <div className="mt-12 max-w-4xl rounded-[26px] border border-white/12 bg-white/[0.08] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-black/25 px-4">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className="ri-search-line text-[#d5b46f] text-xl"></i>
                    </div>
                    <input
                      type="text"
                      placeholder="Rechercher un service ou un prestataire..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/42"
                    />
                  </div>
                  <button className="min-h-14 cursor-pointer whitespace-nowrap rounded-2xl bg-[#d5b46f] px-10 py-4 font-semibold text-[#111] transition-all hover:bg-[#f1d58c]">
                    Rechercher
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 sm:grid-cols-3">
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">{providers.length}+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Prestataires actifs</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">5,000+</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Prestations realisees</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-black/25 p-5">
                    <div className="mb-1 text-3xl font-semibold text-white">4.8/5</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/55">Satisfaction client</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="border-y border-white/10 bg-[#111] px-4 py-6 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'border-[#d5b46f] bg-[#d5b46f] text-[#111]'
                      : 'border-white/10 bg-white/[0.04] text-white/62 hover:border-[#d5b46f]/60 hover:text-white'
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

        {/* Main Content */}
        <section className="px-4 py-10 sm:px-6 lg:px-20 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filters Sidebar */}
              <aside className="w-full lg:w-72 flex-shrink-0">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Filtres</h3>
                    <button
                      className="lg:hidden w-8 h-8 flex items-center justify-center"
                      onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className={showFiltersMobile ? 'ri-arrow-up-s-line text-white/55' : 'ri-arrow-down-s-line text-white/55'}></i>
                      </div>
                    </button>
                  </div>

                  <div className={`${showFiltersMobile ? 'block' : 'hidden'} lg:block space-y-6`}>
                    {/* Price Range */}
                    <div>
                      <label className="mb-3 block text-sm font-medium text-white/70">
                        Tarif horaire (FCFA)
                      </label>
                      <select
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-[#d5b46f]"
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
                      <label className="mb-3 block text-sm font-medium text-white/70">
                        Notation minimum
                      </label>
                      <div className="space-y-2">
                        {[5, 4.5, 4, 3.5].map((rating) => (
                          <label key={rating} className="flex cursor-pointer items-center gap-2">
                            <input
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
                              <span className="ml-1 text-sm text-white/58">{rating}+</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Verification */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={verifiedOnly}
                          onChange={(e) => setVerifiedOnly(e.target.checked)}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-white/68">Prestataires verifies uniquement</span>
                      </label>
                    </div>

                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="w-full cursor-pointer whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-[#d5b46f]/60 hover:text-white"
                      >
                        Reinitialiser les filtres
                      </button>
                    )}
                  </div>
                </div>
              </aside>

              {/* Results */}
              <div className="flex-1 min-w-0">
                {/* Sort Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                  <div className="text-sm text-white/62">
                    <strong className="text-white">{filteredPrestataires.length}</strong> prestataire{filteredPrestataires.length !== 1 ? 's' : ''} trouve{filteredPrestataires.length !== 1 ? 's' : ''}
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white outline-none focus:border-[#d5b46f]"
                  >
                    <option value="rating">Mieux notés</option>
                    <option value="price-low">Prix croissant</option>
                    <option value="price-high">Prix décroissant</option>
                    <option value="reviews">Plus d&apos;avis</option>
                  </select>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] animate-pulse">
                        <div className="h-64 bg-white/10"></div>
                        <div className="p-5 space-y-3">
                          <div className="h-5 bg-white/10 rounded w-3/4"></div>
                          <div className="h-4 bg-white/10 rounded w-1/2"></div>
                          <div className="h-4 bg-white/10 rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPrestataires.length === 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <i className="ri-search-line text-[#d5b46f] text-2xl"></i>
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-white">Aucun prestataire trouve</h3>
                    <p className="mb-4 text-sm text-white/58">Essayez d&apos;ajuster vos filtres pour voir plus de resultats</p>
                    <button
                      onClick={resetFilters}
                      className="cursor-pointer whitespace-nowrap rounded-full bg-[#d5b46f] px-6 py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-[#f1d58c]"
                    >
                      Reinitialiser les filtres
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPrestataires.map((prestataire) => (
                      <Link
                        key={prestataire.id}
                        to={`/allopresta/prestataire/${prestataire.id}`}
                        className="group cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5b46f]/45 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)]"
                      >
                        <div className="relative h-48 sm:h-64 w-full overflow-hidden">
                          <img
                            src={prestataire.image || '/images/home/trust.jpg'}
                            alt={prestataire.name}
                            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
                          {prestataire.verified && (
                            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#d5b46f] px-3 py-1 text-xs font-semibold text-[#111]">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-verified-badge-fill"></i>
                              </div>
                              <span>Verifie</span>
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="mb-1 text-lg font-semibold text-white">
                                {prestataire.name}
                              </h3>
                              <p className="text-sm text-white/55">{prestataire.title}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-star-fill text-yellow-400 text-sm"></i>
                              </div>
                              <span className="text-sm font-semibold text-white">
                                {prestataire.rating}
                              </span>
                            </div>
                            <span className="text-sm text-white/45">
                              ({prestataire.reviews} avis)
                            </span>
                            <span className="text-white/25">•</span>
                            <span className="text-sm text-white/45">{prestataire.completed_jobs} missions</span>
                          </div>

                          <div className="mb-4 flex items-center gap-2 text-sm text-white/52">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line"></i>
                            </div>
                            <span>{prestataire.location}</span>
                          </div>

                          <div className="mb-4 flex items-center gap-2 text-sm text-white/52">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-translate-2"></i>
                            </div>
                            <span>{prestataire.languages.join(', ')}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {prestataire.services.map((service, index) => (
                              <span
                                key={index}
                                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/62"
                              >
                                {service}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between border-t border-white/10 pt-4">
                            <div>
                              <div className="text-xl font-semibold text-[#d5b46f]">
                                {prestataire.price_per_hour.toLocaleString('fr-FR')} FCFA
                              </div>
                              <div className="text-xs text-white/42">par heure</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/52">
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

        {/* CTA Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(213,180,111,0.18),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.02))] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">
              Espace prestataire
            </p>
            <h2 className="mb-6 text-3xl font-semibold text-white md:text-5xl">
              Vous etes professionnel ?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-white/65">
              Rejoignez une communaute qualifiee, recevez des demandes mieux cadrées et developpez votre activite dans l&apos;ecosysteme C2P.
            </p>
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-[#d5b46f] px-10 py-4 text-lg font-semibold text-[#111] transition-all hover:bg-white"
            >
              <span>Devenir Prestataire</span>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-arrow-right-line"></i>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
