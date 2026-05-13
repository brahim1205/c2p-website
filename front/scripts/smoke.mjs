import { chromium } from 'playwright';

const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD ?? 'password123';
const LOCAL_LOGO_URL = `${FRONT_URL}/images/brand/c2p-admin-logo.png`;
const SUITE_FILTER = new Set(
  String(process.env.C2P_SMOKE_SUITES ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);
const SHARE_REVIEW_COURSE_WITH_ADMIN = SUITE_FILTER.size === 0 || SUITE_FILTER.has('admin');

let moderationCourseTitle = null;

const suites = [
  {
    name: 'client',
    email: 'client@c2p.sn',
    landingPath: '/dashboard/client',
    checks: [
      { path: '/dashboard/client', text: 'Espace client', actions: [dashboardTopbarSmoke('/dashboard/client'), clientDashboardSmoke, clientSupportSmoke] },
      { path: '/dashboard/client/prestataires', text: 'Trouver un prestataire', actions: [clientProviderContactSmoke] },
      { path: '/dashboard/client/reservations', text: 'Mes réservations', actions: [clientReservationsSmoke] },
      { path: '/dashboard/client/commandes', text: 'Mes commandes', actions: [clientOrdersSmoke] },
      { path: '/dashboard/paiements', text: 'Paiements', actions: [clickButton('Exporter'), clickText('Voir détails', true), clickButton('Telecharger le reçu', true)] },
      { path: '/dashboard/factures', text: 'Factures', actions: [clickButton('Exporter tout'), clickButton('Telecharger PDF', true)] },
      { path: '/dashboard/notifications', text: 'Notifications', actions: [dashboardNotificationsSmoke] },
      { path: '/dashboard/messages', text: 'Messages', actions: [dashboardMessagesSmoke] },
    ],
  },
  {
    name: 'prestataire',
    email: 'prestataire@c2p.sn',
    landingPath: '/dashboard/prestataire',
    checks: [
      { path: '/dashboard/prestataire', text: 'Espace prestataire', actions: [] },
      { path: '/dashboard/prestataire/services', text: 'Mes services', actions: [] },
      { path: '/dashboard/prestataire/demandes', text: 'Missions attribuées', actions: [clickTitle('Détails', true)] },
      { path: '/dashboard/prestataire/avis', text: 'Avis clients', actions: [clickButton('Utile', true)] },
      { path: '/dashboard/messages', text: 'Messages', actions: [dashboardMessagesSmoke] },
    ],
  },
  {
    name: 'formateur',
    email: 'formateur@c2p.sn',
    landingPath: '/dashboard/formateur',
    checks: [
      { path: '/dashboard/formateur', text: 'Espace formateur', actions: [dashboardTopbarSmoke('/dashboard/formateur'), formateurDashboardSmoke] },
      { path: '/dashboard/formateur/mes-cours', text: 'Mes formations', actions: [formateurCoursSmoke] },
      { path: '/dashboard/formateur/classes-virtuelles', text: 'Classes virtuelles', actions: [formateurClassesSmoke] },
      { path: '/dashboard/formateur/apprenants', text: 'Mes apprenants', actions: [formateurApprenantsSmoke] },
      { path: '/dashboard/formateur/evaluations', text: 'Évaluations', actions: [formateurEvaluationsSmoke] },
      { path: '/dashboard/formateur/certificats', text: 'Certificats', actions: [formateurCertificatsSmoke] },
      { path: '/dashboard/formateur/profil-public', text: 'Profil public formateur', actions: [formateurProfilPublicSmoke] },
      { path: '/dashboard/formateur/revenus', text: 'Revenus et retraits', actions: [formateurRevenusSmoke] },
      { path: '/dashboard/formateur/analytics', text: 'Analytics formateur', actions: [formateurAnalyticsSmoke] },
      { path: '/dashboard/formateur/communaute', text: 'Commentaires, réponses et FAQ', actions: [formateurCommunauteSmoke] },
    ],
  },
  {
    name: 'apprenant',
    email: 'apprenant@c2p.sn',
    landingPath: '/dashboard/apprenant',
    checks: [
      { path: '/dashboard/apprenant', text: 'Espace apprenant', actions: [] },
      { path: '/dashboard/apprenant/mes-cours', text: 'Mes formations', actions: [] },
      { path: '/dashboard/apprenant/cours/1', text: 'Marketing Digital Avancé', actions: [clickButton('Ressources', true), clickButton('Télécharger', true)] },
      { path: '/dashboard/apprenant/progression', text: 'Ma progression', actions: [apprenantProgressionSmoke] },
      { path: '/dashboard/apprenant/certificats', text: 'Mes certificats', actions: [clickButton('Telecharger', true)] },
      { path: '/dashboard/apprenant/examens', text: 'Mes examens', actions: [apprenantExamensSmoke] },
    ],
  },
  {
    name: 'parent',
    email: 'parent@c2p.sn',
    landingPath: '/dashboard/parent',
    checks: [
      { path: '/dashboard/parent', text: 'Suivi parent', actions: [dashboardTopbarSmoke('/dashboard/parent')] },
      { path: '/dashboard/messages', text: 'Messages', actions: [dashboardMessagesSmoke] },
      { path: '/dashboard/securite', text: 'Securite du compte', actions: [] },
    ],
  },
  {
    name: 'porteur',
    email: 'porteur@c2p.sn',
    landingPath: '/dashboard/porteur',
    checks: [
      { path: '/dashboard/porteur', text: 'Espace porteur', actions: [] },
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
      { path: '/dashboard/partenaire', text: 'Espace partenaire', actions: [] },
      { path: '/dashboard/partenaire/opportunites', text: 'Opportunites de collaboration', actions: [] },
      { path: '/dashboard/partenaire/projets-suivis', text: 'Projets suivis', actions: [] },
      { path: '/dashboard/partenaire/projets-suivis/4001', text: 'Suivi', actions: [clickButton('Contacter le porteur', true), clickButton('Documents', true), clickButton('Ouvrir', true)] },
      { path: '/dashboard/partenaire/collaborations', text: 'Mes collaborations', actions: [] },
    ],
  },
  {
    name: 'admin',
    email: 'admin@c2p.sn',
    landingPath: '/admin/dashboard',
    setup: seedPublicContactSubmission,
    checks: [
      { path: '/admin/dashboard', text: 'Administration', actions: [adminTopbarSmoke('/admin/dashboard'), clickButton('Exporter'), clickButton('Actualiser', true)] },
      { path: '/admin/users', text: 'Gestion des utilisateurs', actions: [adminUsersSmoke] },
      { path: '/admin/content', text: 'Gestion des contenus', actions: [adminContentSmoke] },
      { path: '/admin/accreditations', text: 'Gestion des accreditations', actions: [clickButton('Voir les documents', true), clickButton('Consulter', true)] },
      { path: '/admin/payments', text: 'Gestion des paiements', actions: [adminPaymentsSmoke] },
      { path: '/admin/reports', text: 'Signalements', actions: [] },
      { path: '/admin/analytics', text: 'Statistiques et Analytics', actions: [clickButton('Exporter le rapport')] },
      { path: '/admin/security', text: 'Securite et protection', actions: [adminSecuritySmoke] },
      { path: '/admin/profile', text: 'Profil administrateur', actions: [] },
      { path: '/admin/messages', text: 'Messages support', actions: [adminMessagesSmoke] },
      { path: '/admin/notifications', text: 'Notifications admin', actions: [adminNotificationsSmoke] },
      { path: '/admin/communications', text: 'Communications', actions: [adminCommunicationsSmoke] },
      { path: '/admin/settings', text: 'Parametrage de la plateforme', actions: [adminSettingsSmoke] },
    ],
  },
];

function pause(page, ms = 250) {
  return page.waitForTimeout(ms);
}

async function clickLocator(page, locator, description, optional = false) {
  const target = locator.first();
  if (!(await target.count())) {
    if (optional) return false;
    throw new Error(`${description} introuvable`);
  }
  if (!(await target.isVisible().catch(() => false))) {
    if (optional) return false;
    throw new Error(`${description} non visible`);
  }
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await target.click({ force: true });
  await pause(page);
  return true;
}

function clickButton(name, optional = false) {
  return async (page) => clickLocator(page, page.getByRole('button', { name, exact: false }), `Bouton ${name}`, optional);
}

function clickText(text, optional = false) {
  return async (page) => clickLocator(page, page.getByText(text, { exact: false }), `Texte ${text}`, optional);
}

function clickCss(selector, optional = false) {
  return async (page) => clickLocator(page, page.locator(selector), `Selecteur ${selector}`, optional);
}

function clickTitle(title, optional = false) {
  return async (page) => clickLocator(page, page.locator(`[title="${title}"]`), `Title ${title}`, optional);
}

async function fillPlaceholder(page, placeholder, value, optional = false) {
  const locator = page.getByPlaceholder(placeholder, { exact: false }).first();
  if (!(await locator.count())) {
    if (optional) return false;
    throw new Error(`Champ ${placeholder} introuvable`);
  }
  await locator.fill(value);
  await pause(page);
  return true;
}

async function fillSelector(page, selector, value, optional = false) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    if (optional) return false;
    throw new Error(`Champ ${selector} introuvable`);
  }
  await locator.fill(value);
  await pause(page);
  return true;
}

