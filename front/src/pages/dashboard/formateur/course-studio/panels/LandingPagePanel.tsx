import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import type { CourseStudio } from '../useCourseStudio';
import { AutosaveText } from '../StudioFields';
import {
  STUDIO_CATEGORIES,
  STUDIO_DELIVERY_MODES,
  STUDIO_LANGUAGES,
  STUDIO_LEVELS,
  SUBTITLE_MAX,
  TITLE_MAX,
  countWords,
  readErrorMessage,
  type StudioCourse,
} from '../studioModel';
import { IMAGE_ACCEPT, VIDEO_ACCEPT, uploadCourseFile } from '../studioUploads';
import { PanelHeader } from './PanelHeader';

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-c2p-text">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="c2p-input h-11 px-3 text-sm">{children}</select>
    </label>
  );
}

function MediaUpload({ label, hint, accept, preview, onFile }: {
  label: string; hint: string; accept: string; preview: ReactNode; onFile: (file: File, onProgress: (value: number) => void) => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-c2p-text">{label}</p>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center">
        <div className="aspect-video overflow-hidden rounded-xl border border-c2p-border bg-c2p-surface-muted">{preview}</div>
        <div className="space-y-3">
          <p className="text-sm text-c2p-muted">{hint}</p>
          <input ref={input} type="file" accept={accept} className="hidden" onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setProgress(0);
            setFailure(null);
            try {
              await onFile(file, setProgress);
            } catch (reason) {
              setFailure(readErrorMessage(reason, 'L’envoi du fichier a échoué. Réessayez.'));
            } finally {
              setProgress(null);
            }
          }} />
          {progress !== null ? (
            <div className="h-2 overflow-hidden rounded-full bg-c2p-surface-muted" role="progressbar" aria-valuenow={progress}>
              <div className="h-full bg-c2p-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : (
            <Button variant="secondary" size="sm" icon="ri-upload-2-line" onClick={() => input.current?.click()}>Choisir un fichier</Button>
          )}
          {failure ? <p className="text-xs font-medium text-c2p-danger" role="alert">{failure}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function LandingPagePanel({ studio, course }: { studio: CourseStudio; course: StudioCourse }) {
  const words = countWords(course.description);
  const save = (fields: Partial<StudioCourse> & Record<string, unknown>) => studio.patchCourse(fields);
  const upload = (kind: 'cover' | 'trailer') => async (file: File, onProgress: (value: number) => void) => {
    const uploaded = await uploadCourseFile(file, { courseId: course.id, kind }, onProgress);
    await save(kind === 'cover' ? { thumbnail: uploaded.url } : { trailer_url: uploaded.url });
  };

  return (
    <div className="space-y-8">
      <PanelHeader
        title="Page d'accueil du cours"
        description="C'est la vitrine de votre cours dans le catalogue C2P : soignez le titre, l'image et la description, ce sont eux qui donnent envie de s'inscrire."
      />

      <AutosaveText label="Titre du cours" required maxLength={TITLE_MAX} value={course.title} onSave={(title) => title && save({ title })}
        hint="Court, précis et avec les mots que vos apprenants chercheraient." />
      <AutosaveText label="Sous-titre du cours" maxLength={SUBTITLE_MAX} value={course.subtitle} onSave={(subtitle) => save({ subtitle })}
        placeholder="Exemple : Maîtrisez les tableaux, formules et graphiques pour gérer votre activité" />
      <AutosaveText label="Description du cours" required multiline rows={9} value={course.description} onSave={(description) => save({ description })}
        hint={<span className={words >= 100 ? 'text-c2p-success' : ''}>{words} mot(s) · nous conseillons au moins 100 mots : à qui s'adresse le cours, comment il est construit, ce qu'on y fait.</span>} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Langue" value={course.language || 'Français'} onChange={(language) => save({ language })}>
          {STUDIO_LANGUAGES.map((language) => <option key={language}>{language}</option>)}
        </Select>
        <Select label="Niveau" value={course.level} onChange={(level) => save({ level: level as StudioCourse['level'] })}>
          {STUDIO_LEVELS.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
        </Select>
        <Select label="Catégorie" value={course.category ?? ''} onChange={(category) => save({ category })}>
          {!STUDIO_CATEGORIES.some((category) => category.id === course.category) && course.category
            ? <option value={course.category}>{course.category}</option> : null}
          {STUDIO_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select label="Format" value={course.delivery_mode} onChange={(delivery_mode) => save({ delivery_mode: delivery_mode as StudioCourse['delivery_mode'] })}>
          {STUDIO_DELIVERY_MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
        </Select>
      </div>

      <div className="rounded-2xl border border-c2p-border bg-c2p-surface p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--c2p-primary)]" checked={studio.autoDuration}
            onChange={(event) => save(event.target.checked
              ? { duration_auto: true, duration: studio.computedDuration || course.duration || '' }
              : { duration_auto: false })} />
          <span>
            <span className="block text-sm font-bold text-c2p-text">Calculer la durée depuis le programme</span>
            <span className="block text-xs text-c2p-muted">
              {studio.computedDuration ? `Durée actuelle des leçons : ${studio.computedDuration}.` : 'Ajoutez des vidéos ou des durées aux leçons pour la calculer.'}
            </span>
          </span>
        </label>
        {!studio.autoDuration ? (
          <div className="mt-4">
            <AutosaveText label="Durée affichée" required value={course.duration} onSave={(duration) => save({ duration })} placeholder="Exemple : 6 semaines, 12 h" />
          </div>
        ) : null}
      </div>

      <MediaUpload
        label="Image du cours"
        accept={IMAGE_ACCEPT}
        hint="Format 16:9, au moins 750 × 422 pixels, JPG, PNG ou WebP. Évitez le texte sur l'image : il devient illisible en petit."
        preview={course.thumbnail
          ? <img src={course.thumbnail} alt="Image du cours" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-c2p-soft"><i className="ri-image-line text-4xl" aria-hidden="true" /></div>}
        onFile={upload('cover')}
      />

      <MediaUpload
        label="Vidéo de présentation"
        accept={VIDEO_ACCEPT}
        hint="Une courte vidéo (1 à 2 minutes) où vous présentez le cours. Les apprenants qui la regardent s'inscrivent bien plus souvent."
        preview={course.trailer_url
          ? <video src={course.trailer_url} controls preload="metadata" className="h-full w-full bg-black object-contain" />
          : <div className="flex h-full items-center justify-center text-c2p-soft"><i className="ri-movie-2-line text-4xl" aria-hidden="true" /></div>}
        onFile={upload('trailer')}
      />
      {course.trailer_url ? (
        <button type="button" className="text-sm font-semibold text-c2p-danger hover:underline" onClick={() => void save({ trailer_url: null })}>
          Retirer la vidéo de présentation
        </button>
      ) : null}
    </div>
  );
}
