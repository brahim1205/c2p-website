import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';

export function ProjectUnavailableState() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Mes projets', path: '/dashboard/porteur/mes-projets' }, { label: 'Detail' }]} />
        <div className="py-20 text-center">
          <h2 className="mb-3 text-2xl font-bold text-gray-900">Projet indisponible</h2>
          <Link to="/dashboard/porteur/mes-projets" className="inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Retour aux projets
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
