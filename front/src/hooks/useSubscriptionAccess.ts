import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/roles';
import { fetchFinanceSnapshot, fetchSubscriptionPlans, type SubscriptionPlan, type UserSubscription } from '@/lib/saasApi';
import {
  getActiveSubscription,
  isSubscriptionManagedRole,
  resolveSubscriptionGate,
  type SubscriptionGateDecision,
  type SubscriptionGuardAction,
} from '@/lib/subscriptionAccess';

export function useSubscriptionAccess(user: AuthUser | null) {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id || !isSubscriptionManagedRole(user.role)) {
      setSubscriptions([]);
      setPlans([]);
      return;
    }

    setLoading(true);
    try {
      const [snapshot, rolePlans] = await Promise.all([
        fetchFinanceSnapshot(user.id, user.role),
        fetchSubscriptionPlans(user.role),
      ]);
      setSubscriptions(snapshot.subscriptions);
      setPlans(rolePlans);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSubscription = useMemo(() => getActiveSubscription(subscriptions), [subscriptions]);

  const gateFor = useCallback((action: SubscriptionGuardAction): SubscriptionGateDecision => (
    (loading && isSubscriptionManagedRole(user?.role))
      ? {
          required: true,
          allowed: true,
          role: user?.role ?? null,
          action,
          reason: 'active_subscription',
          title: 'Vérification en cours',
          message: 'Vérification de votre abonnement en cours.',
          ctaLabel: 'Voir mes paiements',
          recommendedPlanId: null,
          recommendedPlanName: null,
        }
      : resolveSubscriptionGate({
          role: user?.role ?? null,
          action,
          subscriptions,
          plans,
        })
  ), [loading, plans, subscriptions, user?.role]);

  return {
    loading,
    plans,
    subscriptions,
    activeSubscription,
    hasActiveSubscription: Boolean(activeSubscription),
    gateFor,
    refresh,
  };
}
