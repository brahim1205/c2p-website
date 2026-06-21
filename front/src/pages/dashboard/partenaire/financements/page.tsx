import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { fetchProjectFundingCommitments, type ProjectFundingCommitment } from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import DashboardLayout from '../../components/DashboardLayout';

const typeLabels = {
  donation: 'Don',
  profit_share_loan: 'Prêt sans intérêt avec bénéfices',
  interest_loan: 'Prêt avec intérêt',
};

export default function PartenaireFinancementsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ProjectFundingCommitment | null>(null);
  const commitmentsQuery = useQuery({
    queryKey: queryKeys.partenaire.fundingCommitments(user?.id),
    queryFn: fetchProjectFundingCommitments,
    enabled: Boolean(user?.id),
  });
  const commitments = useMemo(() => commitmentsQuery.data ?? [], [commitmentsQuery.data]);
  const totalCommitted = commitments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const projectedGain = commitments.reduce((sum, item) => sum + Number(item.projected_profit || 0) + Number(item.projected_interest || 0), 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Mes financements' }]} />
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mes souscriptions participatives</h1>
          <p className="mt-2 text-gray-600">Suivez les validations contractuelles, remboursements estimés et bénéfices dégressifs.</p>
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Metric label="Souscriptions" value={String(commitments.length)} />
          <Metric label="Montant engagé" value={formatCurrency(totalCommitted)} />
          <Metric label="Gain total estimé" value={formatCurrency(projectedGain)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-4">
            {commitmentsQuery.isLoading ? <p className="text-sm text-gray-500">Chargement...</p> : null}
            {!commitmentsQuery.isLoading && commitments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">Aucune souscription enregistrée.</div>
            ) : null}
            {commitments.map((commitment) => (
              <button key={commitment.id} type="button" onClick={() => setSelected(commitment)} className={`w-full rounded-2xl border bg-white p-5 text-left transition ${selected?.id === commitment.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-bold text-gray-900">{commitment.project_title}</h2><p className="mt-1 text-sm text-gray-500">{typeLabels[commitment.funding_type]}</p></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{commitment.status.replaceAll('_', ' ')}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Montant</p><p className="font-semibold">{formatCurrency(commitment.amount)}</p></div>
                  <div><p className="text-gray-500">Durée</p><p className="font-semibold">{commitment.duration_months} mois</p></div>
                </div>
                <p className="mt-3 text-xs text-gray-500">Souscrit le {formatDate(commitment.created_at)}</p>
              </button>
            ))}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {!selected ? (
              <div className="flex min-h-80 items-center justify-center text-center text-gray-500">Sélectionnez une souscription pour afficher son tableau d’amortissement.</div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">Tableau d’amortissement</h2>
                <p className="mt-1 text-sm text-gray-600">{selected.project_title} · badge {selected.partner_badge}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Capital" value={formatCurrency(selected.amount)} compact />
                  <Metric label="Bénéfice" value={formatCurrency(selected.projected_profit)} compact />
                  <Metric label="Intérêt" value={formatCurrency(selected.projected_interest)} compact />
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">Capital</th><th className="px-3 py-2">Bénéfice</th><th className="px-3 py-2">Intérêt</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Solde</th></tr></thead>
                    <tbody>{(selected.schedule ?? []).map((entry) => (
                      <tr key={entry.period} className="border-b border-gray-100"><td className="px-3 py-2">{entry.period}</td><td className="px-3 py-2">{formatCurrency(entry.principal)}</td><td className="px-3 py-2">{formatCurrency(entry.profit)}</td><td className="px-3 py-2">{formatCurrency(entry.interest)}</td><td className="px-3 py-2 font-semibold">{formatCurrency(entry.payment)}</td><td className="px-3 py-2">{formatCurrency(entry.closingBalance)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{selected.guarantee}</p>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? 'p-3' : 'p-5'}`}><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>;
}
