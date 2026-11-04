import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-c2p-surface-muted text-c2p-muted',
  primary: 'bg-c2p-success-soft text-c2p-primary-hover',
  success: 'bg-c2p-success-soft text-c2p-success',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-c2p-danger-soft text-c2p-danger',
  accent: 'bg-c2p-accent text-white',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: string;
}

/** Small status pill using the brand colour tokens. */
export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone], className)}
      {...props}
    >
      {icon ? <i className={cx(icon, 'leading-none')} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
