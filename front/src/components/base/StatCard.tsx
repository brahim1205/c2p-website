export interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  change?: string;
  valueClassName?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  color,
  change,
  valueClassName = 'text-2xl',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <div className="w-6 h-6 flex items-center justify-center">
            <i className={`${icon} text-xl text-white`}></i>
          </div>
        </div>
        {change && <span className="text-sm font-medium text-green-600">{change}</span>}
      </div>
      <p className={`${valueClassName} font-bold text-gray-900 mb-1`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}
