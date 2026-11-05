import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import { StudioSidebar, StudioTopBar, SubmitDialog } from './StudioChrome';
import { isStudioPanel, studioPath } from './studioModel';
import { useCourseStudio } from './useCourseStudio';
import CurriculumPanel from './panels/CurriculumPanel';
import IntendedLearnersPanel from './panels/IntendedLearnersPanel';
import LandingPagePanel from './panels/LandingPagePanel';
import PricingPanel from './panels/PricingPanel';

function StudioState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-c2p-bg px-6 text-center">
      <i className={`${icon} text-4xl text-c2p-primary`} aria-hidden="true" />
      <h1 className="text-xl font-bold text-c2p-text">{title}</h1>
      {children}
    </div>
  );
}

export default function CourseStudioPage() {
  const { id, panel } = useParams<{ id: string; panel?: string }>();
  const studio = useCourseStudio(id);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const courseTitle = studio.program?.course.title;
  useEffect(() => {
    document.title = courseTitle ? `${courseTitle} · Studio formateur · C2P` : 'Studio formateur · C2P';
  }, [courseTitle]);

  if (!id) return <Navigate to="/dashboard/formateur/mes-cours" replace />;
  if (!isStudioPanel(panel)) return <Navigate to={studioPath(id, 'programme')} replace />;

  if (studio.programQuery.isLoading) {
    return (
      <StudioState icon="ri-loader-4-line animate-spin" title="Chargement du cours…" />
    );
  }
  if (!studio.program) {
    return (
      <StudioState icon="ri-error-warning-line" title="Cours introuvable">
        <p className="text-sm text-c2p-muted">Ce cours n'existe pas ou ne vous appartient pas.</p>
        <Link to="/dashboard/formateur/mes-cours" className="c2p-btn-primary mt-2 h-11 px-5 text-sm">Retour à mes formations</Link>
      </StudioState>
    );
  }

  const { course } = studio.program;
  const submit = async () => {
    setSubmitting(true);
    const done = await studio.changeStatus('review', `« ${course.title} » est en cours de validation par l’équipe C2P.`);
    setSubmitting(false);
    if (done) setSubmitOpen(false);
  };

  return (
    <div className="min-h-screen bg-c2p-bg">
      <StudioTopBar
        course={course}
        saveState={studio.saveState}
        savedAt={studio.savedAt}
        canSubmit={studio.subscriptionGate.allowed}
        onSubmit={() => setSubmitOpen(true)}
        onWithdraw={() => void studio.changeStatus('draft', 'Vous pouvez de nouveau modifier et soumettre le cours.')}
      />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <aside className="min-w-0">
          <StudioSidebar courseId={course.id} active={panel} checklist={studio.checklist} />
        </aside>
        <main className="min-w-0 rounded-3xl border border-c2p-border bg-c2p-surface p-5 sm:p-8">
          <SubscriptionRequiredBanner gate={studio.subscriptionGate} />
          {course.status === 'rejected' ? (
            <p className="mb-6 rounded-2xl bg-c2p-danger-soft px-4 py-3 text-sm text-c2p-text">
              Ce cours a été refusé lors de la validation. Apportez les corrections demandées, puis soumettez-le à nouveau.
            </p>
          ) : null}
          {course.status === 'review' ? (
            <p className="mb-6 rounded-2xl bg-c2p-surface-muted px-4 py-3 text-sm text-c2p-text">
              Votre cours est en cours de validation. Vous pouvez encore le modifier : l’équipe verra la dernière version.
            </p>
          ) : null}
          {panel === 'objectifs' ? <IntendedLearnersPanel studio={studio} course={course} /> : null}
          {panel === 'programme' ? <CurriculumPanel studio={studio} program={studio.program} /> : null}
          {panel === 'accueil' ? <LandingPagePanel studio={studio} course={course} /> : null}
          {panel === 'tarifs' ? <PricingPanel studio={studio} course={course} /> : null}
        </main>
      </div>
      {submitOpen ? (
        <SubmitDialog courseId={course.id} checklist={studio.checklist} submitting={submitting} onCancel={() => setSubmitOpen(false)} onConfirm={() => void submit()} />
      ) : null}
    </div>
  );
}
