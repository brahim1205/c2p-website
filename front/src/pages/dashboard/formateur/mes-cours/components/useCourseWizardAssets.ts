import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import {
  uploadFileToServer,
  uploadVideoToServer,
} from '@/lib/uploadApi';
import {
  createLocalId,
  type AssetDraft,
  type AssetType,
  type CourseBasicsDraft,
  type LessonDraft,
  type WizardDraftState,
} from './courseWizardModel';

interface LessonOption {
  lessonId: string;
  lessonTitle: string;
}

interface UseCourseWizardAssetsOptions {
  userId?: string | null;
  wizard: WizardDraftState;
  selectedLesson: LessonDraft | null;
  lessonOptions: LessonOption[];
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
  setStepMessage: Dispatch<SetStateAction<string | null>>;
  updateCourse: <K extends keyof CourseBasicsDraft>(field: K, value: CourseBasicsDraft[K]) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

export function useCourseWizardAssets({
  userId,
  wizard,
  selectedLesson,
  lessonOptions,
  setWizard,
  setStepMessage,
  updateCourse,
  success,
  error,
}: UseCourseWizardAssetsOptions) {
  const [isTrailerUploading, setIsTrailerUploading] = useState(false);
  const [trailerUploadProgress, setTrailerUploadProgress] = useState(0);
  const [pendingAssetType, setPendingAssetType] = useState<AssetType>('video');

  const addAssetLink = (lessonId: string, assetType: AssetType) => {
    if (!selectedLesson) return;
    setWizard((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          id: createLocalId('asset'),
          lessonId,
          lessonTitle: selectedLesson.title,
          asset_type: assetType,
          title: '',
          url: '',
          thumbnail_url: '',
          mime_type: '',
          size_bytes: null,
          status: assetType === 'video' ? 'processing' : 'ready',
          queueStatus: assetType === 'link' ? 'ready' : 'queued',
          progress: 0,
          errorMessage: null,
        },
      ],
    }));
  };

  const updateAsset = <K extends keyof AssetDraft>(assetId: string, field: K, value: AssetDraft[K]) => {
    setWizard((current) => ({
      ...current,
      assets: current.assets.map((asset) => (
        asset.id === assetId ? { ...asset, [field]: value, errorMessage: field === 'url' ? null : asset.errorMessage } : asset
      )),
    }));
    setStepMessage(null);
  };

  const removeAsset = (assetId: string) => {
    setWizard((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.id !== assetId),
    }));
  };

  const handleTrailerFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsTrailerUploading(true);
    setTrailerUploadProgress(0);
    try {
      const payload = await uploadVideoToServer(file, {
        folder: `c2p/course-drafts/${userId}/${wizard.draftId}/trailer`,
        filename: `trailer-${Date.now()}`,
        onProgress: setTrailerUploadProgress,
      });
      updateCourse('trailer_url', payload.url);
      success('Bande-annonce importée', 'La vidéo de présentation a été téléversée sur le serveur.');
    } catch (reason) {
      console.error(reason);
      error('Upload impossible', 'La bande-annonce n a pas pu être téléversée.');
    } finally {
      setIsTrailerUploading(false);
      setTrailerUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleQueuedFiles = async (lessonId: string, assetType: AssetType, files: FileList | null) => {
    if (!files || !userId) return;
    const lesson = lessonOptions.find((entry) => entry.lessonId === lessonId);
    if (!lesson) return;

    const queueIds: string[] = [];
    setWizard((current) => {
      const appended: AssetDraft[] = Array.from(files).map((file) => {
        const assetId = createLocalId('asset');
        queueIds.push(assetId);
        return {
          id: assetId,
          lessonId,
          lessonTitle: lesson.lessonTitle,
          asset_type: assetType,
          title: file.name,
          url: '',
          thumbnail_url: '',
          mime_type: file.type,
          size_bytes: file.size,
          status: assetType === 'video' ? 'processing' : 'ready',
          queueStatus: 'queued',
          progress: 0,
          errorMessage: null,
        };
      });

      return {
        ...current,
        assets: [...current.assets, ...appended],
      };
    });

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const assetId = queueIds[index];
      setWizard((current) => ({
        ...current,
        assets: current.assets.map((asset) => (
          asset.id === assetId ? { ...asset, queueStatus: 'uploading', progress: 0, errorMessage: null } : asset
        )),
      }));

      try {
        const payload = await uploadFileToServer(file, {
          folder: `c2p/course-drafts/${userId}/${wizard.draftId}/lessons/${lessonId}`,
          filename: `${assetType}-${Date.now()}-${index + 1}`,
          resourceType: assetType === 'video' ? 'video' : 'raw',
          onProgress: (progress) => {
            setWizard((current) => ({
              ...current,
              assets: current.assets.map((asset) => (
                asset.id === assetId ? { ...asset, progress } : asset
              )),
            }));
          },
        });

        setWizard((current) => ({
          ...current,
          assets: current.assets.map((asset) => (
            asset.id === assetId
              ? {
                ...asset,
                title: asset.title || file.name,
                url: payload.url,
                thumbnail_url: asset.thumbnail_url,
                mime_type: payload.mimeType || file.type,
                size_bytes: payload.size || file.size,
                status: assetType === 'video' ? 'processing' : 'ready',
                queueStatus: 'ready',
                progress: 100,
              }
              : asset
          )),
        }));
      } catch (reason) {
        console.error(reason);
        setWizard((current) => ({
          ...current,
          assets: current.assets.map((asset) => (
            asset.id === assetId
              ? {
                ...asset,
                queueStatus: 'error',
                errorMessage: 'Upload impossible.',
              }
              : asset
          )),
        }));
      }
    }
  };

  return {
    addAssetLink,
    handleQueuedFiles,
    handleTrailerFileChange,
    isTrailerUploading,
    pendingAssetType,
    removeAsset,
    setPendingAssetType,
    trailerUploadProgress,
    updateAsset,
  };
}
