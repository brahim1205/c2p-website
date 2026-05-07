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
    body: JSON.stringify({
      email,
      password: PASSWORD,
    }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const payload = await response.json();
  const cookies = extractCookies(response);
  return { payload, cookieJar: mergeCookieJar(cookies) };
}

async function request(path, init = {}) {
  return fetch(`${API_URL}${path}`, init);
}

async function main() {
  const unauthenticatedPayments = await request('/data/payment_transactions');
  assert(unauthenticatedPayments.status === 401, `expected 401 on unauthenticated payments, got ${unauthenticatedPayments.status}`);

  const { cookieJar } = await loginAs('client@c2p.sn');
  const csrfToken = readCookie(cookieJar, 'c2p_csrf');
  assert(csrfToken, 'missing csrf cookie after login');

  const forbiddenUsers = await request('/auth/users', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenUsers.status === 401, `expected 401 on /auth/users, got ${forbiddenUsers.status}`);

  const forbiddenSecurity = await request('/auth/security/usr-admin', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenSecurity.status === 401, `expected 401 on чужой security endpoint, got ${forbiddenSecurity.status}`);

  const scopedPayments = await request('/data/payment_transactions?eq_user_id=usr-admin', {
    headers: { Cookie: cookieJar },
  });
  assert(scopedPayments.ok, `expected 200 on scoped payments, got ${scopedPayments.status}`);
  const scopedPayload = await scopedPayments.json();
  assert(Array.isArray(scopedPayload), 'scoped payments payload must be an array');
  assert(scopedPayload.every((row) => row.user_id === 'usr-client'), 'client must not see payment rows from another user');

  const missingCsrfMutation = await request('/data/bookings', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: 'usr-client',
      provider_id: 1,
      service: 'Test booking',
      status: 'pending',
      price: 15000,
    }),
  });
  assert(missingCsrfMutation.status === 403, `expected 403 without csrf, got ${missingCsrfMutation.status}`);

  const spoofedClientMutation = await request('/data/bookings', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      client_id: 'usr-admin',
      provider_id: 1,
      service: 'Spoofed booking',
      status: 'pending',
      price: 15000,
    }),
  });
  assert(spoofedClientMutation.status === 401, `expected 401 on spoofed client_id, got ${spoofedClientMutation.status}`);

  const invalidResetChallenge = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'client@c2p.sn',
      code: '000000',
      newPassword: 'Password!456',
    }),
  });
  assert(invalidResetChallenge.status === 401, `expected 401 on invalid reset code, got ${invalidResetChallenge.status}`);

  const { cookieJar: formateurCookies } = await loginAs('formateur@c2p.sn');
  const formateurCsrf = readCookie(formateurCookies, 'c2p_csrf');
  assert(formateurCsrf, 'missing csrf cookie after formateur login');

  const formateurCourses = await request('/data/courses', {
    headers: { Cookie: formateurCookies },
  });
  assert(formateurCourses.ok, `expected 200 on formateur courses, got ${formateurCourses.status}`);
  const formateurCoursesPayload = await formateurCourses.json();
  assert(Array.isArray(formateurCoursesPayload), 'formateur courses payload must be an array');
  assert(formateurCoursesPayload.every((row) => row.instructor_id === 'usr-formateur'), 'formateur must only see own courses');

  const spoofedCourseCreation = await request('/data/courses', {
    method: 'POST',
    headers: {
      Cookie: formateurCookies,
      'Content-Type': 'application/json',
      'X-CSRF-Token': formateurCsrf,
    },
    body: JSON.stringify({
      title: 'Cours pirate',
      instructor_id: 'usr-admin',
      category: 'Test',
      status: 'draft',
      duration: '2h',
      modules: 1,
    }),
  });
  assert(spoofedCourseCreation.status === 401, `expected 401 on spoofed instructor_id, got ${spoofedCourseCreation.status}`);

  console.log('security-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
