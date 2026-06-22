import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  activateProjectFundingCommitment,
  fetchAdminProjectFundingCommitments,
  markProjectFundingInstallmentPaid,
  reviewProjectFundingCommitment,
  type ProjectFundingCommitment,
} from '@/lib/projectApi';
import { openProjectFundingContract } from '@/lib/downloads/projectFundingContract';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

const statusLabels: Record<string, string> = {
  pending_c2p_validation: 'À valider',
  approved_contract_ready: 'Contrat prêt',
  rejected: 'Refusée',
  active: 'Active',
  completed: 'Terminée',
};

export default function AdminProjectFinancingPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProjectFundingCommitment | null>(null);
  const [reason, setReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false);
  const commitmentsQuery = useQuery({
    queryKey: queryKeys.admin.projectFunding(),
    queryFn: fetchAdminProjectFundingCommitments,
    refetchInterval: 5000,
  });
  const commitments = useMemo(() => commitmentsQuery.data ?? [], [commitmentsQuery.data]);
  const pending = commitments.filter((item) => item.status === 'pending_c2p_validation').length;
  const active = commitments.filter((item) => item.status === 'active').length;
  const total = commitments.filter((item) => ['active', 'completed'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);

  const refresh = async (updated?: ProjectFundingCommitment) => {
    if (updated) setSelected(updated);
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.projectFunding() });
  };
  const review = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await reviewProjectFundingCommitment(selected.id, decision, reason);
      success(decision === 'approve' ? 'Souscription validée' : 'Souscription refusée', updated.project_title);
      setReason('');
      await refresh(updated);
    } catch (err) {
      console.error(err);
      error('Erreur', 'La décision n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  };
  const activate = async () => {
    if (!selected || !paymentReference.trim()) return;
    setBusy(true);
    try {
      const updated = await activateProjectFundingCommitment(selected.id, paymentReference.trim());
      success('Financement activé', 'Le transfert est confirmé et l’échéancier est maintenant actif.');
      setPaymentReference('');
      await refresh(updated);
    } catch (err) {
      console.error(err);
      error('Activation impossible', 'Vérifiez la référence et le statut du contrat.');
    } finally {
      setBusy(false);
    }
  };
  const markPaid = async (period: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await markProjectFundingInstallmentPaid(selected.id, period);
      success('Échéance confirmée', `La période ${period} est marquée comme remboursée.`);
      await refresh(updated);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de confirmer cette échéance.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Financements projets' }]} />
        <div className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Contrôle contractuel C2P</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Financements participatifs</h1>
          <p className="mt-2 text-gray-600">Validez les parties, consultez la convention, confirmez le transfert puis suivez les remboursements.</p>
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Metric label="À valider" value={String(pending)} />
          <Metric label="Financements actifs" value={String(active)} />
          <Metric label="Montant activé" value={formatCurrency(total)} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-3">
            {commitmentsQuery.isLoading ? <p className="text-sm text-gray-500">Chargement...</p> : null}
            {commitments.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-2xl border bg-white p-4 text-left ${selected?.id === item.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-900">{item.project_title}</h2><p className="mt-1 text-sm text-gray-500">{item.partner_name ?? item.partner_id}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{statusLabels[item.status] ?? item.status}</span></div>
                <div className="mt-3 flex items-center justify-between text-sm"><strong>{formatCurrency(item.amount)}</strong><span className="text-gray-500">{formatDate(item.created_at)}</span></div>
              </button>
            ))}
          </section>
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {!selected ? <div className="flex min-h-80 items-center justify-center text-gray-500">Sélectionnez une souscription.</div> : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-gray-900">{selected.project_title}</h2><p className="text-sm text-gray-500">Référence {selected.id} · badge {selected.partner_badge}</p></div><button onClick={() => openProjectFundingContract(selected)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Voir le contrat</button></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Part" value={formatCurrency(selected.amount)} compact /><Metric label="Gain estimé" value={formatCurrency(selected.projected_profit + selected.projected_interest)} compact /><Metric label="Remboursé" value={formatCurrency(selected.total_repaid ?? 0)} compact /></div>
                {selected.status === 'pending_c2p_validation' ? (
                  <div className="mt-6 space-y-3"><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Note ou motif de décision" className="w-full rounded-xl border border-gray-300 p-3 text-sm" rows={3} /><div className="flex gap-3"><button disabled={busy} onClick={() => void review('reject')} className="flex-1 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700">Refuser</button><button disabled={busy} onClick={() => void review('approve')} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Valider</button></div></div>
                ) : null}
                {selected.status === 'approved_contract_ready' ? (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4"><label className="text-sm font-semibold text-blue-950">Référence du transfert vérifié</label><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-200 px-4 py-3" placeholder="Ex: BANQUE-2026-000123" /><button disabled={busy || !paymentReference.trim()} onClick={() => void activate()} className="mt-3 w-full rounded-xl bg-[#27346b] px-4 py-3 font-semibold text-white disabled:opacity-50">Confirmer et activer</button></div>
                ) : null}
                {['active', 'completed'].includes(selected.status) ? (
                  <div className="mt-6 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">Montant</th><th className="px-3 py-2">État</th><th className="px-3 py-2"></th></tr></thead><tbody>{(selected.schedule ?? []).map((entry) => <tr key={entry.period} className="border-b border-gray-100"><td className="px-3 py-2">{entry.period}</td><td className="px-3 py-2">{formatCurrency(entry.payment)}</td><td className="px-3 py-2">{entry.status === 'paid' ? 'Payée' : 'À payer'}</td><td className="px-3 py-2 text-right">{entry.status !== 'paid' && selected.status === 'active' ? <button disabled={busy} onClick={() => void markPaid(entry.period)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Confirmer</button> : null}</td></tr>)}</tbody></table></div>
                ) : null}
                {selected.review_reason ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">Motif : {selected.review_reason}</p> : null}
              </>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? 'p-3' : 'p-5'}`}><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>;
}
