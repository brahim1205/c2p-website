import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import { clone, compareValues, findRow, store } from './data-app-store.js';
import {
  canNotifyUser,
  getInstructorCourseIds,
  getOwnerProjectIds,
  getProviderIdsForUser,
} from './data-actor-scope.js';
import {
  sanitizeBookingCreateRecord,
  sanitizeBookingUpdateRecord,
} from './data-booking-sanitizers.js';
import {
  sanitizeAdminContentItemRecord,
  sanitizeCourseLessonRecord,
  sanitizeCourseRecord,
  sanitizeCourseSectionRecord,
} from './data-course-sanitizers.js';
import {
  assertSubscriptionRequiredForWrite,
} from './data-finance-context.js';
import {
  sanitizePayoutAccountRecord,
  sanitizePayoutRequestRecord,
  sanitizeUserSubscriptionRecord,
} from './data-finance-sanitizers.js';
import {
  sanitizeCourseFaqRecord,
  sanitizeCourseReviewRecord,
  sanitizeExamRecord,
  sanitizeLessonAssetRecord,
  sanitizeLessonCommentRecord,
  sanitizeLessonProgressRecord,
  sanitizeQuizChoiceRecord,
  sanitizeQuizQuestionRecord,
  sanitizeSubmissionRecord,
  sanitizeSubmissionUpdateRecord,
  sanitizeVirtualClassRecord,
} from './data-learning-sanitizers.js';
import {
  isConversationAllowedForActor,
  sanitizeConversationParticipants,
} from './data-messaging-policy.js';
import {
  normalizeEscrowStatus,
  parseBoolean,
  requireIdentifier,
  requireNumberOrFallback,
  requireText,
  trimText,
} from './data-normalizers.js';
import { normalizeNotificationType } from './data-notification-policy.js';

function sanitizeProviderVerificationRequestRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('provider_verification_requests', normalized.id) : null;
  const providerId = requireIdentifier(normalized.provider_id ?? existing?.provider_id, 'Le prestataire associe est invalide.');
  const provider = findRow('providers', providerId);
  if (!provider) {
    throw new BadRequestException('Le prestataire associe est introuvable.');
  }

  const ownerUserId = String(provider.user_id ?? existing?.user_id ?? normalized.user_id ?? '');
  if (!ownerUserId) {
    throw new BadRequestException('Le titulaire du prestataire est introuvable.');
  }

  if (!isAdminRole(user)) {
    if (user.role !== 'prestataire' || ownerUserId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (existing && String(existing.user_id ?? '') !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
  }

  const nowIso = new Date().toISOString();
  const activePass = [...(store.provider_visibility_passes ?? [])]
    .filter((pass) =>
      String(pass.provider_id) === providerId
      && String(pass.user_id ?? '') === ownerUserId
      && String(pass.status ?? '') === 'active'
      && parseBoolean(pass.verification_eligible, false),
    )
    .sort((left, right) => compareValues(right.issued_at ?? right.created_at, left.issued_at ?? left.created_at))
    .find((pass) => {
      if (!pass.expires_at) return true;
      const expiresAt = Date.parse(String(pass.expires_at));
      return Number.isNaN(expiresAt) || expiresAt >= Date.now();
    });

  if (!isAdminRole(user) && !activePass) {
    throw new BadRequestException('Un billet SenPresta eligible est requis avant la demande de verification.');
  }

  const currentStatus = trimText(existing?.status) ?? 'pending';
  const requestedStatus = trimText(normalized.status) ?? currentStatus;
  const allowedStatuses = new Set(['pending', 'in_review', 'approved', 'rejected', 'cancelled']);
  if (!allowedStatuses.has(requestedStatus)) {
    throw new BadRequestException('Le statut de la demande de verification est invalide.');
  }

  normalized.provider_id = providerId;
  normalized.provider_name = trimText(normalized.provider_name) ?? trimText(provider.name) ?? trimText(provider.public_alias) ?? `Prestataire #${providerId}`;
  normalized.user_id = ownerUserId;
  normalized.requested_level = 'verified';
  normalized.pass_id = trimText(existing?.pass_id) ?? trimText(normalized.pass_id) ?? trimText(activePass?.id);
  normalized.pass_code = trimText(existing?.pass_code) ?? trimText(normalized.pass_code) ?? trimText(activePass?.code);
  normalized.pass_tier = trimText(existing?.pass_tier) ?? trimText(normalized.pass_tier) ?? trimText(activePass?.pass_tier) ?? null;
  normalized.source = trimText(existing?.source) ?? trimText(normalized.source) ?? 'self_service';
  normalized.note = trimText(normalized.note) ?? trimText(existing?.note) ?? '';

  if (String(normalized.note).length > 1200) {
    throw new BadRequestException('La note de verification est trop longue.');
  }

  if (isAdminRole(user)) {
    normalized.status = requestedStatus;
    normalized.admin_notes = trimText(normalized.admin_notes) ?? trimText(existing?.admin_notes);
    if (normalized.admin_notes && String(normalized.admin_notes).length > 1200) {
      throw new BadRequestException('La note administrateur est trop longue.');
    }

    if (requestedStatus === 'pending') {
      normalized.reviewed_at = null;
      normalized.reviewed_by = null;
    } else if (requestedStatus === 'in_review') {
      normalized.reviewed_at = existing?.reviewed_at ?? null;
      normalized.reviewed_by = user.id;
    } else {
      normalized.reviewed_at = new Date().toISOString();
      normalized.reviewed_by = user.id;
    }
  } else {
    normalized.status = !existing
      ? 'pending'
      : currentStatus === 'pending' && requestedStatus === 'cancelled'
        ? 'cancelled'
        : currentStatus;
    normalized.reviewed_at = existing?.reviewed_at ?? null;
    normalized.reviewed_by = existing?.reviewed_by ?? null;
    normalized.admin_notes = existing?.admin_notes ?? null;
  }

  normalized.requested_at = trimText(existing?.requested_at) ?? nowIso;
  return normalized;
}

function sanitizeEscrowCaseRecord(row: Row, user: AuthUser) {
  if (!isAdminRole(user)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('escrow_cases', normalized.id) : null;
  const bookingId = requireIdentifier(normalized.booking_id ?? existing?.booking_id, 'La mission associee est invalide.');
  const booking = findRow('bookings', bookingId);
  if (!booking) {
    throw new BadRequestException('La mission associee est introuvable.');
  }

  const currentStatus = normalizeEscrowStatus(existing?.status, booking.price ? 'awaiting_funding' : 'awaiting_quote');
  const nextStatus = normalizeEscrowStatus(normalized.status, currentStatus);
  const allowedTransitions = new Map<string, string[]>([
    ['awaiting_quote', ['awaiting_funding', 'cancelled']],
    ['awaiting_funding', ['funded', 'cancelled', 'refunded']],
    ['funded', ['assigned', 'refunded', 'cancelled']],
    ['assigned', ['in_progress', 'refunded', 'cancelled']],
    ['in_progress', ['delivery_review', 'refunded']],
    ['delivery_review', ['released', 'refunded']],
    ['released', []],
    ['refunded', []],
    ['cancelled', []],
  ]);

  if (existing && nextStatus !== currentStatus && !(allowedTransitions.get(currentStatus) ?? []).includes(nextStatus)) {
    throw new BadRequestException('Transition de sequestre invalide.');
  }

  const provider = findRow('providers', normalized.provider_id ?? existing?.provider_id ?? booking.provider_id ?? normalized.requested_provider_id ?? existing?.requested_provider_id ?? booking.requested_provider_id);
  normalized.booking_id = booking.id;
  normalized.client_id = booking.client_id;
  normalized.provider_id = provider?.id ?? booking.provider_id ?? existing?.provider_id ?? null;
  normalized.provider_user_id = provider?.user_id ?? existing?.provider_user_id ?? null;
  normalized.requested_provider_id = normalized.requested_provider_id ?? existing?.requested_provider_id ?? booking.requested_provider_id ?? null;
  normalized.service = booking.service ?? existing?.service ?? null;
  normalized.currency = trimText(normalized.currency) ?? trimText(existing?.currency) ?? 'XAF';
  normalized.amount_total = requireNumberOrFallback(normalized.amount_total, requireNumberOrFallback(booking.price, 0));
  normalized.platform_fee_amount = requireNumberOrFallback(normalized.platform_fee_amount, requireNumberOrFallback(booking.platform_fee_amount, 0));
  normalized.provider_amount = requireNumberOrFallback(normalized.provider_amount, requireNumberOrFallback(booking.provider_payout_amount, 0));
  normalized.status = nextStatus;
  normalized.note = trimText(normalized.note) ?? trimText(existing?.note);
  normalized.funded_at = nextStatus === 'funded' || nextStatus === 'assigned' || nextStatus === 'in_progress' || nextStatus === 'delivery_review' || nextStatus === 'released'
    ? trimText(normalized.funded_at) ?? trimText(existing?.funded_at) ?? new Date().toISOString()
    : trimText(existing?.funded_at);
  normalized.released_at = nextStatus === 'released'
    ? trimText(normalized.released_at) ?? new Date().toISOString()
    : trimText(existing?.released_at);
  normalized.refunded_at = nextStatus === 'refunded'
    ? trimText(normalized.refunded_at) ?? new Date().toISOString()
    : trimText(existing?.refunded_at);
  return normalized;
}

function sanitizeConversationCreateRecord(row: Row, user: AuthUser) {
  const normalized = sanitizeConversationParticipants(user, row.participants, findUserById);
  if (!normalized) {
    throw new UnauthorizedException('Acces refuse.');
  }

  return {
    name: normalized.conversationName,
    role: normalized.conversationRole,
    avatar: normalized.conversationAvatar,
    participants: normalized.participants,
    type: 'individual',
    members: 2,
  };
}

function sanitizeMessageCreateRecord(row: Row, user: AuthUser) {
  if (String(row.sender_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const conversation = findRow('conversations', row.conversation_id);
  if (!conversation || !isConversationAllowedForActor(user, conversation.participants, findUserById)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const attachments = Array.isArray(row.attachments) ? row.attachments : [];
  const content = trimText(row.content);
  if (!content && attachments.length === 0) {
    throw new BadRequestException('Le message est obligatoire.');
  }

  return {
    conversation_id: conversation.id,
    sender_id: user.id,
    sender_name: `${user.firstName} ${user.lastName}`.trim(),
    sender_avatar: user.avatar ?? null,
    content: content ?? '',
    attachments,
    read: false,
  };
}

export function sanitizeUpdatePayload(table: string, existingRow: Row, payload: Row, user: AuthUser) {
  assertSubscriptionRequiredForWrite(table, user);
  switch (table) {
    case 'courses':
      return sanitizeCourseRecord({ ...existingRow, ...payload }, user);
    case 'admin_content_items':
      return sanitizeAdminContentItemRecord({ ...existingRow, ...payload }, user);
    case 'course_sections':
      return sanitizeCourseSectionRecord({ ...existingRow, ...payload }, user);
    case 'course_lessons':
      return sanitizeCourseLessonRecord({ ...existingRow, ...payload }, user);
    case 'lesson_assets':
      return sanitizeLessonAssetRecord({ ...existingRow, ...payload }, user);
    case 'virtual_classes':
      return sanitizeVirtualClassRecord({ ...existingRow, ...payload }, user);
    case 'exams':
      return sanitizeExamRecord({ ...existingRow, ...payload }, user);
    case 'quiz_questions':
      return sanitizeQuizQuestionRecord({ ...existingRow, ...payload }, user);
    case 'quiz_choices':
      return sanitizeQuizChoiceRecord({ ...existingRow, ...payload }, user);
    case 'payout_accounts':
      return sanitizePayoutAccountRecord({ ...existingRow, ...payload }, user);
    case 'payout_requests':
      return sanitizePayoutRequestRecord({ ...existingRow, ...payload }, user);
    case 'user_subscriptions':
      return sanitizeUserSubscriptionRecord({ ...existingRow, ...payload }, user);
    case 'provider_verification_requests':
      return sanitizeProviderVerificationRequestRecord({ ...existingRow, ...payload }, user);
    case 'escrow_cases':
      return sanitizeEscrowCaseRecord({ ...existingRow, ...payload }, user);
    case 'lesson_comments':
      return sanitizeLessonCommentRecord({ ...existingRow, ...payload }, user);
    case 'lesson_progress':
      return sanitizeLessonProgressRecord({ ...existingRow, ...payload }, user);
    case 'course_reviews':
      return sanitizeCourseReviewRecord({ ...existingRow, ...payload }, user);
    case 'course_faq_items':
      return sanitizeCourseFaqRecord({ ...existingRow, ...payload }, user);
    case 'submissions':
      return sanitizeSubmissionUpdateRecord(existingRow, payload, user);
    case 'conversations':
      if (!isConversationAllowedForActor(user, existingRow.participants, findUserById)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        updated_at: payload.updated_at ?? new Date().toISOString(),
      };
    case 'messages':
      if (!isConversationAllowedForActor(user, findRow('conversations', existingRow.conversation_id)?.participants, findUserById)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      if (String(existingRow.sender_id) === user.id) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        read: payload.read === true,
      };
    case 'bookings':
      return sanitizeBookingUpdateRecord(existingRow, payload, user);
    default:
      return payload;
  }
}

export function sanitizeCreatePayload(table: string, row: Row, user: AuthUser) {
  const providerIds = getProviderIdsForUser(user.id);
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const courseIds = getInstructorCourseIds(user.id);
  assertSubscriptionRequiredForWrite(table, user);

  switch (table) {
    case 'courses':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseRecord(row, user);
    case 'course_sections':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseSectionRecord(row, user);
    case 'course_lessons':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseLessonRecord(row, user);
    case 'lesson_assets':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonAssetRecord(row, user);
    case 'virtual_classes':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeVirtualClassRecord(row, user);
    case 'exams':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeExamRecord(row, user);
    case 'quiz_questions':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeQuizQuestionRecord(row, user);
    case 'quiz_choices':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeQuizChoiceRecord(row, user);
    case 'payout_accounts':
      if (!isAdminRole(user) && !new Set(['formateur', 'prestataire', 'porteur']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutAccountRecord(row, user);
    case 'payout_requests':
      if (!isAdminRole(user) && !new Set(['formateur', 'prestataire', 'porteur']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutRequestRecord(row, user);
    case 'user_subscriptions':
      if (!isAdminRole(user) && !new Set(['formateur', 'prestataire', 'porteur', 'partenaire']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeUserSubscriptionRecord(row, user);
    case 'provider_verification_requests':
      if (!isAdminRole(user) && user.role !== 'prestataire') throw new UnauthorizedException('Acces refuse.');
      return sanitizeProviderVerificationRequestRecord(row, user);
    case 'escrow_cases':
      if (!isAdminRole(user)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeEscrowCaseRecord(row, user);
    case 'lesson_comments':
      if (!new Set(['admin', 'formateur', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonCommentRecord(row, user);
    case 'lesson_progress':
      if (!new Set(['admin', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonProgressRecord(row, user);
    case 'course_reviews':
      if (!new Set(['admin', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseReviewRecord(row, user);
    case 'course_faq_items':
      if (!isAdminRole(user) && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseFaqRecord(row, user);
    case 'notifications': {
      const targetUserId = String(row.user_id ?? '');
      const notificationType = normalizeNotificationType(row.type);
      if (!canNotifyUser(user, targetUserId, notificationType)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        ...row,
        type: notificationType,
        metadata: {
          ...(typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}),
          actor_id: user.id,
          actor_role: user.role,
        },
      };
    }
    case 'payment_transactions':
    case 'wallet_accounts':
    case 'invoices':
      if (String(row.user_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'bookings':
      return sanitizeBookingCreateRecord(row, user);
    case 'client_orders':
    case 'client_favorites':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'provider_reviews':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'admin_reports':
      if (!isAdminRole(user) && user.role !== 'client') throw new UnauthorizedException('Acces refuse.');
      return {
        reporter: `${user.firstName} ${user.lastName}`.trim(),
        reporter_id: user.id,
        reported: requireText(row.reported, 'La cible du signalement est obligatoire.'),
        target_id: trimText(row.target_id),
        target_table: trimText(row.target_table),
        type: requireText(row.type, 'Le type du signalement est obligatoire.'),
        reason: requireText(row.reason, 'Le motif du signalement est obligatoire.'),
        description: requireText(row.description, 'La description du signalement est obligatoire.'),
        priority: ['high', 'medium', 'low'].includes(String(row.priority)) ? row.priority : 'medium',
        status: 'pending',
        adminAction: null,
        date: row.date ?? new Date().toISOString(),
        source: 'client_dashboard',
      };
    case 'provider_services':
      if (user.role !== 'prestataire' || !providerIds.includes(String(row.provider_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'course_enrollments':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'submissions':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return sanitizeSubmissionRecord(row, user);
    case 'certificates':
      if (user.role !== 'formateur' || !courseIds.includes(String(row.course_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'conversations':
      return sanitizeConversationCreateRecord(row, user);
    case 'messages':
      return sanitizeMessageCreateRecord(row, user);
    case 'projects':
      if (user.role !== 'porteur' || String(row.owner_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'project_milestones':
    case 'project_documents':
    case 'project_history':
    case 'project_partnerships':
    case 'project_funding_rounds':
      if (user.role !== 'porteur' || !ownerProjectIds.includes(String(row.project_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'project_tracking':
    case 'project_collaborations':
      if (user.role !== 'partenaire' || String(row.partner_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'funding_investors': {
      if (user.role !== 'porteur') throw new UnauthorizedException('Acces refuse.');
      const round = findRow('project_funding_rounds', row.funding_round_id);
      if (!round || !ownerProjectIds.includes(String(round.project_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    }
    default:
      if (isAdminRole(user)) {
        return row;
      }
      throw new UnauthorizedException('Acces refuse.');
  }
}
