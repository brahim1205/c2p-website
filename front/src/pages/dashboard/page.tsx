import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useBackendMessaging } from '@/hooks/useBackendMessaging';
import { SkeletonCard, SkeletonList } from '@/components/base/Skeleton';
import StatCard from '@/components/base/StatCard';
import { ROLE_DASHBOARD_PATHS } from '@/lib/roles';
import { ClientBaseDashboard } from './ClientBaseDashboard';
import {
  createDashboardHomeContent,
  type DashboardHomeRole,
} from './dashboardHomeModel';

export default function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { totalUnread } = useBackendMessaging({ summaryOnly: true });
  const [loading, setLoading] = useState(true);
  const redirectPath = user?.role ? ROLE_DASHBOARD_PATHS[user.role] : null;
  const userType = (user?.role ?? 'client') as DashboardHomeRole;
  const dashboardContent = useMemo(() => createDashboardHomeContent(totalUnread), [totalUnread]);
  const content = dashboardContent[userType] ?? dashboardContent.client;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (redirectPath && location.pathname !== redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (userType === 'client') {
    return (
      <DashboardLayout>
        <ClientBaseDashboard firstName={user?.firstName || 'Awa'} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }]} />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-gray-600">Bienvenue sur votre espace personnel</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonCard count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {content.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} valueClassName="text-3xl" />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {content.quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.link}
              className={`${action.color} text-white rounded-lg p-5 hover:opacity-90 transition-opacity text-center`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className={`${action.icon} text-xl text-white`}></i>
                </div>
              </div>
              <p className="font-medium text-sm">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-6">Activité récente</h2>
        {loading ? (
          <SkeletonList count={4} />
        ) : (
          <div className="space-y-4">
            {content.activities.map((activity) => (
              <div key={`${activity.text}-${activity.time}`} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-notification-3-line text-base text-teal-600"></i>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-sm text-gray-600 mt-1">{activity.detail}</p>
                  <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
