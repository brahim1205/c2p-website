import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SuperAdminGovernance from '../dashboard/SuperAdminGovernance';

export default function SuperAdminGovernancePage() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb items={[{ label: 'Superadmin', path: '/superadmin/dashboard' }, { label: 'Gouvernance' }]} />
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-rose-600">Accès sensibles</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Gouvernance superadmin</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Gérer les comptes privilégiés, les feature flags, les intégrations, les sessions, les sauvegardes et l audit récent.
          </p>
        </section>
        <SuperAdminGovernance />
      </div>
    </AdminLayout>
  );
}
