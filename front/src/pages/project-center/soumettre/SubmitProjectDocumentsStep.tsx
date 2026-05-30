import type { Dispatch, SetStateAction } from 'react';
import type { SubmitProjectFormData } from './submitProjectModel';
import { FileDropField } from './SubmitProjectFields';

export function DocumentsStep({
  formData,
  setFormData,
}: {
  formData: SubmitProjectFormData;
  setFormData: Dispatch<SetStateAction<SubmitProjectFormData>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">Documents du projet</h2>
        <p className="text-gray-600">Téléchargez les documents qui appuient votre candidature.</p>
      </div>

      <div className="space-y-4">
        <FileDropField accept=".pdf" icon="ri-file-text-line" label="Business Plan" meta="PDF, max 10 MB (optionnel)" onChange={(value) => setFormData({ ...formData, businessPlan: value })} />
        <FileDropField accept=".pdf,.ppt,.pptx" icon="ri-slideshow-line" label="Pitch Deck" meta="PDF ou PPT, max 10 MB (optionnel)" onChange={(value) => setFormData({ ...formData, pitchDeck: value })} />
        <FileDropField accept=".xlsx,.xls,.pdf" icon="ri-file-excel-line" label="Projections financières" meta="Excel ou PDF, max 5 MB (optionnel)" onChange={(value) => setFormData({ ...formData, financialProjections: value })} />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <i className="ri-information-line text-yellow-600 text-xl flex-shrink-0 mt-0.5"></i>
          <div>
            <p className="text-sm font-medium text-yellow-900 mb-1">Note importante</p>
            <p className="text-sm text-yellow-800">
              Les documents sont optionnels mais fortement recommandés. Ils augmentent significativement vos chances d'être sélectionné pour notre programme d'incubation.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-teal-50 to-blue-50 p-4 sm:p-6">
        <h3 className="font-bold text-gray-900 mb-3">Prochaines étapes</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {['Examen de votre dossier par notre comité (48h)', 'Entretien avec notre équipe si votre projet est présélectionné', "Décision finale et intégration au programme d'incubation"].map((item) => (
            <li key={item} className="flex items-start space-x-2">
              <i className="ri-check-line text-teal-600 mt-0.5"></i>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
