import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cx } from './cx';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label. When omitted, pass an `aria-label`. */
  label?: string;
  /** Remix Icon class shown inside the field, e.g. `ri-search-line`. */
  icon?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * Text field with an optional leading icon. The icon padding is applied with an inline style so
 * that no global stylesheet rule (e.g. `.dashboard-layout input`) can make the text overlap it.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, icon, hint, error, id, className, containerClassName, style, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cx('w-full', containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-c2p-text">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {icon ? (
          <i
            className={cx(icon, 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-c2p-soft')}
            aria-hidden="true"
          />
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx('c2p-input h-11 px-4 text-sm', error && '!border-c2p-danger', className)}
          style={icon ? { paddingLeft: '2.5rem', ...style } : style}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-c2p-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-c2p-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export type SearchInputProps = Omit<TextInputProps, 'icon' | 'type'>;

/** Search field with the magnifier icon, labelled for screen readers by its placeholder. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(props, ref) {
  return (
    <TextInput
      ref={ref}
      type="search"
      icon="ri-search-line"
      aria-label={props['aria-label'] ?? props.placeholder}
      {...props}
    />
  );
});
