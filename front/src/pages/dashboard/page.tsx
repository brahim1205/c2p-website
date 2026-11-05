import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_DASHBOARD_PATHS } from '@/lib/roles';

/**
 * `/dashboard` has no content of its own: every role owns a dedicated dashboard
 * fed by real data. This entry point only forwards the user there.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const target = user?.role ? ROLE_DASHBOARD_PATHS[user.role] : undefined;
  return <Navigate to={target ?? '/auth/login'} replace />;
}
