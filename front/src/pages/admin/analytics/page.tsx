import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { fetchAdminAnalytics, type AdminAnalyticsSnapshot } from '@/lib/adminApi';
import { downloadCsvFile } from '@/lib/downloads';

export default function AdminAnalyticsPage() {
  const { success, error } = useToast();
  const [timeRange, setTimeRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot>({ stats: [], moduleStats: [], topPrestataires: [] });

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await fetchAdminAnalytics());
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les statistiques administrateur.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, timeRange]);

  const handleExport = () => {
    downloadCsvFile('admin-analytics-report.csv', [
      ...snapshot.stats.map((stat) => ({
        section: 'stat',
        label: stat.label,
        value: stat.value,
        change: stat.change,
      })),
      ...snapshot.moduleStats.map((module) => ({
        section: 'module',
        label: module.name,
        users: module.users,
        revenue: module.revenue,
        growth: module.growth,
      })),
      ...snapshot.topPrestataires.map((item) => ({
        section: 'top_prestataire',
        name: item.name,
        profession: item.profession,
        rating: item.rating,
        services: item.services,
        revenue: item.revenue,
      })),
    ]);
    success('Rapport exporte', 'Le rapport analytics a ete telecharge.');
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Statistiques' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Statistiques et Analytics</h1>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5fa6f3] focus:border-transparent text-sm"
            >
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">3 derniers mois</option>
              <option value="365">12 derniers mois</option>
            </select>
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-[#5fa6f3] text-white rounded-lg hover:bg-[#27346b] transition-colors font-medium text-sm whitespace-nowrap"
            >
              Exporter le rapport
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {snapshot.stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <i className={`${stat.icon} text-xl text-white`}></i>
                </div>
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{loading ? '...' : stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Performance par module</h2>
            <button onClick={loadAnalytics} className="text-sm text-[#5fa6f3] hover:text-[#27346b] font-medium">Actualiser</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {snapshot.moduleStats.map((module) => (
              <div key={module.name} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 ${module.color} rounded-lg`}></div>
                  <h3 className="text-base lg:text-lg font-bold text-gray-900">{module.name}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Utilisateurs</span>
                    <span className="text-sm font-bold text-gray-900">{module.users}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Revenus</span>
                    <span className="text-sm font-bold text-gray-900">{module.revenue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Croissance</span>
                    <span className="text-sm font-bold text-green-600">{module.growth}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Top prestataires</h2>
          <div className="space-y-4">
            {snapshot.topPrestataires.map((prestataire, index) => (
              <div key={`${prestataire.name}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-gray-400 w-8">#{index + 1}</span>
                  <img src={prestataire.avatar} alt={prestataire.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{prestataire.name}</h3>
                    <p className="text-xs text-gray-600">{prestataire.profession}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 sm:space-x-8 flex-wrap gap-y-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Note</p>
                    <div className="flex items-center space-x-1">
                      <i className="ri-star-fill text-sm text-yellow-500"></i>
                      <span className="text-sm font-bold text-gray-900">{prestataire.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Services</p>
                    <p className="text-sm font-bold text-gray-900">{prestataire.services}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Revenus</p>
                    <p className="text-sm font-bold text-gray-900">{prestataire.revenue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
