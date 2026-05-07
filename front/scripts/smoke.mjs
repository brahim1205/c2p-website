import { chromium } from 'playwright';

const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD ?? 'password123';

const suites = [
  {
    name: 'admin',
    email: 'admin@c2p.sn',
    landingPath: '/admin/dashboard',
    checks: [
      { path: '/admin/dashboard', text: 'Tableau de bord administrateur', actions: [clickButton('Exporter')] },
      { path: '/admin/users', text: 'Gestion des utilisateurs', actions: [clickButton('Exporter')] },
      { path: '/admin/content', text: 'Gestion des contenus', actions: [clickButton('Exporter les donnees')] },
      { path: '/admin/accreditations', text: 'Gestion des accreditations', actions: [clickButton('Voir les documents', true), clickButton('Consulter', true)] },
      { path: '/admin/payments', text: 'Gestion des paiements', actions: [clickButton('Exporter le rapport'), clickButton('Details', true)] },
      { path: '/admin/reports', text: 'Signalements', actions: [] },
      { path: '/admin/analytics', text: 'Statistiques et Analytics', actions: [clickButton('Exporter le rapport')] },
      { path: '/admin/security', text: 'Securite et protection', actions: [clickButton('Journaux'), clickButton('Exporter', true)] },
      { path: '/admin/profile', text: 'Profil administrateur', actions: [] },
      { path: '/admin/communications', text: 'Communications', actions: [] },
      { path: '/admin/settings', text: 'Parametrage de la plateforme', actions: [clickButton('Exporter config'), clickButton('Integrations'), clickButton('Synchroniser', true)] },
    ],
  },
  {
    name: 'client',
    email: 'client@c2p.sn',
    landingPath: '/dashboard/client',
    checks: [
      { path: '/dashboard/client', text: 'Mon espace client', actions: [] },
      { path: '/dashboard/client/prestataires', text: 'Trouver un prestataire', actions: [] },
      { path: '/dashboard/client/reservations', text: 'Mes réservations', actions: [] },
      { path: '/dashboard/client/commandes', text: 'Mes commandes', actions: [clickFirst('button[title=\"Developper\"]', true), clickButton('Telecharger la facture', true)] },
      { path: '/dashboard/paiements', text: 'Paiements', actions: [clickButton('Exporter'), clickText('Voir détails', true), clickButton('Telecharger le reçu', true)] },
      { path: '/dashboard/factures', text: 'Factures', actions: [clickButton('Exporter tout'), clickButton('Telecharger PDF', true)] },
      { path: '/dashboard/messages', text: 'Messages', actions: [clickCss('button:has(i.ri-add-line)', true)] },
    ],
  },
  {
    name: 'prestataire',
    email: 'prestataire@c2p.sn',
    landingPath: '/dashboard/prestataire',
    checks: [
      { path: '/dashboard/prestataire', text: 'Tableau de bord Prestataire', actions: [] },
      { path: '/dashboard/prestataire/services', text: 'Mes services', actions: [] },
      { path: '/dashboard/prestataire/demandes', text: 'Demandes de service', actions: [] },
      { path: '/dashboard/prestataire/avis', text: 'Avis clients', actions: [] },
      { path: '/dashboard/messages', text: 'Messages', actions: [clickCss('button:has(i.ri-add-line)', true)] },
    ],
  },
  {
    name: 'formateur',
    email: 'formateur@c2p.sn',
    landingPath: '/dashboard/formateur',
    checks: [
      { path: '/dashboard/formateur', text: 'Tableau de bord Formateur', actions: [] },
      { path: '/dashboard/formateur/mes-cours', text: 'Mes formations', actions: [] },
      { path: '/dashboard/formateur/classes-virtuelles', text: 'Classes virtuelles', actions: [] },
      { path: '/dashboard/formateur/apprenants', text: 'Mes apprenants', actions: [] },
      { path: '/dashboard/formateur/evaluations', text: 'Évaluations', actions: [] },
      { path: '/dashboard/formateur/certificats', text: 'Certificats', actions: [clickButton('Telecharger PDF', true)] },
    ],
  },
  {
    name: 'apprenant',
    email: 'apprenant@c2p.sn',
    landingPath: '/dashboard/apprenant',
    checks: [
      { path: '/dashboard/apprenant', text: 'Tableau de bord Apprenant', actions: [] },
      { path: '/dashboard/apprenant/mes-cours', text: 'Mes formations', actions: [] },
      { path: '/dashboard/apprenant/cours/1', text: 'Marketing Digital Avancé', actions: [clickButton('Ressources', true), clickButton('Télécharger', true)] },
      { path: '/dashboard/apprenant/progression', text: 'Ma progression', actions: [] },
      { path: '/dashboard/apprenant/certificats', text: 'Mes certificats', actions: [clickButton('Telecharger', true)] },
      { path: '/dashboard/apprenant/examens', text: 'Mes examens', actions: [] },
    ],
  },
  {
    name: 'porteur',
    email: 'porteur@c2p.sn',
    landingPath: '/dashboard/porteur',
    checks: [
      { path: '/dashboard/porteur', text: 'Tableau de bord Porteur de projet', actions: [] },
      { path: '/dashboard/porteur/mes-projets', text: 'Mes projets', actions: [] },
      { path: '/dashboard/porteur/mes-projets/4001', text: 'Voir les financements', actions: [clickButton('Documents', true), clickButton('Ouvrir', true)] },
      { path: '/dashboard/porteur/partenariats', text: 'Partenariats', actions: [] },
      { path: '/dashboard/porteur/financements', text: 'Mes financements', actions: [] },
      { path: '/dashboard/porteur/financements/4401', text: 'Execution', actions: [clickButton('Documents', true), clickButton('Ouvrir', true)] },
    ],
  },
  {
    name: 'partenaire',
    email: 'partenaire@c2p.sn',
    landingPath: '/dashboard/partenaire',
    checks: [
      { path: '/dashboard/partenaire', text: 'Tableau de bord Partenaire', actions: [] },
      { path: '/dashboard/partenaire/opportunites', text: 'Opportunites de collaboration', actions: [] },
      { path: '/dashboard/partenaire/projets-suivis', text: 'Projets suivis', actions: [] },
      { path: '/dashboard/partenaire/projets-suivis/4001', text: 'Suivi', actions: [clickButton('Contacter le porteur', true), clickButton('Documents', true), clickButton('Ouvrir', true)] },
      { path: '/dashboard/partenaire/collaborations', text: 'Mes collaborations', actions: [] },
    ],
  },
];

