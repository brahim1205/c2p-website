import type { Dispatch, FormEvent, SetStateAction } from 'react';
import SubscriptionRequiredBanner from '@/components/feature/SubscriptionRequiredBanner';
import type { SubscriptionGateDecision } from '@/lib/subscriptionAccess';
import { StepNavigation } from './SubmitProjectFields';
import {
  AuthRequiredMessage,
  SubmissionHeader,
  SubmissionProgress,
  UnauthorizedRoleMessage,
} from './SubmitProjectShell';
import { StepFields } from './SubmitProjectSteps';
import type { SubmitProjectFormData } from './submitProjectModel';

interface SubmitProjectFormProps {
  currentStep: number;
  formData: SubmitProjectFormData;
  hasProjectRole: boolean;
  isAuthenticated: boolean;
  isDashboardSubmission: boolean;
  isSubmitting: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: (event: FormEvent) => void;
  setFormData: Dispatch<SetStateAction<SubmitProjectFormData>>;
  subscriptionGate: SubscriptionGateDecision;
  togglePartnerNeed: (need: string) => void;
}

export default function SubmitProjectForm({
  currentStep,
  formData,
  hasProjectRole,
  isAuthenticated,
  isDashboardSubmission,
  isSubmitting,
  onNext,
  onPrevious,
  onSubmit,
  setFormData,
  subscriptionGate,
  togglePartnerNeed,
}: SubmitProjectFormProps) {
  return (
    <>
      <SubmissionHeader isDashboardSubmission={isDashboardSubmission} />
      <SubmissionProgress currentStep={currentStep} isDashboardSubmission={isDashboardSubmission} />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {!isAuthenticated ? (
          <AuthRequiredMessage />
        ) : !hasProjectRole ? (
          <UnauthorizedRoleMessage />
        ) : (
          <SubscriptionRequiredBanner gate={subscriptionGate} />
        )}

        {isAuthenticated && hasProjectRole ? (
          <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <StepFields
              currentStep={currentStep}
              formData={formData}
              setFormData={setFormData}
              togglePartnerNeed={togglePartnerNeed}
            />
            <StepNavigation
              currentStep={currentStep}
              isSubmitting={isSubmitting}
              subscriptionAllowed={subscriptionGate.allowed}
              onNext={onNext}
              onPrevious={onPrevious}
            />
          </form>
        ) : null}
      </div>
    </>
  );
}
