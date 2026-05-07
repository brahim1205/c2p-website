import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  changeAccountPassword,
  disable2FA,
  enable2FA,
  fetchSecurity,
  revokeAccountSession,
  revokeOtherAccountSessions,
  type AuditLogEntry,
  type SecuritySession,
} from '@/lib/accountApi';
import { formatDateTime } from '@/lib/formatters';

export default function SecurityPage() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadSecurity = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchSecurity(user.id);
      setSessions(payload.sessions);
      setAuditLogs(payload.auditLogs);
      setBackupCodes(payload.backupCodes);
      updateUser({ is2FAEnabled: payload.user.is2FAEnabled });
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les informations de sécurité.');
    } finally {
      setLoading(false);
    }
  }, [error, updateUser, user?.id]);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const currentSession = useMemo(() => sessions.find((session) => session.current), [sessions]);
  const otherSessions = useMemo(() => sessions.filter((session) => !session.current), [sessions]);

  const handlePasswordChange = async () => {
    if (!user?.id) return;
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      error('Champs incomplets', 'Renseignez tous les champs.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Confirmation invalide', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    try {
      await changeAccountPassword(user.id, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Mot de passe mis à jour', 'Le mot de passe du compte a été modifié.');
      loadSecurity();
    } catch (err) {
      console.error(err);
      error('Erreur', err instanceof Error ? err.message : 'Le mot de passe n a pas pu etre modifie.');
    }
  };

  const handleToggle2FA = async () => {
    if (!user?.id) return;

    try {
      if (user.is2FAEnabled) {
        const payload = await disable2FA(user.id);
        updateUser({ is2FAEnabled: payload.user.is2FAEnabled });
        setBackupCodes([]);
        success('2FA desactivee', 'L authentification a deux facteurs a ete retiree.');
      } else {
        const payload = await enable2FA(user.id);
        updateUser({ is2FAEnabled: payload.user.is2FAEnabled });
        setBackupCodes(payload.backupCodes);
        setShowBackupCodes(true);
        success('2FA activee', 'Les codes de secours ont ete generes.');
      }
      loadSecurity();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de modifier l etat de la double authentification.');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!user?.id) return;
    try {
      await revokeAccountSession(user.id, sessionId);
      success('Session revoquee', 'La session a ete deconnectee.');
      loadSecurity();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de revoquer la session.');
    }
  };

  const handleRevokeOthers = async () => {
    if (!user?.id) return;
    try {
      const payload = await revokeOtherAccountSessions(user.id);
      success('Sessions nettoyees', `${payload.removed} session(s) secondaire(s) ont ete revoquee(s).`);
      loadSecurity();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de revoquer les autres sessions.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Securite' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Securite du compte</h1>
          <p className="text-gray-600">Mot de passe, double authentification, sessions actives et journal d acces.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Double authentification</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {user?.is2FAEnabled
                      ? 'Le compte demande un code supplementaire a la connexion.'
                      : 'Ajoutez une verification supplementaire sur ce compte.'}
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    user?.is2FAEnabled
                      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      : 'bg-[#14B8A6] text-white hover:bg-[#0D9488]'
                  }`}
                >
                  {user?.is2FAEnabled ? 'Desactiver la 2FA' : 'Activer la 2FA'}
                </button>
              </div>

              {user?.is2FAEnabled && backupCodes.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Codes de secours disponibles</p>
                      <p className="text-sm text-amber-800 mt-1">Conservez-les hors ligne. Chaque code ne peut etre utilise qu une fois.</p>
                    </div>
                    <button
                      onClick={() => setShowBackupCodes(true)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-100"
                    >
                      Afficher
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-gray-900">Changer le mot de passe</h2>
              <div className="grid gap-4 mt-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  className="px-5 py-2.5 bg-[#14B8A6] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]"
                >
                  Mettre a jour
                </button>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sessions actives</h2>
                  <p className="text-sm text-gray-600 mt-1">Controlez les appareils actuellement connectes.</p>
                </div>
                <button
                  onClick={handleRevokeOthers}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Revoquer les autres sessions
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {loading && <p className="text-sm text-gray-500">Chargement des sessions...</p>}

                {currentSession && (
                  <div className="rounded-xl border border-[#14B8A6]/20 bg-[#14B8A6]/5 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{currentSession.device}</p>
                        <p className="text-sm text-gray-600">{currentSession.location} · {currentSession.ip}</p>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0D9488] border border-[#14B8A6]/20">
                        Session actuelle
                      </span>
                    </div>
                  </div>
                )}

                {otherSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{session.device}</p>
                        <p className="text-sm text-gray-600">{session.location} · {session.ip}</p>
                        <p className="text-xs text-gray-500 mt-1">Derniere activite: {formatDateTime(session.lastActive)}</p>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50"
                      >
                        Revoquer
                      </button>
                    </div>
                  </div>
                ))}

                {!loading && sessions.length === 0 && (
                  <p className="text-sm text-gray-500">Aucune session active detectee.</p>
                )}
              </div>
            </section>
          </div>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900">Journal recent</h2>
            <p className="text-sm text-gray-600 mt-1">Connexions, changements sensibles et activite compte.</p>
            <div className="mt-5 space-y-3">
              {loading && <p className="text-sm text-gray-500">Chargement du journal...</p>}
              {auditLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{entry.action}</p>
                      <p className="text-sm text-gray-600 mt-1">{entry.device} · {entry.ip}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(entry.timestamp)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.status === 'success' ? 'Succes' : 'Echec'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showBackupCodes && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Codes de secours</h3>
              <button onClick={() => setShowBackupCodes(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {backupCodes.map((code) => (
                <div key={code} className="rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900">
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
