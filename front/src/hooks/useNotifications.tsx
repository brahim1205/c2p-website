import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  clearMyNotifications,
  createNotificationRecord,
  deleteNotificationRecord,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '@/lib/notificationsApi';
import { queryKeys } from '@/lib/queryKeys';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = queryKeys.notifications.mine(user?.id, 30);

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await fetchMyNotifications(30);
      return data.map(mapNotificationRecord);
    },
    enabled: Boolean(user?.id),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updateCachedNotifications = useCallback((updater: (current: Notification[]) => Notification[]) => {
    queryClient.setQueryData<Notification[]>(queryKey, (current = []) => updater(current));
  }, [queryClient, queryKey]);

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];
      updateCachedNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return { previous };
    },
    onError: (err, _id, context) => {
      console.warn('Failed to mark notification as read:', err);
      queryClient.setQueryData(queryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];
      updateCachedNotifications((current) => current.map((n) => ({ ...n, read: true })));
      return { previous };
    },
    onError: (err, _variables, context) => {
      console.warn('Failed to mark all notifications as read:', err);
      queryClient.setQueryData(queryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotificationRecord,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];
      updateCachedNotifications((current) => current.filter((n) => n.id !== id));
      return { previous };
    },
    onError: (err, _id, context) => {
      console.warn('Failed to delete notification:', err);
      queryClient.setQueryData(queryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearMyNotifications,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];
      queryClient.setQueryData<Notification[]>(queryKey, []);
      return { previous };
    },
    onError: (err, _variables, context) => {
      console.warn('Failed to clear notifications:', err);
      queryClient.setQueryData(queryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const addNotificationMutation = useMutation({
    mutationFn: createNotificationRecord,
    onSuccess: (data) => {
      updateCachedNotifications((current) => [mapNotificationRecord(data), ...current]);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.warn('Failed to add notification:', err);
    },
  });

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    await markAsReadMutation.mutateAsync(id);
  }, [markAsReadMutation, user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation, user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user?.id) return;
    await deleteNotificationMutation.mutateAsync(id);
  }, [deleteNotificationMutation, user?.id]);

  const clearAll = useCallback(async () => {
    if (!user?.id) return;
    await clearAllMutation.mutateAsync();
  }, [clearAllMutation, user?.id]);

  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id'>) => {
      if (!user?.id) return;
      await addNotificationMutation.mutateAsync({
        userId: user.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        avatar: notification.avatar,
      });
    },
    [addNotificationMutation, user?.id]
  );

  const refresh = useCallback(async () => {
    await notificationsQuery.refetch();
  }, [notificationsQuery]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    refresh,
  };
}

function mapNotificationRecord(n: NotificationRecord): Notification {
  return {
    id: String(n.id),
    type: (n.type as NotificationType) || 'system',
    title: String(n.title || ''),
    message: String(n.message || ''),
    timestamp: formatTimestamp(String(n.created_at || new Date().toISOString())),
    read: Boolean(n.is_read),
    link: n.link ? String(n.link) : undefined,
    avatar: n.metadata && typeof n.metadata === 'object' && n.metadata.avatar
      ? String(n.metadata.avatar)
      : undefined,
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
