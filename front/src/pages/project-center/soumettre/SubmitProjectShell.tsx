import { Link } from 'react-router-dom';
import {
  STEP_LABELS,
  TOTAL_SUBMIT_PROJECT_STEPS,
} from './submitProjectModel';

export function SubmissionHeader({ isDashboardSubmission }: { isDashboardSubmission: boolean }) {
  return (
    <div className={`${isDashboardSubmission ? 'rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm sm:rounded-3xl sm:px-6 sm:py-8' : 'bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 pb-8 pt-20 sm:pb-12 sm:pt-24'}`}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
          <i className="ri-rocket-line text-teal-500"></i>
          <span className="text-sm font-medium text-gray-700">Soumission de projet</span>
        </div>
        <h1 className={`${isDashboardSubmission ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-3xl sm:text-4xl md:text-5xl'} mb-4 font-bold text-gray-900`}>
          Soumettez votre projet
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
          Remplissez ce formulaire pour soumettre votre projet à notre programme d'incubation. Notre équipe l'examinera et vous contactera sous 48h.
        </p>
      </div>
    </div>
  );
}

export function SubmissionProgress({
  currentStep,
  isDashboardSubmission,
}: {
  currentStep: number;
  isDashboardSubmission: boolean;
}) {
  return (
    <div className={`sticky ${isDashboardSubmission ? 'top-0' : 'top-[73px]'} z-40 border-b border-gray-200 bg-white`}>
      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-2 flex items-start justify-between overflow-x-auto pb-2 sm:mb-4">
          {Array.from({ length: TOTAL_SUBMIT_PROJECT_STEPS }, (_, index) => index + 1).map((step) => (
            <div key={step} className="flex min-w-[76px] flex-1 items-center sm:min-w-0">
              <div className="flex flex-1 flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all sm:h-10 sm:w-10 ${
                  step < currentStep ? 'bg-teal-500 text-white' :
                  step === currentStep ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step < currentStep ? <i className="ri-check-line"></i> : step}
                </div>
                <span className={`mt-2 max-w-[70px] text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-xs ${
                  step === currentStep ? 'text-teal-600' : 'text-gray-500'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {step < TOTAL_SUBMIT_PROJECT_STEPS && (
                <div className={`mx-1 h-1 flex-1 rounded-full transition-all sm:mx-2 ${
                  step < currentStep ? 'bg-teal-500' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthRequiredMessage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900">Connexion requise</h2>
      <p className="mt-3 text-gray-600">
        Connectez-vous avec un compte C2P avant de soumettre un projet dans ProjectCenter.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/auth/login" state={{ from: '/project-center/soumettre' }} className="c2p-btn-accent w-full px-6 py-3 sm:w-auto">
          Me connecter
        </Link>
        <Link to="/auth/register?role=porteur" className="c2p-btn-secondary w-full px-6 py-3 sm:w-auto">
          Créer un compte porteur
        </Link>
      </div>
    </div>
  );
}

export function UnauthorizedRoleMessage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900">Compte non autorisé</h2>
      <p className="mt-3 text-gray-600">
        La soumission de projet est réservée aux comptes porteur ou admin.
      </p>
      <div className="mt-6">
        <Link to="/project-center" className="c2p-btn-secondary w-full px-6 py-3 sm:w-auto">
          Retour à ProjectCenter
        </Link>
      </div>
    </div>
  );
}
