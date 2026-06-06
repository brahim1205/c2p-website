import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isUserRole, ROLE_DASHBOARD_PATHS, type UserRole } from '@/lib/roles';
import { getProfileOnboardingPath, isProfileOnboardingComplete } from '@/lib/profileCompletion';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  redirectAuthenticated?: boolean;
}

export default function RequireAuth({ children, allowedRoles, redirectTo, redirectAuthenticated }: RequireAuthProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Redirect authenticated users away from auth pages (login, register, 2fa)
    if (redirectAuthenticated && isAuthenticated && user) {
      const userDashboard = isUserRole(user.role) ? ROLE_DASHBOARD_PATHS[user.role] : '/dashboard';
      navigate(isProfileOnboardingComplete(user) ? userDashboard : getProfileOnboardingPath(userDashboard), { replace: true });
      return;
    }

    if (!isAuthenticated && !redirectAuthenticated) {
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }

    if (
      isAuthenticated
      && user
      && !redirectAuthenticated
      && location.pathname !== '/auth/onboarding/profil'
      && !isProfileOnboardingComplete(user)
    ) {
      navigate(getProfileOnboardingPath(location.pathname), { replace: true });
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      const userDashboard = isUserRole(user.role) ? ROLE_DASHBOARD_PATHS[user.role] : '/dashboard';
      navigate(userDashboard);
      return;
    }

    if (redirectTo && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, redirectAuthenticated, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Verification de la session...</p>
        </div>
      </div>
    );
  }

  if (redirectAuthenticated && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Redirection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !redirectAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Redirection...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm font-medium">Redirection...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
