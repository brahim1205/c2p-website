import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  activateProjectFundingCommitment,
  fetchAdminProjectFundingCommitments,
  flagProjectOpportunity,
  markProjectFundingInstallmentPaid,
  reviewProjectFundingCommitment,
  type ProjectFundingCommitment,
} from '@/lib/projectApi';
import { openProjectFundingContract } from '@/lib/downloads/projectFundingContract';
import { formatCurrency, formatDate, formatShortCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';

type FinancingFilter = 'all' | 'pending' | 'contract' | 'active' | 'completed' | 'rejected';

const statusLabels: Record<string, string> = {
  pending_c2p_validation: 'À valider',
  approved_contract_ready: 'Contrat prêt',
  rejected: 'Refusée',
  active: 'Active',
  completed: 'Terminée',
};

const statusClasses: Record<string, string> = {
  pending_c2p_validation: 'bg-amber-100 text-amber-800',
  approved_contract_ready: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-700',
};

const fundingTypeLabels: Record<string, string> = {
  donation: 'Don',
  profit_share_loan: 'Prêt sans intérêt + bénéfice',
  interest_loan: 'Prêt avec intérêt',
};

export default function AdminProjectFinancingPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ProjectFundingCommitment | null>(null);
  const [activeFilter, setActiveFilter] = useState<FinancingFilter>('pending');
  const [reason, setReason] = useState('');
  const [flagForm, setFlagForm] = useState({ projectId: '', partnerId: '', reason: '' });
  const [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false);

  const commitmentsQuery = useQuery({
    queryKey: queryKeys.admin.projectFunding(),
    queryFn: fetchAdminProjectFundingCommitments,
    refetchInterval: 5000,
  });

  const commitments = useMemo(() => commitmentsQuery.data ?? [], [commitmentsQuery.data]);
  const selectedCommitment = selected && commitments.find((item) => item.id === selected.id) ? selected : commitments[0] ?? null;

  const counts = useMemo(() => ({
    all: commitments.length,
    pending: commitments.filter((item) => item.status === 'pending_c2p_validation').length,
    contract: commitments.filter((item) => item.status === 'approved_contract_ready').length,
    active: commitments.filter((item) => item.status === 'active').length,
    completed: commitments.filter((item) => item.status === 'completed').length,
    rejected: commitments.filter((item) => item.status === 'rejected').length,
  }), [commitments]);

  const filteredCommitments = useMemo(() => {
    if (activeFilter === 'all') return commitments;
    const statusByFilter: Record<Exclude<FinancingFilter, 'all'>, string> = {
      pending: 'pending_c2p_validation',
      contract: 'approved_contract_ready',
      active: 'active',
      completed: 'completed',
      rejected: 'rejected',
    };
    return commitments.filter((item) => item.status === statusByFilter[activeFilter]);
  }, [activeFilter, commitments]);

  const activeTotal = commitments
    .filter((item) => ['active', 'completed'].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const expectedTotal = commitments
    .filter((item) => ['approved_contract_ready', 'active', 'completed'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.total_expected ?? item.amount), 0);
  const pendingInstallments = commitments
    .filter((item) => item.status === 'active')
    .reduce((sum, item) => sum + (item.schedule ?? []).filter((entry) => entry.status !== 'paid').length, 0);

  const refresh = async (updated?: ProjectFundingCommitment) => {
    if (updated) setSelected(updated);
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.projectFunding() });
  };

  const review = async (decision: 'approve' | 'reject') => {
    if (!selectedCommitment) return;
    setBusy(true);
    try {
      const updated = await reviewProjectFundingCommitment(selectedCommitment.id, decision, reason);
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
    if (!selectedCommitment || !paymentReference.trim()) return;
    setBusy(true);
    try {
      const updated = await activateProjectFundingCommitment(selectedCommitment.id, paymentReference.trim());
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

  const flagOpportunity = async () => {
    if (!flagForm.projectId.trim() || !flagForm.partnerId.trim()) {
      error('Champs incomplets', 'Renseignez le projet et le partenaire à notifier.');
      return;
    }
    setBusy(true);
    try {
      await flagProjectOpportunity({
        projectId: flagForm.projectId.trim(),
        partnerId: flagForm.partnerId.trim(),
        reason: flagForm.reason.trim() || undefined,
      });
      success('Opportunité signalée', 'Le partenaire recevra une alerte C2P dans son espace.');
      setFlagForm({ projectId: '', partnerId: '', reason: '' });
    } catch (err) {
      console.error(err);
      error('Signalement impossible', 'Vérifiez les identifiants projet et partenaire.');
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (period: number) => {
    if (!selectedCommitment) return;
    setBusy(true);
    try {
      const updated = await markProjectFundingInstallmentPaid(selectedCommitment.id, period);
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
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Financements projets' }]} />

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Contrôle C2P</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Financements projets</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 md:text-base">
                Validez les souscriptions, confirmez les transferts, suivez les remboursements et signalez les opportunités aux partenaires.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[420px]">
              <Metric label="À valider" value={String(counts.pending)} tone="amber" />
              <Metric label="Activés" value={formatShortCurrency(activeTotal)} tone="emerald" />
              <Metric label="Échéances" value={String(pendingInstallments)} tone="blue" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Contrats prêts" value={String(counts.contract)} />
          <Metric label="Financements actifs" value={String(counts.active)} />
          <Metric label="Montant attendu" value={formatShortCurrency(expectedTotal)} />
          <Metric label="Terminés" value={String(counts.completed)} />
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <details>
            <summary className="cursor-pointer list-none text-base font-bold text-amber-950">
              Flagger une opportunité partenaire <i className="ri-arrow-down-s-line align-middle"></i>
            </summary>
            <p className="mt-1 text-sm text-amber-900">Utilisez cette action quand C2P veut pousser un projet précis vers un partenaire selon son badge ou son expertise.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
              <Field label="ID projet" value={flagForm.projectId} placeholder="Ex: 4001" onChange={(value) => setFlagForm((current) => ({ ...current, projectId: value }))} />
              <Field label="ID partenaire" value={flagForm.partnerId} placeholder="Ex: usr-partenaire" onChange={(value) => setFlagForm((current) => ({ ...current, partnerId: value }))} />
              <Field label="Raison affichée" value={flagForm.reason} placeholder="Opportunité adaptée à votre badge" onChange={(value) => setFlagForm((current) => ({ ...current, reason: value }))} />
              <button disabled={busy} onClick={() => void flagOpportunity()} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Notifier
              </button>
            </div>
          </details>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <div className="flex gap-2 overflow-x-auto">
                {([
                  ['pending', 'À valider'],
                  ['contract', 'Contrats'],
                  ['active', 'Actifs'],
                  ['completed', 'Terminés'],
                  ['rejected', 'Refusés'],
                  ['all', 'Tous'],
                ] as Array<[FinancingFilter, string]>).map(([key, label]) => (
                  <button key={key} onClick={() => setActiveFilter(key)} className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${activeFilter === key ? 'bg-[#27346b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {label} ({counts[key]})
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[720px] overflow-y-auto p-3">
              {commitmentsQuery.isLoading ? <p className="p-4 text-sm text-gray-500">Chargement...</p> : null}
              {!commitmentsQuery.isLoading && filteredCommitments.length === 0 ? <p className="p-4 text-sm text-gray-500">Aucun financement dans cette catégorie.</p> : null}
              {filteredCommitments.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item)} className={`mb-3 w-full rounded-2xl border p-4 text-left transition ${selectedCommitment?.id === item.id ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-gray-900">{item.project_title}</h2>
                      <p className="mt-1 text-sm text-gray-500">{item.partner_name ?? item.partner_id} · badge {item.partner_badge}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <SmallFact label="Part" value={formatShortCurrency(item.amount)} />
                    <SmallFact label="Gain" value={formatShortCurrency(item.projected_profit + item.projected_interest)} />
                    <SmallFact label="Créé le" value={formatDate(item.created_at)} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <FinancingDetail
            busy={busy}
            commitment={selectedCommitment}
            paymentReference={paymentReference}
            reason={reason}
            onActivate={() => void activate()}
            onMarkPaid={(period) => void markPaid(period)}
            onPaymentReferenceChange={setPaymentReference}
            onReasonChange={setReason}
            onReview={(decision) => void review(decision)}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function FinancingDetail({
  busy,
  commitment,
  paymentReference,
  reason,
  onActivate,
  onMarkPaid,
  onPaymentReferenceChange,
  onReasonChange,
  onReview,
}: {
  busy: boolean;
  commitment: ProjectFundingCommitment | null;
  paymentReference: string;
  reason: string;
  onActivate: () => void;
  onMarkPaid: (period: number) => void;
  onPaymentReferenceChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onReview: (decision: 'approve' | 'reject') => void;
}) {
  if (!commitment) {
    return (
      <section className="flex min-h-96 items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm">
        Sélectionnez une souscription.
      </section>
    );
  }

  const paidTotal = Number(commitment.total_expected ?? 0) > 0
    ? (commitment.schedule ?? []).filter((entry) => entry.status === 'paid').reduce((sum, entry) => sum + Number(entry.payment ?? 0), 0)
    : Number(commitment.total_repaid ?? 0);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StatusBadge status={commitment.status} />
          <h2 className="mt-3 text-xl font-bold text-gray-900">{commitment.project_title}</h2>
          <p className="mt-1 text-sm text-gray-500">Référence {commitment.id} · {commitment.partner_name ?? commitment.partner_id}</p>
        </div>
        <button onClick={() => openProjectFundingContract(commitment)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Voir le contrat
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Montant" value={formatCurrency(commitment.amount)} compact />
        <Metric label="Type" value={fundingTypeLabels[commitment.funding_type] ?? commitment.funding_type} compact />
        <Metric label="Durée" value={`${commitment.duration_months} mois`} compact />
        <Metric label="Total attendu" value={formatCurrency(commitment.total_expected)} compact />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-900">Garantie / cadre</p>
        <p className="mt-1 text-sm leading-6 text-gray-600">{commitment.guarantee}</p>
      </div>

      {commitment.status === 'pending_c2p_validation' ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-950">Décision C2P requise</h3>
          <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Note ou motif de décision" className="mt-3 w-full rounded-xl border border-amber-200 p-3 text-sm" rows={3} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button disabled={busy} onClick={() => onReview('reject')} className="rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700 disabled:opacity-50">Refuser</button>
            <button disabled={busy} onClick={() => onReview('approve')} className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Valider</button>
          </div>
        </div>
      ) : null}

      {commitment.status === 'approved_contract_ready' ? (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-bold text-blue-950">Transfert à confirmer</h3>
          <p className="mt-1 text-sm text-blue-900">Le contrat est prêt. Saisissez la référence du transfert vérifié pour activer l’échéancier.</p>
          <input value={paymentReference} onChange={(event) => onPaymentReferenceChange(event.target.value)} className="mt-3 w-full rounded-xl border border-blue-200 px-4 py-3" placeholder="Ex: BANQUE-2026-000123" />
          <button disabled={busy || !paymentReference.trim()} onClick={onActivate} className="mt-3 w-full rounded-xl bg-[#27346b] px-4 py-3 font-semibold text-white disabled:opacity-50">Confirmer et activer</button>
        </div>
      ) : null}

      {['active', 'completed'].includes(commitment.status) ? (
        <div className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Tableau d’amortissement</h3>
              <p className="text-sm text-gray-500">Remboursé : {formatCurrency(paidTotal)}</p>
            </div>
            {commitment.payment_reference ? <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Réf. {commitment.payment_reference}</span> : null}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-3">Mois</th>
                  <th className="px-3 py-3">Capital</th>
                  <th className="px-3 py-3">Bénéfice</th>
                  <th className="px-3 py-3">Intérêt</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">État</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(commitment.schedule ?? []).map((entry) => (
                  <tr key={entry.period}>
                    <td className="px-3 py-3 font-medium">{entry.period}</td>
                    <td className="px-3 py-3">{formatCurrency(entry.principal)}</td>
                    <td className="px-3 py-3">{formatCurrency(entry.profit)}</td>
                    <td className="px-3 py-3">{formatCurrency(entry.interest)}</td>
                    <td className="px-3 py-3 font-semibold">{formatCurrency(entry.payment)}</td>
                    <td className="px-3 py-3">{entry.status === 'paid' ? 'Payée' : 'À payer'}</td>
                    <td className="px-3 py-3 text-right">
                      {entry.status !== 'paid' && commitment.status === 'active' ? (
                        <button disabled={busy} onClick={() => onMarkPaid(entry.period)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirmer</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {commitment.review_reason ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">Motif : {commitment.review_reason}</p> : null}
    </section>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-amber-950">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm" placeholder={placeholder} />
    </label>
  );
}

function Metric({ label, value, compact = false, tone = 'gray' }: { label: string; value: string; compact?: boolean; tone?: 'gray' | 'amber' | 'emerald' | 'blue' }) {
  const tones = {
    gray: 'border-gray-200 bg-white text-gray-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return (
    <div className={`rounded-2xl border ${tones[tone]} ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${compact ? 'text-sm' : 'text-xl'} mt-1 font-bold`}>{value}</p>
    </div>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status] ?? 'bg-gray-100 text-gray-700'}`}>{statusLabels[status] ?? status}</span>;
}
