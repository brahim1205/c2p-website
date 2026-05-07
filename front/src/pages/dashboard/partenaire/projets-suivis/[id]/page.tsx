import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchProjectDetail, fetchTrackedProjects, type ProjectDocument, type ProjectMilestone, type ProjectRecord, type TrackedProject } from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { backendClient } from '@/lib/backendClient';
import { openHtmlPreview } from '@/lib/downloads';

export default function PartenaireProjetSuiviDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [tracked, setTracked] = useState<TrackedProject | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'documents'>('overview');

  const loadDetail = useCallback(async () => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [portfolio, detail] = await Promise.all([
        fetchTrackedProjects(user.id),
        fetchProjectDetail(Number(id)),
      ]);
      setTracked(portfolio.find((item) => item.project_id === Number(id)) || null);
      setProject(detail.project);
      setMilestones(detail.milestones);
      setDocuments(detail.documents);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger ce projet suivi.');
    } finally {
      setLoading(false);
    }
  }, [error, id, user?.id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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
      error('Indisponible', 'Le porteur de projet est introuvable.');
      return;
    }

    try {
      const { data: conversationRows, error: conversationError } = await backendClient
        .from<any>('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (conversationError) throw new Error(conversationError.message);

      const existingConversation = ((conversationRows as any[]) || []).find((conversation) =>
        Array.isArray(conversation.participants)
        && conversation.participants.map(String).includes(user.id)
        && conversation.participants.map(String).includes(String(project.owner_id))
      );

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        const { data: createdConversation, error: createError } = await backendClient
          .from('conversations')
          .insert({
            name: project.porteur_name,
            role: 'porteur',
            participants: [user.id, String(project.owner_id)],
            type: 'individual',
            members: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

        if (createError) throw new Error(createError.message);
        conversationId = (createdConversation as { id: string }).id;
      }

      await backendClient.from('messages').insert({
        conversation_id: conversationId,
        content: `Bonjour ${project.porteur_name}, je souhaite faire un point sur le projet "${project.title}".`,
        sender_id: user.id,
        sender_name: `${user.firstName} ${user.lastName}`,
        sender_avatar: user.avatar,
        read: false,
        attachments: [],
        created_at: new Date().toISOString(),
      });

      success('Message envoye', 'Votre demande de point projet a ete transmise au porteur.');
      navigate('/dashboard/messages');
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible d ouvrir la conversation avec le porteur.');
    }
  };

  if (!loading && (!tracked || !project)) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Partenaire', path: '/dashboard/partenaire' }, { label: 'Projets suivis', path: '/dashboard/partenaire/projets-suivis' }, { label: 'Detail' }]} />
          <div className="py-20 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Projet introuvable</h2>
            <Link to="/dashboard/partenaire/projets-suivis" className="inline-flex px-4 py-2 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488]">
              Retour au portefeuille
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
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
                    <h1 className="text-3xl font-bold text-gray-900 mt-3">{project.title}</h1>
                    <p className="text-gray-600 mt-2">{project.description}</p>
                  </div>
                  <button onClick={() => void handleContactOwner()} className="px-4 py-2 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488]">
                    Contacter le porteur
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
                  <div className={`h-3 rounded-full ${tracked.status === 'en_risque' ? 'bg-red-500' : 'bg-[#14B8A6]'}`} style={{ width: `${tracked.progress || 0}%` }}></div>
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
                  ['documents', 'Documents'],
                ].map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === key ? 'bg-[#14B8A6] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Pourquoi ce suivi</h3>
                      <p className="text-sm text-gray-700">{project.looking_for.join(', ') || 'Accompagnement general'}</p>
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
                          <div className="h-2 rounded-full bg-[#14B8A6]" style={{ width: `${milestone.progress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(milestone.due_date)}</p>
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
                        <button onClick={() => handleOpenDocument(document)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Ouvrir
                        </button>
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