async function selectSelector(page, selector, value, optional = false) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    if (optional) return false;
    throw new Error(`Select ${selector} introuvable`);
  }
  await locator.selectOption(value);
  await pause(page);
  return true;
}

async function getSelectOptionCount(locator) {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLSelectElement)) return 0;
    return element.options.length;
  });
}

async function waitForSelectOptionCount(locator, minimum = 2, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await getSelectOptionCount(locator).catch(() => 0);
    if (count >= minimum) return count;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return getSelectOptionCount(locator).catch(() => 0);
}

async function clickHeaderLink(page, href, optional = false) {
  return clickLocator(page, page.locator(`header a[href="${href}"]`), `Lien topbar ${href}`, optional);
}

async function clickFirstVisibleByNames(page, names) {
  for (const name of names) {
    const locator = page.getByRole('button', { name, exact: false }).first();
    if ((await locator.count()) && (await locator.isVisible().catch(() => false))) {
      await clickLocator(page, locator, `Bouton ${name}`, true);
      return true;
    }
  }
  return false;
}

async function clickFirstVisibleTitle(page, titles) {
  for (const title of titles) {
    const locator = page.locator(`[title="${title}"]`).first();
    if ((await locator.count()) && (await locator.isVisible().catch(() => false))) {
      await clickLocator(page, locator, `Title ${title}`, true);
      return true;
    }
  }
  return false;
}

async function seedPublicContactSubmission(requestContext) {
  const now = Date.now();
  const response = await requestContext.post(`${API_URL}/public/contact`, {
    data: {
      firstName: 'Smoke',
      lastName: 'Support',
      email: `smoke-support-${now}@example.com`,
      subject: `Demande smoke ${now}`,
      message: 'Message de validation smoke pour verifier la remontée support admin.',
    },
  });
  if (!response.ok()) {
    throw new Error(`Impossible de creer la demande publique: ${response.status()}`);
  }
}

function pathToRegex(path) {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`);
}

async function waitForRoute(page, path) {
  await page.waitForURL(pathToRegex(path), { timeout: 30000, waitUntil: 'commit' });
}

async function routeTo(page, path) {
  const currentPath = new URL(page.url()).pathname;
  if (currentPath === path) {
    await pause(page);
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
  await pause(page, 500);
}

async function waitForTextToDisappear(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  if (!(await locator.count())) return;
  await locator.waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
    await locator.waitFor({ state: 'detached', timeout: 15000 });
  });
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
  if (!loginResponse.ok()) {
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
  if (!verifyResponse.ok()) {
    throw new Error(`Echec verification 2FA pour ${email}: ${verifyResponse.status()}`);
  }

  const verifyPayload = await verifyResponse.json();
  return verifyPayload.user;
}

function attachDiagnostics(page, errors) {
  page.on('pageerror', (error) => {
    errors.push(`pageerror:${error.message}`);
  });
  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const url = response.url();
    if (response.status() === 404) {
      errors.push(`response404:${resourceType}:${url}`);
      return;
    }
    if (response.status() === 401 && (resourceType === 'fetch' || resourceType === 'xhr')) {
      errors.push(`response401:${resourceType}:${url}`);
    }
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('React DevTools')) return;
    if (text.includes('ERR_BLOCKED_BY_RESPONSE.NotSameOrigin')) return;
    if (text.includes('NETWORK_ERROR') || text.includes('REQUEST_TIMEOUT')) return;
    errors.push(`console:${text}`);
  });
  page.on('dialog', async (dialog) => {
    errors.push(`dialog:${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });
}

async function bootstrapSession(page, email, landingPath) {
  const performUiLogin = async () => {
    const loginEmailInput = page.locator('input[type="email"]').first();
    await loginEmailInput.waitFor({ state: 'visible', timeout: 5000 });
    await loginEmailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: false }).click();
    await waitForRoute(page, landingPath);
    await pause(page, 800);
  };

  await page.goto(`${FRONT_URL}${landingPath}`, { waitUntil: 'domcontentloaded' });
  await pause(page, 1200);

  const currentPath = () => new URL(page.url()).pathname;
  const emailInput = page.locator('input[type="email"]').first();

  if (currentPath() === '/auth/login' || await emailInput.isVisible().catch(() => false)) {
    await performUiLogin();
    return;
  }

  if (currentPath() !== landingPath) {
    await waitForRoute(page, landingPath);
    await pause(page, 800);
  }

  if (currentPath() === '/auth/login' || await emailInput.isVisible().catch(() => false)) {
    await performUiLogin();
    return;
  }
}

function dashboardTopbarSmoke(returnPath) {
  return async (page) => {
    await clickHeaderLink(page, '/dashboard/messages');
    await waitForRoute(page, '/dashboard/messages');
    await clickHeaderLink(page, '/dashboard/notifications');
    await waitForRoute(page, '/dashboard/notifications');
    await clickHeaderLink(page, '/dashboard/profile');
    await waitForRoute(page, '/dashboard/profile');
    await routeTo(page, returnPath);
  };
}

