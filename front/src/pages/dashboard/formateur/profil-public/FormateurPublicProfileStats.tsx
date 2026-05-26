import type { computePublicProfileStats } from './formateurPublicProfileModel';

interface FormateurPublicProfileStatsProps {
  stats: ReturnType<typeof computePublicProfileStats>;
}

export default function FormateurPublicProfileStats({ stats }: FormateurPublicProfileStatsProps) {
  const entries = [
    { label: 'Formations', value: stats.courses, icon: 'ri-book-open-line' },
    { label: 'Apprenants', value: stats.students, icon: 'ri-group-line' },
    { label: 'Revenus', value: `${stats.revenue.toLocaleString('fr-FR')} FCFA`, icon: 'ri-wallet-3-line' },
    { label: 'Complétion', value: `${stats.completionRate}%`, icon: 'ri-bar-chart-line' },
  ];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {entries.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <i className={`${stat.icon} text-lg`}></i>
          </div>
          <div className="text-sm text-gray-500">{stat.label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
