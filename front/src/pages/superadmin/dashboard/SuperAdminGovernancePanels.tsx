import type { AdminBackup, AdminFeatureFlag, AdminIntegration, AdminSecurityAlert } from '@/lib/adminApi';
import type { AuditLogEntry, SecuritySession } from '@/lib/accountApi';
import { ROLE_LABELS, type AuthUser } from '@/lib/roles';
import { riskTone, statusTone, type ManagedUser } from './superAdminGovernanceModel';

export function GovernanceStatsGrid({ stats }: { stats: Record<string, number> }) {
  const items = [
    ['Superadmins actifs', stats.superadmins],
    ['Admins', stats.admins],
    ['Suspendus', stats.suspended],
    ['Flags critiques off', stats.criticalFlagsOff],
    ['Alertes actives', stats.activeAlerts],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function GovernanceAccessPanel({
  actor,
  busy,
  onInspectSessions,
  onRefresh,
  onRevokeSessions,
  onUserPatch,
  sessionsByUser,
  users,
}: {
  actor: AuthUser | null | undefined;
  busy: string | null;
  onInspectSessions: (target: ManagedUser) => void;
  onRefresh: () => void;
  onRevokeSessions: (target: ManagedUser) => void;
  onUserPatch: (target: ManagedUser, patch: Partial<AuthUser> & { status?: ManagedUser['status'] }, label: string) => void;
  sessionsByUser: Record<string, SecuritySession[]>;
  users: ManagedUser[];
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Gouvernance des accès</h2>
          <p className="text-sm text-gray-500">Promotion, suspension et révocation de sessions réservées au superadmin.</p>
        </div>
        <button type="button" onClick={onRefresh} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Actualiser
        </button>
      </div>
      <div className="space-y-3">
        {users.map((entry) => (
          <GovernanceAccessCard
            key={entry.id}
            actor={actor}
            busy={busy}
            entry={entry}
            onInspectSessions={onInspectSessions}
            onRevokeSessions={onRevokeSessions}
            onUserPatch={onUserPatch}
            sessions={sessionsByUser[entry.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function GovernanceAccessCard({
  actor,
  busy,
  entry,
  onInspectSessions,
  onRevokeSessions,
  onUserPatch,
  sessions,
}: {
  actor: AuthUser | null | undefined;
  busy: string | null;
  entry: ManagedUser;
  onInspectSessions: (target: ManagedUser) => void;
  onRevokeSessions: (target: ManagedUser) => void;
  onUserPatch: (target: ManagedUser, patch: Partial<AuthUser> & { status?: ManagedUser['status'] }, label: string) => void;
  sessions: SecuritySession[];
}) {
  const isCurrentActor = actor?.id === entry.id;

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold text-gray-900">{entry.firstName} {entry.lastName}</p>
          <p className="text-sm text-gray-500">{entry.email} · {ROLE_LABELS[entry.role]}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(entry.status)}`}>{entry.status}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{entry.is2FAEnabled ? 'MFA actif' : 'MFA non actif'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {entry.role === 'admin' ? (
            <button type="button" disabled={busy !== null} onClick={() => onUserPatch(entry, { role: 'superadmin' }, 'promotion superadmin')} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
              Promouvoir
            </button>
          ) : null}
          {entry.role === 'superadmin' && !isCurrentActor ? (
            <button type="button" disabled={busy !== null} onClick={() => onUserPatch(entry, { role: 'admin' }, 'retour admin')} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Rétrograder
            </button>
          ) : null}
          <button type="button" disabled={busy !== null || isCurrentActor} onClick={() => onUserPatch(entry, { status: entry.status === 'suspended' ? 'active' : 'suspended' }, entry.status === 'suspended' ? 'réactivation' : 'suspension')} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">
            {entry.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => onInspectSessions(entry)} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
            Sessions
          </button>
          <button type="button" disabled={busy !== null} onClick={() => onRevokeSessions(entry)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            Révoquer
          </button>
        </div>
      </div>
      {sessions.length > 0 ? (
        <div className="mt-3 rounded-2xl bg-gray-50 p-3">
          {sessions.slice(0, 3).map((session) => (
            <p key={session.id} className="text-xs text-gray-600">
              {session.device} · {session.ip} · {new Date(session.lastActive).toLocaleString('fr-FR')}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FeatureFlagsPanel({ busy, flags, onToggle }: { busy: string | null; flags: AdminFeatureFlag[]; onToggle: (flag: AdminFeatureFlag) => void }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Feature flags sensibles</h2>
      <div className="mt-4 space-y-3">
        {flags.map((flag) => (
          <div key={flag.id} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{flag.label}</p>
                <p className="mt-1 text-sm text-gray-500">{flag.description}</p>
              </div>
              <button type="button" disabled={busy !== null} onClick={() => onToggle(flag)} className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${flag.enabled ? 'bg-teal-500' : 'bg-gray-300'}`} aria-pressed={flag.enabled}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{flag.scope}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskTone(flag.risk)}`}>{flag.risk}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsPanel({ busy, integrations, onToggle }: { busy: string | null; integrations: AdminIntegration[]; onToggle: (integration: AdminIntegration) => void }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Providers et intégrations</h2>
      <div className="mt-4 space-y-3">
        {integrations.map((integration) => (
          <div key={integration.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4">
            <div>
              <p className="font-semibold text-gray-900">{integration.name}</p>
              <p className="text-xs text-gray-500">{integration.description}</p>
            </div>
            <button type="button" disabled={busy !== null} onClick={() => onToggle(integration)} className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(integration.status)} disabled:opacity-50`}>
              {integration.status === 'connected' ? 'Activé' : 'Désactivé'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecurityAlertsPanel({ alerts, onReviewed }: { alerts: AdminSecurityAlert[]; onReviewed: (alertId: number) => void }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Alertes sécurité</h2>
      <div className="mt-4 space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-900">{alert.title}</p>
            <p className="mt-1 text-sm text-gray-500">{alert.description}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(alert.status)}`}>{alert.status}</span>
              {alert.status === 'active' ? (
                <button type="button" onClick={() => onReviewed(alert.id)} className="text-xs font-medium text-teal-700 hover:text-teal-900">
                  Marquer traité
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BackupsPanel({ backups, busy, onCreateBackup }: { backups: AdminBackup[]; busy: string | null; onCreateBackup: () => void }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Sauvegardes</h2>
        <button type="button" disabled={busy !== null} onClick={onCreateBackup} className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          Snapshot
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {backups.slice(0, 5).map((backup) => (
          <div key={backup.id} className="rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-900">{backup.type} · {backup.size}</p>
            <p className="mt-1 text-xs text-gray-500">{new Date(backup.date).toLocaleString('fr-FR')} · {backup.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditLogPanel({ logs }: { logs: (AuditLogEntry & { admin?: string; target?: string })[] }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Audit récent</h2>
      <div className="mt-4 space-y-3">
        {logs.slice(0, 6).map((log) => (
          <div key={log.id} className="rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-900">{log.action}</p>
            <p className="mt-1 text-xs text-gray-500">{log.admin ?? log.userId} · {new Date(log.timestamp).toLocaleString('fr-FR')}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(log.status)}`}>{log.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
