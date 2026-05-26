import type { ComponentProps } from 'react';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';

interface PrestataireServicesHeaderProps {
  gate: ComponentProps<typeof SubscriptionRequiredBanner>['gate'];
  onCreate: () => void;
}

export function PrestataireServicesHeader({ gate, onCreate }: PrestataireServicesHeaderProps) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Prestataire', path: '/dashboard/prestataire' }, { label: 'Mes services' }]} />
      <SubscriptionRequiredBanner gate={gate} />

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Mes services</h1>
          <p className="text-sm text-gray-600 md:text-base">Gérez et organisez vos offres de service</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0f766e] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#115e59]"
        >
          <i className="ri-add-line text-xl"></i>
          Ajouter un service
        </button>
      </div>
    </>
  );
}
