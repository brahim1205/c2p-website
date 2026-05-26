import {
  getServiceStatusFilterLabel,
  SERVICE_STATUS_FILTERS,
  type ServiceStatusFilter,
} from './servicePageModel';

interface PrestataireServiceFiltersProps {
  searchQuery: string;
  statusFilter: ServiceStatusFilter;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: ServiceStatusFilter) => void;
}

export default function PrestataireServiceFilters({
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
}: PrestataireServiceFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="w-5 h-5 flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
            <i className="ri-search-line text-gray-400"></i>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            aria-label="Rechercher un service"
            placeholder="Rechercher un service..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5fa6f3] text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filtrer les services par statut">
          {SERVICE_STATUS_FILTERS.map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => onStatusFilterChange(status)}
              aria-pressed={statusFilter === status}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#5fa6f3] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getServiceStatusFilterLabel(status)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
