import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import {
  fetchProjectDetail,
  type FundingInvestor,
  type FundingRound,
  type ProjectDocument,
  type ProjectHistoryItem,
  type ProjectPartnership,
  type ProjectRecord,
  type ProjectMilestone,
} from '@/lib/projectApi';

type ProjectTab = 'overview' | 'ecosystem' | 'funding' | 'updates';

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCompactCurrency(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M FCFA`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k FCFA`;
  }
  return `${amount} FCFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Non renseigné';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusMeta(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('incubation')) {
    return { label: 'Incubation', className: 'border-[#27346b]/20 bg-[#ffffff] text-[#27346b]' };
  }
  if (normalized.includes('acceleration') || normalized.includes('croissance')) {
    return { label: 'Accélération', className: 'border-[#dbad29]/20 bg-[#fff4ec] text-[#d0b55e]' };
  }
  if (normalized.includes('term')) {
    return { label: 'Terminé', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }
  return { label: 'Pré-incubation', className: 'border-[#5fa6f3] bg-white text-[#27346b]' };
}

function getMilestoneMeta(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') {
    return { label: 'Terminé', dot: 'bg-emerald-500', tone: 'text-emerald-700' };
  }
  if (normalized === 'in_progress') {
    return { label: 'En cours', dot: 'bg-[#dbad29]', tone: 'text-[#d0b55e]' };
  }
  return { label: 'A venir', dot: 'bg-[#27346b]', tone: 'text-[#27346b]' };
}

function getDocumentIcon(type: string | null | undefined) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('excel')) return 'ri-file-excel-line';
  if (normalized.includes('powerpoint') || normalized.includes('ppt')) return 'ri-slideshow-line';
  if (normalized.includes('word')) return 'ri-file-word-line';
  if (normalized.includes('fig')) return 'ri-shapes-line';
  return 'ri-file-text-line';
}

function getPartnershipMeta(type: string | null | undefined) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('mentor')) {
    return { icon: 'ri-user-star-line', label: 'Mentorat', tone: 'bg-[#ffffff] text-[#27346b]' };
  }
  if (normalized.includes('finan')) {
    return { icon: 'ri-bank-card-line', label: 'Financement', tone: 'bg-[#fff4ec] text-[#d0b55e]' };
  }
  if (normalized.includes('tech')) {
    return { icon: 'ri-cpu-line', label: 'Technique', tone: 'bg-[#f8f7ff] text-[#27346b]' };
  }
  return { icon: 'ri-links-line', label: 'Partenariat', tone: 'bg-[#f8f7ff] text-[#27346b]' };
}

async function expectRows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [partnerships, setPartnerships] = useState<ProjectPartnership[]>([]);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [investors, setInvestors] = useState<FundingInvestor[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<ProjectRecord[]>([]);

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
        const detail = await fetchProjectDetail(projectId);
        const roundIds = detail.rounds.map((round) => round.id);
        const [investorRows, related] = await Promise.all([
          roundIds.length
            ? expectRows<FundingInvestor>(
                backendClient.from('funding_investors').select('*').in('funding_round_id', roundIds).order('date', { ascending: false }),
              )
            : Promise.resolve([]),
          expectRows<ProjectRecord>(
            backendClient.from('projects').select('*').eq('category', detail.project.category).neq('id', projectId).limit(3).order('created_at', { ascending: false }),
          ),
        ]);

        if (cancelled) return;
        setProject(detail.project);
        setMilestones(detail.milestones);
        setDocuments(detail.documents);
        setHistory(detail.history);
        setPartnerships(detail.partnerships);
        setRounds(detail.rounds);
        setInvestors(investorRows);
        setRelatedProjects(related);
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

  const statusMeta = useMemo(() => getStatusMeta(project?.status), [project?.status]);
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
      <div className="min-h-screen bg-c2p-bg px-4 pt-28 pb-16 sm:px-6 lg:px-20">
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
      <div className="min-h-screen bg-c2p-bg px-4 pt-28 pb-16 sm:px-6 lg:px-20">
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
    <div className="min-h-screen bg-c2p-bg text-c2p-text">
      <section className="relative overflow-hidden border-b border-[#80bfdf] bg-[#ffffff]">
        <div className="absolute inset-0">
          <img
            src={project.image || '/images/home/venture.jpg'}
            alt={project.title}
            className="h-full w-full object-cover object-center opacity-22"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.82)_50%,rgba(255,255,255,0.56)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent"></div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-20 lg:pb-18">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              <span className="inline-flex rounded-full border border-[#5fa6f3] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#27346b]">
                {project.sector || project.category}
              </span>
              <span className="inline-flex rounded-full border border-[#80bfdf] bg-white px-3 py-1 text-xs font-medium text-[#27346b]">
                Phase : {project.phase || 'Non renseignée'}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight text-[#06053a] sm:text-5xl lg:text-6xl">
              {project.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#27346b] sm:text-lg">
              {project.description || 'Projet en cours de structuration au sein de ProjectCenter.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(project.looking_for || []).map((item) => (
                <span key={item} className="rounded-full border border-[#80bfdf] bg-white px-3 py-1.5 text-xs text-[#27346b] sm:text-sm">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Financement</p>
                <p className="mt-2 text-2xl font-semibold text-[#06053a]">{fundingPercent}%</p>
                <p className="mt-1 text-sm text-[#27346b]">{formatCompactCurrency(project.funding)} leve sur {formatCompactCurrency(project.funding_goal)}</p>
              </div>
              <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Equipe</p>
                <p className="mt-2 text-2xl font-semibold text-[#06053a]">{project.team_size || 1}</p>
                <p className="mt-1 text-sm text-[#27346b]">membres déclarés sur le projet</p>
              </div>
              <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Réseau C2P</p>
                <p className="mt-2 text-2xl font-semibold text-[#06053a]">{partnerships.length}</p>
                <p className="mt-1 text-sm text-[#27346b]">partenaires et mentors visibles</p>
              </div>
              <div className="rounded-[22px] border border-[#80bfdf] bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:px-5 sm:py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5fa6f3]">Documentation</p>
                <p className="mt-2 text-2xl font-semibold text-[#06053a]">{documents.length}</p>
                <p className="mt-1 text-sm text-[#27346b]">éléments déclarés dans le dossier</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-20 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.55fr_0.85fr] lg:gap-8">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[28px] border border-[#80bfdf] bg-white shadow-[0_20px_60px_rgba(39,52,107,0.08)]">
              <div className="flex flex-wrap gap-2 border-b border-[#80bfdf] px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="contents" role="tablist" aria-label="Navigation de la fiche projet">
                {[
                  { id: 'overview' as const, label: 'Aperçu' },
                  { id: 'ecosystem' as const, label: 'Réseau' },
                  { id: 'funding' as const, label: 'Financement' },
                  { id: 'updates' as const, label: 'Actualités' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`project-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`project-panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                      activeTab === tab.id
                        ? 'bg-[#27346b] text-white'
                        : 'bg-[#ffffff] text-[#27346b] hover:bg-[#ffffff] hover:text-[#27346b]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                {activeTab === 'overview' ? (
                  <div className="space-y-8" role="tabpanel" id="project-panel-overview" aria-labelledby="project-tab-overview">
                    <div>
                      <h2 className="text-xl font-semibold text-[#06053a] sm:text-2xl">À propos du projet</h2>
                      <p className="mt-4 text-sm leading-8 text-[#27346b]">
                        {project.description || 'Aucune description détaillée n’a encore été publiée.'}
                      </p>
                    </div>

                      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                      <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Impact actuel</p>
                        <p className="mt-3 text-sm leading-7 text-[#27346b]">
                          {project.impact || 'Impact en cours de qualification par l’équipe C2P.'}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Prochaine étape</p>
                        <p className="mt-3 text-sm leading-7 text-[#27346b]">
                          {project.next_milestone || 'Aucun jalon prioritaire publié pour le moment.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Jalons</h3>
                      <div className="mt-5 space-y-4">
                        {milestones.length ? milestones.map((milestone) => {
                          const meta = getMilestoneMeta(milestone.status);
                          return (
                            <div key={milestone.id} className="rounded-[22px] border border-[#80bfdf] bg-white p-4 sm:p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex gap-3">
                                  <span className={`mt-1 h-3 w-3 rounded-full ${meta.dot}`}></span>
                                  <div>
                                    <h4 className="font-semibold text-[#06053a]">{milestone.title}</h4>
                                    <p className="mt-1 text-sm leading-6 text-[#27346b]">
                                      {milestone.description || 'Jalon en cours de structuration.'}
                                    </p>
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <p className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</p>
                                  <p className="mt-1 text-xs text-[#5fa6f3]">Echéance : {formatDate(milestone.due_date)}</p>
                                </div>
                              </div>
                              {Array.isArray(milestone.tasks) && milestone.tasks.length ? (
                                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                  {milestone.tasks.map((task) => (
                                    <li key={task.id} className="flex items-center gap-2 text-sm text-[#27346b]">
                                      <i className={task.completed ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-[#5fa6f3]'}></i>
                                      <span>{task.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          );
                        }) : (
                          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
                            Aucun jalon public publié pour ce projet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Documents déclarés</h3>
                      <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
                        {documents.length ? documents.map((document) => (
                          <div key={document.id} className="flex items-start gap-3 rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:gap-4 sm:p-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#27346b] sm:h-11 sm:w-11">
                              <i className={`${getDocumentIcon(document.type)} text-xl`}></i>
                            </div>
                            <div className="min-w-0">
                              <h4 className="truncate font-semibold text-[#06053a]">{document.name}</h4>
                              <p className="mt-1 text-sm text-[#27346b]">
                                {String(document.type || '').toUpperCase()} • {document.size || 'Taille non précisée'}
                              </p>
                              <p className="mt-2 text-xs text-[#5fa6f3]">
                                Mis à jour le {formatDate(document.date)}
                              </p>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
                            Aucun document public n’est encore listé pour ce projet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'ecosystem' ? (
                  <div className="space-y-8" role="tabpanel" id="project-panel-ecosystem" aria-labelledby="project-tab-ecosystem">
                    <div className="rounded-[24px] border border-[#80bfdf] bg-[#ffffff] p-4 sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Porteur du projet</p>
                      <h2 className="mt-3 text-2xl font-semibold text-[#06053a]">{project.porteur_name}</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Localisation</p>
                          <p className="mt-1 text-sm text-[#27346b]">{project.location || 'Non renseignée'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Équipe</p>
                          <p className="mt-1 text-sm text-[#27346b]">{project.team_size || 1} membres</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Mentors annoncés</p>
                          <p className="mt-1 text-sm text-[#27346b]">{project.mentors || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-[#06053a] sm:text-xl">Mentors et partenaires visibles</h3>
                      <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
                        {partnerships.length ? partnerships.map((partnership) => {
                          const meta = getPartnershipMeta(partnership.type);
                          return (
                            <article key={partnership.id} className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className="text-lg font-semibold text-[#06053a]">{partnership.name}</h4>
                                  <p className="mt-1 text-sm text-[#27346b]">{partnership.role}</p>
                                </div>
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
                                  <i className={meta.icon}></i>
                                  <span>{meta.label}</span>
                                </span>
                              </div>
                              {Array.isArray(partnership.expertise) && partnership.expertise.length ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {partnership.expertise.map((item) => (
                                    <span key={item} className="rounded-full border border-[#80bfdf] bg-[#ffffff] px-3 py-1 text-xs text-[#27346b]">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              <p className="mt-4 text-xs text-[#5fa6f3]">Dernière activité : {partnership.last_activity || 'Non renseignée'}</p>
                            </article>
                          );
                        }) : (
                          <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
                            Aucun mentor ou partenaire public n’est encore publié sur ce dossier.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'funding' ? (
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
                        <div className="h-full rounded-full bg-gradient-to-r from-[#27346b] to-[#dbad29]" style={{ width: `${fundingPercent}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {rounds.length ? rounds.map((round) => {
                        const roundInvestors = investorsByRound.get(Number(round.id)) ?? [];
                        return (
                          <article key={round.id} className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">{round.type}</p>
                                <h3 className="mt-2 text-xl font-semibold text-[#06053a]">{round.project_title || project.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-[#27346b]">
                                  {round.description || 'Tour de financement en cours de structuration.'}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-4 py-3">
                                <p className="text-sm font-semibold text-[#06053a]">{round.progress_percent ?? 0}%</p>
                                <p className="text-xs text-[#5fa6f3]">du tour atteint</p>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-3">
                              <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Cible</p>
                                <p className="mt-2 text-lg font-semibold text-[#06053a]">{formatCurrency(round.target_amount)}</p>
                              </div>
                              <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Levé</p>
                                <p className="mt-2 text-lg font-semibold text-[#06053a]">{formatCurrency(round.raised_amount)}</p>
                              </div>
                              <div className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-[#5fa6f3]">Échéance</p>
                                <p className="mt-2 text-lg font-semibold text-[#06053a]">{formatDate(round.deadline)}</p>
                              </div>
                            </div>

                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ffffff]">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#27346b] to-[#dbad29]" style={{ width: `${Math.min(100, round.progress_percent ?? 0)}%` }}></div>
                            </div>

                            <div className="mt-6">
                              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5fa6f3]">Investisseurs liés</h4>
                              {roundInvestors.length ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  {roundInvestors.map((investor) => (
                                    <div key={investor.id} className="rounded-2xl border border-[#80bfdf] bg-[#ffffff] px-3 py-3.5 sm:px-4 sm:py-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-semibold text-[#06053a]">{investor.name}</p>
                                          <p className="mt-1 text-sm text-[#27346b]">{investor.type}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-[#27346b]">{formatCompactCurrency(investor.amount)}</span>
                                      </div>
                                      <p className="mt-3 text-xs text-[#5fa6f3]">
                                        {formatDate(investor.date)} • statut : {investor.status}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-4 text-sm text-[#27346b]">Aucun investisseur public déclaré pour ce tour.</p>
                              )}
                            </div>
                          </article>
                        );
                      }) : (
                        <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
                          Aucun tour de financement public n’est encore affiché pour ce projet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'updates' ? (
                  <div className="space-y-4" role="tabpanel" id="project-panel-updates" aria-labelledby="project-tab-updates">
                    {history.length ? history.map((item) => (
                      <article key={item.id} className="rounded-[24px] border border-[#80bfdf] bg-white p-4 shadow-[0_18px_45px_rgba(39,52,107,0.08)] sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#06053a]">{item.action}</p>
                            <p className="mt-1 text-sm text-[#27346b]">{item.user}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-sm font-semibold text-[#27346b]">{item.type}</p>
                            <p className="mt-1 text-xs text-[#5fa6f3]">{formatDate(item.date)}</p>
                          </div>
                        </div>
                      </article>
                    )) : (
                      <div className="rounded-[22px] border border-[#80bfdf] bg-[#ffffff] p-5 text-sm text-[#27346b]">
                        Aucune actualité publique n’a encore été publiée pour ce projet.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {relatedProjects.length ? (
              <div className="rounded-[28px] border border-[#80bfdf] bg-white p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Même secteur</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#06053a]">Autres projets à suivre</h3>
                  </div>
                  <Link to="/project-center" className="c2p-link text-sm font-medium">
                    Voir tout
                  </Link>
                </div>
                <div className="mt-5 space-y-4">
                  {relatedProjects.map((item) => (
                    <Link key={item.id} to={`/project-center/projet/${item.id}`} className="block rounded-[20px] border border-[#80bfdf] bg-[#ffffff] p-3.5 transition hover:border-[#27346b]/50 hover:bg-white sm:p-4">
                      <p className="font-semibold text-[#06053a]">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#27346b]">{item.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#80bfdf] bg-white p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Résumé dossier</p>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#5fa6f3]">Porteur</span>
                  <span className="font-medium text-[#06053a]">{project.porteur_name}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#5fa6f3]">Localisation</span>
                  <span className="font-medium text-[#06053a]">{project.location || 'Non renseignée'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#5fa6f3]">Dernière mise à jour</span>
                  <span className="font-medium text-[#06053a]">{formatDate(project.last_update || project.created_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#5fa6f3]">Jalon suivant</span>
                  <span className="font-medium text-right text-[#06053a]">{project.next_milestone || 'Non défini'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#80bfdf] bg-[#ffffff] p-4 shadow-[0_20px_60px_rgba(39,52,107,0.08)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#27346b]">Actions</p>
              <div className="mt-5 space-y-3">
                <Link to="/project-center/soumettre" className="c2p-btn-accent w-full px-6 py-3">
                  Soumettre un projet
                </Link>
                <Link to="/contact" className="c2p-btn-secondary w-full px-6 py-3">
                  Parler à C2P
                </Link>
              </div>
              <p className="mt-4 text-xs leading-6 text-[#27346b]">
                Les mises en relation, l’étude du dossier et la structuration de l’accompagnement restent pilotées par l’équipe C2P.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
