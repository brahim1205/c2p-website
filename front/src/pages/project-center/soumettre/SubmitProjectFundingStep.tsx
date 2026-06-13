import type { Dispatch, SetStateAction } from 'react';
import {
  PARTNER_NEED_OPTIONS,
  type SubmitProjectFormData,
} from './submitProjectModel';
import { TextAreaField, TextInputField } from './SubmitProjectFields';

interface FundingStepProps {
  formData: SubmitProjectFormData;
  setFormData: Dispatch<SetStateAction<SubmitProjectFormData>>;
  togglePartnerNeed: (need: string) => void;
}

export function FundingStep({ formData, setFormData, togglePartnerNeed }: FundingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">Besoins en financement</h2>
        <p className="text-gray-600">Indiquez vos besoins financiers pour développer votre projet.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <TextInputField
          label="Montant recherché (FCFA) *"
          min="0"
          placeholder="Ex: 10000000"
          required
          type="number"
          value={formData.fundingGoal}
          onChange={(value) => setFormData({ ...formData, fundingGoal: value })}
        />

        <TextInputField
          label="Durée prévisionnelle (mois) *"
          min="1"
          placeholder="Ex: 12"
          required
          type="number"
          value={formData.projectDurationMonths}
          onChange={(value) => setFormData({ ...formData, projectDurationMonths: value })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type de financement *</label>
          <select
            required
            value={formData.fundingType}
            onChange={(event) => setFormData({ ...formData, fundingType: event.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          >
            <option value="">Sélectionnez un type</option>
            <option value="don">Don / Subvention</option>
            <option value="pret">Prêt</option>
            <option value="equity">Prise de participation (Equity)</option>
            <option value="mixte">Mixte</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Classement automatique : Nano / Bronze jusqu’à 1 000 000 FCFA et 12 mois maximum,
        Argent de plus de 1 000 000 à 2 500 000 FCFA, puis Or au-delà.
      </div>

      <TextInputField
        label="Financement actuel (FCFA)"
        min="0"
        placeholder="Montant déjà levé ou investi (si applicable)"
        type="number"
        value={formData.currentFunding}
        onChange={(value) => setFormData({ ...formData, currentFunding: value })}
      />

      <TextAreaField
        label="Utilisation des fonds *"
        maxLength={500}
        placeholder="Comment allez-vous utiliser les fonds ? (Ex: Développement technologique 40%, Marketing 30%, Opérations 20%, Équipe 10%)"
        required
        rows={5}
        value={formData.useOfFunds}
        onChange={(value) => setFormData({ ...formData, useOfFunds: value })}
      />

      <PartnerNeedsSelector formData={formData} togglePartnerNeed={togglePartnerNeed} />

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <i className="ri-lightbulb-line text-green-600 text-xl flex-shrink-0 mt-0.5"></i>
          <div>
            <p className="text-sm font-medium text-green-900 mb-1">Conseil</p>
            <p className="text-sm text-green-800">
              Soyez réaliste et précis dans vos besoins financiers. Expliquez clairement comment chaque franc sera utilisé pour maximiser vos chances d'obtenir un financement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerNeedsSelector({
  formData,
  togglePartnerNeed,
}: {
  formData: SubmitProjectFormData;
  togglePartnerNeed: (need: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Type de partenaire recherche</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {PARTNER_NEED_OPTIONS.map((option) => {
          const active = formData.partnerNeeds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => togglePartnerNeed(option.id)}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                active ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <i className={`${option.icon} mt-0.5 text-lg ${active ? 'text-teal-600' : 'text-gray-400'}`}></i>
                <div>
                  <p className="font-medium text-gray-900">{option.id}</p>
                  <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">Vous pouvez en choisir un seul ou les deux selon le dossier.</p>
    </div>
  );
}
