import {
  getProviderTierLabel,
  getProviderVisibilityLabel,
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
        <h3 className="text-[#0f1c35] font-bold text-lg mb-4">Informations du profil</h3>
        <div className="space-y-3 text-sm leading-6 text-[#64748b]">
          <p><strong className="text-[#0f1c35]">Accès :</strong> {profileUnlocked ? 'Profil détaillé visible' : getProviderTierLabel(prestataire.public_profile_level)}</p>
          <p><strong className="text-[#0f1c35]">Visibilité :</strong> {getProviderVisibilityLabel(prestataire.visibility_tier)}</p>
          <p><strong className="text-[#0f1c35]">Statut abonnement :</strong> {prestataire.subscription_status || 'Non renseigné'}</p>
          <p><strong className="text-[#0f1c35]">Plan actif :</strong> {prestataire.plan_name || 'Aucun plan indiqué'}</p>
          <p><strong className="text-[#0f1c35]">Alertes :</strong> {prestataire.alerts_enabled ? 'Activées' : 'Non activées'}</p>
          <p><strong className="text-[#0f1c35]">Publication :</strong> {prestataire.operations_managed ? 'Cadrée par C2P' : 'Directe'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#d6dbe1] p-4 sm:p-6">
        <h3 className="text-[#0f1c35] font-bold text-lg mb-4">Informations pratiques</h3>
        <div className="space-y-2 text-sm leading-6 text-[#64748b]">
          <p><strong className="text-[#0f1c35]">Localisation :</strong> {prestataire.location || prestataire.city || 'Non renseignée'}</p>
          <p><strong className="text-[#0f1c35]">Temps de réponse :</strong> {prestataire.response_time || 'Non renseigné'}</p>
          <p><strong className="text-[#0f1c35]">Langues :</strong> {prestataire.languages.length ? prestataire.languages.join(', ') : 'Non renseignées'}</p>
          <p><strong className="text-[#0f1c35]">Prestations réalisées :</strong> {prestataire.completed_jobs}</p>
          <p><strong className="text-[#0f1c35]">Membre depuis :</strong> {prestataire.member_since || 'Non renseigné'}</p>
        </div>
      </div>
    </div>
  );
}
