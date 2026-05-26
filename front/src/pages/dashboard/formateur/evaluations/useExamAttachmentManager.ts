import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { uploadFileToServer } from '@/lib/uploadApi';
import {
  getUploadResourceType,
  type Exam,
  type ExamAttachment,
} from './evaluationModel';

interface ExamAttachmentManagerOptions {
  attachments?: ExamAttachment[] | null;
  setNewExam: Dispatch<SetStateAction<Partial<Exam>>>;
  onMessageClear: () => void;
  onUploadSuccess: (title: string, message: string) => void;
  onUploadError: (title: string, message: string) => void;
}

export function useExamAttachmentManager({
  attachments,
  setNewExam,
  onMessageClear,
  onUploadSuccess,
  onUploadError,
}: ExamAttachmentManagerOptions) {
  const [isUploadingExamAttachment, setIsUploadingExamAttachment] = useState(false);
  const [examAttachmentUploadProgress, setExamAttachmentUploadProgress] = useState(0);
  const examAttachmentInputRef = useRef<HTMLInputElement>(null);

  const addExamAttachments = (nextAttachments: ExamAttachment[]) => {
    setNewExam((current) => ({
      ...current,
      attachments: [...(current.attachments ?? []), ...nextAttachments].slice(0, 8),
    }));
    onMessageClear();
  };

  const removeExamAttachment = (url: string) => {
    setNewExam((current) => ({
      ...current,
      attachments: (current.attachments ?? []).filter((attachment) => attachment.url !== url),
    }));
  };

  const handleExamAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const existingCount = attachments?.length ?? 0;
    const files = selectedFiles.slice(0, Math.max(0, 8 - existingCount));
    if (files.length === 0) {
      onUploadError('Limite atteinte', 'Vous pouvez joindre au maximum 8 fichiers.');
      event.target.value = '';
      return;
    }

    setIsUploadingExamAttachment(true);
    setExamAttachmentUploadProgress(0);
    try {
      const uploadedAttachments: ExamAttachment[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const uploaded = await uploadFileToServer(file, {
          folder: 'formateur/evaluations',
          filename: file.name.replace(/\.[^.]+$/, ''),
          resourceType: getUploadResourceType(file),
          onProgress: (progress) => {
            const completed = (index / files.length) * 100;
            const current = progress / files.length;
            setExamAttachmentUploadProgress(Math.round(completed + current));
          },
        });
        uploadedAttachments.push({
          name: uploaded.originalName || file.name,
          url: uploaded.url,
          size: uploaded.size,
          mimeType: uploaded.mimeType,
          resourceType: uploaded.resourceType,
        });
      }
      addExamAttachments(uploadedAttachments);
      onUploadSuccess(
        'Fichier importé',
        files.length > 1 ? `${files.length} fichiers ont été ajoutés.` : 'Le fichier a été ajouté.',
      );
    } catch (err: unknown) {
      console.error(err);
      onUploadError('Erreur d upload', err instanceof Error ? err.message : 'Impossible d importer le fichier.');
    } finally {
      setIsUploadingExamAttachment(false);
      setExamAttachmentUploadProgress(0);
      event.target.value = '';
    }
  };

  return {
    examAttachmentInputRef,
    examAttachmentUploadProgress,
    handleExamAttachmentUpload,
    isUploadingExamAttachment,
    removeExamAttachment,
    setExamAttachmentUploadProgress,
    setIsUploadingExamAttachment,
  };
}
