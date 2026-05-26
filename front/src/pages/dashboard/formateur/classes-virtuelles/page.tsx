import DashboardLayout from '../../components/DashboardLayout';
import VirtualClassesPageShell from './VirtualClassesPageShell';
import { useVirtualClassesPageSession } from './useVirtualClassesPageSession';

export default function FormateurClassesPage() {
  const session = useVirtualClassesPageSession();

  return (
    <DashboardLayout>
      <VirtualClassesPageShell session={session} />
    </DashboardLayout>
  );
}
