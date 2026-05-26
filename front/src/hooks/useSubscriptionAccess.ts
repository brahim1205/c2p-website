import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/lib/roles';
import { queryKeys } from '@/lib/queryKeys';
import { fetchFinanceSnapshot, fetchSubscriptionPlans, type SubscriptionPlan, type UserSubscription } from '@/lib/saasApi';
import {
  getActiveSubscription,
  isSubscriptionManagedRole,
  resolveSubscriptionGate,
  type SubscriptionGateDecision,
  type SubscriptionGuardAction,
} from '@/lib/subscriptionAccess';

export function useSubscriptionAccess(user: AuthUser | null) {
  const queryClient = useQueryClient();
  const isManagedRole = isSubscriptionManagedRole(user?.role);
  const subscriptionAccessQueryKey = useMemo(() => queryKeys.subscriptions.access(user?.id, user?.role), [user?.id, user?.role]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: subscriptionAccessQueryKey });
  }, [queryClient, subscriptionAccessQueryKey]);

  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: subscriptionAccessQueryKey,
    queryFn: async () => {
      if (!user?.id || !isManagedRole) {
        return { subscriptions: [], plans: [] };
      }
      const [snapshot, rolePlans] = await Promise.all([
        fetchFinanceSnapshot(user.id, user.role),
        fetchSubscriptionPlans(user.role),
      ]);
      return {
        subscriptions: snapshot.subscriptions,
        plans: rolePlans,
      };
    },
    enabled: Boolean(user?.id),
  });

  const subscriptions = useMemo<UserSubscription[]>(() => data?.subscriptions || [], [data?.subscriptions]);
  const plans = useMemo<SubscriptionPlan[]>(() => data?.plans || [], [data?.plans]);

  const activeSubscription = useMemo(() => getActiveSubscription(subscriptions), [subscriptions]);

  const gateFor = useCallback((action: SubscriptionGuardAction): SubscriptionGateDecision => (
    (loading && isManagedRole)
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
  ), [isManagedRole, loading, plans, subscriptions, user?.role]);

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
