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
  return {
    cookieJar: mergeCookieJar(extractCookies(response)),
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
  const anonymousCourses = await readJson('/data/courses');
  assert(anonymousCourses.response.ok, `expected 200 on public courses, got ${anonymousCourses.response.status}`);
  assert(Array.isArray(anonymousCourses.payload), 'public courses payload must be an array');
  assert(anonymousCourses.payload.length > 0, 'public courses payload must not be empty');
  assert(
    anonymousCourses.payload.every((row) => String(row.status) === 'published'),
    'anonymous users must only receive published courses',
  );

  const anonymousSections = await readJson('/data/course_sections?eq_course_id=201');
  assert(anonymousSections.response.ok, `expected 200 on public course sections, got ${anonymousSections.response.status}`);
  assert(
    anonymousSections.payload.every((row) => String(row.status) === 'published' && String(row.course_id) === '201'),
    'anonymous users must only receive published sections for published courses',
  );

  const anonymousVirtualClasses = await readJson('/data/virtual_classes?eq_course_id=201');
  assert(anonymousVirtualClasses.response.ok, `expected 200 on public virtual classes, got ${anonymousVirtualClasses.response.status}`);
  assert(
    anonymousVirtualClasses.payload.every((row) => String(row.status ?? '') !== 'cancelled' && String(row.course_id) === '201'),
    'anonymous users must not receive cancelled virtual classes',
  );

  const anonymousTracking = await request('/data/project_tracking');
  assert(anonymousTracking.status === 401, `expected 401 on anonymous project tracking, got ${anonymousTracking.status}`);

  const anonymousCreateProject = await request('/data/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Projet anonyme' }),
  });
  assert(anonymousCreateProject.status === 401, `expected 401 on anonymous project create, got ${anonymousCreateProject.status}`);

  const { cookieJar: apprenantCookies } = await loginAs('apprenant@c2p.sn');
  const apprenantEnrollments = await readJson('/data/course_enrollments', {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantEnrollments.response.ok, `expected 200 on apprenant enrollments, got ${apprenantEnrollments.response.status}`);
  assert(
    apprenantEnrollments.payload.every((row) => String(row.student_id) === 'usr-apprenant'),
    'apprenant must only receive own enrollments',
  );

  const { cookieJar: partenaireCookies } = await loginAs('partenaire@c2p.sn');
  const partenaireTracking = await readJson('/data/project_tracking', {
    headers: { Cookie: partenaireCookies },
  });
  assert(partenaireTracking.response.ok, `expected 200 on partenaire tracking, got ${partenaireTracking.response.status}`);
  assert(
    partenaireTracking.payload.every((row) => String(row.partner_id) === 'usr-partenaire'),
    'partenaire must only receive own tracking rows',
  );

  const { cookieJar: porteurCookies } = await loginAs('porteur@c2p.sn');
  const ownerProjects = await readJson('/data/projects?eq_owner_id=usr-porteur', {
    headers: { Cookie: porteurCookies },
  });
  assert(ownerProjects.response.ok, `expected 200 on owner projects, got ${ownerProjects.response.status}`);
  const ownerProjectIds = new Set(ownerProjects.payload.map((row) => String(row.id)));
  assert(ownerProjectIds.size > 0, 'porteur must own at least one seeded project');

  const porteurTracking = await readJson('/data/project_tracking', {
    headers: { Cookie: porteurCookies },
  });
  assert(porteurTracking.response.ok, `expected 200 on porteur tracking, got ${porteurTracking.response.status}`);
  assert(
    porteurTracking.payload.every((row) => ownerProjectIds.has(String(row.project_id))),
    'porteur must only receive tracking rows for owned projects',
  );

  console.log('data-access-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
