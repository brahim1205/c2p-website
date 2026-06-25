import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { SkeletonCard } from '@/components/base/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { queryKeys } from '@/lib/queryKeys';
import {
  createPrestataireService,
  deletePrestataireService,
  fetchPrestataireServices,
  updatePrestataireService,
  updatePrestataireServiceStatus,
  type PrestataireService as Service,
} from '@/lib/prestataireDashboardApi';
import PrestataireServiceCard from './PrestataireServiceCard';
import PrestataireServiceFilters from './PrestataireServiceFilters';
import { PrestataireServicesHeader } from './PrestataireServicesHeader';
import {
  CreateServiceModal,
  DeleteServiceModal,
  EditServiceModal,
} from './PrestataireServiceModals';
import PrestataireServiceStats from './PrestataireServiceStats';
import {
  computePrestataireServiceStats,
  filterPrestataireServices,
  type ServiceStatusFilter,
} from './servicePageModel';

export default function PrestataireServicesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { gateFor } = useSubscriptionAccess(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>('all');
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
  const subscriptionGate = gateFor('provider_services_manage');

  const servicesQuery = useQuery({
    queryKey: queryKeys.prestataire.services(user?.id),
    queryFn: () => fetchPrestataireServices(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (servicesQuery.data && !servicesQuery.data.providerId) {
      error('Prestataire introuvable', 'Votre compte prestataire n est pas encore relie a une fiche service.');
    }
  }, [error, servicesQuery.data]);

  useEffect(() => {
    if (servicesQuery.isError) {
      console.error(servicesQuery.error);
      error('Erreur', 'Impossible de charger les services.');
    }
  }, [error, servicesQuery.error, servicesQuery.isError]);

  const loading = servicesQuery.isLoading;
  const providerId = servicesQuery.data?.providerId ?? null;
  const services: Service[] = useMemo(() => servicesQuery.data?.services ?? [], [servicesQuery.data?.services]);

  const refreshServices = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.prestataire.services(user?.id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.prestataire.dashboard(user?.id) });
  };

  const filteredServices = useMemo(
    () => filterPrestataireServices(services, searchQuery, statusFilter),
    [searchQuery, services, statusFilter],
  );

  const handleToggleStatus = async (service: Service) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    const newStatus = service.status === 'active' ? 'paused' : 'active';
    try {
      await updatePrestataireServiceStatus(service.id, newStatus);
    } catch {
      error('Erreur', 'Impossible de modifier le statut.');
      return;
    }
    await refreshServices();
    success(
      `Service ${newStatus === 'active' ? 'activé' : 'mis en pause'}`,
      `"${service.title}" est maintenant ${newStatus === 'active' ? 'visible' : 'masqué'} sur la plateforme.`
    );
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    try {
      await deletePrestataireService(selectedService.id);
    } catch {
      error('Erreur', 'Impossible de supprimer le service.');
      return;
    }
    await refreshServices();
    success('Service supprimé', `Le service "${selectedService.title}" a été supprimé.`);
    setShowDeleteModal(false);
    setSelectedService(null);
  };

  const handleCreate = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!providerId) {
      error('Prestataire introuvable', 'Aucune fiche prestataire associee a ce compte.');
      return;
    }

    if (!newService.title || !newService.price) {
      error('Champs requis', 'Le titre et le prix sont obligatoires.');
      return;
    }
    try {
      await createPrestataireService(providerId, {
        title: newService.title,
        category: newService.category || 'Bâtiment',
        description: newService.description || '',
        price: newService.price,
        price_type: newService.price_type || 'fixe',
        status: newService.status || 'active',
        location: newService.location || 'Dakar',
        image: newService.image || '',
      });
    } catch {
      error('Erreur', 'Impossible de créer le service.');
      return;
    }
    success('Service créé', `"${newService.title}" a été ajouté avec succès.`);
    setShowCreateModal(false);
    setNewService({
      title: '', category: 'Bâtiment', description: '', price: '',
      price_type: 'fixe', status: 'active', image: '', location: 'Dakar'
    });
    await refreshServices();
  };

  const handleEdit = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (!selectedService) return;
    try {
      await updatePrestataireService(selectedService.id, {
        title: editService.title ?? selectedService.title,
        category: editService.category ?? selectedService.category,
        description: editService.description ?? selectedService.description,
        price: editService.price ?? selectedService.price,
        price_type: editService.price_type ?? selectedService.price_type,
        location: editService.location ?? selectedService.location,
        image: editService.image ?? selectedService.image,
      });
    } catch {
      error('Erreur', 'Impossible de modifier le service.');
      return;
    }
    await refreshServices();
    success('Service mis à jour', `"${editService.title || selectedService.title}" a été modifié.`);
    setShowEditModal(false);
    setSelectedService(null);
    setEditService({});
  };

  const stats = useMemo(() => computePrestataireServiceStats(services), [services]);

  const openEditModal = (service: Service) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setSelectedService(service);
    setEditService({
      title: service.title,
      category: service.category,
      description: service.description,
      price: service.price,
      price_type: service.price_type,
      location: service.location,
      image: service.image,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (service: Service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PrestataireServicesHeader
          gate={subscriptionGate}
          onCreate={() => {
            if (!subscriptionGate.allowed) {
              error(subscriptionGate.title, subscriptionGate.message);
              return;
            }
            setShowCreateModal(true);
          }}
        />

        <PrestataireServiceStats stats={stats} />

        <PrestataireServiceFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchQueryChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard count={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <PrestataireServiceCard
                key={service.id}
                service={service}
                subscriptionAllowed={subscriptionGate.allowed}
                onDeleteRequest={openDeleteModal}
                onEditRequest={openEditModal}
                onToggleStatus={handleToggleStatus}
              />
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

        {showCreateModal && (
          <CreateServiceModal
            newService={newService}
            onCancel={() => setShowCreateModal(false)}
            onCreate={handleCreate}
            onNewServiceChange={setNewService}
          />
        )}

        {showEditModal && selectedService && (
          <EditServiceModal
            editService={editService}
            selectedService={selectedService}
            onCancel={() => { setShowEditModal(false); setSelectedService(null); }}
            onEditServiceChange={setEditService}
            onSave={handleEdit}
          />
        )}

        {showDeleteModal && selectedService && (
          <DeleteServiceModal
            selectedService={selectedService}
            onCancel={() => { setShowDeleteModal(false); setSelectedService(null); }}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
