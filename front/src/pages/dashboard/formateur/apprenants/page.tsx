import Breadcrumb from '@/components/base/Breadcrumb';
import DashboardLayout from '../../components/DashboardLayout';
import LearnerDetailModal from './LearnerDetailModal';
import {
  LearnerFiltersPanel,
  LearnerStatsGrid,
  LearnersEmptyState,
  LearnersTable,
} from './ApprenantsPanels';
import { useFormateurApprenantsSession } from './useFormateurApprenantsSession';

export default function FormateurApprenantsPage() {
  const session = useFormateurApprenantsSession();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Mes apprenants' }]} />

        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Mes apprenants</h1>
          <p className="text-sm text-gray-600 md:text-base">Suivez la progression, les évaluations et les signaux d&apos;attention de vos apprenants.</p>
        </div>

        <LearnerStatsGrid stats={session.stats} />

        <LearnerFiltersPanel
          attentionFilter={session.attentionFilter}
          courseFilter={session.courseFilter}
          courses={session.courses}
          searchQuery={session.searchQuery}
          statusFilter={session.statusFilter}
          onAttentionChange={session.setAttentionFilter}
          onCourseChange={session.setCourseFilter}
          onSearchChange={session.setSearchQuery}
          onStatusChange={session.setStatusFilter}
        />

        <LearnersTable
          loading={session.loading}
          students={session.filteredStudents}
          onMessage={session.handleSendMessage}
          onOpenDetail={session.openStudentDetail}
        />

        {session.filteredStudents.length === 0 && !session.loading ? <LearnersEmptyState /> : null}

        {session.showDetailModal && session.selectedStudent ? (
          <LearnerDetailModal
            detailLoading={session.detailLoading}
            detailStats={session.detailStats}
            selectedStudent={session.selectedStudent}
            studentDetail={session.studentDetail}
            onClose={session.closeModal}
            onMessage={session.handleSendMessage}
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
