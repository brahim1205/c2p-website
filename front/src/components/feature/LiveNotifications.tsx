import { useEffect, useRef } from 'react';
import type { Notification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/useToast';

interface LiveNotificationsProps {
  notifications: Notification[];
}

function playNotificationSound() {
  if (typeof window === 'undefined') return;

  const AudioContextCtor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);

    oscillator.onended = () => {
      void context.close().catch(() => undefined);
    };
  } catch {
    // Ignore autoplay and audio device failures.
  }
}

export default function LiveNotifications({ notifications }: LiveNotificationsProps) {
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
      info(notification.title, notification.message);
      playNotificationSound();
    });
  }, [notifications, info]);

  return null;
}
