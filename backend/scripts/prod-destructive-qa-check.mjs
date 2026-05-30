const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
const ADMIN_EMAIL = process.env.C2P_ADMIN_EMAIL || 'admin@c2p.sn';
const ADMIN_PASSWORD = process.env.C2P_ADMIN_PASSWORD || PASSWORD;
const QA_PASSWORD = process.env.C2P_QA_PASSWORD || 'Password123!';
const ALLOW_DESTRUCTIVE = process.env.C2P_E2E_ALLOW_DESTRUCTIVE === 'true';
const apiBaseHref = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
const apiBaseUrl = new URL(apiBaseHref);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isLoopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function assertDestructiveSafety() {
  if (isLoopbackHost(apiBaseUrl.hostname)) return;
  if (ALLOW_DESTRUCTIVE) return;
  throw new Error('prod-destructive-qa refuse les mutations hors local sans C2P_E2E_ALLOW_DESTRUCTIVE=true.');
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

async function request(path, init = {}) {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`invalid API path: ${path}`);
  }
  const url = new URL(path.slice(1), apiBaseUrl);
  if (url.origin !== apiBaseUrl.origin || !url.pathname.startsWith(apiBaseUrl.pathname)) {
    throw new Error(`invalid API URL: ${url.href}`);
  }
  return fetch(url, init);
}

async function readJson(path, init = {}) {
  const response = await request(path, init);
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }
  return { response, payload };
}

async function loginAs(email, password = PASSWORD) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    return { ok: false, status: response.status, body: await response.text() };
  }
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    ok: true,
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function authJson(ctx, path, init = {}) {
  const headers = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(ctx.csrfToken ? { 'X-CSRF-Token': ctx.csrfToken } : {}),
    Cookie: ctx.cookieJar,
    ...(init.headers || {}),
  };
  return readJson(path, { ...init, headers });
}

async function registerQaUser(role, stamp) {
  const email = `qa-${role}-${stamp}@c2p.test`;
  const { response, payload } = await readJson('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: QA_PASSWORD,
      firstName: `QA${role}`,
      lastName: 'Destructive',
      phone: '+221 77 000 00 00',
      role,
      bio: 'Compte QA temporaire pour recette destructive controlee.',
      location: 'Dakar, Senegal',
      publicTitle: `QA ${role}`,
      website: 'https://c2p.sn',
      preferredLanguage: 'Francais',
      skills: ['qa', 'e2e'],
      publicProfileEnabled: false,
    }),
  });
  assert(response.ok, `register ${role} failed (${response.status}) ${JSON.stringify(payload)}`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return { email, role, cookieJar, csrfToken: readCookie(cookieJar, 'c2p_csrf') };
}

async function getCurrentUser(ctx) {
  const { response, payload } = await authJson(ctx, '/auth/me');
  assert(response.ok, `auth/me failed (${response.status})`);
  return payload;
}

async function deleteProfileIfPossible(email, password = QA_PASSWORD) {
  const ctx = await loginAs(email, password);
  if (!ctx.ok) return false;
  const user = await getCurrentUser(ctx);
  const { response } = await authJson(ctx, `/auth/profile/${encodeURIComponent(String(user.id))}`, {
    method: 'DELETE',
  });
  return response.ok;
}

