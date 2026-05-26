interface TextInputFieldProps {
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}

export function TextInputField({
  label,
  min,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: TextInputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={type}
        required={required}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
        placeholder={placeholder}
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows: number;
  value: string;
}

export function TextAreaField({
  label,
  maxLength,
  onChange,
  placeholder,
  required,
  rows,
  value,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <textarea
        required={required}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
        placeholder={placeholder}
      ></textarea>
      <p className="text-xs text-gray-500 mt-1">Maximum {maxLength} caractères</p>
    </div>
  );
}

interface FileDropFieldProps {
  accept: string;
  icon: string;
  label: string;
  meta: string;
  onChange: (value: string | null) => void;
}

export function FileDropField({ accept, icon, label, meta, onChange }: FileDropFieldProps) {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors">
      <label className="cursor-pointer block">
        <div className="flex flex-col items-center">
          <i className={`${icon} text-4xl text-gray-400 mb-2`}></i>
          <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>
          <span className="text-xs text-gray-500">{meta}</span>
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0]?.name || null)}
        />
      </label>
    </div>
  );
}
