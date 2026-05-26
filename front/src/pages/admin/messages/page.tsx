import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import AdminMessagesPanels from './AdminMessagesPanels';
import { useAdminMessagesSession } from './useAdminMessagesSession';

export default function AdminMessagesPage() {
  const session = useAdminMessagesSession();

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Messages support' }]} />
        <AdminMessagesPanels session={session} />
      </div>
    </AdminLayout>
  );
}
