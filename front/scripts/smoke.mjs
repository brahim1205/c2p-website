import { chromium } from 'playwright';

const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD ?? 'password123';
const NEW_PASSWORD = process.env.C2P_NEW_USER_PASSWORD ?? 'Password123!';
const SUITE_FILTER = new Set(
  String(process.env.C2P_SMOKE_SUITES ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);

const publicPages = [
  ['accueil', '/'],
  ['allopresta', '/allopresta'],
  ['espace-numerique', '/espace-numerique'],
  ['project-center', '/project-center'],
  ['tarifs', '/tarifs'],
  ['a-propos', '/a-propos'],
  ['contact', '/contact'],
  ['connexion', '/auth/login'],
];

const dashboardSuites = {
  client: {
    email: 'client@c2p.sn',
    paths: [
      '/dashboard/client',
      '/dashboard/client/prestataires',
      '/dashboard/client/reservations',
      '/dashboard/client/commandes',
      '/dashboard/paiements',
      '/dashboard/parametres',
      '/dashboard/messages',
    ],
  },
  prestataire: {
    email: 'prestataire@c2p.sn',
    paths: [
      '/dashboard/prestataire',
      '/dashboard/prestataire/services',
      '/dashboard/prestataire/demandes',
      '/dashboard/prestataire/avis',
      '/dashboard/paiements',
      '/dashboard/parametres',
      '/dashboard/messages',
    ],
  },
  formateur: {
    email: 'formateur@c2p.sn',
    paths: [
      '/dashboard/formateur',
      '/dashboard/formateur/mes-cours',
      '/dashboard/formateur/classes-virtuelles',
      '/dashboard/formateur/apprenants',
      '/dashboard/formateur/evaluations',
      '/dashboard/formateur/certificats',
      '/dashboard/formateur/profil-public',
      '/dashboard/formateur/revenus',
      '/dashboard/formateur/communaute',
      '/dashboard/messages',
    ],
  },
  apprenant: {
    email: 'apprenant@c2p.sn',
    paths: [
      '/dashboard/apprenant',
      '/dashboard/apprenant/mes-cours',
      '/dashboard/apprenant/examens',
      '/dashboard/apprenant/historique',
      '/dashboard/apprenant/progression',
      '/dashboard/apprenant/certificats',
      '/dashboard/apprenant/cours/__first-enrollment__',
      '/dashboard/paiements',
      '/dashboard/parametres',
      '/dashboard/messages',
    ],
  },
  porteur: {
    email: 'porteur@c2p.sn',
    paths: [
      '/dashboard/porteur',
      '/dashboard/porteur/mes-projets',
      '/dashboard/porteur/mes-projets/soumettre',
      '/dashboard/porteur/partenariats',
      '/dashboard/porteur/financements',
      '/dashboard/parametres',
      '/dashboard/messages',
    ],
  },
  partenaire: {
    email: 'partenaire@c2p.sn',
    paths: [
      '/dashboard/partenaire',
      '/dashboard/partenaire/opportunites',
      '/dashboard/partenaire/projets-suivis',
      '/dashboard/partenaire/collaborations',
      '/dashboard/paiements',
      '/dashboard/parametres',
      '/dashboard/messages',
    ],
  },
  admin: {
    email: 'admin@c2p.sn',
    paths: [
      '/admin/dashboard',
      '/admin/users',
      '/admin/operations',
      '/admin/accreditations',
      '/admin/payments',
      '/admin/reports',
      '/admin/analytics',
      '/admin/profile',
      '/admin/messages',
      '/admin/communications',
    ],
  },
  superadmin: {
    email: 'superadmin@c2p.sn',
    paths: [
      '/superadmin/dashboard',
      '/superadmin/governance',
      '/superadmin/operations',
      '/superadmin/finance',
      '/admin/security',
    ],
  },
};

const registrationRoles = {
  client: 'Client',
  prestataire: 'Prestataire',
  formateur: 'Formateur',
  apprenant: 'Apprenant',
  porteur: 'Porteur de projet',
  partenaire: 'Partenaire',
};

function shouldRun(name) {
  return SUITE_FILTER.size === 0 || SUITE_FILTER.has(name);
}

function isLoopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function assertCompatibleLocalOrigins() {
  const front = new URL(FRONT_URL);
  const api = new URL(API_URL);

  if (!isLoopbackHost(front.hostname) || !isLoopbackHost(api.hostname)) return;
  if (front.hostname === api.hostname) return;

  throw new Error(
    `Smoke local mal configure: FRONT_URL utilise ${front.hostname}, API_URL utilise ${api.hostname}. ` +
    'Utilise le meme hostname pour que les cookies de session HttpOnly soient renvoyes.',
  );
}

function isIgnorableConsole(text) {
  return (
    text.includes('React DevTools') ||
    text.includes('i18next is made possible') ||
    text.includes('favicon') ||
    text.includes('manifest') ||
    text.includes('net::ERR_ABORTED 404') ||
    text.includes('net::ERR_CONNECTION_CLOSED')
  );
}

function collectPageFailures(page, label, failures) {
  page.on('pageerror', (error) => failures.push(`[${label}] pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !isIgnorableConsole(text)) {
      failures.push(`[${label}] console: ${text.slice(0, 300)}`);
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('/api/') && status >= 400 && !url.includes('/api/health')) {
      failures.push(`[${label}] API ${status}: ${url}`);
    }
  });
}

async function gotoAndCheck(page, path, label) {
  await page.goto(`${FRONT_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 4000 });
  } catch {
    // Some pages keep long-polling or preloading assets. DOM readiness is enough for smoke.
  }
  await page.waitForTimeout(250);

  const bodyText = (await page.locator('body').innerText({ timeout: 8000 })).replace(/\s+/g, ' ').trim();
  if (bodyText.length < 40) throw new Error(`${label} ${path}: page trop vide`);
  if (/^(404|Page non trouvée|Page non trouvee|Not Found)\b/i.test(bodyText)) {
    throw new Error(`${label} ${path}: page 404 visible`);
  }
  if (/Erreur réseau|Erreur reseau|Cannot read properties/i.test(bodyText)) {
    throw new Error(`${label} ${path}: erreur visible: ${bodyText.slice(0, 220)}`);
  }
}

async function loginContext(browser, suiteName, email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const response = await context.request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!response.ok()) {
    throw new Error(`${suiteName}: connexion impossible (${response.status()}) ${await response.text()}`);
  }
  return context;
}

