import { useRef, useState } from 'react';
import { uploadImageToServer } from '@/lib/uploadApi';
import { useToast } from '@/hooks/useToast';

interface ImageUploadFieldProps {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  folder: string;
  disabled?: boolean;
  helper?: string;
  allowUrlInput?: boolean;
  compact?: boolean;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  disabled = false,
  helper,
  allowUrlInput = true,
  compact = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Format invalide', 'Selectionnez une image JPG, PNG, WEBP ou GIF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('Fichier trop lourd', 'L image doit faire moins de 5 Mo.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const filename = `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const uploaded = await uploadImageToServer(file, { folder, filename, onProgress: setUploadProgress });
      onChange(uploaded.url);
      success('Image importee', 'L image a ete televersee avec succes.');
    } catch (err) {
      console.error(err);
      error('Erreur d upload', 'Impossible d envoyer l image.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="dashboard-form-wide">
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className={`${isUploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-2-line'} text-base`}></i>
          {isUploading ? `Envoi ${uploadProgress}%` : 'Importer'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleSelectFile}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        <div className={`flex items-center justify-center bg-gray-100 ${compact ? 'min-h-28' : 'min-h-48'}`}>
          {value ? (
            <img src={value} alt={label} className={`${compact ? 'h-28' : 'h-48'} w-full object-cover`} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <i className="ri-image-line text-3xl"></i>
              <span className="text-sm">Aucune image importee</span>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          {allowUrlInput ? (
            <input
              type="url"
              value={value || ''}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://..."
              disabled={disabled}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          ) : null}
          {helper ? <p className="mt-2 text-xs text-gray-500">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}
