import { useState, useEffect } from 'react';
import { Lesson } from '../types';

interface Props {
  isOpen: boolean;
  lesson: Lesson | null;
  initialNote: string;
  onClose: () => void;
  onSave: (lessonId: number, note: string) => void;
}

export default function NotesModal({ isOpen, lesson, initialNote, onClose, onSave }: Props) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen || !lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-sticky-note-line text-amber-600 text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mes notes</h3>
              <p className="text-xs text-gray-500 truncate max-w-[280px]">{lesson.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Écrivez vos annotations personnelles sur cette leçon..."
          maxLength={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none bg-white"
          rows={6}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{note.length}/1000</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={() => { onSave(lesson.id, note); onClose(); }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}