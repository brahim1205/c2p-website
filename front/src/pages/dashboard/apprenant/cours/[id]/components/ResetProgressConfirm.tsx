interface ResetProgressConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ResetProgressConfirm({ open, onCancel, onConfirm }: ResetProgressConfirmProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <i className="ri-delete-bin-line text-red-600 text-lg"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Réinitialiser la progression</h3>
        </div>
        <p className="text-sm text-gray-600 mb-2">Cette action supprimera définitivement :</p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1 ml-4 list-disc">
          <li>Vos leçons complétées</li>
          <li>Vos favoris</li>
          <li>Vos notes personnelles</li>
          <li>Votre historique de quiz</li>
          <li>Votre dernière leçon vue</li>
        </ul>
        <p className="text-sm text-red-600 font-medium mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
