import { getCourseDeliveryLabel } from '@/lib/courseDelivery';
import { Link } from 'react-router-dom';
import WavePaymentQr from '@/components/feature/WavePaymentQr';
import { formatCoursePrice, isPaidCourse, type Course } from './formationDetailModel';

interface FormationEnrollModalProps {
  course: Course;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  enrolling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function FormationEnrollModal({
  course,
  user,
  enrolling,
  onClose,
  onConfirm,
}: FormationEnrollModalProps) {
  const paid = isPaidCourse(course);
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 px-3 py-5 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-enroll-title"
        className="w-full max-w-xl rounded-3xl bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:overflow-y-auto sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h3 id="course-enroll-title" className="text-xl font-bold text-gray-900">Confirmer l’inscription</h3>
          <button type="button" aria-label="Fermer la confirmation d’inscription" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Formation</p>
            <p className="mt-1 font-semibold text-gray-900">{course.title}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Participant</span>
            <span className="font-medium text-gray-900">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Email</span>
            <span className="font-medium text-gray-900">{user.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Format</span>
            <span className="font-medium text-gray-900">{getCourseDeliveryLabel(course.delivery_mode)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tarif</span>
            <span className="font-semibold text-teal-700">{formatCoursePrice(course)}</span>
          </div>
        </div>

        {paid ? (
          <div className="mb-5 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Paiement obligatoire</p>
              <p className="mt-1">
                Scannez le QR Wave pour payer. L’accès ne sera pas ouvert automatiquement après un paiement Wave :
                C2P doit d’abord confirmer le paiement.
              </p>
            </div>

            <WavePaymentQr compact />

            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              <p className="font-semibold">Paiement avec portefeuille C2P</p>
              <p className="mt-1">
                Utilisez cette option seulement si votre portefeuille C2P contient déjà le montant. Le débit est immédiat
                et l’accès sera activé après confirmation API.
              </p>
              <Link to="/dashboard/paiements" className="mt-2 inline-flex font-semibold text-teal-800 underline">
                Recharger mon portefeuille
              </Link>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onConfirm}
          disabled={enrolling}
          className="w-full rounded-2xl bg-teal-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {enrolling ? (
            <span className="flex items-center justify-center gap-2">
              <i className="ri-loader-4-line animate-spin"></i>
              {paid ? 'Paiement portefeuille en cours...' : 'Inscription en cours...'}
            </span>
          ) : (
            paid ? `Payer avec mon portefeuille C2P (${formatCoursePrice(course)})` : 'Confirmer l’inscription'
          )}
        </button>
      </div>
    </div>
  );
}
