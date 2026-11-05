import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  /** Element shown on the right of the title (link, button...). */
  action?: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

const PADDING = { sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

/** Surface block built on `.c2p-card`. */
export function Card({ title, description, action, padding = 'md', className, children, ...props }: CardProps) {
  return (
    <section className={cx('c2p-card rounded-2xl', PADDING[padding], className)} {...props}>
      {title || action ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-bold text-c2p-text">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-c2p-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
