import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { createNotification } from '@/hooks/useCreateNotification';
import { formatCurrency } from '@/lib/formatters';

interface Prestataire {
  id: number;
  user_id?: string;
  name: string;
  avatar: string;
  service: string;
  location: string;
  rating: number;
  reviews: number;
  price: string;
  available: boolean;
  experience: string;
  verified: boolean;
  categories: string[];
}

export default function ClientPrestatairesPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [loading, setLoading] = useState(true);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'price'>('rating');
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const { data, error } = await backendClient
          .from('providers')
          .select('*')
          .order('rating', { ascending: false });
        if (error) {
          throw error;
        }

        const mapped = ((data || []) as any[]).map((provider) => ({
          id: provider.id,
          user_id: provider.user_id,
          name: provider.name,
          avatar: provider.image || 'https://readdy.ai/api/search-image?query=professional%20african%20service%20provider%20portrait%20clean%20background&width=200&height=200&seq=provider-fallback&orientation=squarish',
          service: Array.isArray(provider.services) && provider.services.length > 0 ? provider.services[0] : provider.title || 'Service',
          location: provider.location || provider.city || 'Dakar',
          rating: Number(provider.rating || 0),
          reviews: Number(provider.reviews_count || provider.reviews || 0),
          price: provider.price_per_hour ? `${formatCurrency(Number(provider.price_per_hour))} / heure` : 'Sur devis',
          available: provider.verified !== false,
          experience: `${Number(provider.completed_jobs || 0)} missions`,
          verified: Boolean(provider.verified),
          categories: [
            provider.category ? String(provider.category) : null,
            ...(Array.isArray(provider.services) ? provider.services.slice(0, 2) : []),
          ].filter(Boolean),
        })) as Prestataire[];

        setPrestataires(mapped);
      } catch (error) {
        console.error(error);
        setPrestataires([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const allCategories = useMemo(() => {
    const categories = new Set<string>(['Toutes']);
    prestataires.forEach((provider) => {
      provider.categories.forEach((category) => categories.add(category));
    });
    return Array.from(categories);
  }, [prestataires]);

  const filtered = prestataires.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.service.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'Toutes' || p.categories.includes(categoryFilter);
    const matchesAvailability = availabilityFilter === 'all' ||
      (availabilityFilter === 'available' ? p.available : !p.available);
    return matchesSearch && matchesCategory && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'reviews') return b.reviews - a.reviews;
    if (sortBy === 'price') {
      const aPrice = Number(a.price.replace(/[^\d]/g, '')) || 0;
      const bPrice = Number(b.price.replace(/[^\d]/g, '')) || 0;
      return aPrice - bPrice;
    }
    return 0;
  });

  const handleContact = (p: Prestataire) => {
    setSelectedPrestataire(p);
    setShowContactModal(true);
  };

  const handleSendContact = async () => {
    if (!contactMessage.trim() || !selectedPrestataire || !user) return;

    const recipientUserId = selectedPrestataire.user_id ?? 'usr-prestataire';
    const conversationId = Date.now();

    try {
      await backendClient.from('conversations').insert({
        id: conversationId,
        name: selectedPrestataire.name,
        avatar: selectedPrestataire.avatar,
        role: 'Prestataire',
        type: 'individual',
        participants: [user.id, recipientUserId],
      });

      await backendClient.from('messages').insert({
        conversation_id: conversationId,
        content: contactMessage.trim(),
        sender_id: user.id,
        sender_name: `${user.firstName} ${user.lastName}`,
        sender_avatar: user.avatar ?? null,
        read: false,
      });

      await createNotification(
        recipientUserId,
        'Nouvelle demande client',
        `${user.firstName} ${user.lastName} vous a contacte pour "${selectedPrestataire.service}".`,
        'message',
        '/dashboard/messages',
        user.avatar,
      );

      success('Message envoyé', `${selectedPrestataire.name} a été notifié de votre demande.`);
      setShowContactModal(false);
      setContactMessage('');
      setSelectedPrestataire(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client', path: '/dashboard' }, { label: 'Trouver un prestataire' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Trouver un prestataire</h1>
          <p className="text-gray-600 text-sm md:text-base">Recherchez, comparez et contactez les meilleurs prestataires de services</p>
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, service, localisation..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
              >
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as typeof availabilityFilter)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="available">Disponible</option>
                <option value="busy">Indisponible</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="rating">Meilleure note</option>
                <option value="reviews">Plus d&apos;avis</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <i className="ri-filter-3-line"></i>
            <span>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonCard count={8} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="relative">
                  <img src={p.avatar} alt={p.name} className="w-full h-40 object-cover object-top" />
                  {p.verified && (
                    <div className="absolute top-3 left-3 bg-teal-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <i className="ri-shield-check-line"></i> Vérifié
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 text-xs px-2 py-1 rounded-full font-medium ${p.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.available ? 'Disponible' : 'Indisponible'}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{p.name}</h3>
                  <p className="text-sm text-teal-600 mb-2">{p.service}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-star-fill text-yellow-500 text-sm"></i>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{p.rating}</span>
                    <span className="text-sm text-gray-500">({p.reviews} avis)</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                      <i className="ri-map-pin-line text-xs"></i>
                    </div>
                    {p.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.categories.slice(0, 2).map(cat => (
                      <span key={cat} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{cat}</span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{p.price}</p>
                  <p className="text-xs text-gray-500 mb-3">Expérience : {p.experience}</p>
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => handleContact(p)}
                      className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Contacter
                    </button>
                    <Link
                      to={`/allopresta/prestataire/${p.id}`}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Voir profil
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-search-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun prestataire trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedPrestataire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contacter {selectedPrestataire.name}</h3>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <i className="ri-close-line text-gray-500"></i>
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <img src={selectedPrestataire.avatar} alt={selectedPrestataire.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-medium text-gray-900">{selectedPrestataire.service}</p>
                <p className="text-sm text-gray-500">{selectedPrestataire.location} · {selectedPrestataire.price}</p>
              </div>
            </div>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Décrivez votre besoin..."
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{contactMessage.length}/500</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSendContact}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Envoyer la demande
              </button>
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