async function resolveDashboardPaths(context, suiteName, paths) {
  if (suiteName !== 'apprenant') return paths;

  const response = await context.request.get(`${API_URL}/learning/apprenant/enrollments`);
  if (!response.ok()) {
    throw new Error(`${suiteName}: impossible de charger les inscriptions (${response.status()}) ${await response.text()}`);
  }
  const enrollments = await response.json();
  const firstCourseId = Array.isArray(enrollments)
    ? enrollments.find((entry) => entry?.course_id || entry?.courses?.id)?.course_id
      ?? enrollments.find((entry) => entry?.course_id || entry?.courses?.id)?.courses?.id
    : null;
  if (!firstCourseId) {
    throw new Error(`${suiteName}: aucune inscription de cours disponible pour le smoke`);
  }

  return paths.map((path) => path.replace('__first-enrollment__', String(firstCourseId)));
}

async function fillById(page, id, value) {
  const locator = page.locator(`#${id}`);
  if (await locator.count()) await locator.fill(value);
}

async function runPublicSmoke(browser, failures) {
  if (!shouldRun('public')) return;

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  collectPageFailures(page, 'public', failures);

  for (const [name, path] of publicPages) {
    await gotoAndCheck(page, path, `public:${name}`);
  }

  await gotoAndCheck(page, '/allopresta', 'public:allopresta-detail-source');
  const providerLink = await page.locator('a[href^="/allopresta/prestataire/"]').first().getAttribute('href');
  if (!providerLink) throw new Error('public: aucun profil prestataire trouve');
  await gotoAndCheck(page, providerLink, 'public:prestataire-detail');

  await gotoAndCheck(page, '/espace-numerique', 'public:formation-detail-source');
  const courseLink = await page.locator('a[href^="/espace-numerique/formation/"]').first().getAttribute('href');
  if (!courseLink) throw new Error('public: aucune formation trouvee');
  await gotoAndCheck(page, courseLink, 'public:formation-detail');

  await gotoAndCheck(page, '/project-center', 'public:project-detail-source');
  const projectLink = await page.locator('a[href^="/project-center/projet/"]').first().getAttribute('href');
  if (!projectLink) throw new Error('public: aucun projet trouve');
  await gotoAndCheck(page, projectLink, 'public:project-detail');

  await gotoAndCheck(page, '/contact', 'public:contact-form');
  await page.locator('#prenom').fill('Smoke');
  await page.locator('#nom').fill('C2P');
  await page.locator('#email').fill(`smoke-contact-${Date.now()}@c2p.test`);
  await page.locator('#sujet').selectOption('Question générale');
  await page.locator('#message').fill('Message de test automatique C2P.');
  await page.getByRole('button', { name: /Envoyer le message/i }).click();
  await page.waitForTimeout(1200);
  const contactText = await page.locator('body').innerText();
  if (!/Message envoyé|Message envoye/i.test(contactText)) {
    throw new Error('public: confirmation contact absente');
  }

  await context.close();
}

