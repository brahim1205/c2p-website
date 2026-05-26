import type { computePrestataireServiceStats } from './servicePageModel';

interface PrestataireServiceStatsProps {
  stats: ReturnType<typeof computePrestataireServiceStats>;
}

export default function PrestataireServiceStats({ stats }: PrestataireServiceStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Services actifs', value: String(stats.active), icon: 'ri-briefcase-line', color: 'bg-[#5fa6f3]' },
        { label: 'Réservations', value: String(stats.bookings), icon: 'ri-calendar-check-line', color: 'bg-blue-500' },
        { label: 'Note moyenne', value: stats.avgRating, icon: 'ri-star-line', color: 'bg-yellow-500' },
        { label: 'Revenus estimés', value: `${(stats.revenue / 1000000).toFixed(1)}M FCFA`, icon: 'ri-coins-line', color: 'bg-green-500' },
      ].map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${stat.icon} text-white text-sm`}></i>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
