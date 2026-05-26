import type { ComponentProps } from 'react';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';

interface FormateurAnalyticsTitleProps {
  gate: ComponentProps<typeof SubscriptionRequiredBanner>['gate'];
}

export function FormateurAnalyticsTitle({ gate }: FormateurAnalyticsTitleProps) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Analytics' }]} />
      <SubscriptionRequiredBanner gate={gate} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics formateur</h1>
        <p className="mt-2 text-gray-600">Ventes, revenus, vues, conversion, complétion et signaux d’abandon sur vos formations.</p>
      </div>
    </>
  );
}
