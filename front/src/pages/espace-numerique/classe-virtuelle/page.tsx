import { Link } from 'react-router-dom';
import VirtualClassCourseSidebar from './VirtualClassCourseSidebar';
import VirtualClassHeader from './VirtualClassHeader';
import VirtualClassMainViewer from './VirtualClassMainViewer';
import VirtualClassStatusSidebar from './VirtualClassStatusSidebar';
import { useClasseVirtuelleSession } from './useClasseVirtuelleSession';

export default function ClasseVirtuellePage() {
  const session = useClasseVirtuelleSession();

  if (session.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="text-gray-400">Chargement de la classe virtuelle...</p>
        </div>
      </div>
    );
  }

  if (session.error || !session.vclass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <i className="ri-error-warning-line text-3xl text-gray-400"></i>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">{session.error || 'Classe introuvable'}</h2>
          <Link to="/espace-numerique" className="font-medium text-teal-400 hover:text-teal-300">
            Retour à l&apos;espace numérique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <VirtualClassHeader
        course={session.course}
        isEnded={session.isEnded}
        isLive={session.isLive}
        isScheduled={session.isScheduled}
        vclass={session.vclass}
      />

      <div className="flex h-[calc(100vh-56px-60px)]">
        <VirtualClassCourseSidebar
          completedLessons={session.completedLessons}
          courseModules={session.courseModules}
          currentLesson={session.currentLesson}
          expandedModule={session.expandedModule}
          progress={session.progress}
          totalLessons={session.totalLessons}
          onSelectLesson={session.setCurrentLesson}
          onToggleModule={(moduleId) => session.setExpandedModule(session.expandedModule === moduleId ? '' : moduleId)}
        />

        <VirtualClassMainViewer
          canTrackProgress={session.canTrackProgress}
          currentLesson={session.currentLesson}
          isLive={session.isLive}
          isReplayProcessing={session.isReplayProcessing}
          isScheduled={session.isScheduled}
          notes={session.notes}
          progressSaving={session.progressSaving}
          showNotes={session.showNotes}
          vclass={session.vclass}
          onChangeNotes={session.setNotes}
          onMarkLessonComplete={session.handleMarkLessonComplete}
          onToggleNotes={() => session.setShowNotes((value) => !value)}
        />

        <VirtualClassStatusSidebar
          commentInput={session.commentInput}
          commentSubmitting={session.commentSubmitting}
          comments={session.comments}
          isEnded={session.isEnded}
          isLive={session.isLive}
          isScheduled={session.isScheduled}
          loadingComments={session.loadingComments}
          userId={session.user?.id}
          onChangeComment={session.setCommentInput}
          onSubmitComment={session.handleSubmitComment}
        />
      </div>
    </div>
  );
}
