import { useState, type DragEvent } from 'react';
import { Button, cx } from '@/components/ui';
import type { CourseStudio } from '../useCourseStudio';
import { CURRICULUM_ITEM_TYPES, curriculumItemMeta, type StudioLesson, type StudioLessonType } from '../studioModel';
import type { CurriculumSectionView } from './curriculumOrder';
import LessonEditor from './LessonEditor';

export type DragItem = { kind: 'lesson' | 'section'; id: string } | null;

export interface CurriculumDnd {
  dragging: DragItem;
  setDragging: (item: DragItem) => void;
  dropLesson: (sectionId: string, index: number) => void;
  dropSection: (index: number) => void;
  stepLesson: (lessonId: string, direction: -1 | 1) => void;
  stepSection: (sectionId: string, direction: -1 | 1) => void;
}

interface SectionProps {
  studio: CourseStudio;
  view: CurriculumSectionView;
  sectionNumber: number;
  sectionCount: number;
  firstLessonNumber: number;
  dnd: CurriculumDnd;
}

function IconButton({ icon, label, onClick, disabled, danger }: { icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex h-8 w-8 items-center justify-center rounded-full text-c2p-muted transition disabled:invisible',
        danger ? 'hover:bg-c2p-danger-soft hover:text-c2p-danger' : 'hover:bg-c2p-surface-muted hover:text-c2p-text',
      )}
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );
}

function InlineTitleForm({ initial, placeholder, submitLabel, onSubmit, onCancel }: {
  initial: string; placeholder: string; submitLabel: string; onSubmit: (value: string) => unknown; onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!value.trim()) return;
        setBusy(true);
        await onSubmit(value.trim());
        setBusy(false);
      }}
    >
      <input autoFocus maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder}
        className="c2p-input h-10 flex-1 px-3 text-sm" onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button type="submit" size="sm" loading={busy} disabled={!value.trim()}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function LessonRow({ studio, lesson, number, dnd, index, sectionId, isFirst, isLast }: {
  studio: CourseStudio; lesson: StudioLesson; number: number; dnd: CurriculumDnd; index: number; sectionId: string; isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const meta = curriculumItemMeta(lesson.type);
  const assets = (studio.program?.assets ?? []).filter((asset) => String(asset.lesson_id) === String(lesson.id));
  const hasVideo = assets.some((asset) => asset.asset_type === 'video');
  const missingContent = lesson.type === 'video' ? !hasVideo : lesson.type === 'article' ? !lesson.content?.trim() : false;
  const dropHere = (event: DragEvent) => {
    if (dnd.dragging?.kind !== 'lesson') return;
    event.preventDefault();
    event.stopPropagation();
    dnd.dropLesson(sectionId, index);
  };

  return (
    <li
      className={cx('overflow-hidden rounded-xl border bg-c2p-surface', dnd.dragging?.id === String(lesson.id) ? 'border-c2p-primary opacity-50' : 'border-c2p-border')}
      onDragOver={(event) => { if (dnd.dragging?.kind === 'lesson') event.preventDefault(); }}
      onDrop={dropHere}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 sm:flex-nowrap sm:px-4">
        <span
          draggable
          onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; dnd.setDragging({ kind: 'lesson', id: String(lesson.id) }); }}
          onDragEnd={() => dnd.setDragging(null)}
          className="hidden cursor-grab text-c2p-soft sm:block"
          title="Glisser pour déplacer"
        >
          <i className="ri-draggable" aria-hidden="true" />
        </span>
        <i className={cx(meta.icon, 'text-lg text-c2p-muted')} aria-hidden="true" />
        {renaming ? (
          <div className="flex-1">
            <InlineTitleForm initial={lesson.title} placeholder="Titre de la leçon" submitLabel="Enregistrer"
              onCancel={() => setRenaming(false)}
              onSubmit={async (title) => { await studio.updateLesson(lesson, { title }); setRenaming(false); }} />
          </div>
        ) : (
          <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 basis-[calc(100%-3rem)] text-left sm:basis-auto">
            <span className="block text-sm font-semibold text-c2p-text sm:truncate">
              <span className="text-c2p-muted">Leçon {number} :</span> {lesson.title}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-c2p-muted">
              <span>{meta.label}</span>
              {lesson.duration ? <span>· {lesson.duration}</span> : null}
              {lesson.is_preview ? <span className="rounded-full bg-c2p-success-soft px-2 font-semibold text-c2p-success">Aperçu gratuit</span> : null}
              {missingContent ? <span className="rounded-full bg-c2p-warning-soft px-2 font-semibold text-c2p-warning">Contenu à ajouter</span> : null}
            </span>
          </button>
        )}
        {!renaming ? (
          <div className="ml-auto flex shrink-0 items-center">
            <IconButton icon="ri-arrow-up-s-line" label="Monter" disabled={isFirst} onClick={() => dnd.stepLesson(String(lesson.id), -1)} />
            <IconButton icon="ri-arrow-down-s-line" label="Descendre" disabled={isLast} onClick={() => dnd.stepLesson(String(lesson.id), 1)} />
            <IconButton icon="ri-pencil-line" label="Renommer" onClick={() => setRenaming(true)} />
            <IconButton icon="ri-delete-bin-line" label="Supprimer la leçon" danger onClick={() => {
              if (window.confirm(`Supprimer la leçon « ${lesson.title} » et ses ressources ?`)) void studio.removeLesson(lesson.id);
            }} />
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? 'Replier' : 'Modifier le contenu'}
              onClick={() => setOpen((value) => !value)}
              className={cx(
                'ml-1 inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold transition',
                open ? 'border-c2p-primary bg-c2p-primary text-white' : 'border-c2p-border text-c2p-text hover:border-c2p-primary',
              )}
            >
              Contenu <i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      {open ? <LessonEditor studio={studio} lesson={lesson} assets={assets} /> : null}
    </li>
  );
}

