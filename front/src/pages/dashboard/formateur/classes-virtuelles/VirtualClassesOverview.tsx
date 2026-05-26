import { SkeletonList } from '@/components/base/Skeleton';
import {
  formatClassDate,
  getStatusLabel,
  type VirtualClass,
} from './virtualClassModel';

type ClassFilter = 'all' | 'scheduled' | 'live' | 'ended';

type VirtualClassesOverviewProps = {
  filter: ClassFilter;
  loading: boolean;
  classes: VirtualClass[];
  classStats: Record<'scheduled' | 'live' | 'ended', number>;
  canCreateClass: boolean;
  hasCourses: boolean;
  onFilterChange: (filter: ClassFilter) => void;
  onCreateClass: () => void;
  onJoin: (virtualClass: VirtualClass) => void;
  onEndClass: (virtualClass: VirtualClass) => void;
  onStartLive: (virtualClass: VirtualClass) => void;
  onCopyRoomLink: (virtualClass: VirtualClass) => void;
  onEdit: (virtualClass: VirtualClass) => void;
  onDelete: (virtualClass: VirtualClass) => void;
};

function StatusBadge({ status }: { status: VirtualClass['status'] }) {
  const colors = {
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-red-100 text-red-700',
    ended: 'bg-gray-100 text-gray-700',
  } as const;

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function ClassActions({
  virtualClass,
  onJoin,
  onEndClass,
  onStartLive,
  onCopyRoomLink,
  onEdit,
  onDelete,
}: {
  virtualClass: VirtualClass;
  onJoin: (virtualClass: VirtualClass) => void;
  onEndClass: (virtualClass: VirtualClass) => void;
  onStartLive: (virtualClass: VirtualClass) => void;
  onCopyRoomLink: (virtualClass: VirtualClass) => void;
  onEdit: (virtualClass: VirtualClass) => void;
  onDelete: (virtualClass: VirtualClass) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {virtualClass.status === 'live' && (
        <>
          <button onClick={() => onJoin(virtualClass)} className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"><i className="ri-broadcast-line text-sm" />Rejoindre</button>
          <button onClick={() => onEndClass(virtualClass)} className="whitespace-nowrap rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">Terminer</button>
          <button onClick={() => onCopyRoomLink(virtualClass)} className="whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Copier le lien</button>
        </>
      )}
      {virtualClass.status === 'scheduled' && (
        <>
          <button onClick={() => onStartLive(virtualClass)} className="whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">Démarrer</button>
          <button onClick={() => onCopyRoomLink(virtualClass)} className="whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Copier le lien</button>
          <button onClick={() => onEdit(virtualClass)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"><i className="ri-edit-line text-gray-600" /></button>
        </>
      )}
      {virtualClass.status === 'ended' && (
        <button onClick={() => onEdit(virtualClass)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-gray-100" title="Modifier le replay"><i className="ri-edit-line text-gray-600" /></button>
      )}
      {virtualClass.status === 'ended' && virtualClass.recording_url && (
        <button onClick={() => window.open(virtualClass.recording_url!, '_blank', 'noopener,noreferrer')} className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"><i className="ri-play-circle-line text-sm" />Replay</button>
      )}
      <button onClick={() => onDelete(virtualClass)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-red-50"><i className="ri-delete-bin-line text-red-500" /></button>
    </div>
  );
}

export default function VirtualClassesOverview({
  filter,
  loading,
  classes,
  classStats,
  canCreateClass,
  hasCourses,
  onFilterChange,
  onCreateClass,
  onJoin,
  onEndClass,
  onStartLive,
  onCopyRoomLink,
  onEdit,
  onDelete,
}: VirtualClassesOverviewProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">Classes virtuelles</h1>
          <p className="text-sm text-gray-600 md:text-base">Planifiez les lives liés à vos formations, démarrez la salle et gérez les replays.</p>
        </div>
        <button onClick={onCreateClass} disabled={!canCreateClass} className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"><i className="ri-video-add-line text-base" />Nouvelle classe</button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Programmées', value: classStats.scheduled, icon: 'ri-calendar-check-line', tone: 'bg-blue-50 text-blue-700' },
          { label: 'En direct', value: classStats.live, icon: 'ri-broadcast-line', tone: 'bg-red-50 text-red-700' },
          { label: 'Terminées', value: classStats.ended, icon: 'ri-record-circle-line', tone: 'bg-gray-50 text-gray-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm text-gray-500">{item.label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p></div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}><i className={`${item.icon} text-lg`} /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {(['all', 'scheduled', 'live', 'ended'] as const).map((value) => (
          <button key={value} onClick={() => onFilterChange(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filter === value ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
            {value === 'all' ? 'Toutes' : value === 'scheduled' ? 'Programmées' : value === 'live' ? 'En direct' : 'Terminées'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4"><SkeletonList count={4} /></div>
      ) : (
        <div className="space-y-4">
          {classes.map((virtualClass) => (
            <div key={virtualClass.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3"><StatusBadge status={virtualClass.status} /><span className="text-sm text-gray-600">{virtualClass.course_name || 'Sans formation associée'}</span></div>
                  <h3 className="mb-1 text-base font-semibold text-gray-900">{virtualClass.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><i className="ri-calendar-line text-sm" />{formatClassDate(virtualClass.class_date)}</span>
                    <span className="flex items-center gap-1"><i className="ri-time-line text-sm" />{virtualClass.class_time || 'Heure non définie'} ({virtualClass.duration || 'durée libre'})</span>
                    <span className="flex items-center gap-1"><i className="ri-group-line text-sm" />{virtualClass.students_count}/{virtualClass.max_students} participants</span>
                    <span className="flex items-center gap-1"><i className="ri-live-line text-sm" />{virtualClass.provider === 'custom' ? 'Salle personnalisée' : 'Salle Jitsi'}</span>
                    {virtualClass.recording_url && <span className="flex items-center gap-1 text-teal-600"><i className="ri-record-circle-line text-sm" />Enregistrée</span>}
                    {!virtualClass.recording_url && virtualClass.recording_status === 'processing' && <span className="flex items-center gap-1 text-amber-600"><i className="ri-loader-4-line animate-spin text-sm" />Replay en préparation</span>}
                  </div>
                  {virtualClass.instructor_notes ? <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{virtualClass.instructor_notes}</p> : null}
                </div>
                <ClassActions virtualClass={virtualClass} onJoin={onJoin} onEndClass={onEndClass} onStartLive={onStartLive} onCopyRoomLink={onCopyRoomLink} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
          ))}
        </div>
      )}

      {classes.length === 0 && !loading && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"><i className="ri-video-off-line text-2xl text-gray-400" /></div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucune classe trouvée</h3>
          <p className="text-gray-600">{hasCourses ? 'Créez votre première classe virtuelle.' : 'Ajoutez d’abord une formation pour y rattacher une classe.'}</p>
        </div>
      )}
    </>
  );
}
