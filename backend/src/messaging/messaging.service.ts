import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { findUserById, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { sanitizeConversationParticipants } from '../data/data-messaging-policy.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly authService: AuthService,
  ) {}

  async listConversations(actor: AuthUser, summaryOnly = false) {
    await this.authService.assertPermissionForActor(actor, 'data.messaging.read', {
      targetType: 'messaging',
      targetId: actor.id,
      reason: 'messaging:conversations:list',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const conversations = clone(store.conversations ?? [])
      .filter((conversation) => this.isParticipant(conversation, actor.id))
      .sort((left, right) => Date.parse(String(right.updated_at ?? right.created_at ?? '')) - Date.parse(String(left.updated_at ?? left.created_at ?? '')));
    const conversationIds = new Set(conversations.map((conversation) => String(conversation.id)));
    const messages = summaryOnly && (actor.role === 'admin' || actor.role === 'superadmin')
      ? []
      : clone(store.messages ?? []).filter((message) => conversationIds.has(String(message.conversation_id)));

    return conversations.map((conversation) => {
      const ownMessages = messages
        .filter((message) => String(message.conversation_id) === String(conversation.id))
        .sort((left, right) => Date.parse(String(left.created_at ?? '')) - Date.parse(String(right.created_at ?? '')));
      const lastMessage = ownMessages[ownMessages.length - 1];
      const unreadCount = ownMessages.filter((message) =>
        message.read !== true && String(message.sender_id) !== String(actor.id),
      ).length;
      return {
        id: String(conversation.id),
        name: conversation.name,
        avatar: conversation.avatar,
        role: conversation.role ?? 'Conversation',
        lastMessage: this.getMessagePreview(lastMessage),
        lastMessageAt: lastMessage?.created_at ?? conversation.updated_at ?? conversation.created_at,
        unreadCount,
        online: Boolean(conversation.online ?? false),
        type: conversation.type ?? 'individual',
        members: conversation.members,
        participants: conversation.participants ?? [],
      };
    });
  }

  async listMessages(actor: AuthUser, conversationId: string) {
    await this.assertConversationParticipant(actor, conversationId, 'data.messaging.read', 'messaging:messages:list');
    await syncAppStoreFromDatabase(this.prisma);
    return clone(store.messages ?? [])
      .filter((message) => String(message.conversation_id) === String(conversationId))
      .sort((left, right) => Date.parse(String(left.created_at ?? '')) - Date.parse(String(right.created_at ?? '')))
      .map((message) => this.toMessageDto(message));
  }

  async createConversation(actor: AuthUser, payload: unknown) {
    await this.authService.assertPermissionForActor(actor, 'data.messaging.write', {
      targetType: 'messaging',
      targetId: actor.id,
      reason: 'messaging:conversation:create',
    });
    const input = this.requireObject(payload);
    const requestedParticipants = Array.isArray(input.participants)
      ? input.participants.map((participant) => String(participant ?? '').trim()).filter(Boolean)
      : [];
    const participantPayload = requestedParticipants.includes(String(actor.id))
      ? requestedParticipants
      : [actor.id, ...requestedParticipants];
    const normalized = sanitizeConversationParticipants(actor, participantPayload, findUserById);
    if (!normalized) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const now = new Date().toISOString();
    await syncAppStoreFromDatabase(this.prisma);
    const row = withId({
      name: normalized.conversationName,
      role: normalized.conversationRole,
      avatar: normalized.conversationAvatar,
      participants: normalized.participants,
      type: 'individual',
      members: 2,
      created_at: now,
      updated_at: now,
    });
    const created = appendAppRows('conversations', [row]);
    await this.platformPersistenceService.persistRows({ conversations: [row] }, {
      actorId: actor.id,
      reason: 'messaging:conversation:create',
      afterRowsByTable: { conversations: [row] },
    });
    return this.toConversationDto(created[0] ?? row, actor.id);
  }

  async sendMessage(actor: AuthUser, conversationId: string, payload: unknown) {
    await this.assertConversationParticipant(actor, conversationId, 'data.messaging.write', 'messaging:message:create');
    const input = this.requireObject(payload);
    const content = String(input.content ?? '').trim();
    const attachments = Array.isArray(input.attachments) ? input.attachments : [];
    if (!content && attachments.length === 0) {
      throw new BadRequestException('Message vide.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const conversation = this.findConversation(conversationId);
    const now = new Date().toISOString();
    const message = withId({
      conversation_id: conversation.id,
      content,
      sender_id: actor.id,
      sender_name: `${actor.firstName} ${actor.lastName}`.trim(),
      sender_avatar: actor.avatar ?? null,
      read: false,
      attachments,
      created_at: now,
      updated_at: now,
    });
    const notifications = this.buildMessageNotifications(conversation, message, actor, now);
    const created = appendAppRows('messages', [message]);
    if (notifications.length > 0) {
      appendAppRows('notifications', notifications);
    }
    const updatedConversations = patchAppRows('conversations', (row) => String(row.id) === String(conversation.id), {
      updated_at: now,
    });
    await this.platformPersistenceService.persistRows({
      messages: [message],
      conversations: updatedConversations,
      ...(notifications.length > 0 ? { notifications } : {}),
    }, {
      actorId: actor.id,
      reason: 'messaging:message:create',
      afterRowsByTable: {
        messages: [message],
        conversations: updatedConversations,
        ...(notifications.length > 0 ? { notifications } : {}),
      },
    });
    return this.toMessageDto(created[0] ?? message);
  }

  async markConversationRead(actor: AuthUser, conversationId: string) {
    await this.assertConversationParticipant(actor, conversationId, 'data.messaging.write', 'messaging:conversation:read');
    await syncAppStoreFromDatabase(this.prisma);
    const previousRows = clone(store.messages ?? []).filter((message) =>
      String(message.conversation_id) === String(conversationId)
      && String(message.sender_id) !== String(actor.id)
      && message.read !== true,
    );
    const updated = patchAppRows('messages', (message) =>
      String(message.conversation_id) === String(conversationId)
      && String(message.sender_id) !== String(actor.id)
      && message.read !== true, {
      read: true,
    });
    await this.platformPersistenceService.persistRows({ messages: updated }, {
      actorId: actor.id,
      reason: 'messaging:conversation:read',
      beforeRowsByTable: { messages: previousRows },
      afterRowsByTable: { messages: updated },
    });
    return updated.map((message) => this.toMessageDto(message));
  }

  private async assertConversationParticipant(
    actor: AuthUser,
    conversationId: string,
    permission: 'data.messaging.read' | 'data.messaging.write',
    reason: string,
  ) {
    await this.authService.assertPermissionForActor(actor, permission, {
      targetType: 'conversation',
      targetId: conversationId,
      reason,
    });
    await syncAppStoreFromDatabase(this.prisma);
    const conversation = this.findConversation(conversationId);
    if (!this.isParticipant(conversation, actor.id)) {
      throw new UnauthorizedException('Acces conversation refuse.');
    }
  }

  private findConversation(conversationId: string) {
    const conversation = (store.conversations ?? []).find((row) => String(row.id) === String(conversationId));
    if (!conversation) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return conversation;
  }

  private isParticipant(conversation: Row, userId: string) {
    return Array.isArray(conversation.participants)
      ? conversation.participants.map(String).includes(String(userId))
      : false;
  }

  private toConversationDto(conversation: Row, actorId: string) {
    const conversationMessages = (store.messages ?? [])
      .filter((message) => String(message.conversation_id) === String(conversation.id))
      .sort((left, right) => Date.parse(String(left.created_at ?? '')) - Date.parse(String(right.created_at ?? '')));
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    return {
      id: String(conversation.id),
      name: conversation.name,
      avatar: conversation.avatar,
      role: conversation.role ?? 'Conversation',
      lastMessage: this.getMessagePreview(lastMessage),
      lastMessageAt: lastMessage?.created_at ?? conversation.updated_at ?? conversation.created_at,
      unreadCount: conversationMessages.filter((message) =>
        message.read !== true && String(message.sender_id) !== String(actorId),
      ).length,
      online: Boolean(conversation.online ?? false),
      type: conversation.type ?? 'individual',
      members: conversation.members,
      participants: conversation.participants ?? [],
    };
  }

  private toMessageDto(message: Row) {
    return {
      id: String(message.id),
      conversationId: String(message.conversation_id),
      content: String(message.content ?? ''),
      senderId: String(message.sender_id ?? ''),
      senderName: String(message.sender_name ?? ''),
      senderAvatar: message.sender_avatar ? String(message.sender_avatar) : undefined,
      timestamp: String(message.created_at ?? new Date().toISOString()),
      read: Boolean(message.read),
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
    };
  }

  private getMessagePreview(message: Row | undefined) {
    if (!message) return 'Nouvelle conversation';
    const content = typeof message.content === 'string' || typeof message.content === 'number'
      ? String(message.content).trim()
      : '';
    if (content) return content;
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length > 0) return attachments.length === 1 ? 'Pièce jointe' : `${attachments.length} pièces jointes`;
    return 'Nouveau message';
  }

  private buildMessageNotifications(conversation: Row, message: Row, actor: AuthUser, createdAt: string) {
    const participants = Array.isArray(conversation.participants)
      ? Array.from(new Set(conversation.participants.map((participant) => String(participant))))
      : [];
    const recipients = participants.filter((participantId) => participantId !== String(actor.id));
    const senderName = `${actor.firstName} ${actor.lastName}`.trim() || 'C2P';
    const rawContent = typeof message.content === 'string' || typeof message.content === 'number'
      ? String(message.content).trim()
      : '';
    const preview = rawContent
      ? rawContent.slice(0, 120)
      : 'Vous avez reçu une pièce jointe.';

    return recipients.map((recipientId) => createAppNotificationRow({
      userId: recipientId,
      title: `Nouveau message de ${senderName}`,
      message: preview,
      type: 'message',
      link: `/dashboard/messages?conversation=${encodeURIComponent(String(conversation.id))}`,
      createdAt,
      metadata: {
        channel: 'messaging',
        conversation_id: conversation.id,
        message_id: message.id,
        sender_id: actor.id,
        sender_role: actor.role,
        avatar: actor.avatar ?? null,
      },
    }));
  }

  private requireObject(payload: unknown): Row {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload messaging invalide.');
    }
    return payload as Row;
  }
}
