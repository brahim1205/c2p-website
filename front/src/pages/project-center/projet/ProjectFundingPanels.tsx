import type { PublicProject } from '@/lib/projectCenterApi';
import type { FundingInvestor, FundingRound } from '@/lib/projectApi';
import { formatCompactCurrency, formatCurrency, formatDate } from './projectDetailModel';

export function ProjectFundingPanel({
  fundingPercent,
  investorsByRound,
  project,
  rounds,
}: {
  fundingPercent: number;
  investorsByRound: Map<number, FundingInvestor[]>;
  project: PublicProject;
  rounds: FundingRound[];
}) {
  return (
    <div className="space-y-8" role="tabpanel" id="project-panel-funding" aria-labelledby="project-tab-funding">
      <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Traction financière</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#06053a]">{formatCurrency(project.funding)}</h2>
            <p className="mt-1 text-sm text-[#27346b]">sur un objectif de {formatCurrency(project.funding_goal)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-semibold text-[#d0b55e]">{fundingPercent}% atteint</p>
            <p className="mt-1 text-xs text-[#5fa6f3]">Objectif agrégé du projet</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-gradient-to-r from-[#27346b] to-[#dbad29]" style={{ width: `${fundingPercent}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {rounds.length ? (
          rounds.map((round) => (
            <ProjectFundingRoundCard
              key={round.id}
              investors={investorsByRound.get(Number(round.id)) ?? []}
              project={project}
              round={round}
            />
          ))
        ) : (
          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
            Aucun tour de financement public n’est encore affiché pour ce projet.
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectFundingRoundCard({ investors, project, round }: { investors: FundingInvestor[]; project: PublicProject; round: FundingRound }) {
  return (
    <article className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">{round.type}</p>
          <h3 className="mt-2 text-xl font-semibold text-[#06053a]">{round.project_title || project.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#27346b]">{round.description || 'Tour de financement en cours de structuration.'}</p>
        </div>
        <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-4 py-3">
          <p className="text-sm font-semibold text-[#06053a]">{round.progress_percent ?? 0}%</p>
          <p className="text-xs text-[#5fa6f3]">du tour atteint</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-3">
        <FundingMetric label="Cible" value={formatCurrency(round.target_amount)} />
        <FundingMetric label="Levé" value={formatCurrency(round.raised_amount)} />
        <FundingMetric label="Échéance" value={formatDate(round.deadline)} />
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ffffff]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#27346b] to-[#dbad29]" style={{ width: `${Math.min(100, round.progress_percent ?? 0)}%` }} />
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5fa6f3]">Investisseurs liés</h4>
        {investors.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {investors.map((investor) => (
              <div key={investor.id} className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#06053a]">{investor.name}</p>
                    <p className="mt-1 text-sm text-[#27346b]">{investor.type}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#27346b]">{formatCompactCurrency(investor.amount)}</span>
                </div>
                <p className="mt-3 text-xs text-[#5fa6f3]">{formatDate(investor.date)} • statut : {investor.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#27346b]">Aucun investisseur public déclaré pour ce tour.</p>
        )}
      </div>
    </article>
  );
}

function FundingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#06053a]">{value}</p>
    </div>
  );
}
