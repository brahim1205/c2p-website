import { getFieldClass } from './courseCreationFields';

export type CourseListField = 'objectives' | 'prerequisites' | 'tools';

interface CourseListEditorProps {
  field: CourseListField;
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (field: CourseListField) => void;
  onUpdate: (field: CourseListField, index: number, value: string) => void;
  onRemove: (field: CourseListField, index: number) => void;
}

export default function CourseListEditor({
  field,
  label,
  placeholder,
  values,
  onAdd,
  onUpdate,
  onRemove,
}: CourseListEditorProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <button
          type="button"
          onClick={() => onAdd(field)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
          aria-label={`Ajouter ${label.toLowerCase()}`}
        >
          <i className="ri-add-line"></i>
        </button>
      </div>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={`${field}-${index}`} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(event) => onUpdate(field, index, event.target.value)}
              placeholder={placeholder}
              className={getFieldClass(false)}
            />
            <button
              type="button"
              onClick={() => onRemove(field, index)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600"
              aria-label="Retirer la ligne"
            >
              <i className="ri-delete-bin-line"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
