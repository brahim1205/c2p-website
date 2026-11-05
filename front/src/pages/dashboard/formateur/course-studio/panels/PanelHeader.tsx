import type { ReactNode } from 'react';

export function PanelHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-c2p-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-c2p-text">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-c2p-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
