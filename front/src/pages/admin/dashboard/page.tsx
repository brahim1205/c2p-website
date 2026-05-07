import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import GlobalSearch from '@/pages/dashboard/components/GlobalSearch';
import StatCard from '@/components/base/StatCard';
import { useToast } from '@/hooks/useToast';
import { backendClient } from '@/lib/backendClient';
import { fetchUsers } from '@/lib/accountApi';
import { formatShortCurrency } from '@/lib/formatters';
import { downloadJsonFile } from '@/lib/downloads';

interface ManagedUser {
  status: 'active' | 'pending' | 'suspended';
  role: string;
}

interface Course {
  price: number;
  revenue?: number;
  status: string;
}

interface Booking {
  status: string;
  price: number | null;
}

interface Project {
  funding: number;
  status: string;
}

interface HistoryItem {
  id: number;
  project_title?: string | null;
  action: string;
  user: string;
  date: string;
}

export default function AdminDashboardPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, coursesRes, bookingsRes, projectsRes, historyRes] = await Promise.all([
        fetchUsers(),
        backendClient.from('courses').select('*').order('updated_at', { ascending: false }),
        backendClient.from('bookings').select('*').order('created_at', { ascending: false }),
        backendClient.from('projects').select('*').order('created_at', { ascending: false }),
        backendClient.from('project_history').select('*').order('date', { ascending: false }).limit(6),
      ]);

      if (coursesRes.error) throw new Error(coursesRes.error.message);
      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (projectsRes.error) throw new Error(projectsRes.error.message);
      if (historyRes.error) throw new Error(historyRes.error.message);

      setUsers(usersData as ManagedUser[]);
      setCourses((coursesRes.data as Course[]) || []);
      setBookings((bookingsRes.data as Booking[]) || []);
      setProjects((projectsRes.data as Project[]) || []);
      setHistory((historyRes.data as HistoryItem[]) || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger le tableau de bord administrateur.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((booking) => booking.status === 'completed' || booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.price ?? 0), 0)
      + courses.reduce((sum, course) => sum + Number(course.revenue ?? 0), 0);

    return [
      { label: 'Utilisateurs totaux', value: String(users.length), change: `${users.filter((user) => user.status === 'pending').length} en attente`, icon: 'ri-user-line', color: 'bg-teal-500' },
      { label: 'Revenus consolides', value: formatShortCurrency(revenue), change: `${bookings.length} flux suivis`, icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
      { label: 'Prestations actives', value: String(bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'in_progress').length), change: `${bookings.filter((booking) => booking.status === 'pending').length} a traiter`, icon: 'ri-briefcase-line', color: 'bg-[#14B8A6]' },
      { label: 'Projets actifs', value: String(projects.filter((project) => project.status !== 'termine').length), change: `${courses.filter((course) => course.status === 'published').length} cours publies`, icon: 'ri-lightbulb-flash-line', color: 'bg-amber-500' },
    ];
  }, [bookings, courses, projects, users]);

  const pendingActions = useMemo(() => [
    { label: 'Comptes a valider', count: users.filter((user) => user.status === 'pending').length, link: '/admin/users', color: 'bg-orange-500', icon: 'ri-user-follow-line' },
    { label: 'Prestations a confirmer', count: bookings.filter((booking) => booking.status === 'pending').length, link: '/admin/payments', color: 'bg-[#14B8A6]', icon: 'ri-file-list-3-line' },
    { label: 'Projets en incubation', count: projects.filter((project) => project.status === 'incubation').length, link: '/admin/content', color: 'bg-amber-500', icon: 'ri-lightbulb-line' },
    { label: 'Cours en revue', count: courses.filter((course) => course.status === 'review').length, link: '/admin/content', color: 'bg-blue-500', icon: 'ri-book-open-line' },
  ], [bookings, courses, projects, users]);

  const modules = [
    { title: 'Utilisateurs', description: 'Validation, suspension et suivi des comptes.', path: '/admin/users', icon: 'ri-user-settings-line' },
    { title: 'Contenus', description: 'Formations, projets et contenus a valider.', path: '/admin/content', icon: 'ri-layout-grid-line' },
    { title: 'Paiements', description: 'Transactions, commissions et rapprochement.', path: '/admin/payments', icon: 'ri-bank-card-line' },
    { title: 'Communications', description: 'Campagnes et messages plateforme.', path: '/admin/communications', icon: 'ri-mail-send-line' },
    { title: 'Securite', description: 'Backups, alertes et supervision systeme.', path: '/admin/security', icon: 'ri-shield-keyhole-line' },
    { title: 'Parametres', description: 'Regles, categories et configuration.', path: '/admin/settings', icon: 'ri-settings-4-line' },
  ];

  const handleExport = () => {
    downloadJsonFile('admin-supervision-snapshot.json', {
      generatedAt: new Date().toISOString(),
      stats,
      pendingActions,
      modules,
      history,
    });
    success('Export pret', 'Le snapshot de supervision a ete telecharge.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Tableau de bord' }]} />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord administrateur</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-[#14B8A6] text-white rounded-lg hover:bg-[#0D9488] text-sm font-medium"
          >
            Exporter
          </button>
        </div>

        <GlobalSearch context="admin" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Actions en attente</h2>
            <span className="text-sm text-gray-500">{pendingActions.reduce((sum, item) => sum + item.count, 0)} elements</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {pendingActions.map((action) => (
              <Link key={action.label} to={action.link} className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                    <i className={`${action.icon} text-base`}></i>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{action.count}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 mt-4">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Activite recente</h2>
              <button onClick={loadDashboard} className="text-sm text-[#14B8A6] hover:text-[#0D9488] font-medium">Actualiser</button>
            </div>
            <div className="space-y-4">
              {loading && <p className="text-sm text-gray-500">Chargement de l activite...</p>}
              {!loading && history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className="w-10 h-10 bg-[#14B8A6]/10 rounded-full flex items-center justify-center text-[#14B8A6]">
                    <i className="ri-notification-3-line"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    <p className="text-sm text-gray-600 mt-1">{entry.user}</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Modules d administration</h2>
              <div className="space-y-3">
                {modules.map((module) => (
                  <Link key={module.title} to={module.path} className="block rounded-xl border border-gray-200 p-4 hover:border-[#14B8A6]/40 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                        <i className={`${module.icon} text-lg`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{module.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
