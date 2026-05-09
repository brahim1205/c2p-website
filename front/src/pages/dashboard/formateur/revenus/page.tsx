import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';

interface CourseRevenue {
  id: string | number;
  title: string;
  revenue: number;
  students_count: number;
  current_price?: number;
}

interface PayoutAccount {
  id: string;
  user_id: string;
  method: 'bank' | 'paypal' | 'orange_money' | 'wave' | 'free_money' | 'mtn_money';
  account_name: string;
  account_identifier: string;
  label: string;
  is_default: boolean;
  status?: 'active' | 'archived';
}

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: PayoutAccount['method'];
  account_id: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  requested_at: string;
  processed_at?: string | null;
  note?: string;
  account_label?: string | null;
}

const methodLabels: Record<PayoutAccount['method'], string> = {
  bank: 'Virement bancaire',
  paypal: 'PayPal',
  orange_money: 'Orange Money',
  wave: 'Wave',
  free_money: 'Free Money',
  mtn_money: 'MTN Mobile Money',
};

const emptyAccountForm = {
  method: 'bank' as PayoutAccount['method'],
  account_name: '',
  account_identifier: '',
  label: '',
  is_default: false,
};

export default function FormateurRevenuePage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [courses, setCourses] = useState<CourseRevenue[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');

  const loadPage = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [coursesRes, accountsRes, requestsRes] = await Promise.all([
        backendClient.from<CourseRevenue>('courses').select('*').eq('instructor_id', user.id).order('updated_at', { ascending: false }),
        backendClient.from<PayoutAccount>('payout_accounts').select('*').order('updated_at', { ascending: false }),
        backendClient.from<PayoutRequest>('payout_requests').select('*').order('requested_at', { ascending: false }),
      ]);
      if (coursesRes.error) throw coursesRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (requestsRes.error) throw requestsRes.error;
      const nextAccounts = accountsRes.data || [];
      setCourses(coursesRes.data || []);
      setAccounts(nextAccounts);
      setRequests(requestsRes.data || []);
      setSelectedAccountId(nextAccounts.find((item) => item.is_default)?.id || nextAccounts[0]?.id || '');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les revenus formateur.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const totals = useMemo(() => {
    const grossRevenue = courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0);
    const paidOut = requests.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pending = requests.filter((item) => item.status === 'pending' || item.status === 'approved').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      grossRevenue,
      paidOut,
      pending,
      available: Math.max(grossRevenue - paidOut - pending, 0),
    };
  }, [courses, requests]);

  const createAccount = async () => {
    if (!user?.id) return;
    if (!accountForm.account_name.trim() || !accountForm.account_identifier.trim() || !accountForm.label.trim()) {
      error('Champs requis', 'Renseignez le bénéficiaire, la référence et le libellé du compte.');
      return;
    }

    setSavingAccount(true);
    try {
      if (accountForm.is_default) {
        await Promise.all(accounts.map((account) => backendClient.from('payout_accounts').update({ is_default: false }).eq('id', account.id)));
      }
      const response = await backendClient.from('payout_accounts').insert({
        user_id: user.id,
        ...accountForm,
      });
      if (response.error) throw response.error;
      success('Compte ajouté', 'Le compte de retrait a été enregistré.');
      setAccountForm(emptyAccountForm);
      await loadPage();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d’enregistrer le compte de retrait.');
    } finally {
      setSavingAccount(false);
    }
  };

  const markAsDefault = async (account: PayoutAccount) => {
    try {
      await Promise.all([
        ...accounts.filter((item) => item.is_default && item.id !== account.id).map((item) => backendClient.from('payout_accounts').update({ is_default: false }).eq('id', item.id)),
        backendClient.from('payout_accounts').update({ is_default: true }).eq('id', account.id),
      ]);
      success('Compte principal mis à jour', `Le compte "${account.label}" devient le compte par défaut.`);
      await loadPage();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de définir ce compte comme principal.');
    }
  };

  const requestPayout = async () => {
    if (!user?.id) return;
    const amount = Number(payoutAmount);
    if (!selectedAccountId) {
      error('Compte requis', 'Ajoutez ou sélectionnez un compte de retrait.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 1000) {
      error('Montant invalide', 'Le montant minimum de retrait est fixé à 1 000 FCFA.');
      return;
    }
    if (amount > totals.available) {
      error('Solde insuffisant', 'Le montant dépasse le disponible réellement retirable.');
      return;
    }

    setRequestingPayout(true);
    try {
      const account = accounts.find((item) => item.id === selectedAccountId);
      const response = await backendClient.from('payout_requests').insert({
        user_id: user.id,
        amount,
        account_id: selectedAccountId,
        method: account?.method,
        note: payoutNote,
      });
      if (response.error) throw response.error;
      success('Demande envoyée', 'La demande de retrait a été enregistrée.');
      setPayoutAmount('');
      setPayoutNote('');
      await loadPage();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d’enregistrer la demande de retrait.');
    } finally {
      setRequestingPayout(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Revenus' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Revenus et retraits</h1>
          <p className="mt-2 text-gray-600">Suivez vos ventes, vos comptes de retrait et les versements en attente.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Revenus bruts', value: `${totals.grossRevenue.toLocaleString('fr-FR')} FCFA`, color: 'text-gray-900' },
            { label: 'Disponible', value: `${totals.available.toLocaleString('fr-FR')} FCFA`, color: 'text-emerald-700' },
            { label: 'En attente', value: `${totals.pending.toLocaleString('fr-FR')} FCFA`, color: 'text-amber-700' },
            { label: 'Déjà versé', value: `${totals.paidOut.toLocaleString('fr-FR')} FCFA`, color: 'text-blue-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-sm text-gray-500">{item.label}</div>
              <div className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Formations les plus contributrices</h2>
              <div className="space-y-3">
                {(loading ? [] : courses).map((course) => (
                  <div key={course.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{course.title}</div>
                      <div className="text-sm text-gray-500">{course.students_count} apprenants</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{Number(course.revenue || 0).toLocaleString('fr-FR')} FCFA</div>
                      <div className="text-xs text-gray-500">{Number(course.current_price || 0).toLocaleString('fr-FR')} FCFA / inscription</div>
                    </div>
                  </div>
                ))}
                {!loading && courses.length === 0 ? <p className="text-sm text-gray-500">Aucune donnée de revenu disponible pour le moment.</p> : null}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Historique des retraits</h2>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-gray-900">{Number(request.amount).toLocaleString('fr-FR')} {request.currency}</div>
                        <div className="text-sm text-gray-500">{request.account_label || methodLabels[request.method]}</div>
                        <div className="mt-1 text-xs text-gray-500">Demandé le {new Date(request.requested_at).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        request.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : request.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : request.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                      }`}>
                        {request.status === 'paid' ? 'Payé' : request.status === 'rejected' ? 'Rejeté' : request.status === 'cancelled' ? 'Annulé' : 'En traitement'}
                      </span>
                    </div>
                    {request.note ? <p className="mt-3 text-sm text-gray-600">{request.note}</p> : null}
                  </div>
                ))}
                {!requests.length ? <p className="text-sm text-gray-500">Aucune demande de retrait pour le moment.</p> : null}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Comptes de retrait</h2>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-gray-900">{account.label}</div>
                        <div className="text-sm text-gray-500">{methodLabels[account.method]}</div>
                        <div className="mt-1 text-xs text-gray-500">{account.account_name} • {account.account_identifier}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {account.is_default ? (
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">Par défaut</span>
                        ) : (
                          <button onClick={() => void markAsDefault(account)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Définir par défaut
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!accounts.length ? <p className="text-sm text-gray-500">Ajoutez au moins un compte de retrait.</p> : null}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Ajouter un compte</h2>
              <div className="space-y-4">
                <select value={accountForm.method} onChange={(e) => setAccountForm((current) => ({ ...current, method: e.target.value as PayoutAccount['method'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                  {Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={accountForm.account_name} onChange={(e) => setAccountForm((current) => ({ ...current, account_name: e.target.value }))} placeholder="Nom du bénéficiaire" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <input value={accountForm.account_identifier} onChange={(e) => setAccountForm((current) => ({ ...current, account_identifier: e.target.value }))} placeholder="IBAN, numéro ou identifiant" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <input value={accountForm.label} onChange={(e) => setAccountForm((current) => ({ ...current, label: e.target.value }))} placeholder="Libellé interne" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <input type="checkbox" checked={accountForm.is_default} onChange={(e) => setAccountForm((current) => ({ ...current, is_default: e.target.checked }))} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  Compte principal
                </label>
                <button onClick={() => void createAccount()} disabled={savingAccount} className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingAccount ? 'Enregistrement...' : 'Ajouter le compte'}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Demander un retrait</h2>
              <div className="space-y-4">
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                  <option value="">Sélectionner un compte</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.label} • {methodLabels[account.method]}</option>)}
                </select>
                <input type="number" min={1000} value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Montant à retirer (FCFA)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <textarea value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} rows={3} placeholder="Note interne ou contexte du retrait" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                <button onClick={() => void requestPayout()} disabled={requestingPayout || !accounts.length} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
                  {requestingPayout ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