function clickButton(name, optional = false) {
  return async (page) => {
    const locator = page.getByRole('button', { name, exact: false }).first();
    if (!(await locator.count())) {
      if (optional) return;
      throw new Error(`Bouton introuvable: ${name}`);
    }
    if (!(await locator.isVisible().catch(() => false))) {
      if (optional) return;
      throw new Error(`Bouton non visible: ${name}`);
    }
    await locator.click();
    await page.waitForTimeout(250);
  };
}

function clickText(text, optional = false) {
  return async (page) => {
    const locator = page.getByText(text, { exact: false }).first();
    if (!(await locator.count())) {
      if (optional) return;
      throw new Error(`Texte cliquable introuvable: ${text}`);
    }
    if (!(await locator.isVisible().catch(() => false))) {
      if (optional) return;
      throw new Error(`Texte non visible: ${text}`);
    }
    await locator.click();
    await page.waitForTimeout(250);
  };
}

function clickCss(selector, optional = false) {
  return async (page) => {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) {
      if (optional) return;
      throw new Error(`Selecteur introuvable: ${selector}`);
    }
    if (!(await locator.isVisible().catch(() => false))) {
      if (optional) return;
      throw new Error(`Selecteur non visible: ${selector}`);
    }
    await locator.click();
    await page.waitForTimeout(250);
  };
}

