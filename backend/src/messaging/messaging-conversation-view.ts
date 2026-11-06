import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import { conversationIdentityFor } from '../data/data-messaging-policy.js';
import type { Row } from '../data/mock-store.js';

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set(['image', 'video', 'audio', 'document', 'file', 'pdf', 'docx', 'xlsx']);

export function participantIds(conversation: Row) {
  return Array.isArray(conversation.participants)
    ? Array.from(new Set(conversation.participants.map((participant) => String(participant))))
    : [];
}

/**
 * Conversations are stored once for both participants, so the title, role and
 * avatar shown must be the ones of the *other* participant for each viewer.
 */
export function conversationViewFor(
  conversation: Row,
  viewerId: string,
  findUser: (userId: string) => AuthUser | null | undefined,
) {
  const participants = participantIds(conversation);
  const isIndividual = (conversation.type ?? 'individual') === 'individual' && participants.length === 2;
  const otherId = isIndividual ? participants.find((participantId) => participantId !== String(viewerId)) : undefined;
  const other = otherId ? findUser(otherId) : null;
  if (!other) {
    return {
      name: conversation.name,
      role: conversation.role ?? 'Conversation',
      avatar: conversation.avatar ?? null,
    };
  }
  return conversationIdentityFor(other);
}

/** The individual conversation that already links exactly these two people, if any. */
export function findIndividualConversation(conversations: Row[], participants: string[]) {
  const wanted = new Set(participants.map(String));
  return conversations.find((conversation) => {
    if ((conversation.type ?? 'individual') !== 'individual') return false;
    const current = participantIds(conversation);
    return current.length === wanted.size && current.every((participantId) => wanted.has(participantId));
  });
}

function isSafeAttachmentUrl(url: string) {
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function optionalText(value: unknown, max: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Keeps only well-formed attachments pointing to an http(s) or same-site URL. */
export function sanitizeMessageAttachments(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new BadRequestException('Pièces jointes invalides.');
  if (value.length > MAX_ATTACHMENTS) {
    throw new BadRequestException(`${MAX_ATTACHMENTS} pièces jointes maximum par message.`);
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BadRequestException('Pièce jointe invalide.');
    }
    const attachment = item as Row;
    const url = optionalText(attachment.url, 2048);
    if (!url || !isSafeAttachmentUrl(url)) throw new BadRequestException('Lien de pièce jointe invalide.');
    const sizeBytes = Number(attachment.sizeBytes);
    if (Number.isFinite(sizeBytes) && sizeBytes > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('Pièce jointe trop volumineuse (50 Mo maximum).');
    }
    const type = optionalText(attachment.type, 20);
    return {
      name: optionalText(attachment.name, 200) ?? 'Pièce jointe',
      url,
      type: type && ATTACHMENT_TYPES.has(type) ? type : 'file',
      ...(optionalText(attachment.size, 40) ? { size: optionalText(attachment.size, 40) } : {}),
      ...(optionalText(attachment.mimeType, 120) ? { mimeType: optionalText(attachment.mimeType, 120) } : {}),
      ...(Number.isFinite(sizeBytes) && sizeBytes >= 0 ? { sizeBytes } : {}),
      ...(optionalText(attachment.uploadId, 120) ? { uploadId: optionalText(attachment.uploadId, 120) } : {}),
    };
  });
}

/** Unread "new message" notification of this recipient for this conversation. */
export function isUnreadMessageNotification(notification: Row, recipientId: string, conversationId: string) {
  const metadata = (notification.metadata ?? {}) as Row;
  return String(notification.user_id) === String(recipientId)
    && notification.type === 'message'
    && notification.is_read !== true
    && String(metadata.conversation_id ?? '') === String(conversationId);
}
