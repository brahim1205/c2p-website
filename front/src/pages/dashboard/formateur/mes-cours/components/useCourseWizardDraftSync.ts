import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  fetchFormateurCourseWizardDraft,
  saveFormateurCourseWizardDraft,
} from '@/lib/formateurDashboardApi';
import type { WizardDraftState } from './courseWizardModel';
import { normalizeWizardDraft, readWizardDraft, writeWizardDraft } from './wizardStorage';

interface CourseWizardDraftSyncOptions {
  open: boolean;
  userId?: string | null;
  wizard: WizardDraftState;
  setWizard: Dispatch<SetStateAction<WizardDraftState>>;
  onDraftLoadStart: () => void;
}

export function useCourseWizardDraftSync({
  open,
  userId,
  wizard,
  setWizard,
  onDraftLoadStart,
}: CourseWizardDraftSyncOptions) {
  const [savingDraftAt, setSavingDraftAt] = useState<Date | null>(null);
  const draftHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;
    draftHydratedRef.current = false;
    onDraftLoadStart();

    void fetchFormateurCourseWizardDraft(userId)
      .then((remoteDraft) => {
        if (cancelled) return;
        setWizard(remoteDraft.draft ? normalizeWizardDraft(remoteDraft.draft) : readWizardDraft(userId));
        setSavingDraftAt(remoteDraft.savedAt ? new Date(remoteDraft.savedAt) : null);
      })
      .catch((reason: unknown) => {
        console.warn('Unable to load remote course wizard draft', reason);
        if (!cancelled) {
          setWizard(readWizardDraft(userId));
        }
      })
      .finally(() => {
        if (!cancelled) {
          draftHydratedRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onDraftLoadStart, open, setWizard, userId]);

  useEffect(() => {
    if (!open || !userId || !draftHydratedRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void saveFormateurCourseWizardDraft(userId, wizard)
        .then((remoteDraft) => {
          setSavingDraftAt(new Date(remoteDraft.savedAt));
        })
        .catch((reason: unknown) => {
          console.warn('Unable to save remote course wizard draft', reason);
          writeWizardDraft(userId, wizard);
          setSavingDraftAt(new Date());
        });
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [open, userId, wizard]);

  return {
    savingDraftAt,
  };
}
