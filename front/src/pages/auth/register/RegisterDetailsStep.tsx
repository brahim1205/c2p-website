import { Link } from 'react-router-dom';
import { inputClass, type RoleProfileData } from './registerModel';
import { startSocialAuth } from '@/lib/socialAuth';

export interface RegisterFormData {
  email: string;
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
  selectedUserTypeTitle?: string;
  selectedUserTypeId: string | null;
  socialReturnTo: string;
  showConfirmPassword: boolean;
  showPassword: boolean;
  onBack: () => void;
  onFormDataChange: (formData: RegisterFormData) => void;
  onSubmit: (event: React.FormEvent) => void;
  onToggleConfirmPassword: () => void;
  onTogglePassword: () => void;
}

export default function RegisterDetailsStep({
  formData,
  isLoading,
  selectedUserTypeTitle,
  selectedUserTypeId,
  socialReturnTo,
  showConfirmPassword,
  showPassword,
  onBack,
  onFormDataChange,
  onSubmit,
  onToggleConfirmPassword,
  onTogglePassword,
}: RegisterDetailsStepProps) {
  return (
    <section className="mx-auto max-w-lg rounded-[18px] border border-[#eadfce] bg-[#fbf7f1]/45 p-3 shadow-sm backdrop-blur sm:rounded-[22px] sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <button onClick={onBack} disabled={isLoading} className="text-sm text-[#5b6778] transition-colors hover:text-[#b68b3f] disabled:opacity-50">
          <i className="ri-arrow-left-line mr-1"></i>
          Retour
        </button>
        <span className="w-fit rounded-full border border-[#d5b46f]/30 bg-[#d5b46f]/10 px-3 py-1 text-xs font-semibold text-[#d5b46f]">
          {selectedUserTypeTitle}
        </span>
      </div>

      <div className="mb-3 grid gap-3">
        <button
          type="button"
          onClick={() => startSocialAuth('google', { role: selectedUserTypeId, returnTo: socialReturnTo })}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-semibold text-[#172033] transition-colors hover:bg-[#fbf7f1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="ri-google-fill text-lg" />
          Continuer avec Google
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <TextInput
            id="email"
            type="email"
            label="Adresse email"
            placeholder="votre@email.com"
            value={formData.email}
            disabled={isLoading}
            onChange={(value) => onFormDataChange({ ...formData, email: value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
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
          <span className="ml-2 text-xs leading-5 text-[#5b6778] sm:text-sm">
            J&apos;accepte les <Link to="/cgu" className="c2p-link font-medium">conditions d&apos;utilisation</Link> et la <Link to="/confidentialite" className="c2p-link font-medium">politique de confidentialite</Link>
          </span>
        </label>

        <button type="submit" disabled={!formData.acceptTerms || isLoading} className="c2p-btn-accent w-full px-6 py-2.5">
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

      <p className="mt-3 text-center text-sm text-[#5b6778]">
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#475569]">{label}</label>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#475569]">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} required value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" disabled={disabled} />
        <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors hover:text-[#b68b3f]">
          <i className={visible ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
        </button>
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-[#7c8698]">{hint}</p> : null}
    </div>
  );
}
