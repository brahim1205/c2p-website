import {
  createNotificationRecord,
  fetchProviderNotificationRecipient,
} from '@/lib/notificationsApi';


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
    await createNotificationRecord({
      userId,
      title,
      message,
      type,
      link,
      avatar,
    });
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
  const provider = await fetchProviderNotificationRecipient(providerId);
  const providerUserId = provider.userId ?? 'usr-prestataire';

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

export async function notifyInstructorEnrollment(instructorUserId: string, courseTitle: string) {
  await createNotification(
    instructorUserId,
    'Nouvelle inscription',
    `Un apprenant s'est inscrit a "${courseTitle}"`,
    'formation',
    '/dashboard/formateur/apprenants',
  );
}

export async function notifyAdminClientReport(adminMessage: string, avatar?: string) {
  await createNotification(
    'usr-admin',
    'Nouveau signalement client',
    adminMessage,
    'system',
    '/admin/reports',
    avatar,
  );
}

export async function notifyClientReportReceipt(userId: string, userMessage: string, userLink?: string) {
  await createNotification(
    userId,
    'Signalement enregistré',
    userMessage,
    'system',
    userLink,
  );
}

export async function notifyProviderReviewPublished(
  providerUserId: string,
  clientName: string,
  service: string,
  rating: number,
  avatar?: string,
) {
  await createNotification(
    providerUserId,
    'Nouvel avis client',
    `${clientName} a laisse un avis ${rating}/5 sur "${service}".`,
    'review',
    '/dashboard/prestataire/avis',
    avatar,
  );
}

export async function notifyClientReviewReply(clientUserId: string, service: string) {
  await createNotification(
    clientUserId,
    'Réponse à votre avis',
    `Le prestataire a répondu à votre avis sur "${service}".`,
    'review',
    '/dashboard/client/prestataires',
  );
}

export async function notifyApprenantGradePublished(
  studentUserId: string,
  examTitle: string,
  grade: number,
  maxGrade: number,
) {
  await createNotification(
    studentUserId,
    'Nouvelle note disponible',
    `Votre soumission "${examTitle}" a été notée ${grade}/${maxGrade}.`,
    'evaluation',
    '/dashboard/apprenant/examens',
  );
}

export async function notifyFormateurNewSubmission(instructorUserId: string, examTitle: string) {
  await createNotification(
    instructorUserId,
    'Nouvelle soumission à corriger',
    `Un apprenant a soumis sa réponse pour "${examTitle}"`,
    'evaluation',
    '/dashboard/formateur/evaluations',
  );
}

export async function notifyAdminOwnerPartnershipRequest(message: string) {
  await createNotification(
    'usr-admin',
    'Demande porteur à traiter',
    message,
    'message',
    '/admin/messages',
  );
}

export async function notifyAdminPartnerInterest(message: string, avatar?: string) {
  await createNotification(
    'usr-admin',
    'Intérêt partenaire à cadrer',
    message,
    'collaboration',
    '/admin/messages',
    avatar,
  );
}

export async function notifyClientBookingAssignedByC2P(
  clientUserId: string,
  service: string,
  providerName: string,
) {
  await createNotification(
    clientUserId,
    'Prestataire assigne par C2P',
    `C2P a attribue votre demande "${service || 'Mission'}" a ${providerName}.`,
    'booking',
    '/dashboard/client/reservations',
  );
}

export async function notifyProviderMissionAssignedByC2P(
  providerUserId: string,
  service: string,
) {
  await createNotification(
    providerUserId,
    'Nouvelle mission attribuée par C2P',
    `Une mission "${service || 'Mission'}" vous a été confiée par C2P.`,
    'prestation',
    '/dashboard/prestataire/demandes',
  );
}

export async function notifyAdminPublicAlloPrestaRequest(
  requesterLabel: string,
  providerName: string,
  avatar?: string,
) {
  await createNotification(
    'usr-admin',
    'Nouvelle demande publique via AlloPresta',
    `${requesterLabel} a soumis une demande pour "${providerName || 'un prestataire'}".`,
    'booking',
    '/admin/dashboard',
    avatar,
  );
}

export async function notifyClientManagedBookingReceipt(
  userId: string,
  providerName: string,
  avatar?: string,
) {
  await createNotification(
    userId,
    'Demande reçue par C2P',
    `Votre besoin pour "${providerName || 'ce prestataire'}" a bien été transmis à l'équipe C2P.`,
    'booking',
    '/dashboard/client/reservations',
    avatar,
  );
}
