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
  compact = false,
  compactFieldMode = 'required',
}: {
  roleProfile: RoleProfileData;
  selectedRoleFields: RoleFieldConfig;
  selectedUserTypeTitle?: string;
  userType: string | null;
  isLoading: boolean;
  onRoleProfileChange: (roleProfile: RoleProfileData) => void;
  compact?: boolean;
  compactFieldMode?: 'required' | 'all';
}) {
  const showSectionHeader = Boolean(userType && !inlineRoleProfileSections.has(userType) && !compact);
  const wrapperClassName = userType && inlineRoleProfileSections.has(userType)
    ? ''
    : `${compact ? 'rounded-2xl border border-[#e2e8f0] bg-white p-4' : 'rounded-[24px] border border-[#eadfce] bg-[#fbf7f1] p-5'}`;
  const visibleFields = compact && compactFieldMode === 'required'
    ? selectedRoleFields.fields.filter((field) => field.required)
    : selectedRoleFields.fields;

  return (
    <div className={wrapperClassName}>
      {showSectionHeader ? (
        <div className={compact ? 'mb-4' : 'mb-5'}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d5b46f]">
            {selectedUserTypeTitle}
          </p>
          <h3 className={`${compact ? 'mt-1 text-base' : 'mt-2 text-lg'} font-semibold text-[#172033]`}>{selectedRoleFields.title}</h3>
          {selectedRoleFields.description ? (
            <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-2 text-sm leading-6'} text-[#5b6778]`}>{selectedRoleFields.description}</p>
          ) : null}
        </div>
      ) : null}

      <div className={`${compact ? 'gap-3' : 'gap-4'} grid grid-cols-1 md:grid-cols-2`}>
        {visibleFields.map((field) => {
          const isTextarea = field.type === 'textarea';
          const isSelect = field.type === 'select';
          const fieldId = `role-${field.key}`;
          const className = `${inputClass} bg-white ${compact ? 'py-2' : ''} ${isTextarea ? `${compact ? 'min-h-[82px]' : 'min-h-[112px]'} resize-none md:col-span-2` : ''}`;

          return (
            <div key={field.key} className={isTextarea ? 'md:col-span-2' : ''}>
              <label htmlFor={fieldId} className={`${compact ? 'mb-1 text-xs' : 'mb-2 text-sm'} block font-medium text-[#475569]`}>
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
              {field.hint && !compact ? <p className="mt-2 text-xs text-[#7c8698]">{field.hint}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
