import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { getInstructorWorkflowAction } from '@/lib/courseWorkflow';
import CourseCreationWizard from './components/CourseCreationWizard';
import CourseEditModal from './CourseEditModal';
import {
  CourseFilters,
  CoursesGrid,
  EmptyCoursesState,
  WorkflowModal,
} from './FormateurCoursesPanels';
import { useFormateurCoursesSession } from './useFormateurCoursesSession';

export default function FormateurCoursPage() {
  const session = useFormateurCoursesSession();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Mes cours' },
          ]}
        />
        <SubscriptionRequiredBanner gate={session.subscriptionGate} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes formations</h1>
            <p className="text-gray-600 text-sm md:text-base">Créez, gérez et publiez vos formations</p>
          </div>
          <button
            onClick={session.openCreateModal}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-add-line text-base"></i>
            </div>
            Nouvelle formation
          </button>
        </div>

        <CourseCreationWizard
          open={session.showCreateWizard}
          embedded
          userId={session.user?.id}
          onClose={() => session.setShowCreateWizard(false)}
          onCreated={async () => {
            await session.refreshCourses();
          }}
        />

        {!session.showCreateWizard ? (
          <>
            <CourseFilters
              searchQuery={session.searchQuery}
              statusFilter={session.statusFilter}
              onSearchChange={session.setSearchQuery}
              onStatusChange={session.setStatusFilter}
            />

            <CoursesGrid
              courses={session.filteredCourses}
              loading={session.loading}
              subscriptionAllowed={session.subscriptionGate.allowed}
              onWorkflowAction={session.handleWorkflowAction}
              onEdit={session.handleEdit}
              onDelete={session.handleDelete}
            />

            {session.filteredCourses.length === 0 && !session.loading && (
              <EmptyCoursesState />
            )}
          </>
        ) : null}

        {session.showWorkflowModal && session.workflowCourse && getInstructorWorkflowAction(session.workflowCourse.status) && (
          <WorkflowModal
            course={session.workflowCourse}
            onCancel={session.closeWorkflowModal}
            onConfirm={session.confirmWorkflowAction}
          />
        )}

        {session.showEditModal && session.selectedCourse && session.editForm && (
          <CourseEditModal
            course={session.selectedCourse}
            editForm={session.editForm}
            editErrors={session.editErrors}
            editFormMessage={session.editFormMessage}
            isUpdating={session.isUpdating}
            onClose={session.closeEditModal}
            onConfirm={session.confirmEdit}
            updateEditForm={session.updateEditForm}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
