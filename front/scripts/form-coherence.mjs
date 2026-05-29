import { chromium } from 'playwright';

const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3003/api';
const ADMIN_EMAIL = process.env.C2P_ADMIN_EMAIL ?? 'admin@c2p.sn';
const ADMIN_PASSWORD = process.env.C2P_PASSWORD ?? ['password', '123'].join('');
const ALLOW_MUTATIONS = process.env.C2P_E2E_ALLOW_MUTATIONS === 'true';

const failures = [];
const apiErrors = [];
const pageErrors = [];

function isLoopbackUrl(value) {
  const { hostname } = new URL(value);
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function assertMutationSafety() {
  if (isLoopbackUrl(FRONT_URL) && isLoopbackUrl(API_URL)) return;
  if (ALLOW_MUTATIONS) return;
  throw new Error(
    'form-coherence refuse les mutations hors local sans C2P_E2E_ALLOW_MUTATIONS=true.',
  );
}

function record(step, error) {
  failures.push({
    step,
    message: error instanceof Error ? error.message : String(error),
  });
}

async function login(page) {
  await page.goto(`${FRONT_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\/dashboard|\/dashboard|\/superadmin/, { timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: /^Se connecter$/ }).click(),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
}

async function expectVisible(locator, step) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  } catch (error) {
    record(step, error);
  }
}

async function testAdminCategory(page) {
  const categoryName = `QA categorie ${Date.now()}`;
  await page.goto(`${FRONT_URL}/admin/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  await expectVisible(page.getByRole('heading', { name: /Parametrage de la plateforme/i }), 'admin-settings-loaded');
  await page.getByRole('button', { name: /Ajouter une categorie/i }).click();
  await page.locator('#admin-category-name').fill(categoryName);
  await page.locator('#admin-category-type').selectOption('formation');
  await page.getByRole('button', { name: /^Creer$/i }).click();

  await expectVisible(page.getByRole('heading', { name: categoryName, exact: true }), 'created-category-visible');
  await expectVisible(page.getByText('Formation', { exact: true }).first(), 'created-category-type-visible');

  const card = page.getByRole('heading', { name: categoryName, exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await card.getByRole('button', { name: new RegExp(`Desactiver la categorie ${categoryName}`) }).click();
  await expectVisible(card.getByText('Desactivee', { exact: true }), 'category-toggle-displayed');
  await card.getByRole('button', { name: new RegExp(`Supprimer la categorie ${categoryName}`) }).click();
  await page.waitForTimeout(1500);

  const remaining = await page.getByRole('heading', { name: categoryName, exact: true }).count();
  if (remaining !== 0) record('category-deleted-from-display', `category still visible ${remaining} time(s)`);
}

async function testAdminCampaign(page) {
  const title = `QA campagne ${Date.now()}`;
  const content = `Message de test QA ${new Date().toISOString()}`;

  await page.goto(`${FRONT_URL}/admin/communications`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  await expectVisible(page.getByRole('heading', { name: /^Communications$/i }), 'admin-communications-loaded');
  await page.getByRole('button', { name: /Nouvelle campagne/i }).click();
  await page.locator('#admin-campaign-title').fill(title);
  await page.locator('#admin-campaign-channel').selectOption('email');
  await page.locator('#admin-campaign-target').selectOption('active_clients');
  await page.locator('#admin-campaign-content').fill(content);
  await page.locator('#admin-campaign-schedule-toggle').check();
  await page.locator('#admin-campaign-schedule-date').fill('2026-12-31T09:30');
  await page.getByRole('button', { name: /^Planifier$/i }).click();

  await expectVisible(page.getByText(title, { exact: true }), 'scheduled-campaign-visible');
  await expectVisible(page.getByText(/Planifiee le 2026-12-31T09:30/i), 'scheduled-date-visible');

  const card = page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await card.getByRole('button', { name: /^Apercu$/i }).click();
  const previewDialog = page.getByRole('dialog', { name: /Apercu de la campagne/i });
  await expectVisible(previewDialog.getByText(content, { exact: true }), 'campaign-preview-content-visible');
  await page.getByRole('button', { name: /^Fermer$/i }).click();
  await card.getByRole('button', { name: new RegExp(`Supprimer la campagne ${title}`) }).click();
  await page.waitForTimeout(1500);

  const remaining = await page.getByRole('heading', { name: title, exact: true }).count();
  if (remaining !== 0) record('campaign-deleted-from-display', `campaign still visible ${remaining} time(s)`);
}

async function main() {
  assertMutationSafety();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && url.includes('/api/') && !url.includes('/monitoring/')) {
      apiErrors.push({ status: response.status(), url });
    }
  });

  try {
    await login(page);
    await testAdminCategory(page);
    await testAdminCampaign(page);
  } catch (error) {
    record('fatal', error);
  } finally {
    await browser.close();
  }

  const result = { failures, apiErrors, pageErrors };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length || apiErrors.length || pageErrors.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
