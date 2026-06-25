import type { Dispatch, SetStateAction } from 'react';
import ImageUploadField from '@/components/base/ImageUploadField';
import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';

export interface CreateServiceFormProps {
  newService: Partial<Service>;
  onNewServiceChange: Dispatch<SetStateAction<Partial<Service>>>;
}

export function CreateServiceForm({
  newService,
  onNewServiceChange,
}: CreateServiceFormProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="prestataire-service-create-title-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Titre *
            </label>
            <input
              id="prestataire-service-create-title-input"
              type="text"
              value={newService.title || ''}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Ex: Plomberie résidentielle"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="prestataire-service-create-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="prestataire-service-create-description"
              value={newService.description || ''}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Décrivez votre service..."
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(newService.description || '').length}/500 caractères
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="prestataire-service-create-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Catégorie
            </label>
            <select
              id="prestataire-service-create-category"
              value={newService.category || 'Bâtiment'}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, category: event.target.value }))}
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
            <label
              htmlFor="prestataire-service-create-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Localisation
            </label>
            <input
              id="prestataire-service-create-location"
              type="text"
              value={newService.location || 'Dakar'}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, location: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="prestataire-service-create-price"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prix *
            </label>
            <input
              id="prestataire-service-create-price"
              type="text"
              value={newService.price || ''}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="Ex: 25,000 FCFA"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#5fa6f3] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="prestataire-service-create-price-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type de prix
            </label>
            <select
              id="prestataire-service-create-price-type"
              value={newService.price_type || 'fixe'}
              onChange={(event) => onNewServiceChange((prev) => ({ ...prev, price_type: event.target.value }))}
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
          onChange={(url) => onNewServiceChange((prev) => ({ ...prev, image: url }))}
          folder="c2p/services"
          helper="Importez une image claire de votre service."
          allowUrlInput={false}
          compact
        />
      </div>
    </div>
  );
}

