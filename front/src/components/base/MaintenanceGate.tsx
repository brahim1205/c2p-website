import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchPlatformStatus } from '@/lib/platformApi';

const authPaths = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/two-factor',
]);

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshStatus = () => fetchPlatformStatus()
      .then((status) => {
        if (!cancelled) setMaintenance(Boolean(status.maintenance));
      })
      .catch(() => {
        if (!cancelled) setMaintenance(false);
      })
      .finally(() => {
          if (!cancelled) setLoaded(true);
      });

    void refreshStatus();
    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, 10000);

    const handleMaintenanceUpdated = () => {
      void refreshStatus();
    };
    window.addEventListener('c2p:maintenance-updated', handleMaintenanceUpdated);
    window.addEventListener('focus', handleMaintenanceUpdated);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('c2p:maintenance-updated', handleMaintenanceUpdated);
      window.removeEventListener('focus', handleMaintenanceUpdated);
    };
  }, []);

  const canBypass = user?.role === 'superadmin';
  const isAuthPath = authPaths.has(location.pathname);
  const shouldBlock = useMemo(
    () => loaded && !isLoading && maintenance && !canBypass && !isAuthPath,
    [canBypass, isAuthPath, isLoading, loaded, maintenance],
  );

  if (shouldBlock) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <i className="ri-tools-line text-2xl" aria-hidden="true"></i>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Plateforme en maintenance</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Nos équipes réalisent une intervention technique. L’accès revient automatiquement dès la fin de l’opération.
          </p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
