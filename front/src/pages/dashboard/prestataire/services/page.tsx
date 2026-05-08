import { useState, useEffect, useCallback } from 'react';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { fetchProviderByUserId } from '@/lib/providerApi';
import ImageUploadField from '@/components/base/ImageUploadField';


interface Service {
  id: number;
  title: string;
  category: string;
  description: string;
  price: string;
  price_type: string;
  status: string;
  bookings: number;
  rating: number;
  image: string;
  location: string;
  created_at: string;
}

export default function PrestataireServicesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newService, setNewService] = useState<Partial<Service>>({
    title: '',
    category: 'Bâtiment',
    description: '',
    price: '',
    price_type: 'fixe',
    status: 'active',
    image: '',
    location: 'Dakar',
  });
  const [editService, setEditService] = useState<Partial<Service>>({});

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setProviderId(null);
        setServices([]);
        return;
      }

      const provider = await fetchProviderByUserId(user.id);
      if (!provider?.id) {
        setProviderId(null);
        setServices([]);
        error('Prestataire introuvable', 'Votre compte prestataire n est pas encore relie a une fiche service.');
        return;
      }

      setProviderId(provider.id);

      const { data, error: err } = await backendClient
        .from('provider_services')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false });
      if (err) {
        throw err;
      }
      setServices((data || []) as Service[]);
    } catch (err) {
      error('Erreur', 'Impossible de charger les services.');
      console.error(err);
      setServices([]);
      setProviderId(null);
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const filteredServices = services.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (service: Service) => {
    const newStatus = service.status === 'active' ? 'paused' : 'active';
    const { error: err } = await backendClient
      .from('provider_services')
      .update({ status: newStatus })
      .eq('id', service.id);
    if (err) {
      error('Erreur', 'Impossible de modifier le statut.');
      return;
    }
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: newStatus } : s));
    success(
      `Service ${newStatus === 'active' ? 'activé' : 'mis en pause'}`,
      `"${service.title}" est maintenant ${newStatus === 'active' ? 'visible' : 'masqué'} sur la plateforme.`
    );
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    const { error: err } = await backendClient.from('provider_services').delete().eq('id', selectedService.id);
    if (err) {
      error('Erreur', 'Impossible de supprimer le service.');
      return;
    }
    setServices(prev => prev.filter(s => s.id !== selectedService.id));
    success('Service supprimé', `Le service "${selectedService.title}" a été supprimé.`);
    setShowDeleteModal(false);
    setSelectedService(null);
  };

  const handleCreate = async () => {
    if (!providerId) {
      error('Prestataire introuvable', 'Aucune fiche prestataire associee a ce compte.');
      return;
    }

    if (!newService.title || !newService.price) {
      error('Champs requis', 'Le titre et le prix sont obligatoires.');
      return;
    }
    const { data, error: err } = await backendClient
      .from('provider_services')
      .insert({
        provider_id: providerId,
        title: newService.title,
        category: newService.category || 'Bâtiment',
        description: newService.description || '',
        price: newService.price,
        price_type: newService.price_type || 'fixe',
        status: newService.status || 'active',
        location: newService.location || 'Dakar',
        image: newService.image || '',
        bookings: 0,
        rating: 0,
      })
      .select('id')
      .single();
    if (err || !data) {
      error('Erreur', 'Impossible de créer le service.');
      return;
    }
    success('Service créé', `"${newService.title}" a été ajouté avec succès.`);
    setShowCreateModal(false);
    setNewService({
      title: '', category: 'Bâtiment', description: '', price: '',
      price_type: 'fixe', status: 'active', image: '', location: 'Dakar'
    });
    fetchServices();
  };

  const handleEdit = async () => {
    if (!selectedService) return;
    const { error: err } = await backendClient
      .from('provider_services')
      .update({
        title: editService.title || selectedService.title,
        description: editService.description || selectedService.description,
        price: editService.price || selectedService.price,
        location: editService.location || selectedService.location,
        image: editService.image || selectedService.image,
      })
      .eq('id', selectedService.id);
    if (err) {
      error('Erreur', 'Impossible de modifier le service.');
      return;
    }
    setServices(prev => prev.map(s => s.id === selectedService.id
      ? {
          ...s,
          title: editService.title || s.title,
          description: editService.description || s.description,
          price: editService.price || s.price,
          location: editService.location || s.location,
          image: editService.image || s.image,
        }
      : s
    ));
    success('Service mis à jour', `"${editService.title || selectedService.title}" a été modifié.`);
    setShowEditModal(false);
    setSelectedService(null);
    setEditService({});
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-amber-100 text-amber-700',
      pending: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      paused: 'En pause',
      pending: 'En attente',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = {
    active: services.filter(s => s.status === 'active').length,
    bookings: services.reduce((sum, s) => sum + s.bookings, 0),
    avgRating: (() => {
      const ratedServices = services.filter((service) => Number(service.rating) > 0);
      if (!ratedServices.length) return '0.0';
      const total = ratedServices.reduce((sum, service) => sum + Number(service.rating), 0);
      return (total / ratedServices.length).toFixed(1);
    })(),
    revenue: services.reduce((sum, s) => {
      const price = parseInt(s.price.replace(/[^0-9]/g, '')) || 0;
      return sum + price * s.bookings;
    }, 0),
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Mes services' }]} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes services</h1>
            <p className="text-gray-600 text-sm md:text-base">Gérez et organisez vos offres de service</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-add-line text-base"></i>
            </div>
            Nouveau service
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Services actifs', value: String(stats.active), icon: 'ri-briefcase-line', color: 'bg-[#14B8A6]' },
            { label: 'Réservations', value: String(stats.bookings), icon: 'ri-calendar-check-line', color: 'bg-blue-500' },
            { label: 'Note moyenne', value: stats.avgRating, icon: 'ri-star-line', color: 'bg-yellow-500' },
            { label: 'Revenus estimés', value: `${(stats.revenue / 1000000).toFixed(1)}M FCFA`, icon: 'ri-coins-line', color: 'bg-green-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un service..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'paused', 'pending'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-[#14B8A6] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : status === 'paused' ? 'En pause' : 'En attente'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-44 overflow-hidden">
                  <img src={service.image || 'https://readdy.ai/api/search-image?query=professional%20service%20work%20modern%20background%20clean%20simple&width=400&height=250&seq=svc-fallback&orientation=landscape'} alt={service.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(service.status)}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">{service.category}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-base mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">{service.price}</span>
                    <div className="flex items-center gap-1">
                      {service.rating > 0 && (
                        <>
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-star-fill text-yellow-500 text-sm"></i>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{service.rating}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <i className="ri-map-pin-line"></i>{service.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-check-line"></i>{service.bookings} réservations
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {service.status !== 'pending' && (
                      <button
                        onClick={() => handleToggleStatus(service)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          service.status === 'active'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        }`}
                      >
                        {service.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedService(service); setEditService({}); setShowEditModal(true); }}
                      className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-edit-line"></i>
                      </div>
                    </button>
                    <button
                      onClick={() => { setSelectedService(service); setShowDeleteModal(true); }}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-delete-bin-line"></i>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredServices.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-briefcase-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun service trouvé</h3>
            <p className="text-gray-600">Ajustez vos filtres ou créez un nouveau service</p>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Nouveau service</h3>
              <div className="dashboard-form-grid">
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={newService.title || ''}
                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                    placeholder="Ex: Plomberie résidentielle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select
                      value={newService.category || 'Bâtiment'}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm bg-white"
                    >
                      <option>Bâtiment</option>
                      <option>Électricité</option>
                      <option>Extérieur</option>
                      <option>Ameublement</option>
                      <option>Informatique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                    <input
                      type="text"
                      value={newService.location || 'Dakar'}
                      onChange={(e) => setNewService({ ...newService, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newService.description || ''}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="Décrivez votre service..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{(newService.description || '').length}/500 caractères</p>
                </div>
                <ImageUploadField
                  label="Image du service"
                  value={newService.image || ''}
                  onChange={(url) => setNewService({ ...newService, image: url })}
                  folder="c2p/services"
                  helper="Importez une image claire de votre service ou collez une URL publique."
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix *</label>
                    <input
                      type="text"
                      value={newService.price || ''}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      placeholder="Ex: 25,000 FCFA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de prix</label>
                    <select
                      value={newService.price_type || 'fixe'}
                      onChange={(e) => setNewService({ ...newService, price_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm bg-white"
                    >
                      <option value="fixe">Prix fixe</option>
                      <option value="devis">Sur devis</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Modifier le service</h3>
              <div className="dashboard-form-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    defaultValue={selectedService.title}
                    onChange={(e) => setEditService(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                  />
                </div>
                <div className="dashboard-form-wide">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    defaultValue={selectedService.description}
                    onChange={(e) => setEditService(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm resize-none"
                  />
                </div>
                <ImageUploadField
                  label="Image du service"
                  value={editService.image || selectedService.image || ''}
                  onChange={(url) => setEditService((prev) => ({ ...prev, image: url }))}
                  folder="c2p/services"
                  helper="Mettez a jour le visuel affiche dans votre catalogue."
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix</label>
                    <input
                      type="text"
                      defaultValue={selectedService.price}
                      onChange={(e) => setEditService(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                    <input
                      type="text"
                      defaultValue={selectedService.location}
                      onChange={(e) => setEditService(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#14B8A6] text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => { setShowEditModal(false); setSelectedService(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-alert-line text-red-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Supprimer le service</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>"{selectedService.title}"</strong> ? Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowDeleteModal(false); setSelectedService(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
