import { Link } from 'react-router-dom';
import {
  STEP_LABELS,
  TOTAL_SUBMIT_PROJECT_STEPS,
} from './submitProjectModel';

export function SubmissionHeader({ isDashboardSubmission }: { isDashboardSubmission: boolean }) {
  return (
    <div className={`${isDashboardSubmission ? 'rounded-3xl border border-gray-200 bg-white px-6 py-8 shadow-sm' : 'pt-24 pb-12 bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50'}`}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
          <i className="ri-rocket-line text-teal-500"></i>
          <span className="text-sm font-medium text-gray-700">Soumission de projet</span>
        </div>
        <h1 className={`${isDashboardSubmission ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'} font-bold text-gray-900 mb-4`}>
          Soumettez votre projet
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
    <div className={`bg-white border-b border-gray-200 sticky ${isDashboardSubmission ? 'top-0' : 'top-[73px]'} z-40`}>
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          {Array.from({ length: TOTAL_SUBMIT_PROJECT_STEPS }, (_, index) => index + 1).map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step < currentStep ? 'bg-teal-500 text-white' :
                  step === currentStep ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step < currentStep ? <i className="ri-check-line"></i> : step}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  step === currentStep ? 'text-teal-600' : 'text-gray-500'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {step < TOTAL_SUBMIT_PROJECT_STEPS && (
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900">Connexion requise</h2>
      <p className="mt-3 text-gray-600">
        Connectez-vous avec un compte C2P avant de soumettre un projet dans ProjectCenter.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/auth/login" state={{ from: '/project-center/soumettre' }} className="c2p-btn-accent px-6 py-3">
          Me connecter
        </Link>
        <Link to="/auth/register?role=porteur" className="c2p-btn-secondary px-6 py-3">
          Créer un compte porteur
        </Link>
      </div>
    </div>
  );
}

export function UnauthorizedRoleMessage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900">Compte non autorisé</h2>
      <p className="mt-3 text-gray-600">
        La soumission de projet est réservée aux comptes porteur ou admin.
      </p>
      <div className="mt-6">
        <Link to="/project-center" className="c2p-btn-secondary px-6 py-3">
          Retour à ProjectCenter
        </Link>
      </div>
    </div>
  );
}
