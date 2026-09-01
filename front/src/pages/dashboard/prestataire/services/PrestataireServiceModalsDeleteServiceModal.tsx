import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';

export interface DeleteServiceModalProps {
  selectedService: Service;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteServiceModal({
  selectedService,
  onCancel,
  onConfirm,
}: DeleteServiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestataire-service-delete-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="ri-alert-line text-red-600 text-xl"></i>
          </div>
          <h3 id="prestataire-service-delete-title" className="text-lg font-bold text-gray-900">
            Supprimer le service
          </h3>
        </div>

        <p className="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>"{selectedService.title}"</strong> ? Cette action est irréversible.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

