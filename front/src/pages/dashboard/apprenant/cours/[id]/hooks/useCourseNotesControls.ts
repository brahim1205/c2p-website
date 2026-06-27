import { useState } from 'react';
import type { EntityId, Lesson } from '../types';

type CourseNotesControlsArgs = {
  saveLessonNote: (lessonId: EntityId, note: string | null) => void;
  success: (title: string, message?: string) => void;
};

export function useCourseNotesControls({
  saveLessonNote,
  success,
}: CourseNotesControlsArgs) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesTargetLesson, setNotesTargetLesson] = useState<Lesson | null>(null);

  const handleOpenNotes = (lesson: Lesson) => {
    setNotesTargetLesson(lesson);
    setNotesModalOpen(true);
  };

  const handleCloseNotes = () => {
    setNotesModalOpen(false);
    setNotesTargetLesson(null);
  };

  const handleSaveNote = (lessonId: EntityId, note: string) => {
    setNotes((prev) => {
      const next = { ...prev, [lessonId]: note };
      if (!note.trim()) {
        delete next[lessonId];
      }
      return next;
    });
    saveLessonNote(lessonId, note.trim() || null);
    success('Note enregistrée', 'Votre annotation a été sauvegardée.');
  };

  return {
    handleCloseNotes,
    handleOpenNotes,
    handleSaveNote,
    notes,
    notesModalOpen,
    notesTargetLesson,
    setNotes,
  };
}
