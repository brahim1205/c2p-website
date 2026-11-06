import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { changeFormateurExamStatus } from '@/lib/formateurDashboardApi';
import type { CourseStudio } from '../useCourseStudio';
import { AutosaveText } from '../StudioFields';
import type { StudioAsset, StudioLesson } from '../studioModel';
import { RESOURCE_ACCEPT, VIDEO_ACCEPT, formatFileSize } from '../studioUploads';

interface LessonEditorProps {
  studio: CourseStudio;
  lesson: StudioLesson;
  assets: StudioAsset[];
}

function useUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const start = async (task: (onProgress: (value: number) => void) => Promise<unknown>) => {
    setProgress(0);
    try {
      await task(setProgress);
    } finally {
      setProgress(null);
    }
  };
  return { progress, start };
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-c2p-border bg-c2p-surface p-4" role="status">
      <div className="mb-2 flex justify-between text-sm font-semibold text-c2p-text">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-c2p-surface-muted">
        <div className="h-full rounded-full bg-c2p-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function VideoSlot({ studio, lesson, video }: { studio: CourseStudio; lesson: StudioLesson; video: StudioAsset | undefined }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const pick = (file: File | undefined) => {
    if (file) void upload.start((onProgress) => studio.uploadLessonVideo(lesson, file, onProgress));
  };
  return (
    <div>
      <input ref={input} type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
      {upload.progress !== null ? (
        <ProgressBar value={upload.progress} label="Envoi de la vidéo…" />
      ) : video ? (
        <div className="flex flex-col gap-3 rounded-xl border border-c2p-border bg-c2p-surface p-4 sm:flex-row sm:items-center">
          <i className="ri-film-line text-2xl text-c2p-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-c2p-text">{video.title}</p>
            <p className="text-xs text-c2p-muted">{[formatFileSize(video.size_bytes), lesson.duration].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex gap-2">
            <a href={video.url} target="_blank" rel="noreferrer" className="c2p-btn-secondary h-9 px-3.5 text-sm">Voir</a>
            <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>Remplacer</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); pick(event.dataTransfer.files?.[0]); }}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-c2p-border-strong bg-c2p-surface px-4 py-8 text-center transition hover:border-c2p-primary"
        >
          <i className="ri-upload-cloud-2-line text-3xl text-c2p-primary" aria-hidden="true" />
          <span className="text-sm font-bold text-c2p-text">Glissez votre vidéo ici ou cliquez pour la choisir</span>
          <span className="text-xs text-c2p-muted">MP4, MOV ou WebM · la durée est calculée automatiquement</span>
        </button>
      )}
    </div>
  );
}

