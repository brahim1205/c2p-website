import { Link } from 'react-router-dom';
import type { SubscriptionGateDecision } from '@/lib/subscriptionAccess';

interface SubscriptionRequiredBannerProps {
  gate: SubscriptionGateDecision;
}

export default function SubscriptionRequiredBanner({ gate }: SubscriptionRequiredBannerProps) {
  if (gate.allowed || !gate.required) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">{gate.title}</p>
          <p className="mt-1 text-sm text-amber-900">{gate.message}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={gate.recommendedPlanId ? `/dashboard/paiements?view=wallet&plan=${encodeURIComponent(gate.recommendedPlanId)}` : '/dashboard/paiements?view=wallet'}
            className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            {gate.ctaLabel}
          </Link>
          <Link
            to="/dashboard/paiements"
            className="inline-flex items-center rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-white"
          >
            Voir mes paiements
          </Link>
        </div>
      </div>
    </section>
  );
}
