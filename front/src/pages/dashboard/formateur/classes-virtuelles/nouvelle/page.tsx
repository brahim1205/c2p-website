import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import VirtualClassCreateForm from '../VirtualClassCreateForm';
import { useVirtualClassesPageSession } from '../useVirtualClassesPageSession';

export default function FormateurCreateVirtualClassPage() {
  const navigate = useNavigate();
  const session = useVirtualClassesPageSession();

  const submit = async () => {
    const created = await session.handleCreateClass();
    if (created) navigate('/dashboard/formateur/classes-virtuelles');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Classes virtuelles', path: '/dashboard/formateur/classes-virtuelles' },
            { label: 'Nouvelle classe' },
          ]}
        />
        <SubscriptionRequiredBanner gate={session.subscriptionGate} />

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Live formateur</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Programmer une classe virtuelle</h1>
            <p className="mt-2 text-sm text-gray-600">
              Rattachez la session à une formation, choisissez le créneau et configurez la salle.
            </p>
          </header>

          <VirtualClassCreateForm
            embedded
            newClass={session.newClass}
            errors={session.createErrors}
            formMessage={session.createFormMessage}
            instructorCourses={session.instructorCourses}
            onUpdateClass={session.updateNewClass}
            onSelectCourse={session.selectCreateCourse}
          />

          <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard/formateur/classes-virtuelles')}
              disabled={session.isCreating}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={session.isCreating || !session.canCreateClass}
              className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {session.isCreating ? 'Programmation...' : 'Programmer la classe'}
            </button>
          </footer>
        </section>
      </div>
    </DashboardLayout>
  );
}