function AddItem({ studio, sectionId }: { studio: CourseStudio; sectionId: string }) {
  const [type, setType] = useState<StudioLessonType | null>(null);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon="ri-add-line" onClick={() => setOpen(true)}>Élément du programme</Button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-c2p-border-strong bg-c2p-surface p-4">
      {type ? (
        <InlineTitleForm
          initial=""
          placeholder={`Titre de la leçon (${curriculumItemMeta(type).label.toLowerCase()})`}
          submitLabel="Ajouter la leçon"
          onCancel={() => setType(null)}
          onSubmit={async (title) => {
            await studio.addLesson(sectionId, type, title);
            setType(null);
            setOpen(false);
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-c2p-text">Quel type de leçon ?</p>
            <IconButton icon="ri-close-line" label="Fermer" onClick={() => setOpen(false)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CURRICULUM_ITEM_TYPES.map((item) => (
              <button key={item.id} type="button" onClick={() => setType(item.id)}
                className="flex items-start gap-3 rounded-xl border border-c2p-border p-3 text-left transition hover:border-c2p-primary">
                <i className={cx(item.icon, 'text-xl text-c2p-primary')} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold text-c2p-text">{item.label}</span>
                  <span className="block text-xs text-c2p-muted">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CurriculumSection({ studio, view, sectionNumber, sectionCount, firstLessonNumber, dnd }: SectionProps) {
  const { section, lessons } = view;
  const sectionId = String(section.id);
  const [renaming, setRenaming] = useState(false);

  return (
    <section
      className={cx('rounded-2xl border bg-c2p-surface-muted p-3 sm:p-4', dnd.dragging?.id === sectionId ? 'border-c2p-primary opacity-50' : 'border-c2p-border')}
      onDragOver={(event) => { if (dnd.dragging) event.preventDefault(); }}
      onDrop={(event) => {
        event.preventDefault();
        if (dnd.dragging?.kind === 'section') dnd.dropSection(sectionNumber - 1);
        if (dnd.dragging?.kind === 'lesson') dnd.dropLesson(sectionId, lessons.length);
      }}
    >
      <header className="mb-3 flex items-center gap-2">
        <span draggable onDragStart={() => dnd.setDragging({ kind: 'section', id: sectionId })} onDragEnd={() => dnd.setDragging(null)}
          className="hidden cursor-grab text-c2p-soft sm:block" title="Glisser pour déplacer la section">
          <i className="ri-draggable" aria-hidden="true" />
        </span>
        {renaming ? (
          <div className="flex-1">
            <InlineTitleForm initial={section.title} placeholder="Titre de la section" submitLabel="Enregistrer" onCancel={() => setRenaming(false)}
              onSubmit={async (title) => { await studio.updateSection(section.id, { title, description: section.description ?? '' }); setRenaming(false); }} />
          </div>
        ) : (
          <>
            <h2 className="min-w-0 flex-1 text-base font-bold text-c2p-text sm:truncate">
              <span className="text-c2p-muted">Section {sectionNumber} :</span> {section.title}
            </h2>
            <IconButton icon="ri-arrow-up-s-line" label="Monter la section" disabled={sectionNumber === 1} onClick={() => dnd.stepSection(sectionId, -1)} />
            <IconButton icon="ri-arrow-down-s-line" label="Descendre la section" disabled={sectionNumber === sectionCount} onClick={() => dnd.stepSection(sectionId, 1)} />
            <IconButton icon="ri-pencil-line" label="Renommer la section" onClick={() => setRenaming(true)} />
            <IconButton icon="ri-delete-bin-line" label="Supprimer la section" danger onClick={() => {
              const extra = lessons.length ? ` et ses ${lessons.length} leçon(s)` : '';
              if (window.confirm(`Supprimer la section « ${section.title} »${extra} ?`)) void studio.removeSection(section.id);
            }} />
          </>
        )}
      </header>
      <ul className="space-y-2">
        {lessons.map((lesson, index) => (
          <LessonRow key={String(lesson.id)} studio={studio} lesson={lesson} number={firstLessonNumber + index} dnd={dnd} index={index}
            sectionId={sectionId} isFirst={sectionNumber === 1 && index === 0} isLast={sectionNumber === sectionCount && index === lessons.length - 1} />
        ))}
      </ul>
      {!lessons.length ? <p className="mb-3 rounded-xl border border-dashed border-c2p-border px-4 py-5 text-center text-sm text-c2p-muted">Cette section est vide. Ajoutez une leçon ou glissez-en une ici.</p> : null}
      <div className="mt-3"><AddItem studio={studio} sectionId={sectionId} /></div>
    </section>
  );
}
