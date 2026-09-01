import { Link } from 'react-router-dom';
import {
  CurriculumTab,
  FormationContextSidebar,
  FormationHero,
  FormationTabs,
  OverviewTab,
  ReviewsTab,
} from './FormationDetailPanels';
import { useFormationDetailPageSession } from './useFormationDetailPageSession';

export default function FormationDetailPage() {
  const session = useFormationDetailPageSession();

  if (session.loading) {
    return (
      <div className="public-premium-page flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-200"></div>
          <div className="mx-auto h-4 w-48 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!session.course) {
    return (
      <div className="public-premium-page flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Formation non trouvée</h2>
          <Link to="/espace-numerique" className="text-teal-600 hover:text-teal-700">
            Retour aux formations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="public-premium-page min-h-screen bg-white">
      <FormationHero
        course={session.course}
        totalLessons={session.totalLessons}
        previewLessons={session.previewLessons}
        hasEnrollment={Boolean(session.existingEnrollment)}
        onEnroll={session.openEnrollFlow}
      />

      <FormationTabs activeTab={session.activeTab} totalLessons={session.totalLessons} onChange={session.setActiveTab} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            {session.activeTab === 'overview' && (
              <OverviewTab
                course={session.course}
                objectives={session.objectives}
                requirements={session.requirements}
                tools={session.tools}
              />
            )}

            {session.activeTab === 'curriculum' && (
              <CurriculumTab curriculum={session.curriculum} progressByLesson={session.progressByLesson} />
            )}

            {session.activeTab === 'reviews' && (
              <ReviewsTab
                rating={session.rating}
                reviews={session.reviews}
                userId={session.user?.id}
                myReview={session.myReview}
                reviewGateMessage={session.reviewGateMessage}
                reviewDraft={session.reviewDraft}
                canWriteReview={session.canWriteReview}
                reviewSubmitting={session.reviewSubmitting}
                setReviewDraft={session.setReviewDraft}
                onSubmit={session.handleReviewSubmit}
              />
            )}
          </div>

          <FormationContextSidebar course={session.course} relatedClasses={session.relatedClasses} />
        </div>
      </div>
    </div>
  );
}
