import type { Dispatch, SetStateAction } from 'react';
import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';
import { CreateServiceForm } from './PrestataireServiceModalsCreateServiceForm';
import { EditServiceForm } from './PrestataireServiceModalsEditServiceForm';

interface CreateServiceModalProps {
  newService: Partial<Service>;
  onCancel: () => void;
  onCreate: () => void;
  onNewServiceChange: Dispatch<SetStateAction<Partial<Service>>>;
}

interface EditServiceModalProps {
  editService: Partial<Service>;
  selectedService: Service;
  onCancel: () => void;
  onEditServiceChange: Dispatch<SetStateAction<Partial<Service>>>;
  onSave: () => void;
}

interface DeleteServiceModalProps {
  selectedService: Service;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CreateServiceModal({
  newService,
  onCancel,
  onCreate,
  onNewServiceChange,
}: CreateServiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestataire-service-create-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <h3 id="prestataire-service-create-title" className="text-xl font-bold text-gray-900">Nouveau service</h3>
            <p className="mt-1 text-sm text-gray-500">Renseignez l’offre qui sera visible dans votre catalogue prestataire.</p>
          </div>
          <button
            type="button"
            aria-label="Fermer le formulaire de service"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <CreateServiceForm newService={newService} onNewServiceChange={onNewServiceChange} />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-[#5fa6f3] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#27346b]"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditServiceModal({
  editService,
  selectedService,
  onCancel,
  onEditServiceChange,
  onSave,
}: EditServiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestataire-service-edit-title"
      >
        <h3 id="prestataire-service-edit-title" className="text-lg font-bold text-gray-900 mb-6">
          Modifier le service
        </h3>

        <EditServiceForm
          editService={editService}
          selectedService={selectedService}
          onEditServiceChange={onEditServiceChange}
        />

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b] transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteServiceModal({
  selectedService,
  onCancel,
  onConfirm,
}: DeleteServiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="prestataire-service-delete-title">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="ri-alert-line text-red-600 text-xl"></i>
          </div>
          <h3 id="prestataire-service-delete-title" className="text-lg font-bold text-gray-900">Supprimer le service</h3>
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
