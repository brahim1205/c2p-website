import type { MutableRefObject } from 'react';
import {
  deleteFormateurVirtualClass,
  updateFormateurVirtualClassStatus,
} from '@/lib/formateurDashboardApi';
import type { VirtualClass } from './virtualClassModel';

interface VirtualClassLifecycleActionsParams {
  subscriptionGate: {
    allowed: boolean;
    title: string;
    message: string;
  };
  userId?: string;
  isMountedRef: MutableRefObject<boolean>;
  refreshClasses: () => Promise<void>;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
}

export function useVirtualClassLifecycleActions({
  subscriptionGate,
  userId,
  isMountedRef,
  refreshClasses,
  success,
  error,
}: VirtualClassLifecycleActionsParams) {
  const handleJoin = (cls: VirtualClass) => {
    if (cls.status === 'ended') {
      error('Classe terminée', "Cette session est déjà terminée. Consultez l'enregistrement.");
      return;
    }
    if (cls.room_link) {
      window.open(cls.room_link, '_blank', 'noopener,noreferrer');
    }
    success('Ouverture...', `Connexion à "${cls.title}" en cours...`);
  };

  const handleCopyRoomLink = async (cls: VirtualClass) => {
    if (!cls.room_link) {
      error('Lien indisponible', 'Aucune salle n est encore associée à cette session.');
      return;
    }
    try {
      await navigator.clipboard.writeText(cls.room_link);
      success('Lien copié', 'Le lien de la salle a été copié dans le presse-papiers.');
    } catch (err) {
      console.error(err);
      error('Copie impossible', 'Impossible de copier le lien de la salle.');
    }
  };

  const handleStartLive = async (cls: VirtualClass) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    try {
      if (!userId) throw new Error('Classe introuvable.');
      await updateFormateurVirtualClassStatus(userId, cls.id, 'live');
      if (!isMountedRef.current) return;
      success('En direct !', `La classe "${cls.title}" est maintenant en direct.`);
      void refreshClasses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de démarrer le direct.');
      console.error(err);
    }
  };

  const handleEndClass = async (cls: VirtualClass) => {
    if (!subscriptionGate.allowed) {
      error(subscriptionGate.title, subscriptionGate.message);
      return;
    }
    try {
      if (!userId) throw new Error('Classe introuvable.');
      await updateFormateurVirtualClassStatus(userId, cls.id, 'ended');
      if (!isMountedRef.current) return;
      success('Terminée', cls.recording_enabled
        ? `La classe "${cls.title}" est terminée. Le replay passe en préparation.`
        : `La classe "${cls.title}" est maintenant terminée.`);
      void refreshClasses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de terminer la classe.');
      console.error(err);
    }
  };

  const handleDeleteClass = async (cls: VirtualClass) => {
    if (!userId) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer "${cls.title}" ?`)) return;
    try {
      await deleteFormateurVirtualClass(userId, cls.id);
      if (!isMountedRef.current) return;
      success('Supprimée', `"${cls.title}" a été supprimée.`);
      void refreshClasses();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      error('Erreur', 'Impossible de supprimer la classe.');
      console.error(err);
    }
  };

  return {
    handleJoin,
    handleCopyRoomLink,
    handleStartLive,
    handleEndClass,
    handleDeleteClass,
  };
}
