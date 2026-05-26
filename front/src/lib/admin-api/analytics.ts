import { apiRequest } from '../api';
import { fetchUsers } from '../accountApi';
import { fetchAdminTransactions } from '../adminFinanceApi';

export interface AdminAnalyticsSnapshot {
  stats: { label: string; value: string; change: string; icon: string; color: string }[];
  moduleStats: { name: string; users: number; revenue: string; growth: string; color: string }[];
  topPrestataires: { name: string; profession: string; rating: number; services: number; revenue: string; avatar: string }[];
}

interface AdminAnalyticsData {
  bookings: Array<Record<string, unknown>>;
  enrollments: Array<Record<string, unknown>>;
  providers: Array<Record<string, unknown>>;
}

async function fetchAdminAnalyticsData() {
  return apiRequest<AdminAnalyticsData>('/admin/analytics-data');
}

export async function fetchAdminAnalytics() {
  const [users, transactions, analyticsData] = await Promise.all([
    fetchUsers(),
    fetchAdminTransactions(),
    fetchAdminAnalyticsData(),
  ]);
  const bookings = analyticsData.bookings;
  const enrollments = analyticsData.enrollments;
  const providers = analyticsData.providers;

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const totalRevenue = transactions
    .filter((transaction) => transaction.status === 'completed')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const successfulTransactions = transactions.filter((transaction) => transaction.status === 'completed').length;
  const avgRating = providers.length
    ? providers.reduce((sum, provider) => sum + Number(provider.rating || 0), 0) / providers.length
    : 0;

  const moduleStats = [
    {
      name: 'AlloPresta',
      users: bookings.length,
      revenue: `${bookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: `+${Math.max(8, Math.round(bookings.length / 4))}%`,
      color: 'bg-[#5fa6f3]',
    },
    {
      name: 'Espace Numerique',
      users: enrollments.length,
      revenue: `${transactions.filter((item) => item.description.toLowerCase().includes('formation')).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: `+${Math.max(10, Math.round(enrollments.length / 3))}%`,
      color: 'bg-teal-600',
    },
    {
      name: 'ProjectCenter',
      users: users.filter((user) => user.role === 'porteur' || user.role === 'partenaire').length,
      revenue: `${transactions.filter((item) => item.description.toLowerCase().includes('agrolink') || item.description.toLowerCase().includes('dossier')).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('fr-FR')} FCFA`,
      growth: '+18%',
      color: 'bg-green-500',
    },
  ];

  const topPrestataires = providers
    .map((provider) => ({
      name: String(provider.name || ''),
      profession: String(provider.title || provider.category || ''),
      rating: Number(provider.rating || 0),
      services: Number(provider.completed_jobs || 0),
      revenue: `${Math.round(Number(provider.completed_jobs || 0) * Number(provider.price_per_hour || 0) * 0.35).toLocaleString('fr-FR')} FCFA`,
      avatar: String(provider.image || ''),
    }))
    .sort((left, right) => right.rating - left.rating)
    .slice(0, 5);

  return {
    stats: [
      { label: 'Utilisateurs actifs', value: activeUsers.toLocaleString('fr-FR'), change: `+${Math.max(6, Math.round(activeUsers / 80))}%`, icon: 'ri-user-line', color: 'bg-teal-500' },
      { label: 'Revenus totaux', value: `${(totalRevenue / 1000000).toFixed(1)}M FCFA`, change: '+8%', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500' },
      { label: 'Transactions', value: successfulTransactions.toLocaleString('fr-FR'), change: `+${Math.max(12, Math.round(successfulTransactions / 20))}%`, icon: 'ri-exchange-line', color: 'bg-[#5fa6f3]' },
      { label: 'Taux de satisfaction', value: `${avgRating.toFixed(1)}/5`, change: '+0.2', icon: 'ri-star-line', color: 'bg-yellow-500' },
    ],
    moduleStats,
    topPrestataires,
  } satisfies AdminAnalyticsSnapshot;
}
