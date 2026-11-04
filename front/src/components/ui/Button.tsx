import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'c2p-btn-primary',
  accent: 'c2p-btn-accent',
  secondary: 'c2p-btn-secondary',
  danger: 'c2p-btn-primary !bg-c2p-danger hover:!bg-[#a83434]',
  ghost: 'inline-flex items-center justify-center rounded-full font-semibold text-c2p-muted transition-colors hover:bg-c2p-surface-muted hover:text-c2p-text disabled:cursor-not-allowed disabled:opacity-50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Remix Icon class, e.g. `ri-add-line`. */
  icon?: string;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

/** Brand button built on the `c2p-btn-*` classes and colour tokens of `index.css`. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading = false, fullWidth = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : icon ? (
        <i className={cx(icon, 'text-base leading-none')} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
});
