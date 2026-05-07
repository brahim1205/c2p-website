import { backendClient } from '@/lib/backendClient';


export type NotificationType = 'message' | 'prestation' | 'formation' | 'projet' | 'paiement' | 'system' | 'rendezvous' | 'collaboration' | 'evaluation' | 'booking' | 'review';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'system',
  link?: string,
  avatar?: string
) {
  try {
    const { error } = await backendClient.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      link,
      metadata: avatar ? { avatar } : {},
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Failed to create notification:', err);
    return false;
  }
}

// Booking-related notifications
export async function notifyBookingCreated(clientId: string, providerId: number, service: string) {
  // Notify client
  await createNotification(
    clientId,
    'Réservation créée',
    `Votre demande pour "${service}" a été envoyée au prestataire.`,
    'booking',
    '/dashboard/client/reservations'
  );
  const { data: provider } = await backendClient
    .from<{ user_id?: string }>('providers')
    .select('user_id')
    .eq('id', providerId)
    .maybeSingle();

  const providerUserId = provider?.user_id ?? 'usr-prestataire';

  // Notify provider
  await createNotification(
    providerUserId,
    'Nouvelle demande de prestation',
    `Un client demande : ${service}`,
    'prestation',
    '/dashboard/prestataire/demandes'
  );
}

export async function notifyBookingStatusChanged(
  clientId: string,
  service: string,
  status: string
) {
  const labels: Record<string, string> = {
    confirmed: 'acceptée',
    declined: 'refusée',
    in_progress: 'démarrée',
    completed: 'terminée',
    cancelled: 'annulée',
  };
  await createNotification(
    clientId,
    `Réservation ${labels[status] || 'mise à jour'}`,
    `Votre demande pour "${service}" est maintenant ${labels[status] || status}.`,
    'booking',
    '/dashboard/client/reservations'
  );
}

// Review notification
export async function notifyNewReview(providerUserId: string, clientName: string, rating: number) {
  await createNotification(
    providerUserId,
    'Nouvel avis client',
    `${clientName} vous a noté ${rating}/5 étoiles.`,
    'review',
    '/dashboard/prestataire/avis'
  );
}
