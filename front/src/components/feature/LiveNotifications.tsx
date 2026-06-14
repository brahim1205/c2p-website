import { useEffect, useRef } from 'react';
import type { Notification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/useToast';

interface LiveNotificationsProps {
  notifications: Notification[];
  loading?: boolean;
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return;

  const AudioContextCtor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return;
  sharedAudioContext ??= new AudioContextCtor();
  return sharedAudioContext;
}

async function playNotificationSound() {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();
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

  } catch {
    // Ignore autoplay and audio device failures.
  }
}

export default function LiveNotifications({ notifications, loading = false }: LiveNotificationsProps) {
  const { info } = useToast();
  const lastNotifiedIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!initialized.current) {
      notifications.forEach((n) => lastNotifiedIds.current.add(n.id));
      initialized.current = true;
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
  }, [notifications, info, loading]);

  useEffect(() => {
    const unlockAudio = () => {
      const context = getAudioContext();
      if (context?.state === 'suspended') void context.resume().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  return null;
}
