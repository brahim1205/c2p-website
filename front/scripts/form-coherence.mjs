import { chromium } from 'playwright';

const FRONT_URL = process.env.FRONT_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3003/api';
const ADMIN_EMAIL = process.env.C2P_ADMIN_EMAIL ?? 'admin@c2p.sn';
const FORMATEUR_EMAIL = process.env.C2P_FORMATEUR_EMAIL ?? 'formateur@c2p.sn';
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

async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(`${FRONT_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
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

async function cleanupFormateurCourse(page, title) {
  await page.evaluate(async ({ apiUrl, courseTitle }) => {
    const csrf = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('c2p_csrf='))
      ?.slice('c2p_csrf='.length);
    const headers = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    };
    const coursesResponse = await fetch(`${apiUrl}/learning/formateur/courses`, {
      credentials: 'include',
      headers,
    });
    if (!coursesResponse.ok) return;
    const courses = await coursesResponse.json();
    const created = Array.isArray(courses)
      ? courses.filter((course) => String(course.title) === courseTitle)
      : [];
    await Promise.all(created.map((course) => fetch(`${apiUrl}/learning/formateur/courses/${encodeURIComponent(String(course.id))}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    })));
  }, { apiUrl: API_URL, courseTitle: title });
}

async function fetchFormateurCourseByTitle(page, title) {
  return page.evaluate(async ({ apiUrl, courseTitle }) => {
    const response = await fetch(`${apiUrl}/learning/formateur/courses`, {
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) throw new Error(`courses fetch failed ${response.status}`);
    const courses = await response.json();
    return Array.isArray(courses)
      ? courses.find((course) => String(course.title) === courseTitle) ?? null
      : null;
  }, { apiUrl: API_URL, courseTitle: title });
}

async function fetchFormateurCourseProgram(page, courseId) {
  return page.evaluate(async ({ apiUrl, id }) => {
    const response = await fetch(`${apiUrl}/learning/formateur/courses/${encodeURIComponent(String(id))}/program`, {
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) throw new Error(`course program fetch failed ${response.status}`);
    return response.json();
  }, { apiUrl: API_URL, id: courseId });
}

async function testFormateurCourseCreation(page) {
  const title = `QA formation ${Date.now()}`;
  const updatedSectionTitle = `Partie QA modifiee ${Date.now()}`;
  const updatedLessonTitle = `Lecon QA modifiee ${Date.now()}`;
  await page.goto(`${FRONT_URL}/dashboard/formateur/mes-cours`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  await expectVisible(page.getByRole('heading', { name: /Mes formations/i }), 'formateur-courses-loaded');
  await page.getByRole('button', { name: /Nouvelle formation/i }).click();
  await expectVisible(page.getByRole('heading', { name: /Nouvelle formation en 5/i }), 'course-wizard-open');
  await page.waitForTimeout(1200);

  await page.getByPlaceholder(/Marketing digital/i).fill(title);
  await page.getByPlaceholder(/Marketing, Produit/i).fill('QA SaaS');
  await page.getByPlaceholder(/promesse de la formation/i).fill('Formation creee par le smoke test formulaire.');
  await page.locator('input[type="number"]').nth(1).fill('1000');

  await page.getByRole('button', { name: /^Suivant$/ }).click();
  await expectVisible(page.getByRole('heading', { name: /Structure du programme/i }), 'course-program-step-visible');
  await page.locator('input[placeholder="Titre de la partie"]').first().fill('Partie QA');
  await page.locator('input[placeholder="Titre de la leçon"]').first().fill('Lecon QA');
  await page.getByRole('button', { name: /^Suivant$/ }).click();
  await page.getByRole('button', { name: /^Suivant$/ }).click();
  await page.getByRole('button', { name: /^Suivant$/ }).click();
  await page.getByRole('button', { name: /^Créer la formation$/ }).click();

  await expectVisible(page.getByText(title, { exact: true }), 'created-course-visible');
  const createdCourse = await fetchFormateurCourseByTitle(page, title);
  if (!createdCourse?.id) {
    record('created-course-api-visible', 'created course was not returned by formateur courses API');
    await cleanupFormateurCourse(page, title);
    return;
  }

  await page.goto(`${FRONT_URL}/dashboard/formateur/mes-cours/${encodeURIComponent(String(createdCourse.id))}/programme`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  await expectVisible(page.getByRole('heading', { name: /Programme de la formation/i }), 'course-program-page-loaded');
  await expectVisible(page.getByText('Partie QA', { exact: true }), 'course-program-section-visible');
  await expectVisible(page.getByText('Lecon QA', { exact: true }), 'course-program-lesson-visible');

  await page.getByRole('button', { name: /^Modifier la section Partie QA$/ }).click();
  await expectVisible(page.getByRole('heading', { name: /^Modifier la section$/ }), 'course-section-edit-modal-visible');
  await page.getByPlaceholder(/Fondamentaux/i).fill(updatedSectionTitle);
  await page.getByPlaceholder(/Objectif pédagogique/i).fill('Section modifiee par le smoke test formulaire.');
  await page.getByRole('button', { name: /^Enregistrer$/ }).click();
  await expectVisible(page.getByText(updatedSectionTitle, { exact: true }), 'updated-section-visible');

  await page.getByRole('button', { name: /^Modifier la leçon Lecon QA$/ }).click();
  await expectVisible(page.getByRole('heading', { name: /^Modifier la leçon$/ }), 'course-lesson-edit-modal-visible');
  await page.getByPlaceholder(/Introduction vidéo/i).fill(updatedLessonTitle);
  await page.getByPlaceholder(/12 min/i).fill('15 min');
  await page.getByPlaceholder(/Résumé de la leçon/i).fill('Lecon modifiee par le smoke test formulaire.');
  await page.getByRole('button', { name: /^Enregistrer$/ }).click();
  await expectVisible(page.getByText(updatedLessonTitle, { exact: true }), 'updated-lesson-visible');

  const program = await fetchFormateurCourseProgram(page, createdCourse.id);
  if (!program?.sections?.some((section) => String(section.title) === updatedSectionTitle)) {
    record('updated-section-api-visible', 'updated section was not returned by formateur program API');
  }
  if (!program?.lessons?.some((lesson) => String(lesson.title) === updatedLessonTitle && String(lesson.duration) === '15 min')) {
    record('updated-lesson-api-visible', 'updated lesson was not returned by formateur program API');
  }

  await cleanupFormateurCourse(page, title);
  await page.goto(`${FRONT_URL}/dashboard/formateur/mes-cours`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  const remaining = await page.getByText(title, { exact: true }).count();
  if (remaining !== 0) record('created-course-cleaned', `course still visible ${remaining} time(s)`);
}

async function main() {
  assertMutationSafety();

  const browser = await chromium.launch({ headless: true });
  const attachWatchers = (page) => {
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && url.includes('/api/') && !url.includes('/monitoring/')) {
      apiErrors.push({ status: response.status(), url });
    }
  });
  };

  try {
    const adminPage = await browser.newPage();
    attachWatchers(adminPage);
    await login(adminPage);
    await testAdminCategory(adminPage);
    await testAdminCampaign(adminPage);
    await adminPage.close();

    const formateurPage = await browser.newPage();
    attachWatchers(formateurPage);
    await login(formateurPage, FORMATEUR_EMAIL);
    await testFormateurCourseCreation(formateurPage);
    await formateurPage.close();
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
