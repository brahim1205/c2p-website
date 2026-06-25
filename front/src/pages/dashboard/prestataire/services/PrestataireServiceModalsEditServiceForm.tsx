import ImageUploadField from '@/components/base/ImageUploadField';
import type { PrestataireService as Service } from '@/lib/prestataireDashboardApi';

export interface EditServiceFormProps {
  editService: Partial<Service>;
  selectedService: Service;
  onEditServiceChange: (next: Partial<Service> | ((prev: Partial<Service>) => Partial<Service>)) => void;
}

export function EditServiceForm({
  editService,
  selectedService,
  onEditServiceChange,
}: EditServiceFormProps) {
  return (
    <div className="dashboard-form-grid">
      <div>
        <label htmlFor="prestataire-service-edit-name" className="block text-sm font-medium text-gray-700 mb-1">
          Titre
        </label>
        <input
          id="prestataire-service-edit-name"
          type="text"
          value={editService.title ?? selectedService.title}
          onChange={(event) =>
            onEditServiceChange((prev) => ({ ...prev, title: event.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
        />
      </div>

      <div>
        <label htmlFor="prestataire-service-edit-category" className="block text-sm font-medium text-gray-700 mb-1">
          Catégorie
        </label>
        <select
          id="prestataire-service-edit-category"
          value={editService.category ?? selectedService.category}
          onChange={(event) =>
            onEditServiceChange((prev) => ({ ...prev, category: event.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#5fa6f3] text-sm"
        >
          <option>Bâtiment</option>
          <option>Électricité</option>
          <option>Extérieur</option>
          <option>Ameublement</option>
          <option>Informatique</option>
        </select>
      </div>

      <div className="dashboard-form-wide">
        <label htmlFor="prestataire-service-edit-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="prestataire-service-edit-description"
          value={editService.description ?? selectedService.description}
          onChange={(event) =>
            onEditServiceChange((prev) => ({ ...prev, description: event.target.value }))
          }
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm resize-none"
        />
      </div>

      <ImageUploadField
        label="Image du service"
        value={editService.image || selectedService.image || ''}
        onChange={(url) =>
          onEditServiceChange((prev) => ({ ...prev, image: url }))
        }
        folder="c2p/services"
        helper="Mettez a jour le visuel affiche dans votre catalogue."
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prestataire-service-edit-price" className="block text-sm font-medium text-gray-700 mb-1">
            Prix
          </label>
          <input
            id="prestataire-service-edit-price"
            type="text"
            value={editService.price ?? selectedService.price}
            onChange={(event) =>
              onEditServiceChange((prev) => ({ ...prev, price: event.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
          />
        </div>

        <div>
          <label htmlFor="prestataire-service-edit-price-type" className="block text-sm font-medium text-gray-700 mb-1">
            Type de prix
          </label>
          <select
            id="prestataire-service-edit-price-type"
            value={editService.price_type ?? selectedService.price_type}
            onChange={(event) =>
              onEditServiceChange((prev) => ({ ...prev, price_type: event.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#5fa6f3] text-sm"
          >
            <option value="fixe">Prix fixe</option>
            <option value="devis">Sur devis</option>
          </select>
        </div>

        <div>
          <label htmlFor="prestataire-service-edit-location" className="block text-sm font-medium text-gray-700 mb-1">
            Localisation
          </label>
          <input
            id="prestataire-service-edit-location"
            type="text"
            value={editService.location ?? selectedService.location}
            onChange={(event) =>
              onEditServiceChange((prev) => ({ ...prev, location: event.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
          />
        </div>
      </div>
    </div>
  );
}

