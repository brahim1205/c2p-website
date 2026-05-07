import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/useToast';

export default function LiveNotifications() {
  const { notifications } = useNotifications();
  const { info } = useToast();
  const lastNotifiedIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    // On first mount, mark all existing as notified so we don't flood the user
    if (lastNotifiedIds.current.size === 0) {
      notifications.forEach((n) => lastNotifiedIds.current.add(n.id));
      return;
    }

    // Find new notifications (those we haven't toasted yet)
    const newNotifications = notifications.filter(
      (n) => !lastNotifiedIds.current.has(n.id)
    );

    newNotifications.forEach((notification) => {
      lastNotifiedIds.current.add(notification.id);
      // Show a toast for the new notification
      info(notification.title, notification.message);
    });
  }, [notifications, info]);

  return null;
}