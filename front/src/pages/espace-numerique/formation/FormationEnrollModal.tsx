import { getCourseDeliveryLabel } from '@/lib/courseDelivery';
import { formatCoursePrice, type Course } from './formationDetailModel';

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
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="course-enroll-title" className="w-full max-w-md rounded-xl bg-white p-5 sm:p-6">
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

        <button
          type="button"
          onClick={onConfirm}
          disabled={enrolling}
          className="w-full px-6 py-3 bg-teal-600 text-white text-base font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {enrolling ? (
            <span className="flex items-center justify-center gap-2">
              <i className="ri-loader-4-line animate-spin"></i>
              Inscription en cours...
            </span>
          ) : (
            'Confirmer l’inscription'
          )}
        </button>
      </div>
    </div>
  );
}
