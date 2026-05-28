import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import LessonsTab from './components/LessonsTab';
import QuizTab from './components/QuizTab';
import NotesModal from './components/NotesModal';
import CourseSidebar from './components/CourseSidebar';
import CourseLessonNavigation from './components/CourseLessonNavigation';
import CourseStatusBanners from './components/CourseStatusBanners';
import ResetProgressConfirm from './components/ResetProgressConfirm';
import { useApprenantCourseSession } from './hooks/useApprenantCourseSession';

export default function ApprenantCoursDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    course,
    loading,
    activeLesson,
    completedLessons,
    bookmarkedLessons,
    notes,
    notesModalOpen,
    notesTargetLesson,
    showResetConfirm,
    xpGained,
    showXpToast,
    showMobileSidebar,
    sessionTimer,
    showSessionTimer,
    currentProgress,
    setShowResetConfirm,
    setShowMobileSidebar,
    handleOpenNotes,
    handleCloseNotes,
    handleSaveNote,
    handleCompleteLesson,
    handleQuizComplete,
    handleBadgesUnlocked,
    handleResetProgress,
    toggleBookmark,
    selectLesson,
    getInitialVideoTime,
    handleVideoProgress,
  } = useApprenantCourseSession(id);

  if (loading && !course) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="py-20 text-center text-sm text-gray-500">Chargement de la formation...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-book-open-line text-2xl text-gray-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Formation non trouvée</h2>
            <Link to="/dashboard/apprenant/mes-cours" className="text-teal-600 hover:text-teal-700 font-medium">
              Retour à mes formations
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideMainScrollbar>
      <div className="max-w-[1440px] mx-auto overflow-x-hidden">
        <div className="px-4 lg:px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Apprenant', path: '/dashboard/apprenant' },
              { label: 'Mes formations', path: '/dashboard/apprenant/mes-cours' },
              { label: course.title },
            ]}
          />
        </div>

        <CourseStatusBanners
          showXpToast={showXpToast}
          xpGained={xpGained}
          showSessionTimer={showSessionTimer}
          sessionTimer={sessionTimer}
          currentProgress={currentProgress}
        />

        <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden px-4 pb-8 lg:flex-row lg:px-6">
          {/* Main content area */}
          <div className="min-w-0 flex-1 overflow-x-hidden">
            {/* Course header compact */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{course.title}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <i className="ri-user-line"></i>
                  {course.instructor}
                </span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                  {course.category}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-bar-chart-line"></i>
                  {currentProgress}% complété
                </span>
              </div>
            </div>

            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-3">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <i className="ri-list-check text-sm"></i>
                Afficher le contenu du cours
              </button>
            </div>

            <div className="mb-4 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="min-w-0 overflow-x-hidden p-4 sm:p-5">
                {activeLesson?.type === 'quiz' ? (
                  <QuizTab
                    course={course}
                    completedLessons={completedLessons}
                    bookmarkedLessons={bookmarkedLessons}
                    notes={notes}
                    onBadgesUnlocked={handleBadgesUnlocked}
                    onQuizComplete={handleQuizComplete}
                  />
                ) : (
                  <LessonsTab
                    course={course}
                    completedLessons={completedLessons}
                    bookmarkedLessons={bookmarkedLessons}
                    activeLesson={activeLesson}
                    notes={notes}
                    onOpenNotes={handleOpenNotes}
                    onToggleComplete={handleCompleteLesson}
                    onToggleBookmark={toggleBookmark}
                    onSelectLesson={selectLesson}
                    getInitialVideoTime={getInitialVideoTime}
                    onVideoProgress={handleVideoProgress}
                  />
                )}
              </div>
            </div>

            <CourseLessonNavigation
              course={course}
              activeLesson={activeLesson}
              onSelectLesson={selectLesson}
            />

            {/* Reset */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">Progression synchronisée avec votre compte</p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1"></i>
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Sidebar desktop */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <div className="sticky top-4 max-h-[calc(100vh-6rem)] min-h-0">
              <CourseSidebar
                course={course}
                completedLessons={completedLessons}
                bookmarkedLessons={bookmarkedLessons}
                activeLesson={activeLesson}
                notes={notes}
                onSelectLesson={selectLesson}
                onToggleComplete={handleCompleteLesson}
                onToggleBookmark={toggleBookmark}
                onOpenNotes={handleOpenNotes}
              />
            </div>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Fermer le sommaire"
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowMobileSidebar(false)}
            ></button>
            <div className="relative ml-auto w-full max-w-sm h-full">
              <CourseSidebar
                showMobile={true}
                onCloseMobile={() => setShowMobileSidebar(false)}
                course={course}
                completedLessons={completedLessons}
                bookmarkedLessons={bookmarkedLessons}
                activeLesson={activeLesson}
                notes={notes}
                onSelectLesson={(lesson) => {
                  selectLesson(lesson);
                  setShowMobileSidebar(false);
                }}
                onToggleComplete={handleCompleteLesson}
                onToggleBookmark={toggleBookmark}
                onOpenNotes={(lesson) => {
                  handleOpenNotes(lesson);
                  setShowMobileSidebar(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Notes Modal */}
        <NotesModal
          isOpen={notesModalOpen}
          lesson={notesTargetLesson}
          initialNote={notesTargetLesson ? notes[notesTargetLesson.id] ?? '' : ''}
          onClose={handleCloseNotes}
          onSave={handleSaveNote}
        />

        <ResetProgressConfirm
          open={showResetConfirm}
          onCancel={() => setShowResetConfirm(false)}
          onConfirm={handleResetProgress}
        />

      </div>
    </DashboardLayout>
  );
}
