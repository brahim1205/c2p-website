import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  fetchTrackedProjectDetail,
  openPartnerOwnerConversation,
  type ProjectDocument,
} from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { openHtmlPreview } from '@/lib/downloads';
import { queryKeys } from '@/lib/queryKeys';
import { TrackedProjectUnavailableState } from './TrackedProjectUnavailableState';

function getPartnerTypeLabel(type: string | null | undefined) {
  return type === 'technique' ? 'Technique' : 'Financier';
}

export default function PartenaireProjetSuiviDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'documents' | 'funding' | 'history'>('overview');

  const detailQuery = useQuery({
    queryKey: queryKeys.partenaire.trackedProjectDetail(user?.id, id),
    queryFn: () => fetchTrackedProjectDetail(user!.id, id!),
    enabled: Boolean(user?.id && id),
  });

  useEffect(() => {
    if (detailQuery.isError) {
      console.error(detailQuery.error);
      error('Erreur', 'Impossible de charger ce projet suivi.');
    }
  }, [detailQuery.error, detailQuery.isError, error]);

  const loading = detailQuery.isLoading;
  const tracked = detailQuery.data?.tracked ?? null;
  const project = detailQuery.data?.detail.project ?? null;
  const milestones = useMemo(() => detailQuery.data?.detail.milestones ?? [], [detailQuery.data?.detail.milestones]);
  const documents = useMemo(() => detailQuery.data?.detail.documents ?? [], [detailQuery.data?.detail.documents]);
  const history = useMemo(() => detailQuery.data?.detail.history ?? [], [detailQuery.data?.detail.history]);
  const partnerships = useMemo(() => detailQuery.data?.detail.partnerships ?? [], [detailQuery.data?.detail.partnerships]);
  const rounds = useMemo(() => detailQuery.data?.detail.rounds ?? [], [detailQuery.data?.detail.rounds]);

  const statusTone = useMemo(() => {
    if (tracked?.status === 'en_risque') return 'bg-red-100 text-red-700';
    if (tracked?.status === 'termine') return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  }, [tracked?.status]);

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
    <p>Projet suivi : ${project.title}</p>
    <p>Categorie : ${document.category}</p>
    <p>Date : ${formatDate(document.date)}</p>
  </main>
</body>
</html>`);
    success('Document pret', `Le document "${document.name}" a ete ouvert.`);
  };

  const handleContactOwner = async () => {
    if (!user?.id || !project?.owner_id) {
      error('Indisponible', 'Le projet ou le referent C2P est introuvable.');
      return;
    }

    try {
      await openPartnerOwnerConversation({
        partner: user,
        projectId: project.id,
        ownerId: String(project.owner_id),
        ownerName: project.porteur_name,
        projectTitle: project.title,
      });

      success('Message envoye', 'Votre demande de point projet a ete transmise a l equipe C2P.');
      navigate('/dashboard/messages');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d ouvrir la conversation avec C2P.');
    }
  };

  if (!loading && (!tracked || !project)) {
    return <TrackedProjectUnavailableState />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Projets suivis', path: '/dashboard/partenaire/projets-suivis' }, { label: project?.title || 'Detail' }]} />

        {loading ? (
          <p className="text-sm text-gray-500">Chargement du detail...</p>
        ) : project && tracked && (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mb-8">
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusTone}`}>{tracked.status}</span>
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                      Partenaire {getPartnerTypeLabel(tracked.partner_type)}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-3">{project.title}</h1>
                    <p className="text-gray-600 mt-2">{project.description}</p>
                  </div>
                  <button onClick={() => void handleContactOwner()} className="px-4 py-2 rounded-lg bg-[#5fa6f3] text-white text-sm font-medium hover:bg-[#27346b]">
                    Contacter C2P
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Investi</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(tracked.invested_amount)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">ROI vise</p><p className="text-lg font-semibold text-gray-900">{tracked.roi}%</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Valorisation</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(tracked.valuation)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Revenus</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(tracked.revenue)}</p></div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Suivi</h2>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-sm text-gray-600">Progression projet</p>
                  <p className="text-2xl font-bold text-gray-900">{tracked.progress || 0}%</p>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-200 mb-4">
                  <div className={`h-3 rounded-full ${tracked.status === 'en_risque' ? 'bg-red-500' : 'bg-[#5fa6f3]'}`} style={{ width: `${tracked.progress || 0}%` }}></div>
                </div>
                <p className="text-sm text-gray-600">Prochain jalon: {tracked.next_milestone}</p>
                <p className="text-sm text-gray-600 mt-1">Derniere activite: {formatDate(tracked.last_update)}</p>
                <div className="mt-5 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Impact</p>
                  <p className="text-sm text-gray-700">{tracked.impact || project.impact || 'Impact non renseigne.'}</p>
                </div>
              </section>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex gap-2 border-b border-gray-200 px-6 py-4">
                {[
                  ['overview', 'Vue generale'],
                  ['milestones', 'Jalons'],
                  ['funding', 'Financement'],
                  ['documents', 'Documents'],
                  ['history', 'Historique'],
                ].map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === key ? 'bg-[#5fa6f3] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Indicateurs projet</h3>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>Equipe: {project.team_size} personnes</p>
                        <p>Mentors: {project.mentors}</p>
                        <p>Documents: {tracked.documents || documents.length}</p>
                        <p>Localisation: {project.location || '-'}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Ecosysteme implique</h3>
                      <div className="space-y-3">
                        {partnerships.length ? partnerships.slice(0, 3).map((partner) => (
                          <div key={partner.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">{partner.name}</p>
                              <p className="text-xs text-gray-500">{partner.role}</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{partner.type}</span>
                          </div>
                        )) : (
                          <p className="text-sm text-gray-600">Aucun partenaire detaille pour le moment.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'milestones' && (
                  <div className="space-y-3">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="font-medium text-gray-900">{milestone.title}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${milestone.status === 'completed' ? 'bg-green-100 text-green-700' : milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {milestone.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                        <div className="w-full h-2 rounded-full bg-gray-200 mb-2">
                          <div className="h-2 rounded-full bg-[#5fa6f3]" style={{ width: `${milestone.progress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(milestone.due_date)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'funding' && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {rounds.length ? rounds.map((round) => (
                      <div key={round.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-medium text-gray-900">{round.type}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {round.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{round.description || 'Tour de financement actif sur ce projet.'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Objectif</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(round.target_amount)}</p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Leve</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(round.raised_amount)}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 lg:col-span-2">
                        Aucun tour de financement visible sur ce projet suivi.
                      </div>
                    )}
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
                        <button onClick={() => handleOpenDocument(document)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Ouvrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {history.length ? history.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-gray-200 p-4">
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{entry.user}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(entry.date)}</p>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        Aucun evenement d’historique n’est disponible pour ce projet.
                      </div>
                    )}
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
