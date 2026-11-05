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
  await expectVisible(page.getByText(/Planifi[ée]e le 2026-12-31T09:30/i), 'scheduled-date-visible');

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

// The UI updates optimistically: poll the API for a few seconds instead of reading it once,
// otherwise the check races the write that the UI has just triggered.
async function pollUntil(read, accept, { timeoutMs = 8000, intervalMs = 400 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!accept(value) && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, intervalMs));
    value = await read();
  }
  return value;
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

async function blurField(locator, value) {
  await locator.fill(value);
  await locator.blur();
}

// Udemy-style flow: 3-step quick start, then the course studio (autosave everywhere).
async function testFormateurCourseCreation(page) {
  const title = `QA formation ${Date.now()}`;
  await page.goto(`${FRONT_URL}/dashboard/formateur/mes-cours`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  await expectVisible(page.getByRole('heading', { name: /Mes formations/i }), 'formateur-courses-loaded');
  await page.getByRole('button', { name: /Nouvelle formation/i }).click();
  await expectVisible(page.getByRole('heading', { name: /Quel type de cours/i }), 'quick-start-open');
  await page.getByRole('button', { name: /Cours en ligne/i }).click();
  await page.getByRole('button', { name: /^Continuer$/ }).click();
  await page.getByLabel(/Titre provisoire du cours/i).fill(title);
  await page.getByRole('button', { name: /^Continuer$/ }).click();
  await page.getByRole('button', { name: /^Informatique$/ }).click();
  await page.getByRole('button', { name: /^Créer le cours$/ }).click();
  await page.waitForURL(/\/gerer\/objectifs$/, { timeout: 15000 }).catch((error) => record('studio-opened', error));

  const createdCourse = await pollUntil(() => fetchFormateurCourseByTitle(page, title), (course) => Boolean(course?.id));
  if (!createdCourse?.id) {
    record('created-course-api-visible', 'created course was not returned by formateur courses API');
    await cleanupFormateurCourse(page, title);
    return;
  }
  const readProgram = () => fetchFormateurCourseProgram(page, createdCourse.id);

  // Intended learners.
  await expectVisible(page.getByRole('heading', { name: /^Apprenants cibles$/ }), 'studio-learners-panel');
  await blurField(page.getByLabel(/Que vont apprendre les apprenants dans votre cours \? 1/), 'Objectif QA');
  let program = await pollUntil(readProgram, (snapshot) => snapshot?.course?.objectives?.includes('Objectif QA'));
  if (!program?.course?.objectives?.includes('Objectif QA')) record('objectives-saved', 'objective not persisted');

  // Curriculum: section, lesson, content, then move it into a second section with the arrows.
  await page.getByRole('link', { name: /Programme/ }).first().click();
  await page.getByRole('button', { name: /^Ajouter une section$/ }).click();
  await page.locator('#studio-new-section').fill('Partie QA');
  await page.getByRole('button', { name: /^Ajouter la section$/ }).click();
  await expectVisible(page.getByRole('heading', { name: /Section 1 : Partie QA/ }), 'section-visible');
  await page.getByRole('button', { name: /Élément du programme/ }).click();
  await page.getByRole('button', { name: /^Article/ }).click();
  await page.getByPlaceholder(/Titre de la leçon/).fill('Lecon QA');
  await page.getByRole('button', { name: /^Ajouter la leçon$/ }).click();
  await expectVisible(page.getByRole('button', { name: /Leçon 1 : Lecon QA/ }), 'lesson-visible');
  await page.getByRole('button', { name: /^Modifier le contenu$/ }).click();
  await blurField(page.getByLabel(/^Durée estimée$/), '15 min');
  await blurField(page.getByLabel(/^Contenu de l'article$/), 'Contenu QA');
  await page.getByRole('button', { name: /^Section$/ }).click();
  await page.locator('#studio-new-section').fill('Partie QA 2');
  await page.getByRole('button', { name: /^Ajouter la section$/ }).click();
  await expectVisible(page.getByRole('heading', { name: /Section 2 : Partie QA 2/ }), 'second-section-visible');
  await page.getByRole('button', { name: /^Descendre$/ }).first().click();
  program = await pollUntil(readProgram, (snapshot) => {
    const second = snapshot?.sections?.find((section) => section.title === 'Partie QA 2');
    const lesson = snapshot?.lessons?.find((entry) => entry.title === 'Lecon QA');
    return Boolean(second && lesson && String(lesson.section_id) === String(second.id) && lesson.content === 'Contenu QA');
  });
  const movedLesson = program?.lessons?.find((entry) => entry.title === 'Lecon QA');
  const secondSection = program?.sections?.find((section) => section.title === 'Partie QA 2');
  if (!movedLesson || String(movedLesson.section_id) !== String(secondSection?.id)) record('lesson-moved', `lesson = ${JSON.stringify(movedLesson)}`);
  if (movedLesson?.duration !== '15 min' || movedLesson?.content !== 'Contenu QA') record('lesson-content-saved', `lesson = ${JSON.stringify(movedLesson)}`);
  program = await pollUntil(readProgram, (snapshot) => snapshot?.course?.duration === '15 min');
  if (program?.course?.duration !== '15 min') record('course-duration-auto', `duration = ${program?.course?.duration}`);

  // Landing page and pricing.
  await page.getByRole('link', { name: /Page d'accueil du cours/ }).first().click();
  await blurField(page.getByLabel(/^Sous-titre du cours$/), 'Sous-titre QA');
  await page.getByRole('link', { name: /Tarifs et certificat/ }).first().click();
  await page.getByRole('button', { name: /^Gratuit/ }).click();
  program = await pollUntil(readProgram, (snapshot) => snapshot?.course?.subtitle === 'Sous-titre QA' && snapshot?.course?.is_free === true);
  if (program?.course?.subtitle !== 'Sous-titre QA') record('subtitle-saved', `subtitle = ${program?.course?.subtitle}`);
  if (program?.course?.is_free !== true) record('pricing-saved', `is_free = ${program?.course?.is_free}`);

  // Submission checklist: the cover image is still missing, so the dialog must block.
  await page.getByRole('button', { name: /^Soumettre/ }).click();
  await expectVisible(page.getByRole('heading', { name: /Encore quelques étapes/ }), 'submit-checklist-blocks');
  await expectVisible(page.getByRole('dialog').getByText('Une image de cours'), 'submit-checklist-lists-missing-image');

  await cleanupFormateurCourse(page, title);
  await page.goto(`${FRONT_URL}/dashboard/formateur/mes-cours`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  const remaining = await page.getByText(title, { exact: true }).count();
  if (remaining !== 0) record('created-course-cleaned', `course still visible ${remaining} time(s)`);
}

// Udemy-style communication / performance pages: they load and the grouped menu points to them.
async function testFormateurCommunicationPages(page) {
  await page.goto(`${FRONT_URL}/dashboard/formateur/avis`, { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByRole('heading', { name: /^Avis des apprenants$/ }), 'formateur-reviews-page');
  const navLink = page.locator('aside a[href="/dashboard/formateur/annonces"]').first();
  await expectVisible(navLink, 'formateur-nav-announcements');
  await navLink.click();
  await expectVisible(page.getByRole('heading', { name: /^Nouvelle annonce$/ }), 'formateur-announcements-page');
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
    await testFormateurCommunicationPages(formateurPage);
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
