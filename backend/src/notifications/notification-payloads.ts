export type AppNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type NotificationRecipient = {
  user_id: string;
};

type VirtualClassNotificationEvent = 'live-scheduled' | 'live-updated' | 'live-started' | 'live-ended' | 'replay-ready';

type VirtualClassLike = {
  id?: string | number | null;
  title?: string | null;
  class_date?: string | null;
  class_time?: string | null;
  course_id?: string | number | null;
  course_name?: string | null;
};

export function createNotificationId(prefix = 'notif', recipientId?: string) {
  const suffix = recipientId ? `-${String(recipientId)}` : '';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${suffix}`;
}

export function createAppNotificationRow(input: {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}) : AppNotificationRow {
  return {
    id: input.id ?? createNotificationId('notif', input.userId),
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? 'system',
    is_read: false,
    ...(input.link ? { link: input.link } : {}),
    metadata: {
      channel: 'system',
      ...(input.metadata ?? {}),
    },
    created_at: input.createdAt ?? new Date().toISOString(),
  };
}

export function createVirtualClassNotifications(input: {
  vclass: VirtualClassLike;
  recipients: NotificationRecipient[];
  eventType: VirtualClassNotificationEvent;
}) {
  const { vclass, recipients, eventType } = input;
  if (recipients.length === 0) {
    return [];
  }

  const title = String(vclass.title ?? 'Classe virtuelle');
  const scheduleLabel = `${String(vclass.class_date ?? '')} à ${String(vclass.class_time ?? '')}`.trim();
  const link = `/espace-numerique/classe-virtuelle/${String(vclass.id ?? '')}`;

  const template = {
    'live-scheduled': {
      notificationTitle: 'Nouveau live programme',
      notificationMessage: `Le live "${title}" est programme le ${scheduleLabel}.`,
    },
    'live-updated': {
      notificationTitle: 'Live mis a jour',
      notificationMessage: `Le live "${title}" a ete mis a jour. Verifiez l horaire et le lien de connexion.`,
    },
    'live-started': {
      notificationTitle: 'Live en cours',
      notificationMessage: `Le live "${title}" vient de demarrer. Rejoignez la session maintenant.`,
    },
    'live-ended': {
      notificationTitle: 'Replay en preparation',
      notificationMessage: `Le live "${title}" est termine. Le replay est en cours de preparation.`,
    },
    'replay-ready': {
      notificationTitle: 'Replay disponible',
      notificationMessage: `Le replay du live "${title}" est disponible.`,
    },
  }[eventType];

  return recipients.map((recipient) => createAppNotificationRow({
    id: createNotificationId('notif-live', recipient.user_id),
    userId: recipient.user_id,
    title: template.notificationTitle,
    message: template.notificationMessage,
    type: 'live',
    link,
    metadata: {
      class_id: vclass.id ?? null,
      course_id: vclass.course_id ?? null,
      course_name: vclass.course_name ?? null,
      event: eventType,
    },
  }));
}
