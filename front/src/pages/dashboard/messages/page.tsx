import DashboardLayout from '../components/DashboardLayout';
import MessagesPageShell from './MessagesPageShell';
import { useMessagesPageSession } from './useMessagesPageSession';

export default function MessagesPage() {
  const session = useMessagesPageSession();

  return (
    <DashboardLayout>
      <MessagesPageShell session={session} />
    </DashboardLayout>
  );
}
