import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicProjectCenterDetail, type PublicProject } from '@/lib/projectCenterApi';
import {
  type FundingInvestor,
  type FundingRound,
  type ProjectDocument,
  type ProjectHistoryItem,
  type ProjectPartnership,
  type ProjectMilestone,
} from '@/lib/projectApi';
import ProjectDetailContent from './ProjectDetailContent';
import ProjectDetailHero from './ProjectDetailHero';
import ProjectDetailSidebar from './ProjectDetailSidebar';
import { type ProjectTab } from './projectDetailModel';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<PublicProject | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [partnerships, setPartnerships] = useState<ProjectPartnership[]>([]);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [investors, setInvestors] = useState<FundingInvestor[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<PublicProject[]>([]);

  useEffect(() => {
    if (!Number.isFinite(projectId)) {
      setErrorMessage('Projet introuvable.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const detail = await fetchPublicProjectCenterDetail(projectId);

        if (cancelled) return;
        setProject(detail.project);
        setMilestones(detail.milestones);
        setDocuments(detail.documents);
        setHistory(detail.history);
        setPartnerships(detail.partnerships);
        setRounds(detail.rounds);
        setInvestors(detail.investors);
        setRelatedProjects(detail.relatedProjects);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger ce projet.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const fundingPercent = useMemo(() => {
    if (!project?.funding_goal) return 0;
    return Math.min(100, Math.round((Number(project.funding || 0) / Number(project.funding_goal || 1)) * 100));
  }, [project?.funding, project?.funding_goal]);
  const investorsByRound = useMemo(() => {
    const next = new Map<number, FundingInvestor[]>();
    for (const investor of investors) {
      const roundId = Number(investor.funding_round_id);
      const current = next.get(roundId) ?? [];
      current.push(investor);
      next.set(roundId, current);
    }
    return next;
  }, [investors]);

  if (loading) {
    return (
      <div className="public-premium-page min-h-screen bg-c2p-bg px-4 pt-28 pb-16 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-80 animate-pulse rounded-[32px] border border-[#80bfdf] bg-[#ffffff]"></div>
          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
            <div className="h-[520px] animate-pulse rounded-[28px] border border-[#80bfdf] bg-white"></div>
            <div className="space-y-6">
              <div className="h-64 animate-pulse rounded-[28px] border border-[#80bfdf] bg-white"></div>
              <div className="h-48 animate-pulse rounded-[28px] border border-[#80bfdf] bg-white"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !project) {
    return (
      <div className="public-premium-page min-h-screen bg-c2p-bg px-4 pt-28 pb-16 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#80bfdf] bg-white p-10 text-center shadow-[0_20px_60px_rgba(39,52,107,0.08)]">
          <p className="c2p-eyebrow">ProjectCenter</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#06053a]">Projet indisponible</h1>
          <p className="mt-4 text-sm leading-7 text-[#27346b]">
            {errorMessage || 'Ce projet n’est plus accessible dans le catalogue public.'}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/project-center" className="c2p-btn-secondary px-6 py-3">
              Retour au catalogue
            </Link>
            <Link to="/project-center/soumettre" className="c2p-btn-accent px-6 py-3">
              Soumettre un projet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
      <ProjectDetailHero documents={documents} fundingPercent={fundingPercent} partnerships={partnerships} project={project} />

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-20 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.55fr_0.85fr] lg:gap-8">
          <ProjectDetailContent
            activeTab={activeTab}
            documents={documents}
            fundingPercent={fundingPercent}
            history={history}
            investorsByRound={investorsByRound}
            milestones={milestones}
            partnerships={partnerships}
            project={project}
            relatedProjects={relatedProjects}
            rounds={rounds}
            setActiveTab={setActiveTab}
          />
          <ProjectDetailSidebar project={project} />
        </div>
      </section>
    </div>
  );
}