function adminTopbarSmoke(returnPath) {
  return async (page) => {
    const goBackToDashboard = async () => {
      const dashboardLink = page.locator(`a[href="${returnPath}"]`).first();
      if ((await dashboardLink.count()) && (await dashboardLink.isVisible().catch(() => false))) {
        await clickLocator(page, dashboardLink, `Lien admin ${returnPath}`);
        await waitForRoute(page, returnPath);
        return;
      }
      await routeTo(page, returnPath);
    };

    await clickLocator(page, page.locator('[title="Messages support"]'), 'Topbar messages');
    await waitForRoute(page, '/admin/messages');
    await goBackToDashboard();
    await clickLocator(page, page.locator('[title="Notifications"]'), 'Topbar notifications');
    await waitForRoute(page, '/admin/notifications');
    await goBackToDashboard();
    await clickLocator(page, page.locator('[title="Profil"]'), 'Topbar profil');
    await waitForRoute(page, '/admin/profile');
    await goBackToDashboard();
  };
}

async function clientSupportSmoke(page) {
  const link = page.getByRole('link', { name: 'Contacter le support', exact: false }).first();
  if (!(await link.count())) {
    throw new Error('Lien support client introuvable');
  }
  await link.click();
  await waitForRoute(page, '/dashboard/messages');
  await ensureMessageComposerVisible(page);
  await fillPlaceholder(page, 'Écrivez votre message...', 'Smoke client -> support admin');
  await clickCss('button:has(i.ri-send-plane-fill)')(page);
  await routeTo(page, '/dashboard/client');
}

