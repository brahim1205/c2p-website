import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { createAdminBackup, fetchAdminSecurityOverview, forceSuspendUser, markAlertReviewed, updateAdminRule, type AdminBackup, type AdminRule, type AdminSecurityAlert } from '@/lib/adminApi';
import { ROLE_LABELS, type AuthUser } from '@/lib/roles';
import { downloadCsvFile } from '@/lib/downloads';

type AuditLog = { id: string; admin?: string; action: string; target?: string; timestamp: string; ip: string; status: string };

export default function AdminSecurityPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'backups' | 'settings'>('overview');
  const [securityStats, setSecurityStats] = useState({ totalUsers: 0, activeUsers: 0, suspendedAccounts: 0, failedLogins: 0, twoFactorEnabled: 0, securityAlerts: 0 });
  const [securityAlerts, setSecurityAlerts] = useState<AdminSecurityAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<AdminBackup[]>([]);
  const [rules, setRules] = useState<AdminRule[]>([]);
  const [users, setUsers] = useState<(AuthUser & { status: string })[]>([]);

  const loadSecurity = useCallback(async () => {
    try {
      const overview = await fetchAdminSecurityOverview();
      setSecurityStats(overview.securityStats);
      setSecurityAlerts(overview.securityAlerts);
      setAuditLogs(overview.auditLogs as AuditLog[]);
      setBackups(overview.backups);
      setRules(overview.rules);
      setUsers(overview.users as (AuthUser & { status: string })[]);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le bloc securite.');
    }
  }, [error]);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const saveRule = async (id: string, value: boolean | number) => {
    try {
      const updated = await updateAdminRule(id, { value });
      setRules((prev) => prev.map((rule) => rule.id === id ? updated : rule));
      success('Parametre mis a jour', updated.label);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Mise a jour impossible.');
    }
  };

  const createManualBackup = async () => {
    try {
      const created = await createAdminBackup({
        type: 'Manuel',
        date: new Date().toISOString(),
        size: '2.5 GB',
        status: 'completed',
        location: 'Cloud Storage',
        retention_days: Number(rules.find((rule) => rule.id === 'backup_retention_days')?.value ?? 30),
        provider: 'AWS S3',
        automatic: false,
      });
      setBackups((prev) => [created, ...prev]);
      success('Sauvegarde creee', 'La sauvegarde manuelle a ete enregistree.');
    } catch (err) {
      console.error(err);
      error('Erreur', 'La sauvegarde n a pas pu etre creee.');
    }
  };

  const handleExportLogs = () => {
    downloadCsvFile('admin-audit-logs.csv', auditLogs.map((log) => ({
      id: log.id,
      administrateur: log.admin ?? 'Admin',
      action: log.action,
      cible: log.target ?? '',
      timestamp: log.timestamp,
      ip: log.ip,
      statut: log.status,
    })));
    success('Export demarre', 'Le journal d audit a ete telecharge.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Securite' }]} />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Securite et protection</h1>
            <p className="text-gray-600">Gestion de la securite de la plateforme</p>
          </div>
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#14B8A6] rounded-2xl flex items-center justify-center">
            <i className="ri-shield-check-line text-white text-2xl lg:text-3xl"></i>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              ['overview', 'Vue d ensemble'],
              ['users', 'Utilisateurs'],
              ['logs', 'Journaux'],
              ['backups', 'Sauvegardes'],
              ['settings', 'Parametres'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`px-4 lg:px-6 py-4 font-medium whitespace-nowrap transition-colors text-sm ${activeTab === id ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]' : 'text-gray-600 hover:text-gray-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[
                { label: 'Utilisateurs actifs', value: securityStats.activeUsers, color: 'bg-teal-100', icon: 'ri-user-line text-teal-600' },
                { label: '2FA activee', value: securityStats.twoFactorEnabled, color: 'bg-green-100', icon: 'ri-shield-check-line text-green-600' },
                { label: 'Alertes actives', value: securityStats.securityAlerts, color: 'bg-red-100', icon: 'ri-alert-line text-red-600' },
                { label: 'Connexions echouees', value: securityStats.failedLogins, color: 'bg-yellow-100', icon: 'ri-error-warning-line text-yellow-600' },
                { label: 'Comptes suspendus', value: securityStats.suspendedAccounts, color: 'bg-orange-100', icon: 'ri-user-forbid-line text-orange-600' },
                { label: 'Total utilisateurs', value: securityStats.totalUsers, color: 'bg-teal-100', icon: 'ri-group-line text-teal-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}><i className={`${stat.icon} text-xl`}></i></div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Alertes de securite</h2>
                <button onClick={loadSecurity} className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg font-medium hover:bg-[#0D9488] transition-all whitespace-nowrap text-sm">Actualiser</button>
              </div>
              <div className="space-y-4">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${alert.type === 'critical' ? 'bg-red-50 border-red-500' : alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' : 'bg-teal-50 border-teal-500'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${alert.status === 'active' ? 'bg-red-100 text-red-700' : alert.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{alert.status}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                          <span>{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
                          {alert.ip && <span>IP: {alert.ip}</span>}
                          {alert.user && <span>{alert.user}</span>}
                          {alert.location && <span>{alert.location}</span>}
                        </div>
                      </div>
                      {alert.status === 'active' && (
                        <button onClick={() => void markAlertReviewed(alert.id).then(() => { success('Alerte traitee', alert.title); loadSecurity(); })} className="px-3 py-2 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488] transition-all whitespace-nowrap">
                          Traiter
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-600">{user.email} · {ROLE_LABELS[user.role]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                  {user.status !== 'suspended' && (
                    <button onClick={() => void forceSuspendUser(user.id).then(() => { success('Compte suspendu', user.email); loadSecurity(); })} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors whitespace-nowrap">
                      Suspendre
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">Journaux d audit administrateur</h2>
                <p className="text-gray-600">Historique des actions administratives</p>
              </div>
              <button onClick={handleExportLogs} className="px-6 py-3 bg-[#14B8A6] text-white rounded-lg font-semibold hover:bg-[#0D9488] transition-all whitespace-nowrap text-sm">Exporter</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Administrateur</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cible</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date et heure</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">IP</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">{log.admin || 'Admin'}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{log.action}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{log.target || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{log.ip}</td>
                      <td className="px-4 py-4"><span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'backups' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Historique des sauvegardes</h2>
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-gray-200 p-4 gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{backup.type} · {backup.size}</p>
                      <p className="text-sm text-gray-600">{new Date(backup.date).toLocaleString('fr-FR')} · {backup.location}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">{backup.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Sauvegarde manuelle</h2>
              <p className="text-gray-600 mb-6">Creer une sauvegarde immediate de toutes les donnees.</p>
              <button onClick={() => void createManualBackup()} className="px-6 py-3 bg-[#14B8A6] text-white rounded-lg font-semibold hover:bg-[#0D9488] transition-all whitespace-nowrap">Creer une sauvegarde maintenant</button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {[
              { id: 'force_https', label: 'Forcer HTTPS' },
              { id: 'tls_13_enabled', label: 'TLS 1.3' },
              { id: 'password_expiration', label: 'Expiration des mots de passe' },
              { id: 'backup_automatic', label: 'Sauvegardes automatiques' },
            ].map((item) => {
              const rule = rules.find((entry) => entry.id === item.id);
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{rule?.description}</p>
                  </div>
                  <input type="checkbox" checked={Boolean(rule?.value)} onChange={(e) => void saveRule(item.id, e.target.checked)} />
                </div>
              );
            })}
            {[
              { id: 'session_timeout', label: 'Duree de session (min)' },
              { id: 'max_login_attempts', label: 'Tentatives de connexion max' },
              { id: 'backup_retention_days', label: 'Retention des sauvegardes (jours)' },
            ].map((item) => {
              const rule = rules.find((entry) => entry.id === item.id);
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{rule?.description}</p>
                  </div>
                  <input type="number" value={Number(rule?.value || 0)} onChange={(e) => void saveRule(item.id, Number(e.target.value))} className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
