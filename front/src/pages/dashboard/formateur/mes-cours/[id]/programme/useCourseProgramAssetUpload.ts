import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { uploadFileToServer } from '@/lib/uploadApi';
import type { AssetFormErrors, AssetFormState } from './programmeModel';

interface CourseProgramAssetUploadOptions {
  assetForm: AssetFormState;
  courseId?: string | null;
  setAssetErrors: Dispatch<SetStateAction<AssetFormErrors>>;
  setAssetForm: Dispatch<SetStateAction<AssetFormState>>;
  setAssetFormMessage: Dispatch<SetStateAction<string | null>>;
  onUploadError: (title: string, message: string) => void;
  onUploadSuccess: (title: string, message: string) => void;
}

export function useCourseProgramAssetUpload({
  assetForm,
  courseId,
  setAssetErrors,
  setAssetForm,
  setAssetFormMessage,
  onUploadError,
  onUploadSuccess,
}: CourseProgramAssetUploadOptions) {
  const [isAssetUploading, setIsAssetUploading] = useState(false);
  const [assetUploadProgress, setAssetUploadProgress] = useState(0);
  const assetFileInputRef = useRef<HTMLInputElement>(null);

  const handleAssetFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !courseId || !assetForm.lesson_id) return;

    if (assetForm.asset_type === 'link') {
      setAssetFormMessage('Les liens externes se saisissent directement, sans upload de fichier.');
      onUploadError('Type incompatible', 'Les liens externes se saisissent directement, sans upload de fichier.');
      event.target.value = '';
      return;
    }

    setIsAssetUploading(true);
    setAssetUploadProgress(0);
    try {
      const resourceType = assetForm.asset_type === 'video' ? 'video' : 'raw';
      const filename = `lesson-${assetForm.lesson_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uploaded = await uploadFileToServer(file, {
        folder: `c2p/courses/${courseId}/lessons/${assetForm.lesson_id}`,
        filename,
        resourceType,
        onProgress: setAssetUploadProgress,
      });

      setAssetForm((current) => ({
        ...current,
        url: uploaded.url,
        mime_type: file.type || current.mime_type,
        size_bytes: String(file.size),
        title: current.title || file.name,
        status: 'ready',
      }));
      setAssetErrors((current) => ({
        ...current,
        url: undefined,
        mime_type: undefined,
        size_bytes: undefined,
        title: undefined,
      }));
      setAssetFormMessage(null);
      onUploadSuccess('Fichier importé', 'Le contenu a été téléversé et rattaché au formulaire.');
    } catch (err: unknown) {
      console.error(err);
      setAssetFormMessage('Impossible d envoyer le fichier.');
      onUploadError('Erreur d upload', 'Impossible d envoyer le fichier.');
    } finally {
      setIsAssetUploading(false);
      setAssetUploadProgress(0);
      event.target.value = '';
    }
  };

  return {
    assetFileInputRef,
    assetUploadProgress,
    handleAssetFileChange,
    isAssetUploading,
  };
}
