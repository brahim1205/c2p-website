import {
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_STYLES,
} from './servicePageModel';

export default function ServiceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${SERVICE_STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {SERVICE_STATUS_LABELS[status] || status}
    </span>
  );
}
