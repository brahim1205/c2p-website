import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  createProjectFundingCommitment,
  fetchOpenProjects,
  simulateProjectFunding,
  type ProjectFundingSimulation,
  type ProjectFundingType,
} from '@/lib/projectApi';
import { formatCurrency } from '@/lib/formatters';
import { queryKeys } from '@/lib/queryKeys';
import DashboardLayout from '../../../../components/DashboardLayout';

const fundingLabels: Record<ProjectFundingType, string> = {
  donation: 'Don',
  profit_share_loan: 'Prêt sans intérêt avec partage de bénéfices',
  interest_loan: 'Prêt avec intérêt sans partage de bénéfices',
};

export default function PartenaireFinancerProjetPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(100000);
  const [durationMonths, setDurationMonths] = useState(12);
  const [fundingType, setFundingType] = useState<ProjectFundingType>('profit_share_loan');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [simulation, setSimulation] = useState<ProjectFundingSimulation | null>(null);

  const projectsQuery = useQuery({
    queryKey: queryKeys.partenaire.opportunities(user?.id),
    queryFn: fetchOpenProjects,
    enabled: Boolean(user?.id),
  });
  const project = useMemo(
    () => projectsQuery.data?.find((item) => String(item.id) === String(id)) ?? null,
    [id, projectsQuery.data],
  );

  const simulateMutation = useMutation({
    mutationFn: () => simulateProjectFunding({ projectId: id!, amount, durationMonths, fundingType }),
    onSuccess: setSimulation,
    onError: (err) => {
      console.error(err);
      error('Simulation impossible', 'Vérifiez le montant, la durée et le type de financement.');
    },
  });
  const commitmentMutation = useMutation({
    mutationFn: () => createProjectFundingCommitment({
      projectId: id!,
      amount,
      durationMonths,
      fundingType,
      contractAccepted,
      riskAccepted,
    }),
    onSuccess: async ({ commitment }) => {
      success('Souscription enregistrée', `La demande ${String(commitment.id)} attend maintenant la validation contractuelle de C2P.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.partenaire.root(user?.id) });
    },
    onError: (err) => {
      console.error(err);
      error('Souscription impossible', 'Acceptez le contrat et les risques avant de confirmer.');
    },
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Partenaire', path: '/dashboard/partenaire' },
          { label: 'Opportunités', path: '/dashboard/partenaire/opportunites' },
          { label: 'Simulation de financement' },
        ]} />

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Financement participatif encadré par C2P</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{project?.title ?? 'Projet'}</h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Simulez votre placement avant toute souscription. Les montants et gains affichés restent indicatifs jusqu’à validation C2P et signature du contrat.
            </p>
          </div>
          <Link to={`/project-center/projet/${id}`} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Voir le projet et son porteur</Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Paramètres de la simulation</h2>
            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Type de financement</span>
                <select value={fundingType} onChange={(event) => { setFundingType(event.target.value as ProjectFundingType); setSimulation(null); }} className="w-full rounded-xl border border-gray-300 px-4 py-3">
                  {Object.entries(fundingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Montant de votre part (FCFA)</span>
                <input type="number" min={1000} step={5000} value={amount} onChange={(event) => { setAmount(Number(event.target.value)); setSimulation(null); }} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Durée du remboursement</span>
                <select value={durationMonths} onChange={(event) => { setDurationMonths(Number(event.target.value)); setSimulation(null); }} disabled={fundingType === 'donation'} className="w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100">
                  {[3, 6, 12, 18, 24, 36].map((months) => <option key={months} value={months}>{months} mois</option>)}
                </select>
              </label>
              <button type="button" onClick={() => simulateMutation.mutate()} disabled={simulateMutation.isPending || !id} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
                {simulateMutation.isPending ? 'Calcul...' : 'Visualiser la simulation'}
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <strong>Cadre prudentiel :</strong> aucune somme n’est débitée sur cet écran. La souscription est contrôlée par C2P avant contrat, décaissement et activation de la garantie éventuelle.
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            {!simulation ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center text-gray-500">
                <i className="ri-line-chart-line text-5xl text-emerald-500"></i>
                <p className="mt-4 font-medium">Choisissez un montant pour afficher le remboursement et le gain possible.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Part souscrite" value={formatCurrency(simulation.amount)} />
                  <Metric label="Bénéfice estimé" value={formatCurrency(simulation.projectedProfit)} />
                  <Metric label="Intérêt estimé" value={formatCurrency(simulation.projectedInterest)} />
                  <Metric label="Total estimé" value={formatCurrency(simulation.totalExpected)} />
                </div>
                <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  Badge {simulation.partnerBadge} · rendement indicatif {simulation.projectedReturnRate}%.
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">Capital</th><th className="px-3 py-2">Bénéfice</th><th className="px-3 py-2">Intérêt</th><th className="px-3 py-2">Versement</th><th className="px-3 py-2">Reste</th></tr></thead>
                    <tbody>{simulation.schedule.map((entry) => (
                      <tr key={entry.period} className="border-b border-gray-100">
                        <td className="px-3 py-2">{entry.period}</td><td className="px-3 py-2">{formatCurrency(entry.principal)}</td><td className="px-3 py-2">{formatCurrency(entry.profit)}</td><td className="px-3 py-2">{formatCurrency(entry.interest)}</td><td className="px-3 py-2 font-semibold">{formatCurrency(entry.payment)}</td><td className="px-3 py-2">{formatCurrency(entry.closingBalance)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="mt-5 space-y-3 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                  <p>{simulation.guarantee}</p>
                  <p className="font-medium text-red-700">{simulation.disclaimer}</p>
                  <label className="flex gap-3"><input type="checkbox" checked={contractAccepted} onChange={(event) => setContractAccepted(event.target.checked)} /> J’accepte que la souscription reste soumise au contrat final et à la validation C2P.</label>
                  <label className="flex gap-3"><input type="checkbox" checked={riskAccepted} onChange={(event) => setRiskAccepted(event.target.checked)} /> J’ai compris les risques de perte, de retard et de rendement inférieur à la simulation.</label>
                  <button type="button" onClick={() => commitmentMutation.mutate()} disabled={!contractAccepted || !riskAccepted || commitmentMutation.isPending} className="w-full rounded-xl bg-[#27346b] px-5 py-3 font-semibold text-white disabled:opacity-50">
                    {commitmentMutation.isPending ? 'Enregistrement...' : 'Souscrire cette part pour validation'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-bold text-gray-900">{value}</p></div>;
}
