import { useEffect, useRef, useState } from 'react';
import { formatCount } from '@/lib/formatters';
import type { CourseStudio } from '../useCourseStudio';
import { ChoiceCard } from '../StudioFields';
import type { StudioCourse } from '../studioModel';
import { IMAGE_ACCEPT, uploadCourseFile } from '../studioUploads';
import { PanelHeader } from './PanelHeader';

function NumberField({ label, suffix, value, min, max, onSave, hint }: {
  label: string; suffix: string; value: number; min: number; max: number; onSave: (value: number) => unknown; hint?: string;
}) {
  const [draft, setDraft] = useState(value ? String(value) : '');
  useEffect(() => setDraft(value ? String(value) : ''), [value]);
  const parsed = Math.round(Number(draft.replace(/\s/g, '').replace(',', '.')) || 0);
  const invalid = draft !== '' && (parsed < min || parsed > max);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-c2p-text">{label}</span>
      <span className="relative block">
        <input
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => { if (!invalid && parsed !== value) void onSave(parsed); }}
          aria-invalid={invalid || undefined}
          className="c2p-input h-11 pl-4 pr-16 text-sm tabular-nums"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-c2p-muted">{suffix}</span>
      </span>
      {invalid ? <span className="mt-1.5 block text-xs font-medium text-c2p-danger">Valeur attendue entre {formatCount(min)} et {formatCount(max)}.</span>
        : hint ? <span className="mt-1.5 block text-xs text-c2p-muted">{hint}</span> : null}
    </label>
  );
}

export default function PricingPanel({ studio, course }: { studio: CourseStudio; course: StudioCourse }) {
  const price = Number(course.price ?? 0);
  const promotion = Number(course.promotion_percentage ?? 0);
  const finalPrice = Math.max(0, Math.round(price * (1 - promotion / 100)));
  const paidChosen = !course.is_free;

  return (
    <div className="space-y-8">
      <PanelHeader title="Tarification et certificat" description="Choisissez si votre cours est gratuit ou payant, et s’il délivre un certificat. Vous pourrez modifier ces réglages plus tard." />

      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard selected={course.is_free} icon="ri-gift-line" title="Gratuit"
          description="Idéal pour vous faire connaître et attirer vos premiers apprenants."
          onSelect={() => void studio.patchCourse({ is_free: true, access_type: 'free', price: 0 })} />
        <ChoiceCard selected={paidChosen} icon="ri-money-cny-circle-line" title="Payant"
          description="Les apprenants paient en ligne au moment de l’inscription. Suivez vos ventes dans Revenus."
          onSelect={() => void studio.patchCourse({ is_free: false, access_type: 'paid' })} />
      </div>

      {paidChosen ? (
        <div className="space-y-5 rounded-2xl border border-c2p-border bg-c2p-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Prix" suffix="FCFA" value={price} min={500} max={5_000_000}
              hint="Conseil : entre 5 000 et 50 000 FCFA pour un premier cours."
              onSave={(value) => studio.patchCourse({ price: value, is_free: false, access_type: 'paid' })} />
            <NumberField label="Promotion" suffix="%" value={promotion} min={0} max={90}
              hint="Réduction appliquée au prix affiché (0 = aucune)."
              onSave={(value) => studio.patchCourse({ promotion_percentage: value })} />
          </div>
          <p className="rounded-xl bg-c2p-surface-muted px-4 py-3 text-sm text-c2p-text">
            {price > 0 ? (
              <>Prix affiché aux apprenants : <strong className="tabular-nums">{formatCount(finalPrice)} FCFA</strong>
                {promotion > 0 ? <span className="ml-2 text-c2p-muted line-through tabular-nums">{formatCount(price)} FCFA</span> : null}</>
            ) : 'Indiquez un prix pour terminer cette étape.'}
          </p>
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-c2p-border bg-c2p-surface p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--c2p-primary)]" checked={course.certificate_enabled !== false}
            onChange={(event) => void studio.patchCourse({ certificate_enabled: event.target.checked })} />
          <span>
            <span className="block text-base font-bold text-c2p-text">Formation certifiante</span>
            <span className="block text-sm text-c2p-muted">
              Chaque inscrit (achat ou inscription par vous) reçoit un certificat « en cours ». Il est délivré automatiquement, à son nom, quand il a suivi toutes les leçons et réussi toutes les évaluations — avec votre nom comme responsable pédagogique et le cachet C2P.
            </span>
          </span>
        </label>
        {course.certificate_enabled !== false ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Seuil de réussite des évaluations" suffix="%" value={course.certificate_pass_percentage ?? 50} min={1} max={100}
                hint="Note minimale à chaque évaluation (sauf si l’évaluation fixe sa propre note de passage)."
                onSave={(value) => studio.patchCourse({ certificate_pass_percentage: value })} />
              {course.delivery_mode !== 'online' ? (
                <NumberField label="Présence minimale aux séances" suffix="%" value={course.certificate_min_attendance ?? 0} min={0} max={100}
                  hint="Part des séances tenues (en direct ou en présentiel) à suivre. 0 = non exigé."
                  onSave={(value) => studio.patchCourse({ certificate_min_attendance: value })} />
              ) : null}
            </div>
            <SignatureField course={course} onSave={(url) => studio.patchCourse({ instructor_signature_url: url })} />
          </>
        ) : null}
      </section>
    </div>
  );
}

/** Instructor's scanned signature printed on the certificates of this course (transparent PNG ideally). */
function SignatureField({ course, onSave }: { course: StudioCourse; onSave: (url: string | null) => unknown }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-20 w-56 shrink-0 items-center justify-center rounded-xl border border-dashed border-c2p-border-strong bg-white">
        {course.instructor_signature_url
          ? <img src={course.instructor_signature_url} alt="Votre signature" className="max-h-16 max-w-[13rem] object-contain" />
          : <span className="text-xs text-c2p-soft">Signature écrite générée</span>}
      </div>
      <div className="space-y-2 text-sm">
        <p className="font-bold text-c2p-text">Votre signature sur les certificats</p>
        <p className="text-xs text-c2p-muted">Signez sur une feuille blanche, photographiez-la (PNG ou JPG). Sans image, votre nom est écrit à la main automatiquement.</p>
        <input ref={input} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setBusy(true);
          setFailure(null);
          try {
            const uploaded = await uploadCourseFile(file, { courseId: course.id, kind: 'cover' });
            await onSave(uploaded.url);
          } catch {
            setFailure('L’envoi de la signature a échoué.');
          } finally {
            setBusy(false);
          }
        }} />
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="font-semibold text-c2p-primary hover:underline disabled:opacity-50">
            {busy ? 'Envoi…' : course.instructor_signature_url ? 'Remplacer' : 'Ajouter ma signature'}
          </button>
          {course.instructor_signature_url ? <button type="button" onClick={() => void onSave(null)} className="font-semibold text-c2p-danger hover:underline">Retirer</button> : null}
        </div>
        {failure ? <p className="text-xs text-c2p-danger" role="alert">{failure}</p> : null}
      </div>
    </div>
  );
}
