import { assetTypeLabels, formatBytes, type LessonAsset } from './programmeModel';

export function AssetListPanel({
  assets,
  onDelete,
  onEdit,
}: {
  assets: LessonAsset[];
  onDelete: (asset: LessonAsset) => void;
  onEdit: (asset: LessonAsset) => void;
}) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Aucun contenu rattaché à cette leçon pour le moment.
      </div>
    );
  }

  return (
    <>
      {assets.map((asset) => (
        <div key={asset.id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{asset.title}</span>
                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{assetTypeLabels[asset.asset_type]}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${asset.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {asset.status === 'ready' ? 'Prêt' : 'Traitement'}
                </span>
              </div>
              <p className="break-all text-sm text-gray-600">{asset.url}</p>
              <p className="mt-2 text-xs text-gray-500">
                Position {asset.position}
                {asset.mime_type ? ` • ${asset.mime_type}` : ''}
                {asset.size_bytes ? ` • ${formatBytes(asset.size_bytes)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={asset.url} target="_blank" rel="noreferrer" className="rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50">
                Ouvrir
              </a>
              <AssetIconButton icon="ri-edit-line" label="Modifier le contenu" onClick={() => onEdit(asset)} />
              <AssetIconButton icon="ri-delete-bin-line" label="Supprimer le contenu" danger onClick={() => onDelete(asset)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function AssetIconButton({ danger = false, icon, label, onClick }: { danger?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 w-9 rounded-lg border transition-colors ${danger ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
      title={label}
    >
      <i className={icon}></i>
    </button>
  );
}
