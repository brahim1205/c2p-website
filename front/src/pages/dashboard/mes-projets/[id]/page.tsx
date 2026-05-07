import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  if (user?.role === 'porteur' && id) {
    return <Navigate to={`/dashboard/porteur/mes-projets/${id}`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
