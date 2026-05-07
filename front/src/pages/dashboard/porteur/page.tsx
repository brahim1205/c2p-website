import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import GlobalSearch from '../components/GlobalSearch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fetchFundingRoundsForOwner, fetchOwnerProjects, fetchPartnershipsForOwner, type FundingRound, type ProjectPartnership, type ProjectRecord } from '@/lib/projectApi';
import { formatCurrency, formatShortCurrency } from '@/lib/formatters';

export default function PorteurDashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [partnerships, setPartnerships] = useState<ProjectPartnership[]>([]);
  const [rounds, setRounds] = useState<FundingRound[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projectsData, partnershipsData, roundsData] = await Promise.all([
        fetchOwnerProjects(user.id),
        fetchPartnershipsForOwner(user.id),
        fetchFundingRoundsForOwner(user.id),
      ]);
      setProjects(projectsData);
      setPartnerships(partnershipsData);
      setRounds(roundsData);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les donnees porteur.');
    } finally {
      setLoading(false);
    }
  }, [error, user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const totalFunding = projects.reduce((sum, project) => sum + Number(project.funding || 0), 0);
    const totalGoal = projects.reduce((sum, project) => sum + Number(project.funding_goal || 0), 0);
    return [
      { label: 'Projets soumis', value: projects.length, icon: 'ri-file-list-line', color: 'bg-green-500' },
      { label: 'En incubation', value: projects.filter((project) => project.status === 'incubation').length, icon: 'ri-seedling-line', color: 'bg-teal-500' },
      { label: 'Mentors assignes', value: partnerships.filter((partner) => partner.type === 'mentor').length, icon: 'ri-user-star-line', color: 'bg-purple-500' },
      { label: 'Financement obtenu', value: totalGoal > 0 ? `${Math.round((totalFunding / totalGoal) * 100)}%` : '0%', icon: 'ri-funds-line', color: 'bg-[#14B8A6]', helper: formatShortCurrency(totalFunding) },
    ];
  }, [partnerships, projects]);

  const mentors = partnerships.filter((partner) => partner.type === 'mentor').slice(0, 3);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      incubation: 'bg-blue-100 text-blue-700',
      'pre-incubation': 'bg-amber-100 text-amber-700',
      acceleration: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      incubation: 'En incubation',
      'pre-incubation': 'Pre-incubation',
      acceleration: 'Acceleration',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Porteur de projet' }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Porteur de projet</h1>
          <p className="text-gray-600">Pilotage des projets, partenariats et financements en cours.</p>
        </div>

        <GlobalSearch context="porteur" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                  <i className={`${stat.icon} text-xl`}></i>
                </div>
                {'helper' in stat && stat.helper ? <span className="text-xs text-gray-500">{stat.helper}</span> : null}
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Mes projets</h2>
              <Link to="/dashboard/porteur/mes-projets" className="text-sm font-medium text-green-600 hover:text-green-700">Voir tout</Link>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des projets...</p>}
              {!loading && projects.slice(0, 3).map((project) => (
                <div key={project.id} className="p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(project.status)}
                        <span className="text-sm text-gray-600">{formatCurrency(project.funding)} / {formatShortCurrency(project.funding_goal)}</span>
                      </div>
                    </div>
                    <Link to={`/dashboard/porteur/mes-projets/${project.id}`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 text-center">
                      Details
                    </Link>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{project.phase}</span>
                    <span>{project.next_milestone}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Mentors et partenaires</h2>
              <span className="text-sm text-gray-500">{partnerships.length} relation(s)</span>
            </div>

            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement des partenaires...</p>}
              {!loading && mentors.map((mentor) => (
                <div key={mentor.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <img src={mentor.avatar} alt={mentor.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-medium text-gray-900">{mentor.name}</h3>
                      <p className="text-sm text-gray-600">{mentor.role}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    mentor.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {mentor.status === 'actif' ? 'Actif' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Levees de fonds en cours</h2>
            <Link to="/dashboard/porteur/financements" className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488]">Voir tout</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {rounds.slice(0, 3).map((round) => (
              <div key={round.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{round.project_title}</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${round.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {round.status === 'termine' ? 'Termine' : 'En cours'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{round.type}</p>
                <p className="text-sm font-medium text-gray-900 mb-2">{formatCurrency(round.raised_amount)} / {formatShortCurrency(round.target_amount)}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#14B8A6] h-2 rounded-full" style={{ width: `${round.progress_percent || 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Soumettre un projet', icon: 'ri-add-circle-line', link: '/project-center/soumettre', tone: 'text-green-600 bg-green-100' },
              { label: 'Mes projets', icon: 'ri-folder-line', link: '/dashboard/porteur/mes-projets', tone: 'text-blue-600 bg-blue-100' },
              { label: 'Partenariats', icon: 'ri-team-line', link: '/dashboard/porteur/partenariats', tone: 'text-purple-600 bg-purple-100' },
              { label: 'Financements', icon: 'ri-funds-line', link: '/dashboard/porteur/financements', tone: 'text-[#14B8A6] bg-[#14B8A6]/10' },
              { label: 'Messagerie', icon: 'ri-message-3-line', link: '/dashboard/messages', tone: 'text-yellow-600 bg-yellow-100' },
            ].map((action) => (
              <Link key={action.link} to={action.link} className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 transition-all text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${action.tone}`}>
                  <i className={`${action.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
