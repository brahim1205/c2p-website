import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { uploadImageToServer } from '@/lib/uploadApi';
import { createClientRandomId } from '@/lib/randomId';

// Singleton backend client

interface AvatarUploadProps {
  src?: string | null;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onChange?: (url: string) => void;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-2xl',
};

export default function AvatarUpload({
  src,
  initials = '?',
  size = 'md',
  editable = false,
  onChange,
}: AvatarUploadProps) {
  const { success, error } = useToast();
  const [preview, setPreview] = useState<string | null>(src || null);
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        error('Format invalide', 'Veuillez sélectionner une image (JPG, PNG, GIF).');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        error('Fichier trop lourd', 'L\'image doit faire moins de 2 Mo.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const filename = createClientRandomId('avatar');
        const uploaded = await uploadImageToServer(file, {
          folder: 'c2p/avatars',
          filename,
          onProgress: setUploadProgress,
        });

        setPreview(uploaded.url);
        onChange?.(uploaded.url);
        success('Avatar mis à jour', 'Votre photo de profil a été enregistrée.');
      } catch (err: unknown) {
        console.error('Upload error:', err);
        error('Erreur d\'upload', 'Impossible d\'envoyer l\'image. Réessayez plus tard.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onChange, success, error]
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    setPreview(src || null);
  }, [src]);

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-teal-100 text-teal-700 font-bold select-none ${isUploading ? 'opacity-60' : ''} ${editable ? 'cursor-pointer' : 'cursor-default'}`}
        onMouseEnter={() => editable && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={editable ? triggerFileInput : undefined}
        role={editable ? 'button' : undefined}
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}

        {editable && isHovering && !isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full transition-opacity">
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-camera-line text-white text-lg"></i>
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
          <div className="flex flex-col items-center justify-center text-white">
            <i className="ri-loader-4-line animate-spin text-lg"></i>
            <span className="mt-1 text-[10px] font-semibold">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {preview && (
            <button
              onClick={triggerFileInput}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-colors shadow-sm disabled:bg-gray-400"
              title="Changer l'avatar"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-camera-line text-xs"></i>
              </div>
            </button>
          )}
        </>
      )}
    </div>
  );
}
