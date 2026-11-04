import type { KpiCard } from './adminDashboardContentModel';

/** Real-figure chip under a KPI; the green arrow is shown only when something actually increased. */
export function AdminKpiHighlight({ highlight }: { highlight: KpiCard['highlight'] }) {
  if (!highlight) return null;
  return (
    <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${highlight.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
      {highlight.positive ? <i className="ri-arrow-up-line mr-1" aria-hidden="true" /> : null}
      {highlight.text}
    </div>
  );
}
