import Breadcrumb from '@/components/base/Breadcrumb';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import VirtualClassesOverview from './VirtualClassesOverview';
import { VirtualClassCreateModal, VirtualClassEditModal } from './VirtualClassModals';
import type { useVirtualClassesPageSession } from './useVirtualClassesPageSession';

type VirtualClassesPageSession = ReturnType<typeof useVirtualClassesPageSession>;

export default function VirtualClassesPageShell({ session }: { session: VirtualClassesPageSession }) {
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Formateur', path: '/dashboard/formateur' },
          { label: 'Classes virtuelles' },
        ]}
      />
      <SubscriptionRequiredBanner gate={session.subscriptionGate} />

      <VirtualClassesOverview
        filter={session.filter}
        loading={session.loading}
        classes={session.filteredClasses}
        classStats={session.classStats}
        canCreateClass={session.canCreateClass}
        hasCourses={session.instructorCourses.length > 0}
        onFilterChange={session.setFilter}
        onCreateClass={session.openCreateModal}
        onJoin={session.handleJoin}
        onEndClass={session.handleEndClass}
        onStartLive={session.handleStartLive}
        onCopyRoomLink={session.handleCopyRoomLink}
        onEdit={session.handleEditClick}
        onDelete={session.handleDeleteClass}
      />

      {session.showCreateModal ? (
        <VirtualClassCreateModal
          newClass={session.newClass}
          errors={session.createErrors}
          formMessage={session.createFormMessage}
          instructorCourses={session.instructorCourses}
          isCreating={session.isCreating}
          onClose={session.closeCreateModal}
          onSubmit={session.handleCreateClass}
          onUpdateClass={session.updateNewClass}
          onSelectCourse={session.selectCreateCourse}
        />
      ) : null}

      {session.showDetailModal && session.selectedClass && session.editForm ? (
        <VirtualClassEditModal
          editForm={session.editForm}
          errors={session.editErrors}
          formMessage={session.editFormMessage}
          instructorCourses={session.instructorCourses}
          isUpdating={session.isUpdating}
          isReplayUploading={session.isReplayUploading}
          replayUploadProgress={session.replayUploadProgress}
          onClose={session.closeEditModal}
          onSubmit={session.confirmEdit}
          onUpdateForm={session.updateEditForm}
          onSelectCourse={session.selectEditCourse}
          onReplayFileChange={session.handleReplayFileChange}
        />
      ) : null}
    </div>
  );
}
