import { getCourseFieldClass } from './courseManagementModel';

export type CourseListField = 'objectives' | 'prerequisites' | 'tools';

export default function CourseListFieldEditor({
  label,
  field,
  values,
  onAdd,
  onChange,
  onRemove,
}: {
  label: string;
  field: CourseListField;
  values: string[];
  onAdd: (field: CourseListField) => void;
  onChange: (field: CourseListField, index: number, value: string) => void;
  onRemove: (field: CourseListField, index: number) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800">{label}</label>
        <button type="button" onClick={() => onAdd(field)} className="text-sm font-semibold text-teal-700">+ Ajouter</button>
      </div>
      <div className="space-y-2">
        {values.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Aucun élément renseigné.</p> : null}
        {values.map((value, index) => (
          <div key={`${field}-${index}`} className="flex gap-2">
            <input value={value} onChange={(event) => onChange(field, index, event.target.value)} className={getCourseFieldClass(false)} />
            <button type="button" aria-label={`Supprimer ${label}`} onClick={() => onRemove(field, index)} className="rounded-lg border border-red-200 px-3 text-red-600">
              <i className="ri-delete-bin-line"></i>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
