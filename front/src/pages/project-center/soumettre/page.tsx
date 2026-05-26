import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/pages/dashboard/components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { submitProjectCenterProject } from '@/lib/projectCenterApi';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
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
  const { gateFor } = useSubscriptionAccess(user);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SubmitProjectFormData>(INITIAL_SUBMIT_PROJECT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageTopRef = useRef<HTMLDivElement | null>(null);
  const subscriptionGate = gateFor('project_submit');
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
    if (!hasProjectRole) {
      error('Compte inadapté', 'La soumission de projet est réservée aux comptes porteur et admin.');
      return;
    }
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProjectCenterProject(formData);
      success('Projet soumis', 'Votre dossier a ete cree dans ProjectCenter.');
      navigate(user.role === 'porteur' ? '/dashboard/porteur/mes-projets' : '/project-center');
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
