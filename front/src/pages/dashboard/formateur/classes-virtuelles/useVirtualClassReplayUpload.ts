import { useState, type ChangeEvent } from 'react';
import { uploadVideoToServer } from '@/lib/uploadApi';

interface UseVirtualClassReplayUploadParams {
  classId?: string | number | null;
  onRecordingUrlChange: (url: string) => void;
  onFormMessageChange: (message: string | null) => void;
  onError: (title: string, message: string) => void;
  onSuccess: (title: string, message: string) => void;
}

export function useVirtualClassReplayUpload({
  classId,
  onError,
  onFormMessageChange,
  onRecordingUrlChange,
  onSuccess,
}: UseVirtualClassReplayUploadParams) {
  const [isReplayUploading, setIsReplayUploading] = useState(false);
  const [replayUploadProgress, setReplayUploadProgress] = useState(0);

  const resetReplayUpload = () => {
    setIsReplayUploading(false);
    setReplayUploadProgress(0);
  };

  const handleReplayFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !classId) return;

    setIsReplayUploading(true);
    setReplayUploadProgress(0);
    onFormMessageChange(null);
    try {
      const uploaded = await uploadVideoToServer(file, {
        folder: `c2p/live-replays/${classId}`,
        filename: `replay-${Date.now()}`,
        onProgress: setReplayUploadProgress,
      });
      onRecordingUrlChange(uploaded.url);
      onSuccess('Replay importé', 'La vidéo est prête à être enregistrée sur la classe.');
    } catch (err) {
      console.error(err);
      onFormMessageChange('Impossible d importer le replay.');
      onError('Upload impossible', 'Le replay n a pas pu être envoyé.');
    } finally {
      resetReplayUpload();
      event.target.value = '';
    }
  };

  return {
    handleReplayFileChange,
    isReplayUploading,
    replayUploadProgress,
    resetReplayUpload,
  };
}
