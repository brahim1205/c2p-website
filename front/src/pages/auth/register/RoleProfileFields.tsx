import {
  inlineRoleProfileSections,
  inputClass,
  type RoleProfileData,
} from './registerModel';
import type { RoleFieldConfig } from './RegisterDetailsStep';

export function RoleProfileFields({
  roleProfile,
  selectedRoleFields,
  selectedUserTypeTitle,
  userType,
  isLoading,
  onRoleProfileChange,
}: {
  roleProfile: RoleProfileData;
  selectedRoleFields: RoleFieldConfig;
  selectedUserTypeTitle?: string;
  userType: string | null;
  isLoading: boolean;
  onRoleProfileChange: (roleProfile: RoleProfileData) => void;
}) {
  return (
    <div className={userType && inlineRoleProfileSections.has(userType) ? '' : 'rounded-[24px] border border-[#eadfce] bg-[#fbf7f1] p-5'}>
      {userType && !inlineRoleProfileSections.has(userType) ? (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
            {selectedUserTypeTitle}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#172033]">{selectedRoleFields.title}</h3>
          {selectedRoleFields.description ? (
            <p className="mt-2 text-sm leading-6 text-[#5b6778]">{selectedRoleFields.description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {selectedRoleFields.fields.map((field) => {
          const isTextarea = field.type === 'textarea';
          const isSelect = field.type === 'select';
          const fieldId = `role-${field.key}`;
          const className = `${inputClass} bg-white ${isTextarea ? 'min-h-[112px] resize-none md:col-span-2' : ''}`;

          return (
            <div key={field.key} className={isTextarea ? 'md:col-span-2' : ''}>
              <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-[#475569]">
                {field.label}{field.required ? ' *' : ''}
              </label>
              {isTextarea ? (
                <textarea
                  id={fieldId}
                  required={field.required}
                  value={roleProfile[field.key]}
                  onChange={(event) => onRoleProfileChange({ ...roleProfile, [field.key]: event.target.value })}
                  className={className}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                />
              ) : isSelect ? (
                <select
                  id={fieldId}
                  required={field.required}
                  value={roleProfile[field.key]}
                  onChange={(event) => onRoleProfileChange({ ...roleProfile, [field.key]: event.target.value })}
                  className={className}
                  disabled={isLoading}
                >
                  <option value="">{field.placeholder}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={fieldId}
                  type={field.type === 'url' ? 'url' : 'text'}
                  required={field.required}
                  value={roleProfile[field.key]}
                  onChange={(event) => onRoleProfileChange({ ...roleProfile, [field.key]: event.target.value })}
                  className={className}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                />
              )}
              {field.hint ? <p className="mt-2 text-xs text-[#7c8698]">{field.hint}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
