import {
  getProviderTierLabel,
  getProviderVisibilityPassHint,
  getProviderVisibilityPassLabel,
} from '@/lib/providerApi';
import type { ProviderDetailRecord } from './providerDetailTypes';

export default function AlloPrestaProviderSidebar({
  prestataire,
  profileUnlocked,
}: {
  prestataire: ProviderDetailRecord;
  profileUnlocked: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#d6dbe1] p-4 sm:p-6">
        <h3 className="text-[#0f1c35] font-bold text-lg mb-3">Intermédiation C2P</h3>
        <p className="text-sm leading-6 text-gray-600">
          Cette fiche présente un profil {profileUnlocked ? 'détaillé' : 'résumé'}. La prise en charge commerciale, la qualification du besoin et l&apos;attribution de mission passent par C2P.
        </p>
        <div className="mt-4 space-y-2 text-sm text-[#64748b]">
          <div className="flex items-start gap-2">
            <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
            <span>Analyse du besoin par l&apos;équipe C2P</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
            <span>Sélection et affectation du bon intervenant</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="ri-check-line mt-0.5 text-[#1a9a96]"></i>
            <span>Suivi de mission et cadrage contractuel via C2P</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#d6dbe1] p-4 sm:p-6">
        <h3 className="text-[#0f1c35] font-bold text-lg mb-3">Cadre AlloPresta</h3>
        <div className="space-y-2 text-sm leading-6 text-[#64748b]">
          <p><strong className="text-[#0f1c35]">Niveau requis :</strong> {getProviderTierLabel(prestataire.public_profile_level)}</p>
          <p><strong className="text-[#0f1c35]">Visibilité :</strong> {prestataire.visibility_tier === 'premium' ? 'Premium' : prestataire.visibility_tier === 'priority' ? 'Prioritaire' : 'Standard'}</p>
          <p><strong className="text-[#0f1c35]">Billet :</strong> {getProviderVisibilityPassLabel(prestataire.visibility_tier)}</p>
          <p><strong className="text-[#0f1c35]">Alertes :</strong> {prestataire.alerts_enabled ? 'Activées' : 'Pilotées par C2P'}</p>
          <p><strong className="text-[#0f1c35]">Accompagnement :</strong> {prestataire.operations_managed ? 'Cadrage C2P' : 'Direct'}</p>
          <p className="pt-2 text-xs text-[#64748b]">{getProviderVisibilityPassHint(prestataire.visibility_tier)}</p>
        </div>
      </div>
    </div>
  );
}
