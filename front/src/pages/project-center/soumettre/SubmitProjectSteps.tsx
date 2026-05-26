import type { Dispatch, SetStateAction } from 'react';
import {
  PROJECT_CATEGORIES,
  type SubmitProjectFormData,
} from './submitProjectModel';
import { TextAreaField, TextInputField } from './SubmitProjectFields';
import { DocumentsStep } from './SubmitProjectDocumentsStep';
import { FundingStep } from './SubmitProjectFundingStep';

interface StepFieldsProps {
  currentStep: number;
  formData: SubmitProjectFormData;
  setFormData: Dispatch<SetStateAction<SubmitProjectFormData>>;
  togglePartnerNeed: (need: string) => void;
}

export function StepFields({
  currentStep,
  formData,
  setFormData,
  togglePartnerNeed,
}: StepFieldsProps) {
  if (currentStep === 1) {
    return <BasicInfoStep formData={formData} setFormData={setFormData} />;
  }
  if (currentStep === 2) {
    return <DetailedDescriptionStep formData={formData} setFormData={setFormData} />;
  }
  if (currentStep === 3) {
    return <TeamStep formData={formData} setFormData={setFormData} />;
  }
  if (currentStep === 4) {
    return <FundingStep formData={formData} setFormData={setFormData} togglePartnerNeed={togglePartnerNeed} />;
  }
  return <DocumentsStep formData={formData} setFormData={setFormData} />;
}

interface FormStepProps {
  formData: SubmitProjectFormData;
  setFormData: Dispatch<SetStateAction<SubmitProjectFormData>>;
}

function BasicInfoStep({ formData, setFormData }: FormStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations de base</h2>
        <p className="text-gray-600">Commencez par nous présenter votre projet en quelques mots.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nom du projet *</label>
        <input
          type="text"
          required
          value={formData.projectName}
          onChange={(event) => setFormData({ ...formData, projectName: event.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          placeholder="Ex: AgriConnect"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
          <select
            required
            value={formData.category}
            onChange={(event) => setFormData({ ...formData, category: event.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          >
            <option value="">Sélectionnez une catégorie</option>
            {PROJECT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stade du projet *</label>
          <select
            required
            value={formData.stage}
            onChange={(event) => setFormData({ ...formData, stage: event.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          >
            <option value="">Sélectionnez un stade</option>
            <option value="idee">Idée</option>
            <option value="prototype">Prototype</option>
            <option value="mvp">MVP développé</option>
            <option value="lancement">Lancé sur le marché</option>
            <option value="croissance">En croissance</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Localisation *</label>
        <input
          type="text"
          required
          value={formData.location}
          onChange={(event) => setFormData({ ...formData, location: event.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          placeholder="Ex: Dakar, Sénégal"
        />
      </div>

      <TextAreaField
        label="Description courte *"
        maxLength={200}
        placeholder="Décrivez votre projet en une phrase accrocheuse..."
        required
        rows={3}
        value={formData.shortDescription}
        onChange={(value) => setFormData({ ...formData, shortDescription: value })}
      />
    </div>
  );
}

function DetailedDescriptionStep({ formData, setFormData }: FormStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Description détaillée</h2>
        <p className="text-gray-600">Expliquez-nous votre projet en détail.</p>
      </div>

      <TextAreaField
        label="Problème identifié *"
        maxLength={500}
        placeholder="Quel problème votre projet résout-il ?"
        required
        rows={4}
        value={formData.problemStatement}
        onChange={(value) => setFormData({ ...formData, problemStatement: value })}
      />
      <TextAreaField
        label="Solution proposée *"
        maxLength={500}
        placeholder="Comment votre projet résout-il ce problème ?"
        required
        rows={4}
        value={formData.solution}
        onChange={(value) => setFormData({ ...formData, solution: value })}
      />
      <TextAreaField
        label="Marché cible *"
        maxLength={500}
        placeholder="Qui sont vos clients cibles ? Quelle est la taille du marché ?"
        required
        rows={3}
        value={formData.targetMarket}
        onChange={(value) => setFormData({ ...formData, targetMarket: value })}
      />
      <TextAreaField
        label="Modèle économique *"
        maxLength={500}
        placeholder="Comment allez-vous générer des revenus ?"
        required
        rows={3}
        value={formData.businessModel}
        onChange={(value) => setFormData({ ...formData, businessModel: value })}
      />
      <TextAreaField
        label="Concurrence"
        maxLength={500}
        placeholder="Qui sont vos concurrents ? Quelle est votre différenciation ?"
        rows={3}
        value={formData.competition}
        onChange={(value) => setFormData({ ...formData, competition: value })}
      />
    </div>
  );
}

function TeamStep({ formData, setFormData }: FormStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre équipe</h2>
        <p className="text-gray-600">Parlez-nous de vous et de votre équipe.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <TextInputField
          label="Nom du fondateur *"
          placeholder="Votre nom complet"
          required
          value={formData.founderName}
          onChange={(value) => setFormData({ ...formData, founderName: value })}
        />
        <TextInputField
          label="Email *"
          placeholder="votre@email.com"
          required
          type="email"
          value={formData.founderEmail}
          onChange={(value) => setFormData({ ...formData, founderEmail: value })}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <TextInputField
          label="Téléphone *"
          placeholder="+221 XX XXX XX XX"
          required
          type="tel"
          value={formData.founderPhone}
          onChange={(value) => setFormData({ ...formData, founderPhone: value })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Taille de l'équipe *</label>
          <select
            required
            value={formData.teamSize}
            onChange={(event) => setFormData({ ...formData, teamSize: event.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          >
            <option value="">Sélectionnez</option>
            <option value="1">1 personne (solo)</option>
            <option value="2-3">2-3 personnes</option>
            <option value="4-5">4-5 personnes</option>
            <option value="6-10">6-10 personnes</option>
            <option value="10+">Plus de 10 personnes</option>
          </select>
        </div>
      </div>

      <TextAreaField
        label="Biographie du fondateur *"
        maxLength={500}
        placeholder="Parlez-nous de votre parcours, vos compétences et votre motivation..."
        required
        rows={4}
        value={formData.founderBio}
        onChange={(value) => setFormData({ ...formData, founderBio: value })}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <i className="ri-information-line text-blue-600 text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-sm text-blue-800">
            Si vous avez une équipe, vous pourrez ajouter les autres membres après la soumission initiale.
          </p>
        </div>
      </div>
    </div>
  );
}