function Resources({ studio, lesson, resources }: { studio: CourseStudio; lesson: StudioLesson; resources: StudioAsset[] }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState({ title: '', url: '' });
  const linkValid = link.title.trim() && /^https?:\/\/\S+$/.test(link.url.trim());
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-c2p-text">Ressources téléchargeables</p>
      {resources.length ? (
        <ul className="divide-y divide-c2p-border rounded-xl border border-c2p-border bg-c2p-surface">
          {resources.map((asset) => (
            <li key={String(asset.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <i className={asset.asset_type === 'link' ? 'ri-links-line text-c2p-muted' : 'ri-attachment-2 text-c2p-muted'} aria-hidden="true" />
              <a href={asset.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-c2p-text hover:underline">{asset.title}</a>
              <span className="text-xs text-c2p-soft">{formatFileSize(asset.size_bytes)}</span>
              <button type="button" aria-label={`Supprimer ${asset.title}`} onClick={() => void studio.removeAsset(asset.id)} className="text-c2p-muted hover:text-c2p-danger">
                <i className="ri-close-line" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {upload.progress !== null ? <ProgressBar value={upload.progress} label="Envoi du fichier…" /> : null}
      {linkOpen ? (
        <div className="grid gap-2 rounded-xl border border-c2p-border bg-c2p-surface p-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className="c2p-input h-10 px-3 text-sm" placeholder="Titre du lien" value={link.title} onChange={(event) => setLink({ ...link, title: event.target.value })} />
          <input className="c2p-input h-10 px-3 text-sm" placeholder="https://…" value={link.url} onChange={(event) => setLink({ ...link, url: event.target.value })} />
          <Button
            size="sm"
            disabled={!linkValid}
            onClick={async () => {
              await studio.addResourceLink(lesson, link.title.trim(), link.url.trim());
              setLink({ title: '', url: '' });
              setLinkOpen(false);
            }}
          >
            Ajouter
          </Button>
        </div>
      ) : null}
      <input ref={input} type="file" accept={RESOURCE_ACCEPT} className="hidden" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void upload.start((onProgress) => studio.addResourceFile(lesson, file, onProgress));
      }} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="ri-upload-2-line" onClick={() => input.current?.click()}>Fichier</Button>
        <Button variant="secondary" size="sm" icon="ri-links-line" onClick={() => setLinkOpen((open) => !open)}>Lien externe</Button>
      </div>
    </div>
  );
}

/** A quiz lesson opens a quiz exam: questions are written in Évaluations, then the quiz is opened. */
function QuizSlot({ lesson }: { lesson: StudioLesson }) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  if (!lesson.exam_id) {
    return <p className="rounded-xl bg-c2p-warning-soft px-4 py-3 text-sm text-c2p-text">Ce quiz n’est lié à aucune évaluation. Supprimez-le et recréez-le depuis « Élément du programme ».</p>;
  }
  const open = async () => {
    setBusy(true);
    try {
      await changeFormateurExamStatus(lesson.exam_id as string, 'ongoing');
      success('Quiz ouvert', 'Les inscrits peuvent le passer et sont notifiés.');
    } catch (reason) {
      error('Ouverture impossible', reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-xl border border-c2p-border bg-c2p-surface p-4">
      <p className="text-sm text-c2p-text">
        Ce quiz est une évaluation de votre formation : questions corrigées automatiquement, note de passage, tentatives et chronomètre.
        Il compte pour le certificat.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard/formateur/evaluations" className="c2p-btn-secondary h-9 px-3.5 text-sm"><i className="ri-list-check-3" aria-hidden="true" /> Écrire les questions</Link>
        <Button size="sm" loading={busy} onClick={() => void open()}>Ouvrir le quiz aux apprenants</Button>
      </div>
    </div>
  );
}

export default function LessonEditor({ studio, lesson, assets }: LessonEditorProps) {
  const video = assets.find((asset) => asset.asset_type === 'video');
  const resources = assets.filter((asset) => asset !== video);
  const save = (patch: Partial<StudioLesson>) => studio.updateLesson(lesson, patch);

  return (
    <div className="space-y-5 border-t border-c2p-border bg-c2p-surface-soft px-4 py-5 sm:px-6">
      {lesson.type === 'video' ? <VideoSlot studio={studio} lesson={lesson} video={video} /> : null}
      {lesson.type === 'quiz' ? <QuizSlot lesson={lesson} /> : null}
      {lesson.type === 'article' ? (
        <AutosaveText label="Contenu de l'article" multiline rows={10} value={lesson.content} onSave={(content) => save({ content })}
          placeholder="Rédigez votre leçon. Les retours à la ligne sont conservés." />
      ) : null}
      {lesson.type === 'practice' || lesson.type === 'assignment' ? (
        <AutosaveText label="Consignes de l'exercice" multiline value={lesson.exercise_instructions} onSave={(exercise_instructions) => save({ exercise_instructions })}
          placeholder="Ce que l'apprenant doit réaliser, et comment il saura qu'il a réussi." />
      ) : null}
      {lesson.type === 'coding' ? (
        <>
          <AutosaveText label="Énoncé" multiline value={lesson.exercise_instructions} onSave={(exercise_instructions) => save({ exercise_instructions })} />
          <AutosaveText label="Langage" value={lesson.code_language} onSave={(code_language) => save({ code_language })} placeholder="python, javascript, sql…" />
          <AutosaveText label="Code de départ" multiline rows={8} value={lesson.code_sample} onSave={(code_sample) => save({ code_sample })} />
        </>
      ) : null}
      {lesson.type === 'pdf' && !resources.length ? (
        <p className="rounded-xl bg-c2p-warning-soft px-4 py-3 text-sm text-c2p-text">Ajoutez le document de cette leçon ci-dessous (PDF, slides…).</p>
      ) : null}

      <AutosaveText label="Description de la leçon" multiline rows={3} value={lesson.description} onSave={(description) => save({ description })}
        placeholder="En une ou deux phrases : ce que l'apprenant va voir dans cette leçon." />

      {lesson.type !== 'video' ? (
        <AutosaveText label="Durée estimée" value={lesson.duration} onSave={(duration) => save({ duration })} placeholder="Exemple : 15 min"
          hint="Utilisée pour calculer la durée totale du cours." />
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-c2p-border bg-c2p-surface p-4">
        <input type="checkbox" checked={lesson.is_preview} onChange={(event) => void save({ is_preview: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--c2p-primary)]" />
        <span>
          <span className="block text-sm font-bold text-c2p-text">Aperçu gratuit</span>
          <span className="block text-xs text-c2p-muted">Visible par tous sur la page du cours, même sans inscription. Idéal pour la première leçon.</span>
        </span>
      </label>

      <Resources studio={studio} lesson={lesson} resources={resources} />
    </div>
  );
}
