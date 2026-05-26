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
  const anonymousNotifications = await request('/data/notifications');
  assert(anonymousNotifications.status === 401, `expected 401 on anonymous notifications, got ${anonymousNotifications.status}`);

  const { cookieJar, csrfToken } = await loginAs('apprenant@c2p.sn');
  assert(csrfToken, 'missing csrf cookie for apprenant');

  const ownNotifications = await readJson('/notifications/me', {
    headers: { Cookie: cookieJar },
  });
  assert(ownNotifications.response.ok, `expected 200 on apprenant notifications, got ${ownNotifications.response.status}`);
  assert(
    ownNotifications.payload.every((row) => String(row.user_id) === 'usr-apprenant'),
    'apprenant must only receive own notifications',
  );

  const legacyNotificationWrite = await request('/data/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      user_id: 'usr-apprenant',
      type: 'system',
      title: 'Ecriture legacy interdite',
      message: 'Cette ecriture doit passer par /notifications.',
    }),
  });
  assert(legacyNotificationWrite.status === 400, `expected 400 on legacy notification write, got ${legacyNotificationWrite.status}`);

  const spoofedNotification = await request('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      user_id: 'usr-partenaire',
      type: 'system',
      title: 'Notification interdite',
      message: 'Ceci ne doit pas passer.',
    }),
  });
  assert(spoofedNotification.status === 401, `expected 401 on foreign notification create, got ${spoofedNotification.status}`);

  const forbiddenMessageNotification = await request('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      user_id: 'usr-prestataire',
      type: 'message',
      title: 'Message interdit',
      message: 'Ceci ne doit pas ouvrir un canal direct.',
    }),
  });
  assert(forbiddenMessageNotification.status === 401, `expected 401 on forbidden direct message notification, got ${forbiddenMessageNotification.status}`);

  const title = `smoke-notification-${Date.now()}`;
  const createdNotification = await readJson('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      user_id: 'usr-apprenant',
      type: 'system',
      title,
      message: 'Notification de validation du flux backend.',
      link: '/dashboard/notifications',
    }),
  });
  assert(createdNotification.response.ok, `expected 200 on own notification create, got ${createdNotification.response.status}`);
  assert(String(createdNotification.payload.user_id) === 'usr-apprenant', 'created notification must belong to apprenant');

  const { cookieJar: formateurCookies, csrfToken: formateurCsrf } = await loginAs('formateur@c2p.sn');
  assert(formateurCsrf, 'missing csrf cookie for formateur');
  const directLearnerNotification = await readJson('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrf,
    },
    body: JSON.stringify({
      user_id: 'usr-apprenant',
      type: 'message',
      title: 'Relance formation',
      message: 'Pensez a consulter le support de cours.',
    }),
  });
  assert(directLearnerNotification.response.ok, `expected 200 on formateur -> apprenant message notification, got ${directLearnerNotification.response.status}`);

  const { cookieJar: clientCookies, csrfToken: clientCsrf } = await loginAs('client@c2p.sn');
  assert(clientCsrf, 'missing csrf cookie for client');

  const forbiddenClientSystemNotification = await request('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: clientCookies,
      'X-CSRF-Token': clientCsrf,
    },
    body: JSON.stringify({
      user_id: 'usr-prestataire',
      type: 'system',
      title: 'Tentative non autorisee',
      message: 'Ce message ne doit pas passer.',
    }),
  });
  assert(
    forbiddenClientSystemNotification.status === 401,
    `expected 401 on client -> prestataire system notification, got ${forbiddenClientSystemNotification.status}`,
  );

  const allowedClientReviewNotification = await readJson('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: clientCookies,
      'X-CSRF-Token': clientCsrf,
    },
    body: JSON.stringify({
      user_id: 'usr-prestataire',
      type: 'review',
      title: 'Nouvel avis client',
      message: 'Un client a laisse un avis verifie.',
      link: '/dashboard/prestataire/avis',
    }),
  });
  assert(
    allowedClientReviewNotification.response.ok,
    `expected 200 on client -> prestataire review notification, got ${allowedClientReviewNotification.response.status}`,
  );

  const markedRead = await readJson(`/notifications/${encodeURIComponent(String(createdNotification.payload.id))}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
  });
  assert(markedRead.response.ok, `expected 200 on notification mark-as-read, got ${markedRead.response.status}`);

  const afterRead = await readJson('/notifications/me', {
    headers: { Cookie: cookieJar },
  });
  assert(afterRead.response.ok, `expected 200 on notification refetch, got ${afterRead.response.status}`);
  assert(
    afterRead.payload.find((row) => String(row.id) === String(createdNotification.payload.id))?.is_read === true,
    'notification must be marked as read after PATCH',
  );

  const deleted = await request(`/notifications/${encodeURIComponent(String(createdNotification.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
  });
  assert(deleted.ok, `expected 200 on notification delete, got ${deleted.status}`);

  const afterDelete = await readJson('/notifications/me', {
    headers: { Cookie: cookieJar },
  });
  assert(afterDelete.response.ok, `expected 200 on notification post-delete fetch, got ${afterDelete.response.status}`);
  assert(
    !afterDelete.payload.some((row) => String(row.id) === String(createdNotification.payload.id)),
    'deleted notification must not remain visible',
  );

  console.log('notification-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
