import { useState } from 'react';
import {
  deleteFormateurLessonAsset,
  saveFormateurLessonAsset,
} from '@/lib/formateurDashboardApi';
import {
  emptyAssetForm,
  validateAssetForm,
  type AssetFormErrors,
  type AssetFormState,
  type CourseLesson,
  type LessonAsset,
} from './programmeModel';
import { useCourseProgramAssetUpload } from './useCourseProgramAssetUpload';

interface CourseProgramAssetEditorGate {
  allowed: boolean;
  title: string;
  message: string;
}

interface UseCourseProgramAssetEditorParams {
  availableLessonIds: Set<string>;
  courseId?: string;
  lessons: CourseLesson[];
  subscriptionGate: CourseProgramAssetEditorGate;
  userId?: string;
  onRefresh: () => Promise<void>;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

export function useCourseProgramAssetEditor(params: UseCourseProgramAssetEditorParams) {
  const {
    availableLessonIds,
    courseId,
    lessons,
    subscriptionGate,
    userId,
    onRefresh,
    success,
    error,
  } = params;

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<LessonAsset | null>(null);
  const [activeAssetLesson, setActiveAssetLesson] = useState<CourseLesson | null>(null);
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm());
  const [assetErrors, setAssetErrors] = useState<AssetFormErrors>({});
  const [assetFormMessage, setAssetFormMessage] = useState<string | null>(null);
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  const {
    assetFileInputRef,
    assetUploadProgress,
    handleAssetFileChange,
    isAssetUploading,
  } = useCourseProgramAssetUpload({
    assetForm,
    courseId,
    setAssetErrors,
    setAssetForm,
    setAssetFormMessage,
    onUploadError: error,
    onUploadSuccess: success,
  });

  const updateAssetForm = <K extends keyof AssetFormState>(field: K, value: AssetFormState[K]) => {
    setAssetForm((current) => ({ ...current, [field]: value }));
    setAssetErrors((current) => ({ ...current, [field]: undefined }));
    setAssetFormMessage(null);
  };

  const openAssetModal = (lesson: CourseLesson) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    setActiveAssetLesson(lesson);
    setEditingAsset(null);
    setAssetForm(emptyAssetForm(String(lesson.id)));
    setAssetErrors({});
    setAssetFormMessage(null);
    setShowAssetModal(true);
  };

  const openEditAsset = (asset: LessonAsset) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    const lesson = lessons.find((candidate) => String(candidate.id) === String(asset.lesson_id));
    if (!lesson) return;
    setActiveAssetLesson(lesson);
    setEditingAsset(asset);
    setAssetForm({
      lesson_id: String(asset.lesson_id),
      title: asset.title,
      asset_type: asset.asset_type,
      url: asset.url,
      thumbnail_url: asset.thumbnail_url ?? '',
      mime_type: asset.mime_type ?? '',
      size_bytes: asset.size_bytes ? String(asset.size_bytes) : '',
      status: asset.status,
    });
    setAssetErrors({});
    setAssetFormMessage(null);
    setShowAssetModal(true);
  };

  const startNewAsset = () => {
    if (!activeAssetLesson) return;
    setEditingAsset(null);
    setAssetForm(emptyAssetForm(String(activeAssetLesson.id)));
  };

  const closeAssetModal = () => {
    setShowAssetModal(false);
    setEditingAsset(null);
    setActiveAssetLesson(null);
    setAssetForm(emptyAssetForm());
  };

  const resetAssetForm = () => {
    if (!activeAssetLesson) return;
    setEditingAsset(null);
    setAssetForm(emptyAssetForm(String(activeAssetLesson.id)));
    setAssetErrors({});
    setAssetFormMessage(null);
  };

  const submitAsset = async () => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    if (isAssetUploading) {
      setAssetFormMessage('Patientez jusqu’à la fin de l’upload avant d’enregistrer le contenu.');
      return;
    }
    const nextErrors = validateAssetForm(assetForm, availableLessonIds);
    setAssetErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setAssetFormMessage('Corrigez les champs signalés avant d’enregistrer le contenu.');
      return;
    }

    setIsSavingAsset(true);
    try {
      if (!courseId || !userId) throw new Error('Formation introuvable ou inaccessible.');
      await saveFormateurLessonAsset(userId, courseId, {
        id: editingAsset?.id,
        lesson_id: assetForm.lesson_id,
        title: assetForm.title,
        asset_type: assetForm.asset_type,
        url: assetForm.url,
        thumbnail_url: assetForm.thumbnail_url,
        mime_type: assetForm.mime_type,
        size_bytes: assetForm.size_bytes,
        status: assetForm.status,
        position: editingAsset?.position,
      });
      success(
        editingAsset ? 'Contenu mis à jour' : 'Contenu ajouté',
        editingAsset ? `Le contenu "${assetForm.title}" a été mis à jour.` : `Le contenu "${assetForm.title}" a été attaché à la leçon.`,
      );
      setEditingAsset(null);
      setAssetForm(emptyAssetForm(activeAssetLesson ? String(activeAssetLesson.id) : ''));
      setAssetErrors({});
      setAssetFormMessage(null);
      await onRefresh();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible d enregistrer le contenu.';
      setAssetFormMessage(message);
      error('Erreur', message);
      console.error(err);
    } finally {
      setIsSavingAsset(false);
    }
  };

  const deleteAsset = async (asset: LessonAsset) => {
    if (!courseId || !userId) return;
    if (!window.confirm(`Supprimer le contenu "${asset.title}" ?`)) return;
    try {
      await deleteFormateurLessonAsset(userId, courseId, asset.id);
      success('Contenu supprimé', `"${asset.title}" a été retiré de la leçon.`);
      if (editingAsset && String(editingAsset.id) === String(asset.id)) {
        setEditingAsset(null);
        setAssetForm(emptyAssetForm(activeAssetLesson ? String(activeAssetLesson.id) : ''));
      }
      await onRefresh();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Impossible de supprimer le contenu.';
      error('Erreur', message);
      console.error(err);
    }
  };

  return {
    activeAssetLesson,
    assetErrors,
    assetFileInputRef,
    assetForm,
    assetFormMessage,
    assetUploadProgress,
    closeAssetModal,
    deleteAsset,
    editingAsset,
    handleAssetFileChange,
    isAssetUploading,
    isSavingAsset,
    openAssetModal,
    openEditAsset,
    resetAssetForm,
    showAssetModal,
    startNewAsset,
    submitAsset,
    updateAssetForm,
  };
}
