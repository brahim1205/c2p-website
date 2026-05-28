const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookies(response) {
  const setCookies = response.headers.getSetCookie?.() || [];
  return setCookies.map((cookie) => cookie.split(';', 1)[0]);
}

function mergeCookieJar(...cookieSets) {
  return cookieSets.flat().filter(Boolean).join('; ');
}

function readCookie(cookieJar, name) {
  const prefix = `${name}=`;
  return cookieJar
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || null;
}

async function loginAs(email) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function request(path, init = {}) {
  return fetch(`${API_URL}${path}`, init);
}

async function readJson(path, init = {}) {
  const response = await request(path, init);
  const payload = await response.json();
  return { response, payload };
}

async function main() {
  const anonymousConversations = await request('/messaging/conversations');
  assert(anonymousConversations.status === 401, `expected 401 on anonymous conversations, got ${anonymousConversations.status}`);

  const anonymousMessages = await request('/messaging/conversations/conv-apprenant-formateur/messages');
  assert(anonymousMessages.status === 401, `expected 401 on anonymous messages, got ${anonymousMessages.status}`);

  const { cookieJar: apprenantCookies, csrfToken: apprenantCsrf } = await loginAs('apprenant@c2p.sn');
  assert(apprenantCsrf, 'missing csrf cookie for apprenant');

  const apprenantConversations = await readJson('/messaging/conversations', {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantConversations.response.ok, `expected 200 on apprenant conversations, got ${apprenantConversations.response.status}`);
  assert(Array.isArray(apprenantConversations.payload) && apprenantConversations.payload.length > 0, 'apprenant conversations must not be empty');
  assert(
    apprenantConversations.payload.every((row) => Array.isArray(row.participants) && row.participants.map(String).includes('usr-apprenant')),
    'apprenant must only receive own conversations',
  );

  const targetConversation = apprenantConversations.payload.find((row) =>
    Array.isArray(row.participants) && row.participants.map(String).includes('usr-formateur'),
  ) ?? apprenantConversations.payload[0];
  assert(targetConversation, 'expected seeded apprenant conversation');

  const legacyDataConversationWrite = await request('/data/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      name: 'Conversation legacy',
      role: 'Support',
      participants: ['usr-apprenant', 'usr-formateur'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(legacyDataConversationWrite.status === 400, `expected 400 on legacy /data conversation write, got ${legacyDataConversationWrite.status}`);

  const spoofConversation = await request('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      name: 'Conversation illegitime',
      role: 'Support',
      participants: ['usr-formateur', 'usr-admin'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(spoofConversation.status === 401, `expected 401 on conversation spoof, got ${spoofConversation.status}`);

  const { cookieJar: clientCookies, csrfToken: clientCsrf } = await loginAs('client@c2p.sn');
  assert(clientCsrf, 'missing csrf cookie for client');
  const clientSupportConversation = await readJson('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: clientCookies,
      'X-CSRF-Token': clientCsrf,
    },
    body: JSON.stringify({
      name: 'Support C2P',
      role: 'Support',
      participants: ['usr-client', 'usr-admin'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(clientSupportConversation.response.ok, `expected 200 on client support conversation, got ${clientSupportConversation.response.status}`);

  const forbiddenClientConversation = await request('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: clientCookies,
      'X-CSRF-Token': clientCsrf,
    },
    body: JSON.stringify({
      name: 'Prestataire direct',
      role: 'Prestataire',
      participants: ['usr-client', 'usr-prestataire'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(forbiddenClientConversation.status === 401, `expected 401 on client direct conversation, got ${forbiddenClientConversation.status}`);

  const { cookieJar: prestataireCookies, csrfToken: prestataireCsrf } = await loginAs('prestataire@c2p.sn');
  assert(prestataireCsrf, 'missing csrf cookie for prestataire');
  const prestataireSupportConversation = await readJson('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: prestataireCookies,
      'X-CSRF-Token': prestataireCsrf,
    },
    body: JSON.stringify({
      name: 'Support C2P',
      role: 'Support',
      participants: ['usr-prestataire', 'usr-admin'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(prestataireSupportConversation.response.ok, `expected 200 on prestataire support conversation, got ${prestataireSupportConversation.response.status}`);

  const forbiddenPrestataireConversation = await request('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: prestataireCookies,
      'X-CSRF-Token': prestataireCsrf,
    },
    body: JSON.stringify({
      name: 'Porteur direct',
      role: 'Porteur',
      participants: ['usr-prestataire', 'usr-porteur'],
      type: 'individual',
      members: 2,
    }),
  });
  assert(forbiddenPrestataireConversation.status === 401, `expected 401 on prestataire direct conversation, got ${forbiddenPrestataireConversation.status}`);

  const apprenantMessages = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantMessages.response.ok, `expected 200 on apprenant messages, got ${apprenantMessages.response.status}`);
  assert(
    apprenantMessages.payload.every((row) => String(row.conversationId) === String(targetConversation.id)),
    'apprenant messages must stay within the selected conversation',
  );

  const clientConversationIntrusion = await request(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: clientCookies,
      'X-CSRF-Token': clientCsrf,
    },
    body: JSON.stringify({ content: 'message invalide' }),
  });
  assert(clientConversationIntrusion.status === 401, `expected 401 on non participant message, got ${clientConversationIntrusion.status}`);

  const spoofMessage = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      sender_id: 'usr-formateur',
      sender_name: 'Intrus',
      content: 'message invalide',
    }),
  });
  assert(spoofMessage.response.ok, `expected 200 on sanitized sender spoof payload, got ${spoofMessage.response.status}`);
  assert(String(spoofMessage.payload.senderId) === 'usr-apprenant', 'message sender identity must be enforced from the session');

  const { cookieJar: formateurCookies, csrfToken: formateurCsrf } = await loginAs('formateur@c2p.sn');
  assert(formateurCsrf, 'missing csrf cookie for formateur');
  const providerMessageContent = `smoke-support-${Date.now()}`;
  const providerMessage = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrf,
    },
    body: JSON.stringify({
      content: providerMessageContent,
    }),
  });
  assert(providerMessage.response.ok, `expected 200 on formateur send, got ${providerMessage.response.status}`);
  assert(String(providerMessage.payload.senderId) === 'usr-formateur', 'formateur message must keep the sender identity');

  const apprenantNotificationsAfterProviderMessage = await readJson('/notifications/me', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantNotificationsAfterProviderMessage.response.ok,
    `expected 200 on apprenant notifications after message, got ${apprenantNotificationsAfterProviderMessage.response.status}`,
  );
  assert(
    apprenantNotificationsAfterProviderMessage.payload.some((row) =>
      String(row.type) === 'message'
      && String(row.user_id) === 'usr-apprenant'
      && String(row.metadata?.conversation_id) === String(targetConversation.id)
      && String(row.metadata?.message_id) === String(providerMessage.payload.id),
    ),
    'message delivery must create a message notification for the recipient',
  );

  const markedRead = await readJson(
    `/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/read`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: apprenantCookies,
        'X-CSRF-Token': apprenantCsrf,
      },
    },
  );
  assert(markedRead.response.ok, `expected 200 on mark-as-read, got ${markedRead.response.status}`);
  const apprenantMessagesAfterRead = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantMessagesAfterRead.response.ok, `expected 200 on post-read fetch, got ${apprenantMessagesAfterRead.response.status}`);
  const updatedProviderMessage = apprenantMessagesAfterRead.payload.find((row) => String(row.id) === String(providerMessage.payload.id));
  assert(updatedProviderMessage && updatedProviderMessage.read === true, 'apprenant mark-as-read must update unread counterpart messages');

  const learnerMessageContent = `smoke-reply-${Date.now()}`;
  const learnerMessage = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      content: learnerMessageContent,
    }),
  });
  assert(learnerMessage.response.ok, `expected 200 on apprenant send, got ${learnerMessage.response.status}`);

  const formateurMessages = await readJson(`/messaging/conversations/${encodeURIComponent(String(targetConversation.id))}/messages`, {
    headers: { Cookie: formateurCookies },
  });
  assert(formateurMessages.response.ok, `expected 200 on formateur messages, got ${formateurMessages.response.status}`);
  assert(
    formateurMessages.payload.some((row) => String(row.id) === String(learnerMessage.payload.id) && row.content === learnerMessageContent),
    'formateur must receive the learner reply in the same conversation',
  );

  const formateurNotificationsAfterReply = await readJson('/notifications/me', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurNotificationsAfterReply.response.ok,
    `expected 200 on formateur notifications after reply, got ${formateurNotificationsAfterReply.response.status}`,
  );
  assert(
    formateurNotificationsAfterReply.payload.some((row) =>
      String(row.type) === 'message'
      && String(row.user_id) === 'usr-formateur'
      && String(row.metadata?.conversation_id) === String(targetConversation.id)
      && String(row.metadata?.message_id) === String(learnerMessage.payload.id),
    ),
    'message reply must create a message notification for the recipient',
  );

  console.log('messaging-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
