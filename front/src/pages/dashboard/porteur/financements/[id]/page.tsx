import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { fetchOwnerFundingRoundDetail, type FundingInvestor, type FundingRound, type ProjectDocument, type ProjectHistoryItem } from '@/lib/projectApi';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { openHtmlPreview } from '@/lib/downloads';

export default function PorteurFinancementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<FundingRound | null>(null);
  const [investors, setInvestors] = useState<FundingInvestor[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'investors' | 'documents' | 'history'>('overview');

  const loadRound = useCallback(async () => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchOwnerFundingRoundDetail(user.id, Number(id));
      setRound(payload.round);
      setInvestors(payload.investors);
      setDocuments(payload.documents);
      setHistory(payload.history);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger cette levee de fonds.');
    } finally {
      setLoading(false);
    }
  }, [error, id, user?.id]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const progress = useMemo(() => {
    if (!round?.target_amount) return 0;
    return Math.round((round.raised_amount / round.target_amount) * 100);
  }, [round]);

  const handleOpenDocument = (document: ProjectDocument) => {
    if (!round) return;
    openHtmlPreview(`${round.project_title}-${document.name}`, `<!DOCTYPE html>
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
    <p>Levee : ${round.project_title}</p>
    <p>Type : ${round.type}</p>
    <p>Categorie : ${document.category}</p>
    <p>Date : ${formatDate(document.date)}</p>
  </main>
</body>
</html>`);
    success('Document pret', `Le document "${document.name}" a ete ouvert.`);
  };

  if (!loading && !round) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Financements', path: '/dashboard/porteur/financements' }, { label: 'Detail' }]} />
          <div className="py-20 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Levee introuvable</h2>
            <Link to="/dashboard/porteur/financements" className="inline-flex px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
              Retour aux financements
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur', path: '/dashboard/porteur' }, { label: 'Financements', path: '/dashboard/porteur/financements' }, { label: round?.project_title || 'Detail' }]} />

        {loading ? (
          <p className="text-sm text-gray-500">Chargement de la levee...</p>
        ) : round && (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mb-8">
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{round.type}</span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-3">{round.project_title}</h1>
                    <p className="text-gray-600 mt-2">{round.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {round.status === 'termine' ? 'Terminee' : 'En cours'}
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Objectif</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(round.target_amount)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Leve</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(round.raised_amount)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Valorisation</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(round.valuation)}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Runway</p><p className="text-lg font-semibold text-gray-900">{round.runway || '-'}</p></div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Execution</h2>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-sm text-gray-600">Progression de la levee</p>
                  <p className="text-2xl font-bold text-gray-900">{progress}%</p>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-200 mb-4">
                  <div className="h-3 rounded-full bg-green-500" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm text-gray-600">Date limite: {formatDate(round.deadline)}</p>
                <p className="text-sm text-gray-600 mt-1">Debut: {formatDate(round.start_date)}</p>
                <p className="text-sm text-gray-600 mt-1">Prochain jalon: {round.next_milestone || '-'}</p>
              </section>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex flex-wrap gap-2 border-b border-gray-200 px-6 py-4">
                {[
                  ['overview', 'Vue generale'],
                  ['investors', 'Investisseurs'],
                  ['documents', 'Documents'],
                  ['history', 'Historique'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === key ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Data room</h3>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>Pitch deck: {round.pitch_deck ? 'Disponible' : 'Manquant'}</p>
                        <p>Business plan: {round.business_plan ? 'Disponible' : 'Manquant'}</p>
                        <p>Burn rate: {formatCurrency(round.burn_rate)}</p>
                        <p>Revenus mensuels: {formatCurrency(round.revenue)}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Synthese investisseurs</h3>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>Nombre d investisseurs: {investors.length}</p>
                        <p>Cheque moyen: {formatCurrency(investors.length ? investors.reduce((sum, investor) => sum + investor.amount, 0) / investors.length : 0)}</p>
                        <p>Part active: {investors.filter((investor) => investor.status === 'active').length}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'investors' && (
                  <div className="space-y-3">
                    {investors.map((investor) => (
                      <div key={investor.id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{investor.name}</p>
                          <p className="text-sm text-gray-600">{investor.type} · {investor.equity}</p>
                          <p className="text-xs text-gray-500 mt-1">{investor.notes}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(investor.amount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(investor.date)}</p>
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
                        <button onClick={() => handleOpenDocument(document)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
