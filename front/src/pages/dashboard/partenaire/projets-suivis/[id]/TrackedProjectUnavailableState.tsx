import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';

export function TrackedProjectUnavailableState() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Projets suivis', path: '/dashboard/partenaire/projets-suivis' }, { label: 'Detail' }]} />
        <div className="py-20 text-center">
          <h2 className="mb-3 text-2xl font-bold text-gray-900">Projet introuvable</h2>
          <Link to="/dashboard/partenaire/projets-suivis" className="inline-flex rounded-lg bg-[#5fa6f3] px-4 py-2 text-sm font-medium text-white hover:bg-[#27346b]">
            Retour au portefeuille
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
