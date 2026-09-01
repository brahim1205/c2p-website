import {
  getProviderTierLabel,
  getProviderTierMessage,
} from '@/lib/providerApi';
import type { ProviderDetailRecord } from './providerDetailTypes';

interface AlloPrestaProviderProfileCardProps {
  displayName: string;
  prestataire: ProviderDetailRecord;
  profileUnlocked: boolean;
  reviewsCount: number;
  onContactProvider: () => void;
  onOpenReservationFlow: () => void;
}

export default function AlloPrestaProviderProfileCard({
  displayName,
  prestataire,
  profileUnlocked,
  reviewsCount,
  onContactProvider,
  onOpenReservationFlow,
}: AlloPrestaProviderProfileCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8">
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:gap-6">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32">
          <img
            src={prestataire.image || '/images/brand/image1.jpeg'}
            alt={displayName}
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="flex-1">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-[#0f1c35] font-bold text-xl sm:text-2xl md:text-3xl">{displayName}</h1>
                {prestataire.verified && (
                  <div className="flex items-center gap-1 rounded-full bg-[#1D9BF0] px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(29,155,240,0.28)] sm:px-3 sm:text-xs">
                    <i className="ri-verified-badge-fill"></i>
                    <span>Vérifié</span>
                  </div>
                )}
                <div className="flex items-center gap-1 rounded-full border border-[#d7e6fb] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#27346b] sm:px-3 sm:text-xs">
                  <i className="ri-lock-line"></i>
                  <span>{getProviderTierLabel(prestataire.public_profile_level)}</span>
                </div>
              </div>
              <p className="mb-2 text-base text-gray-600 sm:text-lg">{prestataire.title || prestataire.category || 'Prestataire C2P'}</p>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-map-pin-line"></i>
                </div>
                <span>{prestataire.location || prestataire.city || 'Localisation non renseignée'}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-star-fill text-yellow-400 text-lg"></i>
              </div>
              <span className="text-base font-bold text-gray-900 sm:text-lg">{prestataire.rating}</span>
              <span className="text-gray-500 text-sm">({reviewsCount} avis)</span>
            </div>
            <div className="text-gray-600 text-sm">{prestataire.completed_jobs} prestations réalisées</div>
            {prestataire.response_time ? (
              <div className="text-gray-600 text-sm">Réponse : {prestataire.response_time}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onContactProvider}
              aria-label={`Contacter ${displayName} via C2P`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#147f7b] px-5 py-3 text-sm font-semibold leading-tight text-white shadow-[0_14px_34px_rgba(20,127,123,0.20)] transition-all hover:bg-[#0f6b68] cursor-pointer sm:w-fit"
            >
              <i className="ri-message-3-line text-base"></i>
              Contacter
            </button>
            <button
              type="button"
              onClick={onOpenReservationFlow}
              aria-label={`Demander un devis à ${displayName} via C2P`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f1c35] px-5 py-3 text-sm font-semibold leading-tight text-white shadow-[0_14px_34px_rgba(15,28,53,0.20)] transition-all hover:bg-[#172b50] cursor-pointer sm:w-fit"
            >
              <i className="ri-file-list-3-line text-base"></i>
              Demande de devis
            </button>
          </div>
        </div>
      </div>

      {!profileUnlocked ? (
        <div className="mb-6 grid gap-4 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4 text-sm leading-6 text-[#31445f] sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#27346b] shadow-sm">
              <i className="ri-lock-2-line text-lg"></i>
            </div>
            <div>
              <p className="font-semibold text-[#0f1c35]">{getProviderTierLabel(prestataire.public_profile_level)}</p>
              <p className="mt-1 text-[#64748b]">{getProviderTierMessage(prestataire.public_profile_level)}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[#31445f] shadow-sm sm:max-w-[260px]">
            Utilisez les boutons ci-dessus pour contacter le prestataire ou envoyer une demande de devis avec vos vraies informations.
          </div>
        </div>
      ) : null}

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-[#0f1c35] font-bold text-lg mb-3">À propos</h3>
        <p className="text-gray-700 text-[15px] leading-relaxed">
          {profileUnlocked
            ? (prestataire.bio || 'Aucune présentation publique n’a encore été renseignée.')
            : 'Le détail complet du profil n’est pas public pour ce niveau d’accès.'}
        </p>
      </div>
    </div>
  );
}
