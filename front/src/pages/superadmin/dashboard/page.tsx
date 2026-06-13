import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchAdminFeatureFlags,
  fetchAdminSecurityAlerts,
  fetchOutboxMetrics,
  updateAdminFeatureFlag,
  type AdminFeatureFlag,
  type AdminSecurityAlert,
  type OutboxMetrics,
} from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/lib/roles';

type ManagedUser = AuthUser & { status: 'active' | 'pending' | 'suspended' };

const quickLinks = [
  {
    title: 'Gouvernance',
    description: 'Admins, superadmins, sessions, feature flags et intégrations.',
    path: '/superadmin/governance',
    icon: 'ri-shield-user-line',
  },
  {
    title: 'Opérations',
    description: 'Outbox, dead-letter, deliveries et dispatch webhooks.',
    path: '/superadmin/operations',
    icon: 'ri-loop-left-line',
  },
  {
    title: 'Finance et tarifs',
    description: 'Plans, abonnements, DexPay, webhooks et réconciliation.',
    path: '/superadmin/finance',
    icon: 'ri-bank-card-line',
  },
  {
    title: 'Sécurité',
    description: 'Audit, alertes, sauvegardes et paramètres sensibles.',
    path: '/admin/security',
    icon: 'ri-shield-keyhole-line',
  },
];

function toneFromState(state: 'ok' | 'warning' | 'danger' | 'neutral') {
  if (state === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (state === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (state === 'danger') return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-gray-50 text-gray-700 border-gray-100';
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [alerts, setAlerts] = useState<AdminSecurityAlert[]>([]);
  const [outboxMetrics, setOutboxMetrics] = useState<OutboxMetrics | null>(null);
  const [dexPayStatus, setDexPayStatus] = useState<DexPayStatus | null>(null);
  const [busyFlag, setBusyFlag] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextUsers, nextFlags, nextAlerts, nextOutbox, nextDexPay] = await Promise.all([
        fetchUsers(),
        fetchAdminFeatureFlags(),
        fetchAdminSecurityAlerts(),
        fetchOutboxMetrics().catch(() => null),
        fetchDexPayStatus().catch(() => null),
      ]);
      setUsers(nextUsers as ManagedUser[]);
      setFlags(nextFlags);
      setAlerts(nextAlerts);
      setOutboxMetrics(nextOutbox);
      setDexPayStatus(nextDexPay);
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger le cockpit superadmin.');
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const maintenanceFlag = flags.find((flag) => flag.id === 'maintenance_mode') ?? null;
  const platformFlags = flags.filter((flag) => ['system', 'access', 'finance'].includes(String(flag.scope)));

  const stats = useMemo(() => {
    const activeAlerts = alerts.filter((alert) => alert.status === 'active').length;
    const outboxIssues = (outboxMetrics?.counts.failed ?? 0) + (outboxMetrics?.counts.dead ?? 0);
    const providerIssue = dexPayStatus && (!dexPayStatus.configured || dexPayStatus.reachable === false);

    return [
      {
        label: 'Superadmins actifs',
        value: users.filter((entry) => entry.role === 'superadmin' && entry.status === 'active').length,
        state: 'ok' as const,
      },
      {
        label: 'Alertes actives',
        value: activeAlerts,
        state: activeAlerts > 0 ? 'danger' as const : 'ok' as const,
      },
      {
        label: 'Outbox à traiter',
        value: outboxIssues,
        state: outboxIssues > 0 ? 'warning' as const : 'ok' as const,
      },
      {
        label: 'Provider',
        value: providerIssue ? 'À vérifier' : 'Stable',
        state: providerIssue ? 'warning' as const : 'ok' as const,
      },
    ];
  }, [alerts, dexPayStatus, outboxMetrics, users]);

  const toggleFlag = async (flag: AdminFeatureFlag) => {
    setBusyFlag(flag.id);
    try {
      const updated = await updateAdminFeatureFlag(flag.id, {
        enabled: !flag.enabled,
        updated_at: new Date().toISOString(),
        updated_by: user ? `${user.firstName} ${user.lastName}`.trim() : 'Super Admin',
      });
      setFlags((previous) => previous.map((entry) => entry.id === flag.id ? updated : entry));
      success(updated.enabled ? 'Fonction activée' : 'Fonction désactivée', updated.label);
    } catch (toggleError) {
      console.error(toggleError);
      error('Erreur', 'Impossible de modifier ce flag.');
    } finally {
      setBusyFlag(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb items={[{ label: 'Superadmin', path: '/superadmin/dashboard' }, { label: 'Cockpit' }]} />

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Superadmin uniquement</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Cockpit sensible C2P</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Vue synthétique des risques, accès rapides et activation des modes critiques.
              </p>
            </div>
            {maintenanceFlag ? (
              <div className={`rounded-2xl border px-4 py-3 ${maintenanceFlag.enabled ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Mode maintenance</p>
                    <p className="text-xs text-gray-600">{maintenanceFlag.enabled ? 'Plateforme bloquée pour les utilisateurs' : 'Plateforme ouverte'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyFlag !== null}
                    onClick={() => void toggleFlag(maintenanceFlag)}
                    className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${maintenanceFlag.enabled ? 'bg-red-500' : 'bg-gray-300'}`}
                    aria-pressed={maintenanceFlag.enabled}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${maintenanceFlag.enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-3xl border p-5 ${toneFromState(stat.state)}`}>
              <p className="text-xs font-medium">{stat.label}</p>
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Espaces superadmin</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {quickLinks.map((item) => (
                <Link key={item.path} to={item.path} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-teal-200 hover:bg-teal-50">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                      <i className={`${item.icon} text-lg`} aria-hidden="true"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Contrôles rapides</h2>
            <div className="mt-4 space-y-3">
              {platformFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{flag.label}</p>
                    <p className="text-xs text-gray-500">{flag.scope} · {flag.risk}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyFlag !== null}
                    onClick={() => void toggleFlag(flag)}
                    className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${flag.enabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                    aria-pressed={flag.enabled}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
