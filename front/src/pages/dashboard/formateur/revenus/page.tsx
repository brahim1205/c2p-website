import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchFormateurRevenueSnapshot } from '@/lib/formateurDashboardApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  createPayoutAccount,
  createPayoutRequest,
  setDefaultPayoutAccount,
} from '@/lib/paymentsApi';
import { type PayoutAccount, type PayoutRequest } from '@/lib/saasApi';
import {
  AccountFormPanel,
  CourseRevenuePanel,
  PayoutAccountsPanel,
  PayoutBreakdownGrid,
  PayoutRequestFormPanel,
  PayoutRequestsPanel,
  RevenueTotalsGrid,
} from './RevenuePanels';
import {
  buildPayoutBreakdown,
  buildRevenueTotals,
  emptyAccountForm,
  type RevenueSnapshot,
} from './revenueModel';

export default function FormateurRevenuePage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [savingAccount, setSavingAccount] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');

  const revenueQueryKey = useMemo(() => queryKeys.formateur.revenue(user?.id), [user?.id]);
  const {
    data: revenueSnapshot,
    isLoading: loading,
    isError,
    error: revenueError,
  } = useQuery({
    queryKey: revenueQueryKey,
    queryFn: async () => fetchFormateurRevenueSnapshot(user?.id ?? '') as Promise<RevenueSnapshot>,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) {
      error('Erreur', 'Impossible de charger les revenus formateur.');
      console.error(revenueError);
    }
  }, [error, isError, revenueError]);

  useEffect(() => {
    const nextAccounts = revenueSnapshot?.accounts || [];
    if (nextAccounts.length === 0) {
      setSelectedAccountId('');
      return;
    }
    if (selectedAccountId && nextAccounts.some((item) => item.id === selectedAccountId)) {
      return;
    }
    setSelectedAccountId(nextAccounts.find((item) => item.is_default)?.id || nextAccounts[0]?.id || '');
  }, [revenueSnapshot?.accounts, selectedAccountId]);

  const courses = useMemo(() => revenueSnapshot?.courses || [], [revenueSnapshot?.courses]);
  const accounts = useMemo(() => revenueSnapshot?.accounts || [], [revenueSnapshot?.accounts]);
  const requests = useMemo(() => revenueSnapshot?.requests || [], [revenueSnapshot?.requests]);

  const refreshRevenue = async () => {
    await queryClient.invalidateQueries({ queryKey: revenueQueryKey });
  };

  const totals = useMemo(() => buildRevenueTotals(courses, requests), [courses, requests]);

  const payoutBreakdown = useMemo(() => buildPayoutBreakdown(requests), [requests]);

  const updateAccountForm = (patch: Partial<typeof accountForm>) => {
    setAccountForm((current) => ({ ...current, ...patch }));
  };

  const createAccount = async () => {
    if (!user?.id) return;
    if (!accountForm.account_name.trim() || !accountForm.account_identifier.trim() || !accountForm.label.trim()) {
      error('Champs requis', 'Renseignez le bénéficiaire, la référence et le libellé du compte.');
      return;
    }

    setSavingAccount(true);
    try {
      await createPayoutAccount({
        ...accountForm,
      });
      success('Compte ajouté', 'Le compte de retrait a été enregistré.');
      setAccountForm(emptyAccountForm);
      await refreshRevenue();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d’enregistrer le compte de retrait.');
    } finally {
      setSavingAccount(false);
    }
  };

  const markAsDefault = async (account: PayoutAccount) => {
    try {
      await setDefaultPayoutAccount(account.id);
      success('Compte principal mis à jour', `Le compte "${account.label}" devient le compte par défaut.`);
      await refreshRevenue();
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
      await createPayoutRequest({
        amount,
        account_id: selectedAccountId,
        note: payoutNote,
      });
      success('Demande envoyée', 'La demande de retrait a été enregistrée.');
      setPayoutAmount('');
      setPayoutNote('');
      await refreshRevenue();
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

        <RevenueTotalsGrid totals={totals} />
        <PayoutBreakdownGrid breakdown={payoutBreakdown} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <CourseRevenuePanel courses={courses} loading={loading} />
            <PayoutRequestsPanel requests={requests} />
          </div>

          <div className="space-y-6">
            <PayoutAccountsPanel accounts={accounts} onDefault={(account) => void markAsDefault(account)} />
            <AccountFormPanel
              accountForm={accountForm}
              savingAccount={savingAccount}
              onCreateAccount={() => void createAccount()}
              onFormChange={updateAccountForm}
            />
            <PayoutRequestFormPanel
              accounts={accounts}
              payoutAmount={payoutAmount}
              payoutNote={payoutNote}
              requestingPayout={requestingPayout}
              selectedAccountId={selectedAccountId}
              onAmountChange={setPayoutAmount}
              onNoteChange={setPayoutNote}
              onRequestPayout={() => void requestPayout()}
              onSelectedAccountChange={setSelectedAccountId}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