async function deleteProfileWithContextIfPossible(ctx) {
  try {
    const user = await getCurrentUser(ctx);
    const { response } = await authJson(ctx, `/auth/profile/${encodeURIComponent(String(user.id))}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function testMaintenanceFlag(adminCtx, checked) {
  const flags = await authJson(adminCtx, '/admin/resources/featureFlags');
  assert(flags.response.ok, `feature flags read failed (${flags.response.status})`);
  const flag = flags.payload.find((entry) => entry.id === 'maintenance_mode');
  assert(flag, 'maintenance_mode flag missing');
  const originalEnabled = Boolean(flag.enabled);

  try {
    const enabled = await authJson(adminCtx, '/admin/resources/featureFlags/maintenance_mode', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true, updated_by: 'QA destructive check' }),
    });
    assert(enabled.response.ok, `maintenance enable failed (${enabled.response.status})`);
    const publicStatus = await readJson('/public/platform-status');
    assert(publicStatus.response.ok, `platform-status failed (${publicStatus.response.status})`);
    assert(publicStatus.payload?.maintenance === true, 'platform-status must expose maintenance=true after enable');
    checked.push('maintenance_mode_enable_visible');
  } finally {
    const restored = await authJson(adminCtx, '/admin/resources/featureFlags/maintenance_mode', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: originalEnabled, updated_by: 'QA destructive restore' }),
    });
    assert(restored.response.ok, `maintenance restore failed (${restored.response.status})`);
    const restoredStatus = await readJson('/public/platform-status');
    assert(restoredStatus.payload?.maintenance === originalEnabled, 'maintenance flag was not restored');
    checked.push('maintenance_mode_restored');
  }
}

async function testAdminCampaignAndCategory(adminCtx, stamp, checked) {
  const categoryName = `QA destructive category ${stamp}`;
  const category = await authJson(adminCtx, '/admin/resources/categories', {
    method: 'POST',
    body: JSON.stringify({ name: categoryName, type: 'formation', active: true, count: 0 }),
  });
  assert(category.response.ok, `category create failed (${category.response.status})`);
  const categoryId = category.payload.id;
  const disabled = await authJson(adminCtx, `/admin/resources/categories/${encodeURIComponent(String(categoryId))}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: false }),
  });
  assert(disabled.response.ok && disabled.payload.active === false, 'category disable failed');
  const deletedCategory = await authJson(adminCtx, `/admin/resources/categories/${encodeURIComponent(String(categoryId))}`, {
    method: 'DELETE',
  });
  assert(deletedCategory.response.ok, `category delete failed (${deletedCategory.response.status})`);
  checked.push('admin_category_create_disable_delete');

  const campaignTitle = `QA destructive campaign ${stamp}`;
  const campaign = await authJson(adminCtx, '/admin/resources/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: campaignTitle,
      type: 'email',
      target: 'active_clients',
      status: 'scheduled',
      sentCount: 0,
      openRate: null,
      scheduledDate: '2026-12-31T09:30',
      createdAt: new Date().toISOString(),
      content: 'Campagne QA temporaire.',
    }),
  });
  assert(campaign.response.ok, `campaign create failed (${campaign.response.status})`);
  const campaignId = campaign.payload.id;
  const cancelled = await authJson(adminCtx, `/admin/resources/campaigns/${encodeURIComponent(String(campaignId))}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });
  assert(cancelled.response.ok && cancelled.payload.status === 'cancelled', 'campaign cancel failed');
  const deletedCampaign = await authJson(adminCtx, `/admin/resources/campaigns/${encodeURIComponent(String(campaignId))}`, {
    method: 'DELETE',
  });
  assert(deletedCampaign.response.ok, `campaign delete failed (${deletedCampaign.response.status})`);
  checked.push('admin_campaign_create_cancel_delete');
}

async function testUserSuspendReactivateDelete(adminCtx, stamp, checked) {
  const qa = await registerQaUser('client', stamp);
  const users = await authJson(adminCtx, '/auth/users');
  assert(users.response.ok, `users read failed (${users.response.status})`);
  const user = users.payload.find((entry) => String(entry.email).toLowerCase() === qa.email);
  assert(user?.id, 'created QA client not found in admin users');

  const suspended = await authJson(adminCtx, `/auth/users/${encodeURIComponent(String(user.id))}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'suspended' }),
  });
  assert(suspended.response.ok && suspended.payload.status === 'suspended', 'QA client suspend failed');
  const blockedLogin = await loginAs(qa.email, QA_PASSWORD);
  assert(!blockedLogin.ok, 'suspended QA client must not login');
  checked.push('user_suspend_blocks_login');

  const reactivated = await authJson(adminCtx, `/auth/users/${encodeURIComponent(String(user.id))}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' }),
  });
  assert(reactivated.response.ok && reactivated.payload.status === 'active', 'QA client reactivate failed');
  const activeLogin = await loginAs(qa.email, QA_PASSWORD);
  const activeCtx = activeLogin.ok ? activeLogin : qa;
  const deleted = await authJson(activeCtx, `/auth/profile/${encodeURIComponent(String(user.id))}`, {
    method: 'DELETE',
  });
  assert(deleted.response.ok, `QA client profile delete failed (${deleted.response.status})`);
  const loginAfterDelete = await loginAs(qa.email, QA_PASSWORD);
  assert(!loginAfterDelete.ok, 'deleted QA client must not login');
  checked.push('user_reactivate_delete_blocks_login');
}

async function testPrestataireServiceLifecycle(checked) {
  const ctx = await loginAs('prestataire@c2p.sn');
  assert(ctx.ok, `prestataire login failed (${ctx.status})`);
  const title = `QA service destructive ${Date.now()}`;
  const created = await authJson(ctx, '/marketplace/prestataire/services', {
    method: 'POST',
    body: JSON.stringify({
      title,
      category: 'QA',
      description: 'Service temporaire pour recette destructive.',
      price: '1000 FCFA',
      price_type: 'fixed',
      status: 'active',
      image: '',
      location: 'Dakar',
    }),
  });
  assert(created.response.ok, `service create failed (${created.response.status})`);
  const serviceId = created.payload.id;
  const inactive = await authJson(ctx, `/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'inactive' }),
  });
  assert(inactive.response.ok && inactive.payload.status === 'inactive', 'service status inactive failed');
  const updated = await authJson(ctx, `/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: `${title} modifie` }),
  });
  assert(updated.response.ok && String(updated.payload.title).endsWith('modifie'), 'service update failed');
  const deleted = await authJson(ctx, `/marketplace/prestataire/services/${encodeURIComponent(String(serviceId))}`, {
    method: 'DELETE',
  });
  assert(deleted.response.ok, `service delete failed (${deleted.response.status})`);
  const services = await authJson(ctx, '/marketplace/prestataire/services');
  assert(
    !services.payload.services.some((entry) => String(entry.id) === String(serviceId)),
    'deleted service still visible',
  );
  checked.push('prestataire_service_create_update_disable_delete');
}

async function testFormateurCourseCascadeDelete(stamp, checked) {
  const qa = await registerQaUser('formateur', `${stamp}-course`);
  const ctx = qa;
  const title = `QA destructive course ${Date.now()}`;
  try {
    const created = await authJson(ctx, '/learning/formateur/courses/bundle', {
      method: 'POST',
      body: JSON.stringify({
        course: {
          title,
          category: 'QA',
          description: 'Formation temporaire pour recette destructive.',
          duration: '1h',
          modules: 1,
          level: 'beginner',
          program_branch: 'form_actions',
          delivery_mode: 'online',
          price: 0,
          is_free: true,
          access_type: 'free',
          promotion_percentage: 0,
        },
        sections: [
          {
            id: 'draft-section-1',
            title: 'Section QA',
            description: 'Section temporaire.',
            status: 'draft',
            position: 1,
            lessons: [
              {
                id: 'draft-lesson-1',
                title: 'Lecon QA',
                description: 'Lecon temporaire.',
                duration: '10 min',
                type: 'article',
                content: 'Contenu temporaire.',
                status: 'draft',
                is_preview: false,
                position: 1,
              },
            ],
          },
        ],
        assets: [],
        exams: [],
      }),
    });
    assert(created.response.ok, `course bundle create failed (${created.response.status}) ${JSON.stringify(created.payload)}`);
    const courseId = created.payload.id;
    const program = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/program`);
    assert(program.response.ok, `program read failed (${program.response.status})`);
    const lessonId = program.payload.lessons?.[0]?.id;
    const sectionId = program.payload.sections?.[0]?.id;
    assert(lessonId && sectionId, 'created course must have section and lesson');

    const deletedLesson = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/lessons/${encodeURIComponent(String(lessonId))}`, {
      method: 'DELETE',
    });
    assert(deletedLesson.response.ok, `lesson delete failed (${deletedLesson.response.status})`);
    const afterLessonDelete = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/program`);
    assert(!afterLessonDelete.payload.lessons.some((entry) => String(entry.id) === String(lessonId)), 'deleted lesson still visible');

    const deletedSection = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/sections/${encodeURIComponent(String(sectionId))}`, {
      method: 'DELETE',
    });
    assert(deletedSection.response.ok, `section delete failed (${deletedSection.response.status})`);
    const afterSectionDelete = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}/program`);
    assert(!afterSectionDelete.payload.sections.some((entry) => String(entry.id) === String(sectionId)), 'deleted section still visible');

    const deletedCourse = await authJson(ctx, `/learning/formateur/courses/${encodeURIComponent(String(courseId))}`, {
      method: 'DELETE',
    });
    assert(deletedCourse.response.ok, `course delete failed (${deletedCourse.response.status})`);
    const courses = await authJson(ctx, '/learning/formateur/courses');
    assert(!courses.payload.some((entry) => String(entry.id) === String(courseId)), 'deleted course still visible');
    checked.push('formateur_course_lesson_section_course_delete');
  } finally {
    await deleteProfileWithContextIfPossible(ctx);
  }
}

