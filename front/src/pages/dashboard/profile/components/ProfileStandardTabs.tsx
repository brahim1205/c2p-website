import type { Dispatch, SetStateAction } from 'react';
import type { ProfileFormData } from './profileTypes';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface EditableProfileTabProps {
  formData: ProfileFormData;
  isEditing: boolean;
  onCancelEdit: () => void;
  onFormDataChange: Dispatch<SetStateAction<ProfileFormData>>;
  onSave: () => void;
}

interface ProfileSecurityTabProps {
  passwordData: PasswordData;
  onDeleteAccountRequest: () => void;
  onPasswordChange: () => void;
  onPasswordDataChange: Dispatch<SetStateAction<PasswordData>>;
}

const fieldClassName = 'block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500';

export function ProfilePersonalTab({
  formData,
  isEditing,
  onCancelEdit,
  onFormDataChange,
  onSave,
}: EditableProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(event) => onFormDataChange({ ...formData, firstName: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(event) => onFormDataChange({ ...formData, lastName: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(event) => onFormDataChange({ ...formData, email: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(event) => onFormDataChange({ ...formData, phone: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
          <input
            type="text"
            value={formData.location}
            onChange={(event) => onFormDataChange({ ...formData, location: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Biographie</label>
          <textarea
            value={formData.bio}
            onChange={(event) => onFormDataChange({ ...formData, bio: event.target.value })}
            disabled={!isEditing}
            rows={4}
            maxLength={500}
            className={`${fieldClassName} resize-none`}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 caractères</p>
        </div>
      </div>

      {isEditing && (
        <ProfileSaveActions onCancelEdit={onCancelEdit} onSave={onSave} />
      )}
    </div>
  );
}

export function ProfileProfessionalTab({
  formData,
  isEditing,
  onCancelEdit,
  onFormDataChange,
  onSave,
}: EditableProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profession / Titre</label>
          <input
            type="text"
            value={formData.profession}
            onChange={(event) => onFormDataChange({ ...formData, profession: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise / Organisation</label>
          <input
            type="text"
            value={formData.company}
            onChange={(event) => onFormDataChange({ ...formData, company: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Années d&apos;expérience</label>
          <select
            value={formData.experience}
            onChange={(event) => onFormDataChange({ ...formData, experience: event.target.value })}
            disabled={!isEditing}
            className={`${fieldClassName} cursor-pointer`}
          >
            <option value="Moins d&apos;un an">Moins d&apos;un an</option>
            <option value="1-3 ans">1-3 ans</option>
            <option value="3-5 ans">3-5 ans</option>
            <option value="5-10 ans">5-10 ans</option>
            <option value="Plus de 10 ans">Plus de 10 ans</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site web</label>
          <input
            type="url"
            value={formData.website}
            onChange={(event) => onFormDataChange({ ...formData, website: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
          <input
            type="url"
            value={formData.linkedin}
            onChange={(event) => onFormDataChange({ ...formData, linkedin: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Twitter / X</label>
          <input
            type="url"
            value={formData.twitter}
            onChange={(event) => onFormDataChange({ ...formData, twitter: event.target.value })}
            disabled={!isEditing}
            className={fieldClassName}
          />
        </div>
      </div>

      {isEditing && (
        <ProfileSaveActions onCancelEdit={onCancelEdit} onSave={onSave} />
      )}
    </div>
  );
}

export function ProfileSecurityTab({
  passwordData,
  onDeleteAccountRequest,
  onPasswordChange,
  onPasswordDataChange,
}: ProfileSecurityTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Changer le mot de passe</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(event) => onPasswordDataChange({ ...passwordData, currentPassword: event.target.value })}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(event) => onPasswordDataChange({ ...passwordData, newPassword: event.target.value })}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 10 caracteres avec majuscule, minuscule, chiffre et caractere special</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(event) => onPasswordDataChange({ ...passwordData, confirmPassword: event.target.value })}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button
            onClick={onPasswordChange}
            className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer md:col-span-2 xl:col-span-3"
          >
            Mettre à jour le mot de passe
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Reinitialisation securisee</h3>
          <p className="text-sm text-gray-600">
            La verification par code SMS est reservee a la procedure "mot de passe oublie". La connexion normale au dashboard ne demande plus de code supplementaire.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-bold text-red-600 mb-2">Zone de danger</h3>
        <p className="text-sm text-gray-600 mb-4">
          La suppression de votre compte est irréversible. Toutes vos données seront perdues.
        </p>
        <button
          onClick={onDeleteAccountRequest}
          className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
        >
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}

function ProfileSaveActions({
  onCancelEdit,
  onSave,
}: Pick<EditableProfileTabProps, 'onCancelEdit' | 'onSave'>) {
  return (
    <div className="flex flex-col sm:flex-row justify-end gap-3">
      <button
        onClick={onCancelEdit}
        className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
      >
        Annuler
      </button>
      <button
        onClick={onSave}
        className="px-6 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
      >
        Enregistrer
      </button>
    </div>
  );
}
