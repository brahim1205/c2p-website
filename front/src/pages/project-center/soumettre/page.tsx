import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/pages/dashboard/components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { submitProjectCenterProject } from '@/lib/projectCenterApi';
import { switchAccountActivity } from '@/lib/accountApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import SubmitProjectForm from './SubmitProjectForm';
import {
  INITIAL_SUBMIT_PROJECT_FORM,
  TOTAL_SUBMIT_PROJECT_STEPS,
  type SubmitProjectFormData,
} from './submitProjectModel';

export default function SubmitProjectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SubmitProjectFormData>(INITIAL_SUBMIT_PROJECT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageTopRef = useRef<HTMLDivElement | null>(null);
  const subscriptionGate = {
    required: false,
    allowed: true,
    role: user?.role ?? null,
    action: 'project_submit' as const,
    reason: 'not_applicable' as const,
    title: 'Soumission gratuite',
    message: 'Aucun abonnement n’est requis pour déposer un projet.',
    ctaLabel: '',
    recommendedPlanId: null,
    recommendedPlanName: null,
  };
  const isAuthenticated = Boolean(user?.id);
  const hasProjectRole = user?.role === 'porteur' || user?.role === 'admin';
  const isDashboardSubmission = location.pathname.startsWith('/dashboard/');

  const togglePartnerNeed = (need: string) => {
    setFormData((previous) => ({
      ...previous,
      partnerNeeds: previous.partnerNeeds.includes(need)
        ? previous.partnerNeeds.filter((item) => item !== need)
        : [...previous.partnerNeeds, need],
    }));
  };

  const scrollToFormTop = () => {
    window.requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_SUBMIT_PROJECT_STEPS) {
      setCurrentStep((step) => step + 1);
      scrollToFormTop();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
      scrollToFormTop();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      error('Connexion requise', 'Connectez-vous avant de soumettre un projet.');
      navigate('/auth/login', { state: { from: '/project-center/soumettre' } });
      return;
    }
    setIsSubmitting(true);
    try {
      const submittingUser = hasProjectRole ? user : await switchAccountActivity('porteur');
      await submitProjectCenterProject(formData);
      success('Projet soumis gratuitement', 'Votre dossier a été créé et classé dans Project’Center.');
      navigate(submittingUser.role === 'porteur' ? '/dashboard/porteur/mes-projets' : '/project-center');
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le projet n a pas pu etre soumis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div ref={pageTopRef} className={isDashboardSubmission ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      {isDashboardSubmission ? (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Porteur', path: '/dashboard/porteur' },
              { label: 'Mes projets', path: '/dashboard/porteur/mes-projets' },
              { label: 'Soumettre un projet' },
            ]}
          />
        </div>
      ) : null}

      <SubmitProjectForm
        currentStep={currentStep}
        formData={formData}
        hasProjectRole={hasProjectRole}
        isAuthenticated={isAuthenticated}
        isDashboardSubmission={isDashboardSubmission}
        isSubmitting={isSubmitting}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
        setFormData={setFormData}
        subscriptionGate={subscriptionGate}
        togglePartnerNeed={togglePartnerNeed}
      />
    </div>
  );

  if (isDashboardSubmission) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  return content;
}
