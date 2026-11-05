import { Navigate } from 'react-router-dom';

/** The public profile now lives in the settings page; old links keep working. */
export default function FormateurPublicProfilePage() {
  return <Navigate to="/dashboard/parametres?onglet=profil-public" replace />;
}
