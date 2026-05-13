const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || 'password123';

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
  const anonymousConversations = await request('/data/conversations');
  assert(anonymousConversations.status === 401, `expected 401 on anonymous conversations, got ${anonymousConversations.status}`);

  const anonymousMessages = await request('/data/messages');
  assert(anonymousMessages.status === 401, `expected 401 on anonymous messages, got ${anonymousMessages.status}`);

  const { cookieJar: apprenantCookies, csrfToken: apprenantCsrf } = await loginAs('apprenant@c2p.sn');
  assert(apprenantCsrf, 'missing csrf cookie for apprenant');

  const apprenantConversations = await readJson('/data/conversations', {
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

  const spoofConversation = await request('/data/conversations', {
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
  const clientSupportConversation = await readJson('/data/conversations', {
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

  const forbiddenClientConversation = await request('/data/conversations', {
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
  const prestataireSupportConversation = await readJson('/data/conversations', {
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

  const forbiddenPrestataireConversation = await request('/data/conversations', {
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

  const apprenantMessages = await readJson(`/data/messages?eq_conversation_id=${encodeURIComponent(String(targetConversation.id))}`, {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantMessages.response.ok, `expected 200 on apprenant messages, got ${apprenantMessages.response.status}`);
  assert(
    apprenantMessages.payload.every((row) => String(row.conversation_id) === String(targetConversation.id)),
    'apprenant messages must stay within the selected conversation',
  );

  const spoofMessage = await request('/data/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      conversation_id: targetConversation.id,
      sender_id: 'usr-formateur',
      sender_name: 'Intrus',
      content: 'message invalide',
    }),
  });
  assert(spoofMessage.status === 401, `expected 401 on sender spoof, got ${spoofMessage.status}`);

  const { cookieJar: formateurCookies, csrfToken: formateurCsrf } = await loginAs('formateur@c2p.sn');
  assert(formateurCsrf, 'missing csrf cookie for formateur');
  const providerMessageContent = `smoke-support-${Date.now()}`;
  const providerMessage = await readJson('/data/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrf,
    },
    body: JSON.stringify({
      conversation_id: targetConversation.id,
      sender_id: 'usr-formateur',
      sender_name: 'Aminata Diop',
      content: providerMessageContent,
    }),
  });
  assert(providerMessage.response.ok, `expected 200 on formateur send, got ${providerMessage.response.status}`);
  assert(String(providerMessage.payload.sender_id) === 'usr-formateur', 'formateur message must keep the sender identity');

  const markedRead = await readJson(
    `/data/messages?eq_conversation_id=${encodeURIComponent(String(targetConversation.id))}&eq_read=false&neq_sender_id=usr-apprenant`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: apprenantCookies,
        'X-CSRF-Token': apprenantCsrf,
      },
      body: JSON.stringify({ read: true }),
    },
  );
  assert(markedRead.response.ok, `expected 200 on mark-as-read, got ${markedRead.response.status}`);
  const apprenantMessagesAfterRead = await readJson(`/data/messages?eq_conversation_id=${encodeURIComponent(String(targetConversation.id))}`, {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantMessagesAfterRead.response.ok, `expected 200 on post-read fetch, got ${apprenantMessagesAfterRead.response.status}`);
  const updatedProviderMessage = apprenantMessagesAfterRead.payload.find((row) => String(row.id) === String(providerMessage.payload.id));
  assert(updatedProviderMessage && updatedProviderMessage.read === true, 'apprenant mark-as-read must update unread counterpart messages');

  const learnerMessageContent = `smoke-reply-${Date.now()}`;
  const learnerMessage = await readJson('/data/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrf,
    },
    body: JSON.stringify({
      conversation_id: targetConversation.id,
      sender_id: 'usr-apprenant',
      sender_name: 'Ibrahim Toure',
      content: learnerMessageContent,
    }),
  });
  assert(learnerMessage.response.ok, `expected 200 on apprenant send, got ${learnerMessage.response.status}`);

  const formateurMessages = await readJson(`/data/messages?eq_conversation_id=${encodeURIComponent(String(targetConversation.id))}`, {
    headers: { Cookie: formateurCookies },
  });
  assert(formateurMessages.response.ok, `expected 200 on formateur messages, got ${formateurMessages.response.status}`);
  assert(
    formateurMessages.payload.some((row) => String(row.id) === String(learnerMessage.payload.id) && row.content === learnerMessageContent),
    'formateur must receive the learner reply in the same conversation',
  );

  console.log('messaging-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
