import { Navigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import MessagesPageShell from './MessagesPageShell';
import { useMessagesPageSession } from './useMessagesPageSession';

export default function MessagesPage() {
  const session = useMessagesPageSession();

  if (session.user?.role === 'apprenant') {
    return <Navigate to="/dashboard/apprenant" replace />;
  }

  return (
    <DashboardLayout>
      <MessagesPageShell session={session} />
    </DashboardLayout>
  );
}