async function runDashboardSmoke(browser, failures) {
  for (const [suiteName, suite] of Object.entries(dashboardSuites)) {
    if (!shouldRun(suiteName)) continue;

    const context = await loginContext(browser, suiteName, suite.email);
    const page = await context.newPage();
    collectPageFailures(page, suiteName, failures);

    const paths = await resolveDashboardPaths(context, suiteName, suite.paths);
    for (const path of paths) {
      await gotoAndCheck(page, path, suiteName);
    }

    await context.close();
  }
}

async function runRegistrationSmoke(browser, failures) {
  if (!shouldRun('register')) return;

  const stamp = Date.now();
  for (const [role, title] of Object.entries(registrationRoles)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    collectPageFailures(page, `register:${role}`, failures);

    await gotoAndCheck(page, '/auth/register', `register:${role}`);
    await page.locator('button').filter({ hasText: title }).first().click();
    await page.getByRole('button', { name: /Continuer/i }).click();

    await fillById(page, 'firstName', `Smoke${role}`);
    await fillById(page, 'lastName', 'C2P');
    await fillById(page, 'email', `smoke-${role}-${stamp}@c2p.test`);
    await fillById(page, 'phone', '+221 77 000 00 00');
    await fillById(page, 'password', NEW_PASSWORD);
    await fillById(page, 'confirmPassword', NEW_PASSWORD);
    await fillById(page, 'role-location', 'Dakar, Senegal');
    await fillById(page, 'role-publicTitle', role === 'formateur' ? 'Formateur smoke' : 'Profil smoke');
    await fillById(page, 'role-skills', 'test, validation');
    await fillById(page, 'role-bio', 'Profil cree pendant un smoke test.');
    await fillById(page, 'role-preferredLanguage', 'Francais');
    await fillById(page, 'role-website', 'https://c2p.sn');

    const partnerType = page.locator('#role-partnerType');
    if (await partnerType.count()) await partnerType.selectOption('technique');

    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole('button', { name: /Créer mon compte|Creer mon compte/i }).click();
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText();
    if (/Erreur d inscription/i.test(bodyText)) {
      throw new Error(`register:${role}: erreur d inscription visible`);
    }
    if (['prestataire', 'formateur', 'porteur'].includes(role)) {
      if (!currentUrl.includes('/auth/onboarding/') && !/clauses|confidentialite|abonnement|conditions/i.test(bodyText)) {
        throw new Error(`register:${role}: onboarding attendu, url=${currentUrl}`);
      }
    } else if (currentUrl.includes('/auth/register')) {
      throw new Error(`register:${role}: dashboard attendu, url=${currentUrl}`);
    }

    await context.close();
  }
}

async function main() {
  assertCompatibleLocalOrigins();

  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    await runPublicSmoke(browser, failures);
    await runDashboardSmoke(browser, failures);
    await runRegistrationSmoke(browser, failures);
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    throw new Error(`${failures.length} erreur(s) detectee(s) pendant le smoke test.`);
  }

  console.log('smoke: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