function clickFirst(selector, optional = false) {
  return clickCss(selector, optional);
}

async function ensureReachable(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Service inaccessible: ${url} (${response.status})`);
  }
}

async function authenticateUser(requestContext, email) {
  const loginResponse = await requestContext.post(`${API_URL}/auth/login`, {
    method: 'POST',
    data: { email, password: PASSWORD },
  });
  if (!loginResponse.ok) {
    throw new Error(`Echec auth API pour ${email}: ${loginResponse.status()}`);
  }

  const loginPayload = await loginResponse.json();
  if (!loginPayload.requires2FA) {
    return loginPayload.user;
  }

  const verifyResponse = await requestContext.post(`${API_URL}/auth/verify-2fa`, {
    method: 'POST',
    data: {
      challengeId: loginPayload.challengeId,
      userId: loginPayload.user.id,
      code: loginPayload.devCodePreview || '123456',
    },
  });
  if (!verifyResponse.ok) {
    throw new Error(`Echec verification 2FA pour ${email}: ${verifyResponse.status()}`);
  }

  const verifyPayload = await verifyResponse.json();
  return verifyPayload.user;
}

function pathToRegex(path) {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

async function waitForRoute(page, path) {
  await page.waitForURL(pathToRegex(path), { timeout: 30000, waitUntil: 'commit' });
}

async function routeTo(page, path) {
  const currentPath = new URL(page.url()).pathname;
  if (currentPath === path) {
    await page.waitForTimeout(250);
    return;
  }

  await page.evaluate(async (targetPath) => {
    if (!window.REACT_APP_NAVIGATE) {
      throw new Error('REACT_APP_NAVIGATE indisponible');
    }
    window.REACT_APP_NAVIGATE(targetPath);
  }, path);
  await waitForRoute(page, path);
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}

function attachDiagnostics(page, errors) {
  page.on('pageerror', (error) => {
    errors.push(`pageerror:${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('React DevTools')) return;
    errors.push(`console:${text}`);
  });
}

async function bootstrapSession(page, email, landingPath) {
  await page.goto(`${FRONT_URL}${landingPath}`, { waitUntil: 'domcontentloaded' });
  await waitForRoute(page, landingPath);
  await page.waitForTimeout(800);
}

async function runSuite(browser, suite) {
  const context = await browser.newContext({ acceptDownloads: true });
  const errors = [];
  let mainPage = null;

  await authenticateUser(context.request, suite.email);

  context.on('page', async (page) => {
    attachDiagnostics(page, errors);
    if (mainPage && page !== mainPage) {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      } catch {
        // ignore preview tabs that do not fully settle
      }
      await page.close().catch(() => {});
    }
  });

  const page = await context.newPage();
  mainPage = page;
  attachDiagnostics(page, errors);

  await bootstrapSession(page, suite.email, suite.landingPath);

  for (const check of suite.checks) {
    try {
      await routeTo(page, check.path);
      await page.getByText(check.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
      for (const action of check.actions) {
        await action(page);
      }
    } catch (error) {
      const snippet = (await page.locator('body').innerText().catch(() => '')).slice(0, 1600);
      throw new Error(
        `[${suite.name}] echec sur ${check.path}\n` +
        `url=${page.url()}\n` +
        `attendu=${check.text}\n` +
        `body=${snippet}\n` +
        `cause=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (errors.length) {
    throw new Error(`[${suite.name}] erreurs detectees:\n${errors.join('\n')}`);
  }

  await context.close();
}

async function main() {
  await ensureReachable(FRONT_URL);
  await ensureReachable(`${API_URL.replace(/\/api$/, '')}/api`);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const suite of suites) {
      process.stdout.write(`Running smoke suite: ${suite.name}\n`);
      await runSuite(browser, suite);
    }
    process.stdout.write('Smoke suite completed successfully.\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
