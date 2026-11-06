import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthUser } from '../auth/auth.store.js';
import {
  conversationViewFor,
  findIndividualConversation,
  isUnreadMessageNotification,
  sanitizeMessageAttachments,
} from './messaging-conversation-view.js';

const users: Record<string, Partial<AuthUser>> = {
  teacher: { id: 'teacher', role: 'formateur', firstName: 'Aminata', lastName: 'Diop', avatar: '/a.png' },
  learner: { id: 'learner', role: 'apprenant', firstName: 'Ibrahim', lastName: 'Toure', avatar: undefined },
  support: { id: 'support', role: 'admin', firstName: 'Admin', lastName: 'C2P' },
};
const findUser = (id: string) => (users[id] as AuthUser | undefined) ?? null;

describe('conversationViewFor', () => {
  // Stored from the creator's point of view (the learner's name).
  const conversation = { id: 'c1', name: 'Ibrahim Toure', role: 'Apprenant', participants: ['teacher', 'learner'], type: 'individual' };

  it('shows the other participant to each viewer', () => {
    assert.equal(conversationViewFor(conversation, 'teacher', findUser).name, 'Ibrahim Toure');
    const learnerView = conversationViewFor(conversation, 'learner', findUser);
    assert.equal(learnerView.name, 'Aminata Diop');
    assert.equal(learnerView.role, 'Formateur');
    assert.equal(learnerView.avatar, '/a.png');
  });

  it('presents staff as the C2P support', () => {
    const view = conversationViewFor({ ...conversation, participants: ['learner', 'support'] }, 'learner', findUser);
    assert.deepEqual(view, { name: 'Support C2P', role: 'Support', avatar: null });
  });

  it('falls back to the stored identity when the other user is unknown', () => {
    const view = conversationViewFor({ ...conversation, participants: ['learner', 'ghost'] }, 'learner', findUser);
    assert.equal(view.name, 'Ibrahim Toure');
  });
});

describe('findIndividualConversation', () => {
  const rows = [
    { id: 'group', type: 'group', participants: ['a', 'b'] },
    { id: 'pair', type: 'individual', participants: ['b', 'a'] },
  ];

  it('finds the thread of the same two people whatever the order', () => {
    assert.equal(findIndividualConversation(rows, ['a', 'b'])?.id, 'pair');
    assert.equal(findIndividualConversation(rows, ['a', 'c']), undefined);
  });
});

describe('sanitizeMessageAttachments', () => {
  it('keeps known fields of http(s) and same-site attachments', () => {
    const [attachment] = sanitizeMessageAttachments([
      { name: 'cours.pdf', url: '/uploads/cours.pdf', type: 'pdf', size: '2 Mo', sizeBytes: 2048, extra: '<script>' },
    ]);
    assert.deepEqual(attachment, { name: 'cours.pdf', url: '/uploads/cours.pdf', type: 'pdf', size: '2 Mo', sizeBytes: 2048 });
    assert.equal(sanitizeMessageAttachments([{ url: 'https://cdn.example.com/x.png', type: 'weird' }])[0].type, 'file');
  });

  it('rejects scripts, protocol-relative links and oversized lists', () => {
    assert.throws(() => sanitizeMessageAttachments([{ url: 'javascript:alert(1)' }]));
    assert.throws(() => sanitizeMessageAttachments([{ url: '//evil.example/x' }]));
    assert.throws(() => sanitizeMessageAttachments('nope'));
    assert.throws(() => sanitizeMessageAttachments(Array.from({ length: 11 }, () => ({ url: '/x' }))));
    assert.deepEqual(sanitizeMessageAttachments(undefined), []);
  });
});

describe('isUnreadMessageNotification', () => {
  const notification = { user_id: 'learner', type: 'message', is_read: false, metadata: { conversation_id: 'c1' } };

  it('matches only the unread message notification of that thread and recipient', () => {
    assert.equal(isUnreadMessageNotification(notification, 'learner', 'c1'), true);
    assert.equal(isUnreadMessageNotification({ ...notification, is_read: true }, 'learner', 'c1'), false);
    assert.equal(isUnreadMessageNotification(notification, 'teacher', 'c1'), false);
    assert.equal(isUnreadMessageNotification(notification, 'learner', 'c2'), false);
  });
});
