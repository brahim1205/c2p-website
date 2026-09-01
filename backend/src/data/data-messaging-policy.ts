import type { AuthUser } from '../auth/auth.store.js';

function normalizeParticipantIds(participants: unknown) {
  if (!Array.isArray(participants)) {
    return [];
  }

  return Array.from(
    new Set(
      participants
        .map((participant) => String(participant ?? '').trim())
        .filter(Boolean),
    ),
  );
}

function getConversationRoleLabel(role: AuthUser['role']) {
  switch (role) {
    case 'admin':
      return 'Support';
    case 'client':
      return 'Client / Prestateur';
    case 'prestataire':
      return 'Prestataire';
    case 'formateur':
      return 'Formateur';
    case 'apprenant':
      return 'Apprenant';
    case 'parent':
      return 'Parent';
    case 'porteur':
      return 'Porteur de projet';
    case 'partenaire':
      return 'Partenaire';
    default:
      return 'Contact';
  }
}

const DIRECT_MESSAGE_ROLE_PAIRS = new Set([
  'apprenant:formateur',
  'parent:formateur',
  'partenaire:porteur',
]);

function pairKey(actorRole: AuthUser['role'], targetRole: AuthUser['role']) {
  return [actorRole, targetRole].sort().join(':');
}

export function canMessageRole(actorRole: AuthUser['role'], targetRole: AuthUser['role']) {
  if (
    actorRole === 'admin'
    || actorRole === 'superadmin'
    || targetRole === 'admin'
    || targetRole === 'superadmin'
  ) {
    return true;
  }

  return DIRECT_MESSAGE_ROLE_PAIRS.has(pairKey(actorRole, targetRole));
}

export function isConversationAllowedForActor(
  actor: AuthUser,
  participants: unknown,
  findUserById: (userId: string) => AuthUser | null | undefined,
) {
  const participantIds = normalizeParticipantIds(participants);
  if (participantIds.length !== 2 || !participantIds.includes(String(actor.id))) {
    return false;
  }

  const targetUserId = participantIds.find((participantId) => participantId !== String(actor.id));
  if (!targetUserId) {
    return false;
  }

  const targetUser = findUserById(targetUserId);
  if (!targetUser) {
    return false;
  }

  return canMessageRole(actor.role, targetUser.role);
}

export function sanitizeConversationParticipants(
  actor: AuthUser,
  participants: unknown,
  findUserById: (userId: string) => AuthUser | null | undefined,
) {
  const participantIds = normalizeParticipantIds(participants);
  if (participantIds.length !== 2 || !participantIds.includes(String(actor.id))) {
    return null;
  }

  const targetUserId = participantIds.find((participantId) => participantId !== String(actor.id));
  if (!targetUserId) {
    return null;
  }

  const targetUser = findUserById(targetUserId);
  if (!targetUser || !canMessageRole(actor.role, targetUser.role)) {
    return null;
  }

  return {
    participants: participantIds,
    targetUser,
    targetUserId,
    conversationName: targetUser.role === 'admin'
      ? 'Support C2P'
      : `${targetUser.firstName} ${targetUser.lastName}`.trim(),
    conversationRole: targetUser.role === 'admin'
      ? 'Support'
      : (targetUser.publicTitle?.trim() || getConversationRoleLabel(targetUser.role)),
    conversationAvatar: targetUser.role === 'admin' ? null : (targetUser.avatar ?? null),
  };
}
