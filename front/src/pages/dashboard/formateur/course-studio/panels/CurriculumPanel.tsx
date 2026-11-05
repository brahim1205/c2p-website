import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { plural } from '@/lib/formatters';
import type { CourseStudio } from '../useCourseStudio';
import type { StudioProgram } from '../studioModel';
import { buildCurriculum, moveLesson, moveSection, sameOrder, stepLesson, toOrder } from './curriculumOrder';
import CurriculumSection, { type CurriculumDnd, type DragItem } from './CurriculumSection';
import { PanelHeader } from './PanelHeader';

function NewSectionForm({ studio, onDone }: { studio: CourseStudio; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 rounded-2xl border border-dashed border-c2p-border-strong bg-c2p-surface p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        await studio.addSection(title.trim());
        setBusy(false);
        onDone();
      }}
    >
      <label className="block text-sm font-bold text-c2p-text" htmlFor="studio-new-section">Nouvelle section</label>
      <input id="studio-new-section" autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)}
        placeholder="Exemple : Les bases du tableur" className="c2p-input h-11 px-4 text-sm" />
      <p className="text-xs text-c2p-muted">Une section regroupe des leçons autour d'un même objectif.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>Annuler</Button>
        <Button type="submit" size="sm" loading={busy} disabled={!title.trim()}>Ajouter la section</Button>
      </div>
    </form>
  );
}

export default function CurriculumPanel({ studio, program }: { studio: CourseStudio; program: StudioProgram }) {
  const curriculum = useMemo(() => buildCurriculum(program), [program]);
  const [dragging, setDragging] = useState<DragItem>(null);
  const [adding, setAdding] = useState(false);

  const commit = (next: ReturnType<typeof toOrder>) => {
    setDragging(null);
    if (!sameOrder(next, toOrder(curriculum))) void studio.applyOrder(next);
  };
  const dnd: CurriculumDnd = {
    dragging,
    setDragging,
    dropLesson: (sectionId, index) => { if (dragging?.kind === 'lesson') commit(moveLesson(toOrder(curriculum), dragging.id, sectionId, index)); },
    dropSection: (index) => { if (dragging?.kind === 'section') commit(moveSection(toOrder(curriculum), dragging.id, index)); },
    stepLesson: (lessonId, direction) => commit(stepLesson(toOrder(curriculum), lessonId, direction)),
    stepSection: (sectionId, direction) => {
      const order = toOrder(curriculum);
      commit(moveSection(order, sectionId, order.findIndex((entry) => entry.id === sectionId) + direction));
    },
  };

  const lessonCount = program.lessons.length;
  let lessonNumber = 1;

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Programme"
        description="Organisez votre cours en sections et en leçons. Glissez-déposez pour réorganiser (ou utilisez les flèches). Chaque modification est enregistrée automatiquement."
        action={(
          <p className="text-sm text-c2p-muted">
            {plural(curriculum.length, 'section(s)')} · {plural(lessonCount, 'leçon(s)')}
            {studio.computedDuration ? ` · ${studio.computedDuration}` : ''}
          </p>
        )}
      />

      {!curriculum.length && !adding ? (
        <div className="rounded-2xl border border-dashed border-c2p-border-strong bg-c2p-surface px-6 py-10 text-center">
          <i className="ri-list-check-3 text-4xl text-c2p-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-c2p-text">Commencez par créer une section</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-c2p-muted">
            Par exemple « Introduction », puis ajoutez-y vos premières leçons : vidéos, articles, documents ou exercices.
          </p>
          <Button className="mt-5" icon="ri-add-line" onClick={() => setAdding(true)}>Ajouter une section</Button>
        </div>
      ) : null}

      {curriculum.map((view, index) => {
        const first = lessonNumber;
        lessonNumber += view.lessons.length;
        return (
          <CurriculumSection key={String(view.section.id)} studio={studio} view={view} sectionNumber={index + 1}
            sectionCount={curriculum.length} firstLessonNumber={first} dnd={dnd} />
        );
      })}

      {adding ? <NewSectionForm studio={studio} onDone={() => setAdding(false)} /> : curriculum.length ? (
        <Button variant="secondary" icon="ri-add-line" onClick={() => setAdding(true)}>Section</Button>
      ) : null}
    </div>
  );
}
