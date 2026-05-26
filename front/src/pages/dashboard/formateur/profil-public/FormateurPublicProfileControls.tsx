import { getFieldClass } from './formateurPublicProfileModel';

export function ProfileTextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  labelClassName = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={className}>
      <label className={`mb-1 block text-sm font-medium text-gray-700 ${labelClassName}`}>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={getFieldClass()} />
    </div>
  );
}

export function TagEditor({
  label,
  value,
  placeholder,
  tags,
  tagClassName,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  value: string;
  placeholder: string;
  tags: string[];
  tagClassName: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), onAdd())}
            placeholder={placeholder}
            className={getFieldClass()}
          />
          <button type="button" onClick={onAdd} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">
            Ajouter
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => onRemove(tag)} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${tagClassName}`}>
            {tag}
            <i className="ri-close-line" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ListSectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <button type="button" onClick={onAdd} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Ajouter
      </button>
    </div>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mb-3 flex justify-end">
      <button type="button" onClick={onClick} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
        Supprimer
      </button>
    </div>
  );
}
