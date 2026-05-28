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
    const now = context.currentTime;
    const notes = [
      { frequency: 1174.66, start: 0, duration: 0.16 },
      { frequency: 1567.98, start: 0.13, duration: 0.2 },
    ];

    notes.forEach((note) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = now + note.start;
      const endAt = startAt + note.duration;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 0.92, endAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.052, startAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt);
    });

    window.setTimeout(() => {
      void context.close().catch(() => undefined);
    }, 450);
  } catch {
    // Ignore autoplay and audio device failures.
  }
}

export default function LiveNotifications({ notifications }: LiveNotificationsProps) {
  const { info } = useToast();
  const lastNotifiedIds = useRef<Set<string>>(new Set());

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
