import { Link } from 'react-router-dom';
import type { PublicSubscriptionPlan } from '@/lib/publicSubscriptions';
import { userTypes } from './registerModel';

type SelectedRolePlanSummary = {
  content: {
    shortLabel: string;
    gateLabel: string;
    purpose: string;
  };
  priceRange: string | null;
  selectedPlan: PublicSubscriptionPlan | null;
};

interface RegisterAccountTypeStepProps {
  isLoading: boolean;
  isLoadingPlans: boolean;
  selectedRolePlanSummary: SelectedRolePlanSummary | null;
  userType: string | null;
  onSelectUserType: (userType: string) => void;
}

export default function RegisterAccountTypeStep({
  isLoading,
  isLoadingPlans,
  selectedRolePlanSummary,
  userType,
  onSelectUserType,
}: RegisterAccountTypeStepProps) {
  return (
    <section className="rounded-[18px] border border-[#eadfce] bg-[#fbf7f1]/45 p-3 shadow-sm backdrop-blur sm:rounded-[22px] sm:p-4">
      <div className="mb-3 text-center">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d5b46f]">Votre acces</p>
        <h2 className="text-lg font-semibold text-[#172033] sm:text-xl">Choisissez votre type de compte</h2>
        <p className="mx-auto mt-1.5 max-w-3xl text-xs leading-5 text-[#5b6778] sm:text-sm">
          Vous pouvez creer le compte sans payer. Les plans publics concernent surtout les prestataires,
          formateurs et porteurs de projet quand ils veulent activer leurs fonctions premium.
        </p>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b68b3f]">
          Touchez une carte pour ouvrir le formulaire
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {userTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            aria-pressed={userType === type.id}
            onClick={() => onSelectUserType(type.id)}
            disabled={isLoading}
            className={`group rounded-[16px] border p-3 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d5b46f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3.5 ${
              userType === type.id
                ? 'border-[#d5b46f] bg-[#d5b46f]/12 shadow-[0_22px_60px_rgba(213,180,111,0.14)]'
                : 'border-[#eadfce] bg-[#fbf7f1] hover:border-[#d5b46f]/45'
            }`}
          >
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9 ${userType === type.id ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#d5b46f] border border-[#eadfce]'} transition-all`}>
              <i className={`${type.icon} text-base`}></i>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-[#172033] sm:text-base">{type.title}</h3>
            <p className="text-xs leading-5 text-[#5b6778] sm:text-sm">{type.description}</p>
          </button>
        ))}
      </div>

      <RegisterPlanHint
        isLoadingPlans={isLoadingPlans}
        selectedRolePlanSummary={selectedRolePlanSummary}
        userType={userType}
      />
    </section>
  );
}

function RegisterPlanHint({
  isLoadingPlans,
  selectedRolePlanSummary,
  userType,
}: {
  isLoadingPlans: boolean;
  selectedRolePlanSummary: SelectedRolePlanSummary | null;
  userType: string | null;
}) {
  if (!userType) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[20px] border border-[#eadfce] bg-[#fbf7f1] px-4 py-4">
      {selectedRolePlanSummary ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
                Abonnement requis plus tard
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#172033]">
                {selectedRolePlanSummary.content.shortLabel}
              </h3>
            </div>
            <span className="rounded-full border border-[#d5b46f]/30 bg-[#d5b46f]/10 px-3 py-1 text-xs font-semibold text-[#d5b46f]">
              {selectedRolePlanSummary.priceRange ?? (isLoadingPlans ? 'Chargement des tarifs...' : 'Voir les plans')}
            </span>
          </div>
          <p className="text-sm leading-7 text-[#5b6778]">
            {selectedRolePlanSummary.content.gateLabel}
          </p>
          {selectedRolePlanSummary.selectedPlan ? (
            <div className="rounded-2xl border border-[#d5b46f]/30 bg-white px-4 py-4 text-sm text-[#5b6778]">
              <p className="font-semibold text-[#172033]">{selectedRolePlanSummary.selectedPlan.name}</p>
              <p className="mt-1">
                {selectedRolePlanSummary.selectedPlan.price_monthly.toLocaleString('fr-SN')} {selectedRolePlanSummary.selectedPlan.currency === 'XAF' ? 'FCFA' : selectedRolePlanSummary.selectedPlan.currency} / mois
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 text-sm leading-6 text-[#5b6778] sm:flex-row sm:items-center sm:justify-between">
            <span>{selectedRolePlanSummary.content.purpose}</span>
            <Link to="/tarifs" className="c2p-link font-medium">
              Voir les plans complets
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5b46f]">
            Aucun abonnement mensuel requis
          </p>
          <p className="text-sm leading-7 text-[#5b6778]">
            Ce role peut entrer sur la plateforme sans plan mensuel public. Si vous voulez comparer les
            abonnements monetises disponibles, consultez la page tarifs.
          </p>
          <Link to="/tarifs" className="c2p-link text-sm font-medium">
            Voir les tarifs C2P
          </Link>
        </div>
      )}
    </div>
  );
}
