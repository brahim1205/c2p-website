import { useState } from 'react';

export interface ResetFormState {
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFieldsProps {
  resetForm: ResetFormState;
  onResetFormChange: (next: ResetFormState) => void;
}

export function ResetPasswordFields({ resetForm, onResetFormChange }: ResetPasswordFieldsProps) {
  const [visibleFields, setVisibleFields] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const toggleField = (field: keyof ResetFormState) => {
    setVisibleFields((current) => ({ ...current, [field]: !current[field] }));
  };

  return (
    <div className="space-y-4">
      <ResetPasswordInput
        id="reset-new-password"
        label="Nouveau mot de passe"
        placeholder="Minimum 10 caractères"
        value={resetForm.newPassword}
        visible={visibleFields.newPassword}
        onChange={(value) => onResetFormChange({ ...resetForm, newPassword: value })}
        onToggle={() => toggleField('newPassword')}
      />
      <ResetPasswordInput
        id="reset-confirm-password"
        label="Confirmer le mot de passe"
        value={resetForm.confirmPassword}
        visible={visibleFields.confirmPassword}
        onChange={(value) => onResetFormChange({ ...resetForm, confirmPassword: value })}
        onToggle={() => toggleField('confirmPassword')}
      />
    </div>
  );
}

function ResetPasswordInput({
  id,
  label,
  placeholder = '••••••••',
  value,
  visible,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 pr-12 transition-colors focus:border-teal-500 focus:outline-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          aria-label={visible ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
        >
          <i className={visible ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
        </button>
      </div>
    </div>
  );
}
