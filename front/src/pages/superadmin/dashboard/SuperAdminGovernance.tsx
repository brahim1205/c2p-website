import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import {
  createAdminBackup,
  fetchAdminAuditLogs,
  fetchAdminBackups,
  fetchAdminFeatureFlags,
  fetchAdminIntegrations,
  fetchAdminSecurityAlerts,
  markAlertReviewed,
  updateAdminFeatureFlag,
  updateAdminIntegration,
  type AdminBackup,
  type AdminFeatureFlag,
  type AdminIntegration,
  type AdminSecurityAlert,
} from '@/lib/adminApi';
import { fetchSecurity, fetchUsers, revokeOtherAccountSessions, updateManagedUser, type AuditLogEntry, type SecuritySession } from '@/lib/accountApi';
import type { AuthUser } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import {
  AuditLogPanel,
  BackupsPanel,
  FeatureFlagsPanel,
  GovernanceAccessPanel,
  GovernanceStatsGrid,
  IntegrationsPanel,
  SecurityAlertsPanel,
} from './SuperAdminGovernancePanels';
import {
  getGovernanceStats,
  privilegedRoles,
  type ManagedUser,
} from './superAdminGovernanceModel';

export default function SuperAdminGovernance() {
  const { user: actor } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [alerts, setAlerts] = useState<AdminSecurityAlert[]>([]);
  const [logs, setLogs] = useState<(AuditLogEntry & { admin?: string; target?: string })[]>([]);
  const [backups, setBackups] = useState<AdminBackup[]>([]);
  const [sessionsByUser, setSessionsByUser] = useState<Record<string, SecuritySession[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextUsers, nextFlags, nextIntegrations, nextAlerts, nextLogs, nextBackups] = await Promise.all([
        fetchUsers(),
        fetchAdminFeatureFlags(),
        fetchAdminIntegrations(),
        fetchAdminSecurityAlerts(),
        fetchAdminAuditLogs(),
        fetchAdminBackups(),
      ]);
      setUsers(nextUsers as ManagedUser[]);
      setFlags(nextFlags);
      setIntegrations(nextIntegrations);
      setAlerts(nextAlerts);
      setLogs(nextLogs as (AuditLogEntry & { admin?: string; target?: string })[]);
      setBackups(nextBackups);
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger la gouvernance superadmin.');
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => getGovernanceStats({ alerts, flags, users }), [alerts, flags, users]);

  const privilegedUsers = useMemo(
    () => users.filter((entry) => privilegedRoles.has(entry.role)).sort((left, right) => left.role.localeCompare(right.role)),
    [users],
  );

  const runUserPatch = async (target: ManagedUser, patch: Partial<AuthUser> & { status?: ManagedUser['status'] }, label: string) => {
    setBusy(`${target.id}:${label}`);
    try {
      const updated = await updateManagedUser(target.id, patch);
      setUsers((previous) => previous.map((entry) => entry.id === target.id ? { ...entry, ...(updated as ManagedUser) } : entry));
      success('Accès mis à jour', `${target.email} · ${label}`);
    } catch (patchError) {
      console.error(patchError);
      error('Action refusée', 'La modification superadmin n a pas pu être appliquée.');
    } finally {
      setBusy(null);
    }
  };

  const revokeSessions = async (target: ManagedUser) => {
    setBusy(`${target.id}:sessions`);
    try {
      const result = await revokeOtherAccountSessions(target.id);
      success('Sessions révoquées', `${result.removed} session(s) fermée(s).`);
      const security = await fetchSecurity(target.id);
      setSessionsByUser((previous) => ({ ...previous, [target.id]: security.sessions }));
    } catch (revokeError) {
      console.error(revokeError);
      error('Erreur', 'Impossible de révoquer les sessions.');
    } finally {
      setBusy(null);
    }
  };

  const inspectSessions = async (target: ManagedUser) => {
    setBusy(`${target.id}:inspect`);
    try {
      const security = await fetchSecurity(target.id);
      setSessionsByUser((previous) => ({ ...previous, [target.id]: security.sessions }));
    } catch (inspectError) {
      console.error(inspectError);
      error('Erreur', 'Impossible de charger les sessions.');
    } finally {
      setBusy(null);
    }
  };

  const toggleFlag = async (flag: AdminFeatureFlag) => {
    setBusy(`flag:${flag.id}`);
    try {
      const updated = await updateAdminFeatureFlag(flag.id, {
        enabled: !flag.enabled,
        updated_at: new Date().toISOString(),
        updated_by: actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'Super Admin',
      });
      setFlags((previous) => previous.map((entry) => entry.id === flag.id ? updated : entry));
      success(updated.enabled ? 'Fonction activée' : 'Fonction désactivée', updated.label);
    } catch (flagError) {
      console.error(flagError);
      error('Erreur', 'Impossible de modifier ce feature flag.');
    } finally {
      setBusy(null);
    }
  };

  const toggleIntegration = async (integration: AdminIntegration) => {
    setBusy(`integration:${integration.id}`);
    try {
      const updated = await updateAdminIntegration(integration.id, {
        status: integration.status === 'connected' ? 'disconnected' : 'connected',
        lastSync: new Date().toLocaleString('fr-FR'),
      });
      setIntegrations((previous) => previous.map((entry) => entry.id === integration.id ? updated : entry));
      success(updated.status === 'connected' ? 'Provider activé' : 'Provider désactivé', updated.name);
    } catch (integrationError) {
      console.error(integrationError);
      error('Erreur', 'Impossible de modifier cette intégration.');
    } finally {
      setBusy(null);
    }
  };

  const createBackup = async () => {
    setBusy('backup:create');
    try {
      const created = await createAdminBackup({
        type: 'Manuel superadmin',
        date: new Date().toISOString(),
        size: '2.5 GB',
        status: 'completed',
        location: 'Cloud Storage',
        retention_days: 30,
        provider: 'AWS S3',
        automatic: false,
      });
      setBackups((previous) => [created, ...previous]);
      success('Sauvegarde enregistrée', 'Le snapshot manuel est disponible dans l historique.');
    } catch (backupError) {
      console.error(backupError);
      error('Erreur', 'Impossible de créer la sauvegarde.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-6">
      <GovernanceStatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <GovernanceAccessPanel
          actor={actor}
          busy={busy}
          onInspectSessions={(target) => void inspectSessions(target)}
          onRefresh={() => void load()}
          onRevokeSessions={(target) => void revokeSessions(target)}
          onUserPatch={(target, patch, label) => void runUserPatch(target, patch, label)}
          sessionsByUser={sessionsByUser}
          users={privilegedUsers}
        />

        <div className="space-y-6">
          <FeatureFlagsPanel busy={busy} flags={flags} onToggle={(flag) => void toggleFlag(flag)} />
          <IntegrationsPanel busy={busy} integrations={integrations} onToggle={(integration) => void toggleIntegration(integration)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SecurityAlertsPanel alerts={alerts} onReviewed={(alertId) => void markAlertReviewed(alertId).then(load)} />
        <BackupsPanel backups={backups} busy={busy} onCreateBackup={() => void createBackup()} />
        <AuditLogPanel logs={logs} />
      </div>
    </section>
  );
}
