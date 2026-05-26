import AdminLayout from '@/components/feature/AdminLayout';
import AdminPaymentsPageShell from './AdminPaymentsPageShell';
import { useAdminPaymentsPageSession } from './useAdminPaymentsPageSession';

export default function AdminPaymentsPage() {
  const session = useAdminPaymentsPageSession();

  return (
    <AdminLayout>
      <AdminPaymentsPageShell session={session} />
    </AdminLayout>
  );
}
