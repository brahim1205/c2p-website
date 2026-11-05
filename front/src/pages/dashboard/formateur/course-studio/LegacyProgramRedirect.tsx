import { Navigate, useParams } from 'react-router-dom';
import { studioPath } from './studioModel';

/** Old `/mes-cours/:id/programme` links (notifications, bookmarks) now open the course studio. */
export default function LegacyProgramRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? studioPath(id, 'programme') : '/dashboard/formateur/mes-cours'} replace />;
}
