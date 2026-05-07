import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchProjectDetail,
  type FundingRound,
  type ProjectDocument,
  type ProjectHistoryItem,
  type ProjectMilestone,
  type ProjectPartnership,
  type ProjectRecord,
} from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { openHtmlPreview } from '@/lib/downloads';

export default function PorteurProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [partnerships, setPartnerships] = useState<ProjectPartnership[]>([]);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'documents' | 'history'>('overview');

  const loadDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchProjectDetail(Number(id));
      setProject(payload.project);
      setMilestones(payload.milestones);
      setDocuments(payload.documents);
      setHistory(payload.history);
      setPartnerships(payload.partnerships);
      setRounds(payload.rounds);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le detail du projet.');
    } finally {
      setLoading(false);
    }
  }, [error, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const fundingPercent = useMemo(() => {
    if (!project?.funding_goal) return 0;
    return Math.round((project.funding / project.funding_goal) * 100);
  }, [project]);

  const handleOpenDocument = (document: ProjectDocument) => {
    if (!project) return;
    openHtmlPreview(`${project.title}-${document.name}`, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${document.name}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f5; color: #111; margin: 0; padding: 40px; }
    main { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #dce3e1; padding: 32px; }
  </style>
</head>
<body>
  <main>
    <h1>${document.name}</h1>
    <p>Projet : ${project.title}</p>
    <p>Categorie : ${document.category}</p>
    <p>Taille : ${document.size}</p>
    <p>Date : ${formatDate(document.date)}</p>
    <p style="margin-top: 24px;">Document de travail genere pour consultation rapide dans l espace porteur.</p>
  </main>
</body>
</html>`);
    success('Telechargement', `Le document "${document.name}" a ete ouvert.`);
  };

  if (!loading && !project) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Mes projets', path: '/dashboard/porteur/mes-projets' }, { label: 'Detail' }]} />
          <div className="py-20 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Projet introuvable</h2>
            <Link to="/dashboard/porteur/mes-projets" className="inline-flex px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
              Retour aux projets
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Mes projets', path: '/dashboard/porteur/mes-projets' }, { label: project?.title || 'Detail' }]} />

        {loading ? (
          <p className="text-sm text-gray-500">Chargement du projet...</p>
        ) : project && (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mb-8">
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{project.status}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{project.sector || project.category}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                    <p className="text-gray-600 mt-2">{project.description}</p>
                  </div>
                  <Link to="/dashboard/porteur/financements" className="px-4 py-2 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488]">
                    Voir les financements
                  </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Equipe</p><p className="text-lg font-semibold text-gray-900">{project.team_size}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Mentors</p><p className="text-lg font-semibold text-gray-900">{project.mentors}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Valorisation</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(project.valuation)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Revenus</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(project.revenue)}</p></div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Financement</h2>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-sm text-gray-600">Objectif atteint</p>
                  <p className="text-2xl font-bold text-gray-900">{fundingPercent}%</p>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-200 mb-4">
                  <div className="h-3 rounded-full bg-green-500" style={{ width: `${fundingPercent}%` }}></div>
                </div>
                <p className="text-sm text-gray-700 mb-3">{formatCurrency(project.funding)} leves sur {formatCurrency(project.funding_goal)}</p>
                <p className="text-sm text-gray-600">Prochain jalon: {project.next_milestone || '-'}</p>
                <p className="text-sm text-gray-600 mt-1">Derniere mise a jour: {formatDate(project.last_update)}</p>
                <div className="mt-5 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Impact</p>
                  <p className="text-sm text-gray-700">{project.impact || 'Impact non renseigne.'}</p>
                </div>
              </section>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap gap-2 border-b border-gray-200 px-6 py-4">
                {[
                  ['overview', 'Vue generale'],
                  ['milestones', 'Jalons'],
                  ['documents', 'Documents'],
                  ['history', 'Historique'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === key ? 'bg-[#14B8A6] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Partenaires rattaches</h3>
                      <div className="space-y-3">
                        {partnerships.map((partner) => (
                          <div key={partner.id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={partner.avatar} alt={partner.name} className="w-11 h-11 rounded-full object-cover" />
                              <div>
                                <p className="font-medium text-gray-900">{partner.name}</p>
                                <p className="text-sm text-gray-600">{partner.role}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {partner.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tours de financement</h3>
                      <div className="space-y-3">
                        {rounds.map((round) => (
                          <div key={round.id} className="rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900">{round.type}</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {round.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{formatCurrency(round.raised_amount)} / {formatCurrency(round.target_amount)}</p>
                            <p className="text-xs text-gray-500 mt-1">Echeance: {formatDate(round.deadline)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'milestones' && (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-xl border border-gray-200 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${milestone.status === 'completed' ? 'bg-green-100 text-green-700' : milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {milestone.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-2">{formatDate(milestone.due_date)}</p>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 mb-4">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: `${milestone.progress}%` }}></div>
                        </div>
                        <div className="grid gap-2">
                          {milestone.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm text-gray-700">
                              <i className={`${task.completed ? 'ri-checkbox-circle-fill text-green-500' : 'ri-checkbox-blank-circle-line text-gray-300'}`}></i>
                              <span>{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{document.name}</p>
                          <p className="text-sm text-gray-600">{document.category} · {document.size}</p>
                        </div>
                        <button
                          onClick={() => handleOpenDocument(document)}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Ouvrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-gray-200 p-4">
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{entry.user}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(entry.date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
