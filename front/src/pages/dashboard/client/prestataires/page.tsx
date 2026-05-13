import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { REQUEST_TYPE_META, getPaymentMethodLabel, type BookingRequestType } from '@/lib/clientDashboard';
import {
  addClientFavorite,
  createClientManagedBooking,
  fetchClientProvidersAndFavorites,
  removeClientFavorite,
  type ClientFavoriteRow as FavoriteRow,
  type ClientPrestataire as Prestataire,
} from '@/lib/clientDashboardApi';

interface RequestFormState {
  requestType: BookingRequestType;
  service: string;
  date: string;
  time: string;
  budget: string;
  address: string;
  description: string;
  paymentMethod: string;
}
function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatAvailability(provider: Prestataire) {
  if (provider.availabilityStatus === 'today') return 'Disponible aujourd’hui';
  if (provider.availabilityStatus === 'tomorrow') return 'Créneau demain';
  if (!provider.nextAvailableAt) return 'Indisponible';
  return `Prochain créneau ${new Date(provider.nextAvailableAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
}

function buildSmartScore(provider: Prestataire, query: string) {
  if (!query.trim()) {
    return (provider.rating * 10) + provider.reviews - (provider.distanceKm ?? 20);
  }

  const text = normalize(query);
  let score = 0;
  if (normalize(provider.name).includes(text)) score += 8;
  if (normalize(provider.title).includes(text)) score += 5;
  if (normalize(provider.service).includes(text)) score += 6;
  if (normalize(provider.location).includes(text)) score += 4;
  if (provider.categories.some((category) => normalize(category).includes(text))) score += 4;
  if (provider.services.some((service) => normalize(service).includes(text))) score += 5;
  score += provider.rating;
  score -= (provider.distanceKm ?? 15) / 10;
  return score;
}

export default function ClientPrestatairesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today' | 'tomorrow' | 'busy'>('all');
  const [sortBy, setSortBy] = useState<'smart' | 'rating' | 'reviews' | 'price' | 'distance'>('smart');
  const [maxPrice, setMaxPrice] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    requestType: 'booking',
    service: '',
    date: '',
    time: '09:00',
    budget: '',
    address: '',
    description: '',
    paymentMethod: 'wave',
  });

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const snapshot = await fetchClientProvidersAndFavorites(user?.id);
        setPrestataires(snapshot.providers);
        setFavorites(snapshot.favorites);
      } catch (fetchError) {
        console.error(fetchError);
        setPrestataires([]);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchProviders();
  }, [user?.id]);

  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => Number(favorite.provider_id))), [favorites]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>(['Toutes']);
    prestataires.forEach((provider) => {
      provider.categories.forEach((category) => categories.add(category));
    });
    return Array.from(categories);
  }, [prestataires]);

  const filtered = useMemo(() => {
    const maxPriceValue = maxPrice ? Number(maxPrice) : null;
    const maxDistanceValue = maxDistance ? Number(maxDistance) : null;
    const minRatingValue = minRating ? Number(minRating) : 0;

    return prestataires
      .filter((provider) => {
        const matchesSearch = !search.trim() || buildSmartScore(provider, search) > provider.rating;
        const matchesCategory = categoryFilter === 'Toutes' || provider.categories.includes(categoryFilter);
        const matchesAvailability = availabilityFilter === 'all' || provider.availabilityStatus === availabilityFilter;
        const matchesPrice = maxPriceValue === null || provider.pricePerHour === null || provider.pricePerHour <= maxPriceValue;
        const matchesDistance = maxDistanceValue === null || provider.distanceKm === null || provider.distanceKm <= maxDistanceValue;
        const matchesRating = provider.rating >= minRatingValue;
        return matchesSearch && matchesCategory && matchesAvailability && matchesPrice && matchesDistance && matchesRating;
      })
      .sort((left, right) => {
        if (sortBy === 'smart') return buildSmartScore(right, search) - buildSmartScore(left, search);
        if (sortBy === 'rating') return right.rating - left.rating;
        if (sortBy === 'reviews') return right.reviews - left.reviews;
        if (sortBy === 'distance') return (left.distanceKm ?? 999) - (right.distanceKm ?? 999);
        return (left.pricePerHour ?? Number.MAX_SAFE_INTEGER) - (right.pricePerHour ?? Number.MAX_SAFE_INTEGER);
      });
  }, [availabilityFilter, categoryFilter, maxDistance, maxPrice, minRating, prestataires, search, sortBy]);

  const openRequestModal = (provider: Prestataire, requestType: BookingRequestType) => {
    setSelectedPrestataire(provider);
    setRequestForm({
      requestType,
      service: provider.services[0] || provider.service,
      date: '',
      time: '09:00',
      budget: provider.pricePerHour ? String(provider.pricePerHour) : '',
      address: '',
      description: '',
      paymentMethod: provider.paymentMethods[0] || 'wave',
    });
    setShowRequestModal(true);
  };

  const toggleFavorite = async (provider: Prestataire) => {
    if (!user?.id) {
      error('Connexion requise', 'Connectez-vous pour gérer vos favoris.');
      return;
    }

    const existing = favorites.find((favorite) => Number(favorite.provider_id) === provider.id);
    try {
      if (existing) {
        await removeClientFavorite(existing.id);
        setFavorites((current) => current.filter((favorite) => String(favorite.id) !== String(existing.id)));
        success('Favori retiré', `${provider.name} a été retiré de vos favoris.`);
        return;
      }

      const nextFavorite = await addClientFavorite(user.id, provider.id);
      setFavorites((current) => [
        ...(nextFavorite ? [nextFavorite] : [{ id: `fav-${Date.now()}`, provider_id: provider.id }]),
        ...current,
      ]);
      success('Favori ajouté', `${provider.name} est maintenant dans vos favoris.`);
    } catch (toggleError) {
      console.error(toggleError);
      error('Erreur', 'Impossible de mettre à jour vos favoris.');
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedPrestataire || !user) return;
    if (!requestForm.service || !requestForm.date || !requestForm.address.trim() || !requestForm.description.trim()) {
      error('Informations manquantes', 'Renseignez le service, la date, l adresse et le besoin.');
      return;
    }

    const requestMeta = REQUEST_TYPE_META[requestForm.requestType];
    const price = requestForm.budget ? Number(requestForm.budget) : selectedPrestataire.pricePerHour;
    try {
      await createClientManagedBooking({
        user,
        requestedProviderId: selectedPrestataire.id,
        service: requestForm.service,
        description: requestForm.description.trim(),
        bookingDate: requestForm.date,
        bookingTime: requestForm.time || '09:00',
        paymentMethod: requestForm.paymentMethod,
        address: requestForm.address.trim(),
        requestType: requestForm.requestType,
        price: Number.isFinite(price) ? price : null,
      });

      // Les notifications métier sont déjà créées côté backend via les side effects booking/outbox.

      success('Demande créée', `${requestMeta.label} envoyée à l équipe C2P pour traitement.`);
      setShowRequestModal(false);
      setSelectedPrestataire(null);
      navigate('/dashboard/client/reservations');
    } catch (submitError) {
      console.error(submitError);
      error('Erreur', 'Impossible d enregistrer cette demande.');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim()
    || categoryFilter !== 'Toutes'
    || availabilityFilter !== 'all'
    || sortBy !== 'smart'
    || maxPrice
    || maxDistance
    || minRating !== '0',
  );

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('Toutes');
    setAvailabilityFilter('all');
    setSortBy('smart');
    setMaxPrice('');
    setMaxDistance('');
    setMinRating('0');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client / Prestateur', path: '/dashboard/client' }, { label: 'Trouver un prestataire' }]} />

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-600">Recherche prestateur</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Trouver un prestataire</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Comparez les profils, puis soumettez votre besoin à C2P. L équipe sélectionne et assigne le bon prestataire.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Filtres de recherche</h2>
              <p className="text-sm text-gray-500">Gardez uniquement les critères utiles pour décider vite.</p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-12">
              <label className="space-y-2 text-sm text-gray-600 xl:col-span-6">
                <span className="font-medium text-gray-700">Recherche</span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="ri-search-line text-base"></i>
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nom, service, localisation ou catégorie"
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                  />
                </span>
              </label>

              <label className="space-y-2 text-sm text-gray-600 xl:col-span-3">
                <span className="font-medium text-gray-700">Catégorie</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                >
                  {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>

              <label className="space-y-2 text-sm text-gray-600 xl:col-span-3">
                <span className="font-medium text-gray-700">Disponibilité</span>
                <select
                  value={availabilityFilter}
                  onChange={(event) => setAvailabilityFilter(event.target.value as typeof availabilityFilter)}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                >
                  <option value="all">Toutes disponibilités</option>
                  <option value="today">Disponible aujourd’hui</option>
                  <option value="tomorrow">Disponible demain</option>
                  <option value="busy">Complet</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Budget max (FCFA)</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="50000"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Distance max (km)</span>
                <input
                  type="number"
                  min="0"
                  value={maxDistance}
                  onChange={(event) => setMaxDistance(event.target.value)}
                  placeholder="10"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Note minimum</span>
                <select
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                >
                  <option value="0">Toutes</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </label>

              <label className="space-y-2 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Trier par</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                >
                  <option value="smart">Pertinence intelligente</option>
                  <option value="rating">Meilleure note</option>
                  <option value="reviews">Plus d’avis</option>
                  <option value="price">Prix le plus bas</option>
                  <option value="distance">Plus proche</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <i className="ri-radar-line text-teal-600"></i>
                <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
                {search.trim() ? <span>pour “{search.trim()}”</span> : null}
              </div>
              {hasActiveFilters ? (
                <p className="text-xs text-gray-400">Filtres personnalisés actifs</p>
              ) : (
                <p className="text-xs text-gray-400">Aucun filtre avancé actif</p>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard count={6} />
          </div>
        ) : (
          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Prestataires disponibles</h2>
                <p className="text-sm text-gray-500">Chaque fiche garde les informations utiles et les actions principales.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((provider) => {
              const requestMeta = REQUEST_TYPE_META.booking;
              const isFavorite = favoriteIds.has(provider.id);
              return (
                <article key={provider.id} className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative">
                    <img src={provider.avatar} alt={provider.name} className="h-44 w-full object-cover object-top" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {provider.verified ? (
                        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
                          <i className="ri-shield-check-line mr-1"></i>Vérifié
                        </span>
                      ) : null}
                      {provider.distanceKm !== null ? (
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700">
                          <i className="ri-map-pin-range-line mr-1"></i>{provider.distanceKm} km
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(provider)}
                      className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isFavorite ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-white/70 bg-white/90 text-gray-500 hover:text-pink-600'}`}
                      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <i className={`${isFavorite ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`}></i>
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                        <p className="text-sm text-gray-500">{provider.title}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${provider.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {formatAvailability(provider)}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <i className="ri-star-fill text-yellow-500"></i>
                        <strong className="text-gray-900">{provider.rating.toFixed(1)}</strong> ({provider.reviews} avis)
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-map-pin-line"></i>{provider.location}
                      </span>
                    </div>

                    <p className="mb-3 text-sm text-gray-700">{provider.service}</p>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {provider.categories.slice(0, 3).map((category) => (
                        <span key={category} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{category}</span>
                      ))}
                    </div>

                    <div className="mb-4 grid gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Tarif</div>
                        <div className="font-semibold text-gray-900">{provider.pricePerHour ? `${formatCurrency(provider.pricePerHour)} / heure` : 'Sur devis'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Expérience</div>
                        <div className="font-semibold text-gray-900">{provider.experience}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-xs uppercase tracking-wide text-gray-400">Paiements acceptés</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {provider.paymentMethods.map((method) => (
                            <span key={method} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">{getPaymentMethodLabel(method)}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => openRequestModal(provider, 'booking')}
                        className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                      >
                        <i className={`${requestMeta.icon} mr-2`}></i>Commander via C2P
                      </button>
                      <button
                        type="button"
                        onClick={() => openRequestModal(provider, 'quote')}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        <i className="ri-file-paper-2-line mr-2"></i>Devis via C2P
                      </button>
                      <button
                        type="button"
                        onClick={() => openRequestModal(provider, 'appointment')}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <i className="ri-calendar-check-line mr-2"></i>Planifier via C2P
                      </button>
                      <Link
                        to="/dashboard/messages?support=1"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <i className="ri-customer-service-2-line mr-2"></i>Passer par C2P
                      </Link>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Link to={`/allopresta/prestataire/${provider.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
                        Voir le profil
                      </Link>
                      {provider.distanceKm !== null ? (
                        <span className="text-xs text-gray-500">Zone proche: {provider.distanceKm} km</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          </section>
        )}

        {!loading && filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <i className="ri-search-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun prestataire trouvé</h3>
            <p className="text-gray-600">Ajustez les filtres de budget, de distance ou de note.</p>
          </div>
        ) : null}
      </div>

      {showRequestModal && selectedPrestataire ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setShowRequestModal(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{REQUEST_TYPE_META[requestForm.requestType].label} avec {selectedPrestataire.name}</h3>
                <p className="text-sm text-gray-600">C2P reçoit votre besoin, vérifie le cadre puis assigne le bon prestataire.</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-gray-500"></i>
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {(Object.keys(REQUEST_TYPE_META) as BookingRequestType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRequestForm((current) => ({ ...current, requestType: type }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${requestForm.requestType === type ? REQUEST_TYPE_META[type].color : 'bg-gray-100 text-gray-600'}`}
                >
                  <i className={`${REQUEST_TYPE_META[type].icon} mr-2`}></i>{REQUEST_TYPE_META[type].label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-600">
                <span>Service</span>
                <select
                  value={requestForm.service}
                  onChange={(event) => setRequestForm((current) => ({ ...current, service: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                >
                  {selectedPrestataire.services.map((service) => <option key={service} value={service}>{service}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-600">
                <span>Mode de paiement souhaité</span>
                <select
                  value={requestForm.paymentMethod}
                  onChange={(event) => setRequestForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                >
                  {selectedPrestataire.paymentMethods.map((method) => <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-gray-600">
                <span>Date souhaitée</span>
                <input
                  type="date"
                  value={requestForm.date}
                  onChange={(event) => setRequestForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-600">
                <span>Heure</span>
                <input
                  type="time"
                  value={requestForm.time}
                  onChange={(event) => setRequestForm((current) => ({ ...current, time: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
                <span>Adresse / lieu de prestation</span>
                <input
                  type="text"
                  value={requestForm.address}
                  onChange={(event) => setRequestForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Quartier, immeuble, repère..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-600">
                <span>Budget indicatif (FCFA)</span>
                <input
                  type="number"
                  min="0"
                  value={requestForm.budget}
                  onChange={(event) => setRequestForm((current) => ({ ...current, budget: event.target.value }))}
                  placeholder={selectedPrestataire.pricePerHour ? String(selectedPrestataire.pricePerHour) : 'À discuter'}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                <div className="font-medium text-gray-900">Préférence transmise à C2P</div>
                <div className="mt-1">{selectedPrestataire.name}</div>
                <div>{formatAvailability(selectedPrestataire)}</div>
                <div>{selectedPrestataire.pricePerHour ? `${formatCurrency(selectedPrestataire.pricePerHour)} / heure` : 'Tarif sur devis'}</div>
              </div>
              <label className="space-y-2 text-sm text-gray-600 md:col-span-2">
                <span>Décrivez précisément votre besoin</span>
                <textarea
                  value={requestForm.description}
                  onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Contexte, urgence, contraintes d’accès, livrables attendus..."
                  rows={5}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button onClick={() => void handleSubmitRequest()} className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
                Envoyer à C2P
              </button>
              <button onClick={() => setShowRequestModal(false)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
