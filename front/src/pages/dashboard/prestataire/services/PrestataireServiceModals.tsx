import type { Dispatch, SetStateAction } from 'react';
import ImageUploadField from '@/components/base/ImageUploadField';
import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';

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
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="prestataire-service-create-title">
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
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="prestataire-service-create-title-input" className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    id="prestataire-service-create-title-input"
                    type="text"
                    value={newService.title || ''}
                    onChange={(event) => onNewServiceChange({ ...newService, title: event.target.value })}
                    placeholder="Ex: Plomberie résidentielle"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="prestataire-service-create-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="prestataire-service-create-description"
                    value={newService.description || ''}
                    onChange={(event) => onNewServiceChange({ ...newService, description: event.target.value })}
                    placeholder="Décrivez votre service..."
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{(newService.description || '').length}/500 caractères</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="prestataire-service-create-category" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    id="prestataire-service-create-category"
                    value={newService.category || 'Bâtiment'}
                    onChange={(event) => onNewServiceChange({ ...newService, category: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  >
                    <option>Bâtiment</option>
                    <option>Électricité</option>
                    <option>Extérieur</option>
                    <option>Ameublement</option>
                    <option>Informatique</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prestataire-service-create-location" className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                  <input
                    id="prestataire-service-create-location"
                    type="text"
                    value={newService.location || 'Dakar'}
                    onChange={(event) => onNewServiceChange({ ...newService, location: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="prestataire-service-create-price" className="block text-sm font-medium text-gray-700 mb-1">Prix *</label>
                  <input
                    id="prestataire-service-create-price"
                    type="text"
                    value={newService.price || ''}
                    onChange={(event) => onNewServiceChange({ ...newService, price: event.target.value })}
                    placeholder="Ex: 25,000 FCFA"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="prestataire-service-create-price-type" className="block text-sm font-medium text-gray-700 mb-1">Type de prix</label>
                  <select
                    id="prestataire-service-create-price-type"
                    value={newService.price_type || 'fixe'}
                    onChange={(event) => onNewServiceChange({ ...newService, price_type: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
                  >
                    <option value="fixe">Prix fixe</option>
                    <option value="devis">Sur devis</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:border-l lg:border-gray-200 lg:pl-6">
              <ImageUploadField
                label="Image du service"
                value={newService.image || ''}
                onChange={(url) => onNewServiceChange({ ...newService, image: url })}
                folder="c2p/services"
                helper="Importez une image claire de votre service."
                allowUrlInput={false}
                compact
              />
            </div>
          </div>
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
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="prestataire-service-edit-title">
        <h3 id="prestataire-service-edit-title" className="text-lg font-bold text-gray-900 mb-6">Modifier le service</h3>
        <div className="dashboard-form-grid">
          <div>
            <label htmlFor="prestataire-service-edit-name" className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              id="prestataire-service-edit-name"
              type="text"
              defaultValue={selectedService.title}
              onChange={(event) => onEditServiceChange((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
            />
          </div>
          <div className="dashboard-form-wide">
            <label htmlFor="prestataire-service-edit-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="prestataire-service-edit-description"
              defaultValue={selectedService.description}
              onChange={(event) => onEditServiceChange((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm resize-none"
            />
          </div>
          <ImageUploadField
            label="Image du service"
            value={editService.image || selectedService.image || ''}
            onChange={(url) => onEditServiceChange((prev) => ({ ...prev, image: url }))}
            folder="c2p/services"
            helper="Mettez a jour le visuel affiche dans votre catalogue."
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prestataire-service-edit-price" className="block text-sm font-medium text-gray-700 mb-1">Prix</label>
              <input
                id="prestataire-service-edit-price"
                type="text"
                defaultValue={selectedService.price}
                onChange={(event) => onEditServiceChange((prev) => ({ ...prev, price: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
              />
            </div>
            <div>
              <label htmlFor="prestataire-service-edit-location" className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input
                id="prestataire-service-edit-location"
                type="text"
                defaultValue={selectedService.location}
                onChange={(event) => onEditServiceChange((prev) => ({ ...prev, location: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
              />
            </div>
          </div>
        </div>
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
