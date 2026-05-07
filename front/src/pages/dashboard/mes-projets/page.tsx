import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function MesProjetsPage() {
  const { user } = useAuth();

  if (user?.role === 'porteur') {
    return <Navigate to="/dashboard/porteur/mes-projets" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
