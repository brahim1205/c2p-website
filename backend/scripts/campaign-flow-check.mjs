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
  // Login as admin
  const { cookieJar, csrfToken } = await loginAs('superadmin@c2p.sn');
  assert(csrfToken, 'missing csrf cookie for admin');

  // Dispatch Campaign
  const dispatchResponse = await readJson('/communications/campaigns/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      title: 'Campagne de test',
      type: 'email',
      target: 'all_users',
      content: 'Ceci est un test E2E pour l\'envoi de campagne immédiate.',
    }),
  });

  console.log('Dispatch payload:', dispatchResponse.payload);
  assert(dispatchResponse.response.ok, `expected 2xx on dispatch campaign, got ${dispatchResponse.response.status}`);
  assert(dispatchResponse.payload.recipients > 0, 'expected at least one recipient');
  
  console.log('campaign-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
