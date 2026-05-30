import { TOTAL_SUBMIT_PROJECT_STEPS } from './submitProjectModel';

interface StepNavigationProps {
  currentStep: number;
  isSubmitting: boolean;
  subscriptionAllowed: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function StepNavigation({
  currentStep,
  isSubmitting,
  subscriptionAllowed,
  onNext,
  onPrevious,
}: StepNavigationProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentStep === 1}
        className={`w-full rounded-lg px-6 py-3 font-semibold transition-colors sm:w-auto ${
          currentStep === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <i className="ri-arrow-left-line mr-2"></i>
        Précédent
      </button>

      {currentStep < TOTAL_SUBMIT_PROJECT_STEPS ? (
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600 sm:w-auto"
        >
          Suivant
          <i className="ri-arrow-right-line ml-2"></i>
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting || !subscriptionAllowed}
          className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 px-6 py-3 font-semibold leading-tight text-white transition-colors hover:from-teal-600 hover:to-blue-700 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          <i className="ri-send-plane-line mr-2"></i>
          {isSubmitting ? 'Soumission...' : 'Soumettre mon projet'}
        </button>
      )}
    </div>
  );
}

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
    <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-teal-500 sm:p-6">
      <label className="cursor-pointer block">
        <div className="flex flex-col items-center">
          <i className={`${icon} mb-2 text-3xl text-gray-400 sm:text-4xl`}></i>
          <span className="mb-1 text-center text-sm font-medium text-gray-700">{label}</span>
          <span className="text-center text-xs text-gray-500">{meta}</span>
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
