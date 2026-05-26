import { useEffect, useRef } from 'react';
import type { useBackendMessaging } from '@/hooks/useBackendMessaging';
import type { AuthUser } from '@/lib/roles';
import {
  SUPPORT_ONLY_ROLES,
  findSupportConversation,
} from './messagesPageModel';

type ToastFn = (title: string, message?: string) => void;

type SupportConversationBootstrapArgs = {
  error: ToastFn;
  messaging: ReturnType<typeof useBackendMessaging>;
  searchParams: URLSearchParams;
  success: ToastFn;
  user: AuthUser | null;
};

export function useSupportConversationBootstrap({
  error,
  messaging,
  searchParams,
  success,
  user,
}: SupportConversationBootstrapArgs) {
  const supportBootstrapDoneRef = useRef(false);

  useEffect(() => {
    const supportRequested = searchParams.get('support') === '1';
    const shouldAutoOpenSupport = Boolean(user && SUPPORT_ONLY_ROLES.has(user.role));

    if ((!supportRequested && !shouldAutoOpenSupport) || !user || messaging.loading) {
      return;
    }

    const supportConversation = findSupportConversation(messaging.conversations, user.id);

    if (supportConversation) {
      const shouldNotify = !supportBootstrapDoneRef.current || messaging.activeConversationId !== supportConversation.id;
      supportBootstrapDoneRef.current = true;
      if (messaging.activeConversationId !== supportConversation.id) {
        messaging.setActiveConversationId(supportConversation.id);
      }
      if (shouldNotify) {
        success('Support ouvert', 'La conversation avec l equipe C2P est prete.');
      }
      return;
    }

    if (supportBootstrapDoneRef.current || messaging.conversations.length > 0) {
      return;
    }

    supportBootstrapDoneRef.current = true;

    void (async () => {
      const created = await messaging.createConversation({
        name: 'Support C2P',
        role: 'Support',
        participants: [user.id, 'usr-admin'],
        type: 'individual',
        members: 2,
      });

      if (created) {
        messaging.setActiveConversationId(created.id);
        success('Support ouvert', 'La conversation avec l equipe C2P a ete creee.');
      } else {
        supportBootstrapDoneRef.current = false;
        error('Support indisponible', 'Impossible d ouvrir la conversation support.');
      }
    })();
  }, [error, messaging, searchParams, success, user]);
}
