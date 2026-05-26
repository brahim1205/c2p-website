interface AdminProfileHeaderProps {
  isEditing: boolean;
  onToggleEditing: () => void;
}

export function AdminProfileHeader({ isEditing, onToggleEditing }: AdminProfileHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profil administrateur</h1>
        <p className="mt-1 text-gray-600">Coordonnees, presentation et securite du compte admin.</p>
      </div>
      <button
        type="button"
        onClick={onToggleEditing}
        aria-pressed={isEditing}
        className="rounded-lg bg-[#5fa6f3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#27346b]"
      >
        {isEditing ? 'Annuler' : 'Modifier'}
      </button>
    </div>
  );
}
