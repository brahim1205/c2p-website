interface DeleteAccountModalProps {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-6 h-6 flex items-center justify-center">
            <i className="ri-alert-line text-red-600 text-xl"></i>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Supprimer votre compte ?</h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Cette action est irréversible. Toutes vos données, formations, projets et messages seront définitivement supprimés.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
