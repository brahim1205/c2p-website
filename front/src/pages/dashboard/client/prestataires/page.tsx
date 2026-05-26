import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import {
  ClientPrestatairesEmptyState,
  ClientPrestatairesFilters,
  ClientPrestatairesHero,
  ClientPrestatairesList,
  ClientProviderRequestModal,
} from './ClientPrestatairesPanels';
import { useClientPrestatairesSession } from './useClientPrestatairesSession';

export default function ClientPrestatairesPage() {
  const session = useClientPrestatairesSession();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Client / Prestateur', path: '/dashboard/client' }, { label: 'Trouver un prestataire' }]} />

        <ClientPrestatairesHero />

        <ClientPrestatairesFilters
          allCategories={session.allCategories}
          categoryFilter={session.categoryFilter}
          filteredCount={session.filtered.length}
          hasActiveFilters={session.hasActiveFilters}
          resetFilters={session.resetFilters}
          search={session.search}
          setCategoryFilter={session.setCategoryFilter}
          setSearch={session.setSearch}
        />

        <ClientPrestatairesList
          favoriteIds={session.favoriteIds}
          filtered={session.filtered}
          loading={session.loading}
          openRequestModal={session.openRequestModal}
          toggleFavorite={session.toggleFavorite}
        />

        <ClientPrestatairesEmptyState loading={session.loading} resultCount={session.filtered.length} />
      </div>

      {session.showRequestModal && session.selectedPrestataire ? (
        <ClientProviderRequestModal
          closeRequestModal={session.closeRequestModal}
          requestForm={session.requestForm}
          selectedPrestataire={session.selectedPrestataire}
          setRequestForm={session.setRequestForm}
          submitRequest={session.submitRequest}
        />
      ) : null}
    </DashboardLayout>
  );
}