async function testWalletRefundOnQaAccount(adminCtx, stamp, checked) {
  const qa = await registerQaUser('client', `${stamp}-wallet`);
  try {
    const ctx = qa;
    const requestId = `qa-wallet-${stamp}`;
    const topup = await authJson(ctx, '/payments/wallet/topup', {
      method: 'POST',
      headers: { 'X-Request-Id': requestId },
      body: JSON.stringify({
        amount: 25,
        method: 'wave',
        description: 'Topup QA temporaire pour test remboursement.',
      }),
    });
    assert(topup.response.ok, `QA topup failed (${topup.response.status}) ${JSON.stringify(topup.payload)}`);
    const transactionId = topup.payload?.transaction?.id;
    assert(transactionId, 'QA topup must return transaction id');
    const refund = await authJson(adminCtx, `/payments/admin/transactions/${encodeURIComponent(String(transactionId))}/refund`, {
      method: 'POST',
      headers: { 'X-Request-Id': `${requestId}-refund` },
    });
    assert(refund.response.ok, `QA refund failed (${refund.response.status}) ${JSON.stringify(refund.payload)}`);
    checked.push('wallet_topup_refund_on_qa_account');
  } finally {
    await deleteProfileWithContextIfPossible(qa);
  }
}

async function main() {
  assertDestructiveSafety();
  const checked = [];
  const stamp = Date.now();
  const adminCtx = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert(adminCtx.ok, `admin login failed (${adminCtx.status})`);

  await testMaintenanceFlag(adminCtx, checked);
  await testAdminCampaignAndCategory(adminCtx, stamp, checked);
  await testUserSuspendReactivateDelete(adminCtx, stamp, checked);
  await testPrestataireServiceLifecycle(checked);
  await testFormateurCourseCascadeDelete(stamp, checked);
  await testWalletRefundOnQaAccount(adminCtx, stamp, checked);

  console.log(JSON.stringify({ ok: true, checked }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
