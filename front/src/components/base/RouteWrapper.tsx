import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import PublicLayout from '@/components/feature/PublicLayout';
import PageTransition from './PageTransition';
import RequireAuth from './RequireAuth';
import type { UserRole } from '@/lib/roles';

interface RouteWrapperProps {
  children: React.ReactNode;
  layout?: 'public' | 'dashboard' | 'admin' | 'none';
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  redirectAuthenticated?: boolean;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

export default function RouteWrapper({
  children,
  layout = 'public',
  requireAuth = false,
  allowedRoles,
  redirectTo,
  redirectAuthenticated,
  hideFooter = false,
  hideHeader = false,
}: RouteWrapperProps) {
  const location = useLocation();

  const wrappedContent = useMemo(() => {
    let content = layout === 'public'
      ? (
        <PageTransition key={location.pathname}>
          {children}
        </PageTransition>
      )
      : <>{children}</>;

    if (requireAuth || redirectAuthenticated) {
      content = (
        <RequireAuth
          allowedRoles={allowedRoles}
          redirectTo={redirectTo}
          redirectAuthenticated={redirectAuthenticated}
        >
          {content}
        </RequireAuth>
      );
    }

    // Dashboard and admin pages handle their own layouts internally.
    // Keep route transitions on public pages only so dashboard navigation feels stable.
    if (layout === 'public') {
      content = (
        <PublicLayout hideFooter={hideFooter} hideHeader={hideHeader}>
          {content}
        </PublicLayout>
      );
    }

    return content;
  }, [children, layout, requireAuth, allowedRoles, redirectTo, redirectAuthenticated, hideFooter, hideHeader, location.pathname]);

  return wrappedContent;
}
