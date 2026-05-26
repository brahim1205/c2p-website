import { Link } from 'react-router-dom';
import {
  inputClass,
  type RoleProfileData,
} from './registerModel';
import { RoleProfileFields } from './RoleProfileFields';

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export type RoleFieldConfig = {
  title: string;
  description: string;
  fields: {
    key: keyof RoleProfileData;
    label: string;
    placeholder: string;
    required?: boolean;
    type?: 'text' | 'url' | 'textarea' | 'select';
    options?: { value: string; label: string }[];
    hint?: string;
  }[];
};

interface RegisterDetailsStepProps {
  formData: RegisterFormData;
  isLoading: boolean;
  roleProfile: RoleProfileData;
  selectedRoleFields: RoleFieldConfig | null;
  selectedUserTypeTitle?: string;
  showConfirmPassword: boolean;
  showPassword: boolean;
  userType: string | null;
  onBack: () => void;
  onFormDataChange: (formData: RegisterFormData) => void;
  onRoleProfileChange: (roleProfile: RoleProfileData) => void;
  onSubmit: (event: React.FormEvent) => void;
  onToggleConfirmPassword: () => void;
  onTogglePassword: () => void;
}

export default function RegisterDetailsStep({
  formData,
  isLoading,
  roleProfile,
  selectedRoleFields,
  selectedUserTypeTitle,
  showConfirmPassword,
  showPassword,
  userType,
  onBack,
  onFormDataChange,
  onRoleProfileChange,
  onSubmit,
  onToggleConfirmPassword,
  onTogglePassword,
}: RegisterDetailsStepProps) {
  return (
    <section className="c2p-card mx-auto max-w-4xl rounded-[30px] bg-white/92 p-6 shadow-c2p-lg backdrop-blur sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button onClick={onBack} disabled={isLoading} className="text-sm text-[#5b6778] transition-colors hover:text-[#b68b3f] disabled:opacity-50">
          <i className="ri-arrow-left-line mr-1"></i>
          Retour
        </button>
        <span className="rounded-full border border-[#d5b46f]/30 bg-[#d5b46f]/10 px-3 py-1 text-xs font-semibold text-[#d5b46f]">
          {selectedUserTypeTitle}
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput
            id="firstName"
            label="Prenom"
            placeholder="Votre prenom"
            value={formData.firstName}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, firstName: value })}
          />
          <TextInput
            id="lastName"
            label="Nom"
            placeholder="Votre nom"
            value={formData.lastName}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, lastName: value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput
            id="email"
            type="email"
            label="Adresse email"
            placeholder="votre@email.com"
            value={formData.email}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, email: value })}
          />
          <TextInput
            id="phone"
            type="tel"
            label="Telephone"
            placeholder="+221 7X XXX XX XX"
            value={formData.phone}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, phone: value })}
          />
        </div>

        {selectedRoleFields && selectedRoleFields.fields.length > 0 ? (
          <RoleProfileFields
            roleProfile={roleProfile}
            selectedRoleFields={selectedRoleFields}
            selectedUserTypeTitle={selectedUserTypeTitle}
            userType={userType}
            isLoading={isLoading}
            onRoleProfileChange={onRoleProfileChange}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PasswordInput
            id="password"
            label="Mot de passe"
            value={formData.password}
            visible={showPassword}
            disabled={isLoading}
            hint="Minimum 10 caracteres avec majuscule, minuscule, chiffre et caractere special."
            onChange={(value) => onFormDataChange({ ...formData, password: value })}
            onToggle={onTogglePassword}
          />
          <PasswordInput
            id="confirmPassword"
            label="Confirmer"
            value={formData.confirmPassword}
            visible={showConfirmPassword}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, confirmPassword: value })}
            onToggle={onToggleConfirmPassword}
          />
        </div>

        <label className="flex cursor-pointer items-start">
          <input type="checkbox" checked={formData.acceptTerms} onChange={(event) => onFormDataChange({ ...formData, acceptTerms: event.target.checked })} className="mt-1 h-4 w-4 cursor-pointer rounded border-[#d8c8af] bg-white text-[#d5b46f] focus:ring-[#d5b46f]" disabled={isLoading} />
          <span className="ml-2 text-sm leading-6 text-[#5b6778]">
            J&apos;accepte les <Link to="/cgu" className="c2p-link font-medium">conditions d&apos;utilisation</Link> et la <Link to="/confidentialite" className="c2p-link font-medium">politique de confidentialite</Link>
          </span>
        </label>

        <button type="submit" disabled={!formData.acceptTerms || isLoading} className="c2p-btn-accent w-full px-6 py-3.5">
          {isLoading ? (
            <span className="flex items-center justify-center">
              <i className="ri-loader-4-line mr-2 animate-spin"></i>
              Creation du compte...
            </span>
          ) : (
            'Creer mon compte'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#5b6778]">
        Vous avez deja un compte ?{' '}
        <Link to="/auth/login" className="c2p-link font-medium">
          Se connecter
        </Link>
      </p>
    </section>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#475569]">{label}</label>
      <input id={id} type={type} required value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  visible,
  disabled,
  hint,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  hint?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#475569]">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} required value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={disabled} />
        <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#b68b3f]">
          <i className={visible ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
        </button>
      </div>
      {hint ? <p className="mt-2 text-xs text-[#7c8698]">{hint}</p> : null}
    </div>
  );
}
