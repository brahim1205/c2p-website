const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || 'password123';
const EXPECTED_UPLOAD_PUBLIC_BASE_URL = process.env.EXPECTED_UPLOAD_PUBLIC_BASE_URL;
const { PrismaClient } = await import('@prisma/client');

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

async function readJsonResponse(response) {
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

function createUploadBody({ content, type, filename, folder = 'smoke_uploads', resourceType = 'raw' }) {
  const body = new FormData();
  body.set('folder', folder);
  body.set('resourceType', resourceType);
  body.set('filename', filename.replace(/\.[^.]+$/, ''));
  body.set('file', new Blob([content], { type }), filename);
  return body;
}

async function main() {
  const anonymousStrategy = await request('/uploads/strategy');
  assert(anonymousStrategy.status === 401, `expected 401 on anonymous upload strategy, got ${anonymousStrategy.status}`);

  const anonymousUpload = await request('/uploads/local', {
    method: 'POST',
    body: createUploadBody({
      content: 'anonymous upload must fail',
      type: 'text/plain',
      filename: 'anonymous.txt',
    }),
  });
  assert(anonymousUpload.status === 401, `expected 401 on anonymous upload, got ${anonymousUpload.status}`);

  const { cookieJar, csrfToken } = await loginAs('formateur@c2p.sn');
  assert(csrfToken, 'missing csrf cookie for upload flow');

  const strategyResponse = await request('/uploads/strategy', {
    headers: { Cookie: cookieJar },
  });
  assert(strategyResponse.ok, `expected 200 on upload strategy, got ${strategyResponse.status}`);
  const strategy = await readJsonResponse(strategyResponse);
  assert(strategy.mode === 'local-disk', `expected local-disk strategy, got ${strategy.mode}`);
  assert(Number(strategy.requestMaxBytes) > 0, 'upload strategy must expose requestMaxBytes');
  assert(strategy.resourceTypes?.raw?.maxBytes > 0, 'upload strategy must expose raw maxBytes');

  const rejectedUpload = await request('/uploads/local', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: createUploadBody({
      content: '<svg><script>alert(1)</script></svg>',
      type: 'image/svg+xml',
      filename: 'blocked.svg',
      resourceType: 'image',
    }),
  });
  assert(rejectedUpload.status === 400, `expected 400 on disallowed svg upload, got ${rejectedUpload.status}`);

  const uploadResponse = await request('/uploads/local', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: createUploadBody({
      content: `c2p upload smoke ${Date.now()}\n`,
      type: 'text/plain',
      filename: 'upload-smoke.txt',
    }),
  });
  assert(uploadResponse.ok, `expected 201/200 on valid upload, got ${uploadResponse.status}`);
  const uploadPayload = await readJsonResponse(uploadResponse);
  assert(uploadPayload.folder === 'smoke_uploads', 'upload response must keep normalized folder');
  assert(uploadPayload.resourceType === 'raw', 'upload response must keep resourceType raw');
  assert(uploadPayload.mimeType === 'text/plain', 'upload response must keep text/plain mime type');
  assert(String(uploadPayload.relativePath ?? '').startsWith('/uploads/smoke_uploads/'), 'upload response must expose a scoped relative path');
  assert(!String(uploadPayload.relativePath ?? '').includes('..'), 'upload response path must not contain traversal');
  assert(String(uploadPayload.url ?? '').includes('/uploads/smoke_uploads/'), 'upload response must expose an accessible URL');
  assert(uploadPayload.storageKey, 'upload response must expose storageKey');
  if (EXPECTED_UPLOAD_PUBLIC_BASE_URL) {
    assert(
      String(uploadPayload.url ?? '').startsWith(EXPECTED_UPLOAD_PUBLIC_BASE_URL.replace(/\/$/, '')),
      `upload response URL must use configured public base ${EXPECTED_UPLOAD_PUBLIC_BASE_URL}`,
    );
  }

  const prisma = new PrismaClient();
  try {
    const metadata = await prisma.uploadObject.findUnique({
      where: { storageKey: uploadPayload.storageKey },
      select: {
        id: true,
        driver: true,
        ownerId: true,
        storageKey: true,
        resourceType: true,
        sizeBytes: true,
      },
    });
    assert(metadata, 'upload metadata must be persisted in UploadObject');
    assert(metadata.driver === uploadPayload.driver, 'upload metadata driver must match response');
    assert(metadata.ownerId, 'upload metadata must keep authenticated ownerId');
    assert(metadata.resourceType === 'raw', 'upload metadata must keep raw resourceType');
    assert(metadata.sizeBytes > 0n, 'upload metadata must keep positive sizeBytes');
  } finally {
    await prisma.$disconnect();
  }

  console.log('upload-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
