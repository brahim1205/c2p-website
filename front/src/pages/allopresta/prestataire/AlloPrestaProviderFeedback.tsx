import { Link } from 'react-router-dom';

export function ProviderSuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-6 right-6 z-50 max-w-md">
      <div role="status" aria-live="polite" className="bg-[#1a9a96] text-white px-5 py-3 rounded-xl shadow-[0_16px_34px_rgba(26,154,150,0.22)] flex items-center gap-3">
        <div className="w-5 h-5 flex items-center justify-center">
          <i className="ri-check-line"></i>
        </div>
        <span className="text-sm font-medium">{message}</span>
        <button type="button" aria-label="Fermer le message de confirmation" onClick={onClose} className="ml-2 w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded">
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}

export function ProviderBreadcrumb({
  displayName,
}: {
  displayName: string;
}) {
  return (
    <div className="bg-white border-b border-[#d6dbe1] px-4 sm:px-6 lg:px-20 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-[#64748b]">
        <Link to="/" className="hover:text-[#0f1c35]">Accueil</Link>
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-arrow-right-s-line"></i>
        </div>
        <Link to="/allopresta" className="hover:text-[#0f1c35]">AlloPresta</Link>
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-arrow-right-s-line"></i>
        </div>
        <span className="text-[#0f1c35]">{displayName}</span>
      </div>
    </div>
  );
}

export function ProviderLoadingState() {
  return (
    <div className="public-premium-page min-h-screen bg-[#f7f6f4] pt-24 px-4">
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-8 h-48"></div>
            <div className="bg-white rounded-xl p-8 h-32"></div>
            <div className="bg-white rounded-xl p-8 h-40"></div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 h-32"></div>
            <div className="bg-white rounded-xl p-6 h-40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProviderNotFoundState() {
  return (
    <div className="public-premium-page min-h-screen bg-[#f7f6f4] pt-24 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-3xl text-gray-400"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Prestataire introuvable</h2>
        <p className="text-gray-600 mb-4">Ce prestataire n&apos;existe pas ou a été supprimé.</p>
        <Link to="/allopresta" className="text-[#1a9a96] font-medium hover:underline">
          Retour à AlloPresta
        </Link>
      </div>
    </div>
  );
}
