import { useEffect, useId, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui';

interface AutosaveTextProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => unknown;
  placeholder?: string;
  hint?: ReactNode;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
}

/** Text field that keeps a local draft and saves on blur (no "Save" button, like Udemy). */
export function AutosaveText({ label, value, onSave, placeholder, hint, maxLength, multiline, rows = 6, required }: AutosaveTextProps) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const commit = () => {
    if (draft.trim() !== (value ?? '').trim()) void onSave(draft.trim());
  };
  const shared = {
    id,
    value: draft,
    placeholder,
    maxLength,
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onBlur: commit,
    className: 'c2p-input w-full px-4 py-3 text-sm',
  };
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-c2p-text">
          {label}
          {required ? <span className="ml-1 text-c2p-danger">*</span> : null}
        </label>
        {maxLength ? <span className="text-xs tabular-nums text-c2p-soft">{maxLength - draft.length}</span> : null}
      </div>
      {multiline ? <textarea rows={rows} {...shared} /> : <input type="text" {...shared} />}
      {hint ? <p className="mt-1.5 text-xs text-c2p-muted">{hint}</p> : null}
    </div>
  );
}

interface ListEditorProps {
  title: string;
  description: ReactNode;
  items: string[] | undefined;
  placeholders: string[];
  onSave: (items: string[]) => unknown;
  minRows?: number;
  maxLength?: number;
}

/** Bullet list editor ("Ce que les apprenants vont apprendre"...), saved on blur. */
export function ListEditor({ title, description, items, placeholders, onSave, minRows = 1, maxLength = 160 }: ListEditorProps) {
  const [draft, setDraft] = useState<string[]>([]);
  useEffect(() => {
    const filled = (items ?? []).filter((item) => item.trim());
    setDraft(filled.length >= minRows ? filled : [...filled, ...Array(minRows - filled.length).fill('')]);
  }, [items, minRows]);

  const persist = (next: string[]) => {
    const cleaned = next.map((item) => item.trim()).filter(Boolean);
    const current = (items ?? []).map((item) => item.trim()).filter(Boolean);
    if (cleaned.join('\n') !== current.join('\n')) void onSave(cleaned);
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-c2p-text">{title}</h3>
        <p className="mt-1 text-sm text-c2p-muted">{description}</p>
      </div>
      {draft.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={item}
              maxLength={maxLength}
              placeholder={placeholders[index] ?? placeholders[placeholders.length - 1]}
              aria-label={`${title} ${index + 1}`}
              onChange={(event) => setDraft((current) => current.map((entry, position) => (position === index ? event.target.value : entry)))}
              onBlur={() => persist(draft)}
              className="c2p-input w-full py-3 pl-4 pr-14 text-sm"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs tabular-nums text-c2p-soft">
              {maxLength - item.length}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Supprimer l’élément ${index + 1}`}
            disabled={draft.length <= 1}
            onClick={() => {
              const next = draft.filter((_, position) => position !== index);
              setDraft(next);
              persist(next);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-c2p-muted transition hover:bg-c2p-danger-soft hover:text-c2p-danger disabled:invisible"
          >
            <i className="ri-delete-bin-line" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setDraft((current) => [...current, ''])}
        disabled={draft.length >= 20}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-c2p-primary hover:underline disabled:opacity-40"
      >
        <i className="ri-add-line" aria-hidden="true" /> Ajouter une réponse
      </button>
    </section>
  );
}

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  description?: string;
}

export function ChoiceCard({ selected, onSelect, icon, title, description }: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        'flex w-full flex-col items-start gap-2 rounded-2xl border-2 bg-c2p-surface p-5 text-left transition',
        selected ? 'border-c2p-primary shadow-c2p' : 'border-c2p-border hover:border-c2p-border-strong',
      )}
    >
      <i className={cx(icon, 'text-2xl', selected ? 'text-c2p-primary' : 'text-c2p-muted')} aria-hidden="true" />
      <span className="text-base font-bold text-c2p-text">{title}</span>
      {description ? <span className="text-sm text-c2p-muted">{description}</span> : null}
    </button>
  );
}