async function clientDashboardSmoke(page) {
  await page.getByText('À traiter maintenant', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await clickLocator(page, page.getByRole('link', { name: 'Voir les paiements', exact: false }).first(), 'Lien paiements client', true);
  if (new URL(page.url()).pathname === '/dashboard/paiements') {
    await routeTo(page, '/dashboard/client');
  }
  await clickLocator(page, page.locator('a[href="/dashboard/client/reservations"]').first(), 'Lien reservations dashboard client', true);
  await waitForRoute(page, '/dashboard/client/reservations');
  await routeTo(page, '/dashboard/client');
}

async function clientProviderContactSmoke(page) {
  await fillPlaceholder(page, 'Nom, service, localisation...', 'dakar', true);
  await page.getByRole('button', { name: 'Commander via C2P', exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await clickButton('Commander via C2P')(page);
  await fillSelector(page, 'input[type="date"]', '2026-05-20');
  await fillPlaceholder(page, 'Quartier, immeuble, repère...', 'Plateau, immeuble C2P');
  await fillPlaceholder(page, 'Contexte, urgence, contraintes d’accès, livrables attendus...', 'Besoin smoke pour tester le flux client -> prestataire.');
  await clickFirstVisibleByNames(page, ['Envoyer à C2P', 'Envoyer']);
  await waitForRoute(page, '/dashboard/client/reservations');
}

async function clientReservationsSmoke(page) {
  await clickButton('Prestataire assigné', true)(page);
  await clickButton('Analyse C2P', true)(page);
  await clickButton('Mission en cours', true)(page);
  await clickButton('Terminée', true)(page);
  await clickButton('Toutes', true)(page);
  const reviewButton = page.getByRole('button', { name: 'Noter', exact: false }).first();
  if ((await reviewButton.count()) && (await reviewButton.isVisible().catch(() => false))) {
    await clickLocator(page, reviewButton, 'Bouton Noter');
    const stars = page.locator('button').filter({ has: page.locator('i.ri-star-fill') });
    if (await stars.count()) {
      await stars.nth(Math.min(4, (await stars.count()) - 1)).click({ force: true });
      await pause(page);
    }
    await fillSelector(page, 'textarea[placeholder*="Décrivez votre expérience"]', 'Avis smoke de reservation.');
    await clickButton('Publier l’avis', true)(page);
    await clickButton("Publier l'avis", true)(page);
  }
}

async function clientOrdersSmoke(page) {
  await clickButton('Paiement en attente', true)(page);
  await clickButton('En préparation', true)(page);
  await clickButton('Livrée', true)(page);
  await clickButton('Toutes', true)(page);
  await clickCss('button:has(i.ri-arrow-down-s-line)', true)(page);
  await clickFirstVisibleByNames(page, ['Télécharger la facture', 'Téléchargement prêt', 'Régler via paiements', 'Signaler un problème']);
}

async function dashboardNotificationsSmoke(page) {
  await clickButton('Préférences', true)(page);
  await clickCss('button.w-12.h-6', true)(page);
  await clickButton('Enregistrer les préférences', true)(page);
  await clickButton('Historique', true)(page);
  await clickButton('Messages', true)(page);
  await clickButton('Toutes', true)(page);
  await clickButton('Tout marquer comme lu', true)(page);
  await clickButton('Marquer comme lu', true)(page);
}

async function ensureMessageComposerVisible(page) {
  const composer = page.getByPlaceholder('Écrivez votre message...', { exact: false }).first();
  if (await composer.isVisible().catch(() => false)) {
    return;
  }

  const searchInput = page.locator('input[placeholder*="Rechercher une conversation"]').first();
  let conversationButtons = page.locator('div.flex-1.overflow-y-auto > button');
  if (await searchInput.count()) {
    const conversationPanel = searchInput.locator('xpath=ancestor::div[contains(@class,"bg-white")][1]');
    const panelButtons = conversationPanel.locator('button');
    const scopedButtons = conversationPanel.locator('div.flex-1.overflow-y-auto > button');
    if (await scopedButtons.count()) {
      conversationButtons = scopedButtons;
    } else if (await panelButtons.count()) {
      conversationButtons = panelButtons;
    }
  }

  const count = await conversationButtons.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = conversationButtons.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    await candidate.click({ force: true }).catch(() => {});
    await pause(page, 400);
    if (await composer.isVisible().catch(() => false)) {
      return;
    }
  }

  await composer.waitFor({ state: 'visible', timeout: 10000 });
}

async function dashboardMessagesSmoke(page) {
  await pause(page, 600);
  await ensureMessageComposerVisible(page);

  await clickCss('button:has(i.ri-add-line)', true)(page);
  if (await page.locator('input[placeholder*="Rechercher un utilisateur"]').count()) {
    await fillPlaceholder(page, 'Rechercher un utilisateur...', 'admin', true);
    await fillPlaceholder(page, "Message d'introduction facultatif...", 'Conversation smoke ouverte depuis le test.');
    const composeTargets = page.locator('div[role="dialog"], .fixed').getByRole('button').filter({ has: page.locator('span') });
    if (await composeTargets.count()) {
      await composeTargets.first().click({ force: true }).catch(() => {});
      await pause(page, 500);
    }
  }

  await fillPlaceholder(page, 'Écrivez votre message...', 'Message smoke principal');
  await clickCss('button:has(i.ri-send-plane-fill)')(page);

  await clickCss('button:has(i.ri-attachment-line)')(page);
  await clickButton('Document', true)(page);

  await clickCss('button:has(i.ri-emotion-line)')(page);
  await clickCss('[title="😀"]', true)(page);
  await clickCss('button:has(i.ri-send-plane-fill)', true)(page);

  await clickTitle('Appel audio', true)(page);
  await clickLocator(page, page.locator('div.fixed button:has(i.ri-phone-line)').last(), 'Fin appel', true);

  await clickCss('button:has(i.ri-more-2-line)')(page);
  await clickButton('Infos de la conversation', true)(page);
  await clickButton('Fermer', true)(page);

  await clickCss('button:has(i.ri-more-2-line)')(page);
  await clickButton('Médias et fichiers', true)(page);
  await clickButton('Telecharger', true)(page);
  await clickButton('Fermer', true)(page);

  await clickCss('button:has(i.ri-more-2-line)')(page);
  await clickButton('Rechercher dans la conversation', true)(page);
  await fillPlaceholder(page, 'Rechercher un mot, un auteur ou une phrase...', 'Smoke', true);
  await clickButton('Fermer', true)(page);
}

async function formateurDashboardSmoke(page) {
  await page.getByText('Pipeline de publication', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Apprenants à relancer', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Quiz & évaluations', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Programme & contenus', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });

  await clickLocator(page, page.getByRole('link', { name: 'Continuer le programme', exact: false }), 'Lien continuer le programme', true);
  if (/\/dashboard\/formateur\/mes-cours\/[^/]+\/programme/.test(new URL(page.url()).pathname)) {
    await page.getByText('Programme de la formation', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
    await routeTo(page, '/dashboard/formateur');
  }

  await clickLocator(page, page.locator('a[href="/dashboard/formateur/apprenants"]').first(), 'Lien dashboard apprenants', true);
  await waitForRoute(page, '/dashboard/formateur/apprenants');
  await routeTo(page, '/dashboard/formateur');

  await clickLocator(page, page.locator('a[href="/dashboard/formateur/evaluations"]').first(), 'Lien dashboard evaluations', true);
  await waitForRoute(page, '/dashboard/formateur/evaluations');
  await routeTo(page, '/dashboard/formateur');

  await clickLocator(page, page.locator('a[href="/dashboard/formateur/classes-virtuelles"]').last(), 'Lien dashboard classes virtuelles', true);
  await waitForRoute(page, '/dashboard/formateur/classes-virtuelles');
  await routeTo(page, '/dashboard/formateur');

  await clickLocator(page, page.locator('a[href="/dashboard/formateur/profil-public"]').first(), 'Lien dashboard profil public', true);
  if (new URL(page.url()).pathname === '/dashboard/formateur/profil-public') {
    await routeTo(page, '/dashboard/formateur');
  }

  await clickLocator(page, page.locator('a[href="/dashboard/formateur/revenus"]').first(), 'Lien dashboard revenus', true);
  if (new URL(page.url()).pathname === '/dashboard/formateur/revenus') {
    await routeTo(page, '/dashboard/formateur');
  }
}

async function formateurProfilPublicSmoke(page) {
  const stamp = Date.now();
  const title = `Formatrice smoke ${stamp}`;
  const website = `https://example.com/formateur-smoke-${stamp}`;
  const skill = `Smoke skill ${stamp}`;
  const saveButton = page.getByRole('button', { name: 'Enregistrer', exact: true }).first();

  await saveButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((button) => button.textContent?.trim() === 'Enregistrer' && !button.disabled);
  }, { timeout: 15000 });

  await fillSelector(page, 'input[placeholder*="Formatrice React"]', title);
  await fillSelector(page, 'textarea[placeholder*="Présentez votre expertise"]', 'Profil smoke mis à jour pour valider le formulaire public formateur.');
  await fillSelector(page, 'input[placeholder="https://..."]', website);
  await fillSelector(page, 'input[placeholder="Français"]', 'Français');
  const skillInput = page.locator('input[placeholder="Ajouter une compétence"]').first();
  await clickLocator(page, skillInput, 'Champ compétence');
  await skillInput.fill(skill);
  await clickLocator(page, skillInput.locator('xpath=following-sibling::button[1]'), 'Ajout compétence smoke');
  await page.getByText(skill, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  const languageInput = page.locator('input[placeholder="Ajouter une langue"]').first();
  await clickLocator(page, languageInput, 'Champ langue');
  await languageInput.fill('Wolof');
  await clickLocator(page, languageInput.locator('xpath=following-sibling::button[1]'), 'Ajout langue smoke');
  await page.getByText('Wolof', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await fillSelector(page, 'input[placeholder="Nom du bénéficiaire"]', 'Formateur Smoke QA');
  await fillSelector(page, 'input[placeholder="IBAN / compte bancaire"]', `SN00SMOKE${stamp}`);
  await fillSelector(page, 'input[placeholder="Email PayPal"]', `formateur-smoke-${stamp}@example.com`);
  await clickLocator(page, saveButton, 'Enregistrement profil public smoke');
  await page.getByText('Profil mis à jour', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  await pause(page, 600);

  await clickLocator(page, page.getByRole('link', { name: 'Prévisualiser la page publique', exact: false }), 'Preview profil public');
  await page.waitForURL(/\/formateurs\/[^/]+(?:[?#].*)?$/, { timeout: 15000 });
  await page.getByText('Compétences', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(skill, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await routeTo(page, '/dashboard/formateur/profil-public');
}

async function formateurCoursSmoke(page) {
  const courseName = `Smoke formation ${Date.now()}`;
  const sectionName = `Bloc smoke ${Date.now()}`;
  const lessonName = `Leçon smoke ${Date.now()}`;
  const examTitle = `Quiz smoke ${Date.now()}`;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Mes formations', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await pause(page, 800);

  await fillPlaceholder(page, 'Rechercher une formation...', 'react', true);
  await clickButton('Publies', true)(page);
  await clickButton('Brouillons', true)(page);
  await clickButton('Révision', true)(page);
  await clickButton('Tous', true)(page);
  await fillPlaceholder(page, 'Rechercher une formation...', '');

  await clickButton('Nouvelle formation')(page);
  const wizard = page.locator('div.fixed').filter({ has: page.getByText('Nouvelle formation en 4 étapes', { exact: false }) }).first();
  await wizard.locator('input[placeholder*="Marketing digital avancé"]').fill(courseName);
  await wizard.locator('input[placeholder*="Marketing, Produit"]').fill('Smoke QA');
  await wizard.locator('textarea[placeholder*="Résumez la promesse"]').fill('Formation smoke pour valider le wizard mobile-first de creation de cours.');
  await wizard.locator('input[placeholder*="8h ou 4 semaines"]').fill('8h');
  await wizard.locator('label:has-text("Promotion (%)") + input').fill('10');
  await wizard.locator('label:has-text("Prix (FCFA)") + input').fill('25000');
  await wizard.locator('input[type="url"][placeholder="https://..."]').first().fill(`${FRONT_URL}/images/home/hero.jpg`);
  await wizard.locator('input[placeholder="Titre du chapitre"]').first().fill(sectionName);
  await wizard.locator('input[placeholder="Titre de la leçon"]').first().fill(lessonName);
  await clickLocator(page, wizard.getByRole('button', { name: 'Suivant', exact: true }), 'Passage etape 1 > 2 wizard');
  await wizard.getByText('Uploads et bibliothèque de contenus', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

  await wizard.locator('label:has-text("Type de contenu") + select').selectOption('link');
  await clickLocator(page, wizard.getByRole('button', { name: 'Ajouter une carte contenu', exact: false }), 'Ajout carte contenu wizard');
  const assetTitleInput = wizard.locator('input[placeholder="Titre du contenu"]').first();
  await assetTitleInput.fill(`Guide smoke ${Date.now()}`);
  await wizard.locator('input[placeholder="https://..."]').first().fill(`https://example.com/guide-smoke-${Date.now()}.pdf`);
  await clickLocator(page, wizard.getByRole('button', { name: 'Suivant', exact: true }), 'Passage etape 2 > 3 wizard');
  await wizard.getByText('Éditeur de leçons', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

  await wizard.locator('textarea[placeholder*="Résumé visible dans le programme"]').fill('Résumé smoke rédigé depuis l éditeur de leçon.');
  await wizard.locator('textarea[placeholder*="Rédigez ici le contenu principal"]').fill('## Objectif\n\nValider le parcours de création en plusieurs étapes.');
  await clickLocator(page, wizard.getByRole('button', { name: 'Suivant', exact: true }), 'Passage etape 3 > 4 wizard');
  await wizard.getByText('Quiz et évaluations', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

  await wizard.locator('input[placeholder="Quiz de validation"]').fill(examTitle);
  await wizard.locator('input[type="date"]').first().fill(tomorrow);
  await wizard.locator('input[placeholder="Intitulé de la question"]').first().fill('Quelle est la priorité smoke ?');
  const correctChoiceButton = wizard.locator('button').filter({ hasText: 'Marquer correcte' }).first();
  await clickLocator(page, correctChoiceButton, 'Marquage bonne reponse smoke');
  await wizard.locator('button').filter({ hasText: 'Réponse correcte' }).first().waitFor({ state: 'visible', timeout: 10000 });
  const createCourseButton = wizard.getByRole('button', { name: /Créer la formation/i }).first();
  await createCourseButton.scrollIntoViewIfNeeded().catch(() => {});
  await createCourseButton.waitFor({ state: 'visible', timeout: 10000 });
  await clickLocator(page, createCourseButton, 'Creation formation wizard');
  await wizard.waitFor({ state: 'hidden', timeout: 120000 }).catch(async () => {
    await wizard.waitFor({ state: 'detached', timeout: 120000 });
  });

  try {
    await page.getByText(courseName, { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Mes formations', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(courseName, { exact: true }).first().waitFor({ state: 'visible', timeout: 90000 });
  }

  await fillPlaceholder(page, 'Rechercher une formation...', courseName);
  const courseTitle = page.getByText(courseName, { exact: true }).first();
  let courseCard = courseTitle.locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
  await clickLocator(page, courseCard.getByRole('link', { name: 'Programme', exact: false }), 'Acces programme formation smoke');
  await page.waitForURL(/\/dashboard\/formateur\/mes-cours\/[^/]+\/programme(?:[?#].*)?$/, { timeout: 15000 });
  await page.getByText('Programme de la formation', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(sectionName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(lessonName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  await routeTo(page, '/dashboard/formateur/mes-cours');
  await fillPlaceholder(page, 'Rechercher une formation...', courseName);
  const reviewCourseTitle = page.getByText(courseName, { exact: true }).first();
  courseCard = reviewCourseTitle.locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
  const submitButton = courseCard.getByRole('button', { name: 'Envoyer en révision', exact: false }).first();
  if (await submitButton.count()) {
    await submitButton.click({ force: true });
    await pause(page);
    const workflowModal = page.locator('div.fixed div.bg-white').filter({ has: page.getByText('Envoyer en révision', { exact: true }) }).first();
    await clickLocator(page, workflowModal.getByRole('button', { name: 'Confirmer', exact: false }), 'Confirmation soumission revision formation');
    await workflowModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
      await workflowModal.waitFor({ state: 'detached', timeout: 15000 });
    });
  }

  if (SHARE_REVIEW_COURSE_WITH_ADMIN) {
    moderationCourseTitle = courseName;
  } else {
    await routeTo(page, '/dashboard/formateur/mes-cours');
    await fillPlaceholder(page, 'Rechercher une formation...', courseName);
    const deletionCourseTitle = page.getByText(courseName, { exact: true }).first();
    await deletionCourseTitle.waitFor({ state: 'visible', timeout: 30000 });
    courseCard = deletionCourseTitle.locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
    await clickLocator(page, courseCard.locator('button:has(i.ri-delete-bin-line)'), 'Suppression formation smoke');
    await waitForTextToDisappear(page, courseName);
  }
  await fillPlaceholder(page, 'Rechercher une formation...', '');
}

async function formateurClassesSmoke(page) {
  const className = `Smoke classe ${Date.now()}`;
  const updatedClassName = `${className} MAJ`;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  await clickButton('Programmées', true)(page);
  await clickButton('En direct', true)(page);
  await clickButton('Terminées', true)(page);
  await clickButton('Toutes', true)(page);

  await clickButton('Nouvelle classe')(page);
  const createModal = page.locator('div.fixed div.bg-white').filter({ has: page.getByText('Programmer une classe virtuelle', { exact: true }) }).first();
  await createModal.locator('input[placeholder*="Session Q&A"]').fill(className);
  const courseSelect = createModal.getByLabel('Formation associée', { exact: true });
  if ((await courseSelect.count()) && (await waitForSelectOptionCount(courseSelect, 2)) > 1) {
    await courseSelect.selectOption({ index: 1 });
  }
  await createModal.locator('input[type="date"]').fill(tomorrow);
  await createModal.locator('input[type="time"]').fill('09:30');
  await createModal.locator('label:has-text("Fournisseur live") + select').selectOption('custom');
  await createModal.locator('label:has-text("Durée") + select').selectOption('1h');
  await createModal.locator('label:has-text("Max participants") + input').fill('25');
  await createModal.locator('label:has-text("Lien de la salle") + input').fill(`https://example.com/live/${Date.now()}`);
  await clickLocator(page, createModal.getByRole('button', { name: 'Programmer', exact: true }), 'Creation classe smoke');
  await page.getByText(className, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  let classTitle = page.getByText(className, { exact: true }).first();
  let classCard = classTitle.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await clickLocator(page, classCard.locator('button:has(i.ri-edit-line)'), 'Edition classe smoke');

  const editModal = page.locator('div.fixed div.bg-white').filter({ has: page.getByText('Modifier la classe', { exact: true }) }).first();
  await editModal.locator('label:has-text("Titre") + input').fill(updatedClassName);
  await editModal.locator('label:has-text("Lien de la salle") + input').fill(`https://example.com/live/${Date.now()}-maj`);
  await clickLocator(page, editModal.getByRole('button', { name: 'Enregistrer', exact: true }), 'Sauvegarde classe smoke');
  await page.getByText(updatedClassName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  classTitle = page.getByText(updatedClassName, { exact: true }).first();
  classCard = classTitle.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await clickLocator(page, classCard.getByRole('button', { name: 'Démarrer', exact: false }), 'Demarrage classe smoke');
  await page.getByText(updatedClassName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  classTitle = page.getByText(updatedClassName, { exact: true }).first();
  classCard = classTitle.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await classCard.getByRole('button', { name: 'Rejoindre', exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await clickLocator(page, classCard.getByRole('button', { name: 'Rejoindre', exact: false }), 'Rejoindre classe smoke', true);
  await clickLocator(page, classCard.getByRole('button', { name: 'Terminer', exact: false }), 'Fin classe smoke');
  await pause(page, 500);

  classTitle = page.getByText(updatedClassName, { exact: true }).first();
  classCard = classTitle.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await clickLocator(page, classCard.locator('button:has(i.ri-delete-bin-line)'), 'Suppression classe smoke');
  await waitForTextToDisappear(page, updatedClassName);
}

async function formateurRevenusSmoke(page) {
  const accountCards = page.getByText('Comptes de retrait', { exact: true }).locator('xpath=ancestor::section[1]');
  await accountCards.waitFor({ state: 'visible', timeout: 10000 });

  const defaultButton = page.getByRole('button', { name: 'Définir par défaut', exact: false }).first();
  if (await defaultButton.count()) {
    await clickLocator(page, defaultButton, 'Définition compte par défaut', true);
  }

  const accountSelect = page.locator('section').filter({ has: page.getByText('Demander un retrait', { exact: true }) }).locator('select').first();
  if ((await accountSelect.count()) && (await getSelectOptionCount(accountSelect)) > 1) {
    await accountSelect.selectOption({ index: 1 });
    await pause(page, 300);
    await fillSelector(page, 'input[placeholder="Montant à retirer (FCFA)"]', '1500');
    await fillSelector(page, 'textarea[placeholder*="Note interne"]', 'Retrait smoke formateur.');
    await clickButton('Envoyer la demande')(page);
    return;
  }

  const addAccountSection = page.locator('section').filter({ has: page.getByText('Ajouter un compte', { exact: true }) }).first();
  await addAccountSection.locator('select').first().selectOption('wave');
  await addAccountSection.locator('input[placeholder="Nom du bénéficiaire"]').fill('Formateur Smoke QA');
  await addAccountSection.locator('input[placeholder="IBAN, numéro ou identifiant"]').fill(`WAVE-${Date.now()}`);
  await addAccountSection.locator('input[placeholder="Libellé interne"]').fill(`Compte smoke ${Date.now()}`);
  const accountCheckbox = addAccountSection.locator('input[type="checkbox"]').first();
  if (await accountCheckbox.count()) {
    await accountCheckbox.check({ force: true });
  }
  await clickLocator(page, addAccountSection.getByRole('button', { name: 'Ajouter le compte', exact: false }).first(), 'Ajout compte retrait smoke');
}

async function formateurAnalyticsSmoke(page) {
  await page.getByText('Revenus par mois', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Conversion et complétion par cours', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Engagement apprenants', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Cours les plus regardés', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}

async function formateurCommunauteSmoke(page) {
  await page.getByRole('button', { name: 'Commentaires', exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
  const replyTextarea = page.locator('textarea[placeholder*="Répondre au commentaire"]').first();
  if (await replyTextarea.count()) {
    await replyTextarea.fill(`Réponse smoke ${Date.now()}`);
    await pause(page);
    await clickLocator(page, replyTextarea.locator('xpath=ancestor::div[contains(@class,"space-y-3")][1]').getByRole('button', { name: 'Répondre', exact: false }).first(), 'Réponse commentaire smoke', true);
  }

  await clickButton('FAQ')(page);
  const faqCreateSection = page.locator('section, div').filter({ has: page.getByText('Nouvelle FAQ', { exact: true }) }).first();
  const faqCourseSelect = faqCreateSection.locator('select').first();
  if ((await faqCourseSelect.count()) && (await waitForSelectOptionCount(faqCourseSelect, 2)) > 1) {
    await faqCourseSelect.selectOption({ index: 1 }).catch(() => {});
  }
  await faqCreateSection.locator('input[placeholder="Question fréquente"]').fill(`Question smoke ${Date.now()}`);
  await faqCreateSection.locator('textarea[placeholder="Réponse formateur"]').fill('Réponse smoke sur la FAQ formateur.');
  await clickLocator(page, faqCreateSection.getByRole('button', { name: 'Ajouter la FAQ', exact: false }).first(), 'Ajout FAQ smoke');
}

async function formateurApprenantsSmoke(page) {
  await fillPlaceholder(page, 'Rechercher un apprenant ou une formation...', 'apprenant', true);
  const courseFilter = page.locator('select[aria-label="Filtrer par formation"]');
  if ((await courseFilter.count()) && (await getSelectOptionCount(courseFilter)) > 1) {
    await courseFilter.selectOption({ index: 1 });
    await pause(page, 300);
    await courseFilter.selectOption('all');
  }
  const attentionFilter = page.locator('select[aria-label="Filtrer par attention"]');
  if (await attentionFilter.count()) {
    await attentionFilter.selectOption('at_risk');
    await pause(page, 300);
    await attentionFilter.selectOption('all');
  }
  await clickButton('Actifs', true)(page);
  await clickButton('Inactifs', true)(page);
  await clickButton('Terminés', true)(page);
  await clickButton('Tous', true)(page);
  await fillPlaceholder(page, 'Rechercher un apprenant ou une formation...', '');

  const firstRow = page.locator('tbody tr').first();
  await firstRow.waitFor({ state: 'visible', timeout: 15000 });
  await clickLocator(page, firstRow.locator('button:has(i.ri-eye-line)'), 'Details apprenant smoke');
  await page.getByText('Parcours sur vos formations', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
  const programmeLink = page.getByRole('link', { name: 'Voir le programme', exact: false }).first();
  if (await programmeLink.count()) {
    await programmeLink.click({ force: true });
    await page.waitForURL(/\/dashboard\/formateur\/mes-cours\/[^/]+\/programme(?:[?#].*)?$/, { timeout: 15000 });
    await routeTo(page, '/dashboard/formateur/apprenants');
  } else {
    await clickLocator(page, page.locator('button[aria-label="Fermer le détail"]').first(), 'Fermeture détail apprenant');
  }

  const refreshedFirstRow = page.locator('tbody tr').first();
  await refreshedFirstRow.waitFor({ state: 'visible', timeout: 15000 });
  await clickLocator(page, refreshedFirstRow.locator('button:has(i.ri-message-3-line)'), 'Message apprenant smoke');
  await waitForRoute(page, '/dashboard/messages');
  await page.locator('textarea[placeholder*="Écrivez votre message"]').first().waitFor({ state: 'visible', timeout: 10000 });
  await routeTo(page, '/dashboard/formateur/apprenants');
}

async function formateurEvaluationsSmoke(page) {
  const examName = `Smoke examen ${Date.now()}`;
  const questionPrompt = `Question smoke ${Date.now()}`;

  await clickButton('Soumissions à corriger', true)(page);
  const gradeButton = page.getByRole('button', { name: /Corriger|Modifier/i }).first();
  if (await gradeButton.count()) {
    await gradeButton.click({ force: true });
    await pause(page);
    await fillPlaceholder(page, 'Ex: 16.5', '15.5', true);
    await fillPlaceholder(page, "Ajoutez un commentaire pour l'apprenant...", 'Correction smoke formateur.', true);
    await clickButton('Attribuer la note', true)(page);
  }

  await clickButton('Mes examens', true)(page);
  await clickButton('Nouvel examen')(page);
  const createModal = page.locator('div.fixed div.bg-white').filter({ has: page.getByText('Nouvel examen', { exact: true }) }).first();
  await createModal.locator('input[placeholder*="Quiz React"]').fill(examName);
  const courseSelect = createModal.locator('label:has-text("Formation associée") + select');
  if ((await courseSelect.count()) && (await waitForSelectOptionCount(courseSelect, 2)) > 1) {
    await courseSelect.selectOption({ index: 1 });
  }
  await createModal.locator('select').nth(1).selectOption('quiz');
  await createModal.locator('input[type="date"]').fill(new Date(Date.now() + 172_800_000).toISOString().slice(0, 10));
  await createModal.locator('input[type="number"]').nth(0).fill('8');
  await createModal.locator('input[type="number"]').nth(1).fill('20');
  await createModal.locator('select').nth(2).selectOption('upcoming');
  await clickLocator(page, createModal.getByRole('button', { name: 'Créer', exact: true }), 'Creation examen smoke');
  await page.getByText(examName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  const examRow = page.getByText(examName, { exact: true }).first().locator('xpath=ancestor::tr[1]');
  await clickLocator(page, examRow.locator('button[title="Configurer le quiz"]').first(), 'Configuration quiz smoke');
  const quizModal = page.getByText('Configuration du quiz', { exact: true }).locator('xpath=ancestor::div[contains(@class,"bg-white")][1]');
  await quizModal.locator('textarea[placeholder*="Quel indicateur"]').fill(questionPrompt);
  await quizModal.locator('select').first().selectOption('true_false');
  await clickLocator(page, quizModal.getByRole('button', { name: 'Ajouter la question', exact: true }), 'Ajout question quiz smoke');
  const questionCard = quizModal.locator('div.bg-white.border.border-gray-200.rounded-2xl.p-5.shadow-sm').first();
  await questionCard.waitFor({ state: 'visible', timeout: 15000 });
  const correctCheckbox = questionCard.locator('label:has-text("Bonne réponse") input[type="checkbox"]').first();
  if (await correctCheckbox.count()) {
    await correctCheckbox.check({ force: true });
  }
  await clickLocator(page, questionCard.getByRole('button', { name: 'Enregistrer', exact: true }).first(), 'Sauvegarde question smoke');
  await clickLocator(page, quizModal.locator('button:has(i.ri-close-line)').first(), 'Fermeture quiz smoke');
  await quizModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
    await quizModal.waitFor({ state: 'detached', timeout: 15000 });
  });
  await pause(page, 400);
  const refreshedExamRow = page.getByText(examName, { exact: true }).first().locator('xpath=ancestor::tr[1]');
  await clickLocator(page, refreshedExamRow.locator("button[title=\"Supprimer l'examen\"]").first(), 'Suppression examen smoke');
  await waitForTextToDisappear(page, examName);
}

async function apprenantExamensSmoke(page) {
  const quizTitle = 'Quiz acquisition S1';
  const quizCard = page.getByText(quizTitle, { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"px-6")][1]');
  if (!(await quizCard.count())) {
    return;
  }

  const submitButton = quizCard.getByRole('button', { name: 'Soumettre ma réponse', exact: true });
  if (!(await submitButton.count()) || !(await submitButton.isVisible().catch(() => false))) {
    return;
  }

  await clickLocator(page, submitButton, 'Soumission quiz apprenant');
  const submitModal = page.getByText(`Soumettre : ${quizTitle}`, { exact: true }).locator('xpath=ancestor::div[contains(@class,"bg-white")][1]');
  await submitModal.getByText('Quel indicateur mesure le cout d acquisition par client ?', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await submitModal.getByLabel('CPA', { exact: true }).check({ force: true });
  await submitModal.getByLabel('Clarifier la proposition de valeur', { exact: true }).check({ force: true });
  await submitModal.getByLabel('Reduire le nombre de champs obligatoires', { exact: true }).check({ force: true });
  await clickLocator(page, submitModal.getByRole('button', { name: 'Soumettre', exact: true }), 'Validation quiz apprenant');
  await page.getByText('Soumis - en attente de correction', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}

async function apprenantProgressionSmoke(page) {
  await clickButton('Configurer mes objectifs')(page);
  await fillPlaceholder(page, 'Ex: 250', '320');
  await fillPlaceholder(page, 'Ex: 7', '10');
  await fillPlaceholder(page, 'Ex: Reprendre mes cours React avant vendredi', 'Finaliser mes cours React cette semaine.');
  await clickButton('Enregistrer')(page);

  const focusButton = page.locator('button[aria-label^="Voir le détail de"]').first();
  if (await focusButton.count()) {
    await clickLocator(page, focusButton, 'Detail compétence apprenant');
    await page.getByText('Progression moyenne', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
    await clickLocator(page, page.locator('button[aria-label="Fermer le détail de la compétence"]').first(), 'Fermeture détail compétence');
  }
}

async function formateurCertificatsSmoke(page) {
  await clickButton('Prêts', true)(page);
  await clickButton('Délivrés', true)(page);
  await clickButton('En attente', true)(page);
  await clickButton('Tous', true)(page);

  await clickTitle('Aperçu', true)(page);
  const previewModal = page.getByText('CERTIFICAT DE RÉUSSITE', { exact: true }).locator('xpath=ancestor::div[contains(@class,"bg-white")][1]');
  if (await previewModal.count()) {
    await clickButton('Télécharger PDF', true)(page);
    await clickButton('Délivrer le certificat', true)(page);
    await clickButton('Fermer', true)(page);
  }

  await clickTitle('Télécharger', true)(page);
}

async function adminUsersSmoke(page) {
  await clickButton('Exporter')(page);
  await fillPlaceholder(page, 'Rechercher un utilisateur...', 'client', true);
  const filtersSection = page.locator('section').filter({ has: page.getByText('Filtres utilisateurs', { exact: true }) }).first();
  const roleSelect = filtersSection.locator('select').nth(0);
  const statusSelect = filtersSection.locator('select').nth(1);
  if (await roleSelect.count()) {
    await roleSelect.selectOption('client');
    await pause(page, 300);
  }
  await clickButton('Actifs', true)(page);
  await clickButton('Tous', true)(page);
  await fillPlaceholder(page, 'Rechercher un utilisateur...', 'formateur@c2p.sn', true);
  if (await roleSelect.count()) {
    await roleSelect.selectOption('formateur');
    await pause(page, 300);
  }
  const trainerRow = page.getByText('formateur@c2p.sn', { exact: true }).first().locator('xpath=ancestor::tr[1]');
  if (await trainerRow.count()) {
    const toggleButton = trainerRow.getByRole('button', { name: /Vérifier|Retirer le badge/i }).first();
    if (await toggleButton.count()) {
      const initialLabel = (await toggleButton.textContent())?.trim() || '';
      await clickLocator(page, toggleButton, 'Toggle badge expert formateur');
      await pause(page, 400);
      const reverseLabel = initialLabel.includes('Retirer') ? 'Vérifier' : 'Retirer le badge';
      await clickLocator(page, trainerRow.getByRole('button', { name: reverseLabel, exact: false }).first(), 'Restauration badge expert formateur', true);
    }
  }
  await fillPlaceholder(page, 'Rechercher un utilisateur...', '', true);
  if (await roleSelect.count()) {
    await roleSelect.selectOption('all');
    await pause(page, 300);
  }
  if (await statusSelect.count()) {
    await statusSelect.selectOption('all');
    await pause(page, 300);
  }
}

async function adminContentSmoke(page) {
  await clickButton('Exporter les données')(page);
  await clickButton('Brouillons', true)(page);
  await clickButton('En attente', true)(page);
  await clickButton('Publies', true)(page);
  await clickButton('Tous', true)(page);
  await clickButton('Archives', true)(page);

  if (moderationCourseTitle) {
    await clickButton('En attente', true)(page);
    const reviewRow = page.getByText(moderationCourseTitle, { exact: true }).first().locator('xpath=ancestor::tr[1]');
    await clickLocator(page, reviewRow.locator('button[title="Publier"]').first(), 'Publication admin formation en revision');
    await pause(page, 400);
    moderationCourseTitle = null;
    await clickButton('Publies', true)(page);
  }

  await clickTitle('Voir', true)(page);
  await clickButton('Fermer', true)(page);
}

async function adminPaymentsSmoke(page) {
  await clickButton('Exporter le rapport')(page);
  await clickButton('En attente', true)(page);
  await clickButton('Echouees', true)(page);
  await clickButton('Toutes', true)(page);
  await clickButton('Details', true)(page);
  await clickButton('Fermer', true)(page);
}

async function adminSecuritySmoke(page) {
  await clickButton('Actualiser', true)(page);
  await clickButton('Utilisateurs', true)(page);
  await clickButton('Journaux', true)(page);
  await clickButton('Exporter', true)(page);
  await clickButton('Sauvegardes', true)(page);
  await clickButton('Creer une sauvegarde maintenant', true)(page);
  await clickButton('Parametres', true)(page);
  const securityCheckbox = page.locator('input[type="checkbox"]').first();
  if (await securityCheckbox.count()) {
    await securityCheckbox.click({ force: true });
    await pause(page);
    await securityCheckbox.click({ force: true });
    await pause(page);
  }
}

async function adminMessagesSmoke(page) {
  await clickButton('Formulaire public', true)(page);
  await clickButton('Marquer traite', true)(page);
  await clickButton('Inbox interne', true)(page);

  const conversationPanel = page
    .locator('input[placeholder*="Rechercher une conversation"]')
    .locator('xpath=ancestor::aside[1]');
  const conversationButton = conversationPanel.locator('button').first();
  if (await conversationButton.count()) {
    await conversationButton.click({ force: true });
    await pause(page, 400);
  }

  const replyArea = page.locator('textarea[placeholder*="Repondre"]').first();
  if (await replyArea.count()) {
    await replyArea.fill('Reponse smoke admin support');
    await pause(page);
    await clickButton('Repondre', true)(page);
  }
}

async function adminNotificationsSmoke(page) {
  await clickButton('message', true)(page);
  await clickButton('system', true)(page);
  await clickButton('Toutes', true)(page);
  await clickButton('Tout marquer comme lu', true)(page);
  await clickButton('Marquer comme lu', true)(page);
}

async function adminCommunicationsSmoke(page) {
  await clickButton('Brouillons', true)(page);
  await clickButton('Planifiees', true)(page);
  await clickButton('Envoyees', true)(page);
  await clickButton('Toutes', true)(page);
  await clickButton('Apercu', true)(page);
  await clickButton('Fermer', true)(page);
  await clickButton('Nouvelle campagne')(page);
  await fillPlaceholder(page, 'Titre de la campagne', `Smoke campagne ${Date.now()}`);
  await fillPlaceholder(page, 'Redigez votre message ici...', 'Message smoke de campagne admin.');
  await clickButton('Envoyer maintenant')(page);
}

async function adminSettingsSmoke(page) {
  await clickButton('Exporter config')(page);

  const categoryName = `Smoke categorie ${Date.now()}`;
  await clickButton('Ajouter une categorie', true)(page);
  await fillPlaceholder(page, 'Ex: Menuiserie', categoryName, true);
  await clickButton('Creer', true)(page);

  const categoryHeading = page.getByText(categoryName, { exact: true }).first();
  if (await categoryHeading.count()) {
    const categoryCard = categoryHeading.locator('xpath=ancestor::div[contains(@class,"bg-white")][1]');
    const toggle = categoryCard.locator('button').first();
    if (await toggle.count()) {
      await toggle.click({ force: true });
      await pause(page);
    }
    const deleteButton = categoryCard.locator('[title="Supprimer"]').first();
    if (await deleteButton.count()) {
      await deleteButton.click({ force: true });
      await pause(page);
    }
  }

  await clickButton('Regles & Commissions', true)(page);
  const editButton = page.locator('button').filter({ has: page.locator('i.ri-edit-line') }).first();
  if (await editButton.count()) {
    await editButton.click({ force: true });
    await pause(page);
    const confirmButton = page.locator('button').filter({ has: page.locator('i.ri-check-line') }).first();
    if (await confirmButton.count()) {
      await confirmButton.click({ force: true });
      await pause(page);
    }
  }

  await clickButton('Integrations', true)(page);
  await clickButton('Synchroniser', true)(page);
  const integrationButton = page.getByRole('button', { name: /Connecter|Deconnecter/i }).first();
  if (await integrationButton.count()) {
    const before = ((await integrationButton.innerText()) || '').trim();
    await integrationButton.click({ force: true });
    await pause(page, 500);
    const restoreName = before === 'Connecter' ? 'Deconnecter' : 'Connecter';
    const restoreButton = page.getByRole('button', { name: restoreName, exact: false }).first();
    if (await restoreButton.count()) {
      await restoreButton.click({ force: true });
      await pause(page, 500);
    }
  }
}

async function runSuite(browser, suite) {
  const context = await browser.newContext({ acceptDownloads: true });
  const errors = [];
  let mainPage = null;

  await context.addInitScript(() => {
    window.confirm = () => true;
  });

  if (suite.setup) {
    await suite.setup(context.request);
  }
  await authenticateUser(context.request, suite.email);

  context.on('page', async (page) => {
    attachDiagnostics(page, errors);
    if (mainPage && page !== mainPage) {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      } catch {
        // ignore preview tabs
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
      const snippet = (await page.locator('body').innerText().catch(() => '')).slice(0, 2200);
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
  const activeSuites = SUITE_FILTER.size
    ? suites.filter((suite) => SUITE_FILTER.has(suite.name))
    : suites;

  try {
    if (activeSuites.length === 0) {
      throw new Error(`Aucune suite smoke ne correspond a: ${Array.from(SUITE_FILTER).join(', ')}`);
    }

    for (const suite of activeSuites) {
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
