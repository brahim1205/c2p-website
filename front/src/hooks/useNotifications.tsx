import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { backendClient } from '@/lib/backendClient';

export type NotificationType = 'message' | 'prestation' | 'formation' | 'projet' | 'paiement' | 'system' | 'rendezvous' | 'collaboration' | 'evaluation' | 'booking' | 'review';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  link?: string;
}


export function useNotifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    if (isMountedRef.current) {
      setIsLoading(true);
    }
    try {
      const { data, error } = await backendClient
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!isMountedRef.current) return;
      if (data) {
        const mapped: Notification[] = data.map((n) => ({
          id: String(n.id),
          type: (n.type as NotificationType) || 'system',
          title: String(n.title || ''),
          message: String(n.message || ''),
          timestamp: formatTimestamp(n.created_at),
          read: Boolean(n.is_read),
          link: n.link ? String(n.link) : undefined,
          avatar: n.metadata && typeof n.metadata === 'object' && (n.metadata as Record<string, unknown>).avatar
            ? String((n.metadata as Record<string, unknown>).avatar)
            : undefined,
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Failed to fetch notifications:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications table changes for this user
    const channel = backendClient
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Record<string, unknown>;
          const notification: Notification = {
            id: String(newNotif.id),
            type: (newNotif.type as NotificationType) || 'system',
            title: String(newNotif.title || ''),
            message: String(newNotif.message || ''),
            timestamp: 'À l\'instant',
            read: false,
            link: newNotif.link ? String(newNotif.link) : undefined,
            avatar: newNotif.metadata && typeof newNotif.metadata === 'object' && (newNotif.metadata as Record<string, unknown>).avatar
              ? String((newNotif.metadata as Record<string, unknown>).avatar)
              : undefined,
          };
          setNotifications((prev) => [notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === String(updated.id)
                ? { ...n, read: Boolean(updated.is_read) }
                : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (user?.id) {
      try {
        await backendClient
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
      }
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user?.id) {
      try {
        await backendClient
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_read', false);
      } catch (err) {
        console.warn('Failed to mark all notifications as read:', err);
      }
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (user?.id) {
      try {
        await backendClient.from('notifications').delete().eq('id', id).eq('user_id', user.id);
      } catch (err) {
        console.warn('Failed to delete notification:', err);
      }
    }
  }, [user?.id]);

  const clearAll = useCallback(async () => {
    const previous = notifications;
    setNotifications([]);
    if (user?.id) {
      try {
        await backendClient.from('notifications').delete().eq('user_id', user.id);
      } catch (err) {
        console.warn('Failed to clear notifications:', err);
        setNotifications(previous);
      }
    }
  }, [notifications, user?.id]);

  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id'>) => {
      if (!user?.id) return;
      try {
        const { data, error } = await backendClient
          .from('notifications')
          .insert({
            user_id: user.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            is_read: false,
            link: notification.link,
            metadata: notification.avatar ? { avatar: notification.avatar } : {},
          })
          .select('id')
          .single();
        if (error) throw error;
        if (data) {
          setNotifications((prev) => [
            { ...notification, id: String(data.id), timestamp: 'À l\'instant' },
            ...prev,
          ]);
        }
      } catch (err) {
        console.warn('Failed to add notification:', err);
      }
    },
    [user?.id]
  );

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
    isLoading,
    error: null,
    refresh: fetchNotifications,
  };
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
