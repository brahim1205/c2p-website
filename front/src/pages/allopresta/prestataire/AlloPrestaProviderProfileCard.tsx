import { Link } from 'react-router-dom';
import {
  getProviderTierLabel,
  getProviderTierMessage,
} from '@/lib/providerApi';
import type { ProviderDetailRecord } from './providerDetailTypes';

interface LockedProfileAction {
  to: string;
  label: string;
}

interface AlloPrestaProviderProfileCardProps {
  displayName: string;
  isAuthenticated: boolean;
  lockedProfileAction: LockedProfileAction;
  prestataire: ProviderDetailRecord;
  profileUnlocked: boolean;
  reviewsCount: number;
  onOpenReservationFlow: () => void;
}

export default function AlloPrestaProviderProfileCard({
  displayName,
  isAuthenticated,
  lockedProfileAction,
  prestataire,
  profileUnlocked,
  reviewsCount,
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
              <p className="mb-2 text-base text-gray-600 sm:text-lg">{prestataire.title}</p>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-map-pin-line"></i>
                </div>
                <span>{prestataire.location}</span>
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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onOpenReservationFlow}
              aria-label={`Contacter ${displayName} via C2P`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a9a96] px-5 py-3 text-sm font-semibold leading-tight text-white shadow-[0_14px_34px_rgba(26,154,150,0.20)] transition-all hover:bg-[#147f7b] cursor-pointer"
            >
              <i className="ri-file-list-3-line text-base"></i>
              {profileUnlocked ? 'Demander une intervention' : 'Déposer une demande'}
            </button>
            <Link
              to={isAuthenticated ? '/dashboard/messages?support=1' : '/contact'}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6dbe1] px-4 py-3 text-sm font-semibold text-[#0f1c35] transition-colors hover:border-[#1a9a96] hover:text-[#1a9a96]"
            >
              <i className="ri-customer-service-2-line text-base"></i>
              Support C2P
            </Link>
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
          <div className="flex flex-col gap-2 sm:min-w-[220px]">
            <Link
              to={lockedProfileAction.to}
              className="inline-flex items-center justify-center rounded-xl bg-[#27346b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#06053a]"
            >
              {lockedProfileAction.label}
            </Link>
            <Link
              to="/tarifs#prestataire-plans"
              className="inline-flex items-center justify-center rounded-xl border border-[#bfdbfe] bg-white px-4 py-2.5 text-sm font-semibold text-[#27346b] transition-colors hover:border-[#27346b]"
            >
              Offres AlloPresta
            </Link>
          </div>
        </div>
      ) : null}

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-[#0f1c35] font-bold text-lg mb-3">À propos</h3>
        <p className="text-gray-700 text-[15px] leading-relaxed">
          {profileUnlocked
            ? (prestataire.bio || 'Professionnel qualifié et vérifié sur la plateforme C2P.')
            : 'Profil résumé diffusé par C2P. Le détail complet, les signaux de fiabilité et la mise en relation sont cadrés par l’équipe C2P.'}
        </p>
      </div>
    </div>
  );
}
