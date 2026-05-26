import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { REQUEST_TYPE_META, type BookingRequestType } from '@/lib/clientDashboard';
import {
  addClientFavorite,
  createClientManagedBooking,
  fetchClientProvidersAndFavorites,
  removeClientFavorite,
  type ClientFavoriteRow as FavoriteRow,
  type ClientPrestataire as Prestataire,
} from '@/lib/clientDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildSmartScore,
  createRequestForm,
  initialRequestForm,
  type RequestFormState,
} from './clientPrestatairesModel';

export function useClientPrestatairesSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(initialRequestForm);

  const providersQuery = useQuery({
    queryKey: queryKeys.client.providers(user?.id),
    queryFn: () => fetchClientProvidersAndFavorites(user?.id),
  });

  useEffect(() => {
    if (providersQuery.isError) {
      console.error(providersQuery.error);
      error('Erreur', 'Impossible de charger les prestataires.');
    }
  }, [error, providersQuery.error, providersQuery.isError]);

  const prestataires: Prestataire[] = useMemo(() => providersQuery.data?.providers ?? [], [providersQuery.data?.providers]);
  const favorites: FavoriteRow[] = useMemo(() => providersQuery.data?.favorites ?? [], [providersQuery.data?.favorites]);
  const providersQueryKey = queryKeys.client.providers(user?.id);

  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => Number(favorite.provider_id))), [favorites]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>(['Toutes']);
    prestataires.forEach((provider) => {
      provider.categories.forEach((category) => categories.add(category));
    });
    return Array.from(categories);
  }, [prestataires]);

  const filtered = useMemo(() => {
    return prestataires
      .filter((provider) => {
        const matchesSearch = !search.trim() || buildSmartScore(provider, search) > provider.rating;
        const matchesCategory = categoryFilter === 'Toutes' || provider.categories.includes(categoryFilter);
        return matchesSearch && matchesCategory;
      })
      .sort((left, right) => buildSmartScore(right, search) - buildSmartScore(left, search));
  }, [categoryFilter, prestataires, search]);

  const openRequestModal = (provider: Prestataire, requestType: BookingRequestType) => {
    setSelectedPrestataire(provider);
    setRequestForm(createRequestForm(provider, requestType));
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
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
        await queryClient.invalidateQueries({ queryKey: providersQueryKey });
        await queryClient.invalidateQueries({ queryKey: queryKeys.client.dashboard(user.id) });
        success('Favori retiré', `${provider.name} a été retiré de vos favoris.`);
        return;
      }

      await addClientFavorite(user.id, provider.id);
      await queryClient.invalidateQueries({ queryKey: providersQueryKey });
      await queryClient.invalidateQueries({ queryKey: queryKeys.client.dashboard(user.id) });
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

      await queryClient.invalidateQueries({ queryKey: queryKeys.client.root(user.id) });
      success('Demande créée', `${requestMeta.label} envoyée à l équipe C2P pour traitement.`);
      setShowRequestModal(false);
      setSelectedPrestataire(null);
      navigate('/dashboard/client/reservations');
    } catch (submitError) {
      console.error(submitError);
      error('Erreur', 'Impossible d enregistrer cette demande.');
    }
  };

  const hasActiveFilters = Boolean(search.trim() || categoryFilter !== 'Toutes');

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('Toutes');
  };

  return {
    allCategories,
    categoryFilter,
    closeRequestModal,
    favoriteIds,
    filtered,
    hasActiveFilters,
    loading: providersQuery.isLoading,
    openRequestModal,
    requestForm,
    resetFilters,
    search,
    selectedPrestataire,
    setCategoryFilter,
    setRequestForm,
    setSearch,
    showRequestModal,
    submitRequest: handleSubmitRequest,
    toggleFavorite,
  };
}
