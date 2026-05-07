import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';

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

      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to backend Storage
        const { data: uploadData, error: uploadError } = await backendClient.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = backendClient.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setPreview(publicUrl);
        onChange?.(publicUrl);
        success('Avatar mis à jour', 'Votre photo de profil a été enregistrée.');
      } catch (err: unknown) {
        console.error('Upload error:', err);
        error('Erreur d\'upload', 'Impossible d\'envoyer l\'image. Réessayez plus tard.');
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, success, error]
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-teal-100 text-teal-700 font-bold select-none ${isUploading ? 'opacity-60' : ''}`}
        onMouseEnter={() => editable && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={editable ? triggerFileInput : undefined}
        style={{ cursor: editable ? 'pointer' : 'default' }}
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
          <div className="w-6 h-6 flex items-center justify-center">
            <i className="ri-loader-4-line animate-spin text-white text-lg"></i>
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