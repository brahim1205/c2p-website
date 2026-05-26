import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import FormateurPublicProfileStats from './FormateurPublicProfileStats';
import {
  FormateurPublicProfileEditor,
  FormateurPublicProfileHeader,
} from './FormateurPublicProfilePanels';
import { useFormateurPublicProfileSession } from './useFormateurPublicProfileSession';

export default function FormateurPublicProfilePage() {
  const session = useFormateurPublicProfileSession();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Profil public' },
          ]}
        />

        <FormateurPublicProfileHeader session={session} />
        <FormateurPublicProfileStats stats={session.stats} />
        <FormateurPublicProfileEditor session={session} />
      </div>
    </DashboardLayout>
  );
}
