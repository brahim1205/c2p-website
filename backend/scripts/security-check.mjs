const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || 'password123';
const METRICS_AUTH_TOKEN = process.env.METRICS_AUTH_TOKEN || 'local-metrics-token';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJsonOrNull(response) {
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

function assertNoSensitiveUserFields(user, context) {
  assert(user && typeof user === 'object', `${context} must be an object`);
  for (const field of ['password', 'passwordHash', 'passwordHistory', 'failedLoginAttempts', 'lockedUntil', 'lastPasswordChangeAt', 'lastLoginAt', 'backupCodes']) {
    assert(typeof user[field] === 'undefined', `${context} must not expose ${field}`);
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

async function loginAs(email, password = PASSWORD) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const payload = await response.json();
  const cookies = extractCookies(response);
  return { payload, cookieJar: mergeCookieJar(cookies) };
}

async function request(path, init = {}) {
  return fetch(`${API_URL}${path}`, init);
}

async function main() {
  const unauthenticatedPayments = await request('/data/payment_transactions');
  assert(unauthenticatedPayments.status === 401, `expected 401 on unauthenticated payments, got ${unauthenticatedPayments.status}`);

  const unauthenticatedMetrics = await request('/metrics');
  assert(unauthenticatedMetrics.status === 401, `expected 401 on /metrics without token, got ${unauthenticatedMetrics.status}`);

  const authorizedMetrics = await request('/metrics', {
    headers: {
      Authorization: `Bearer ${METRICS_AUTH_TOKEN}`,
    },
  });
  assert(authorizedMetrics.ok, `expected 200 on /metrics with token, got ${authorizedMetrics.status}`);
  const authorizedMetricsPayload = await authorizedMetrics.text();
  assert(authorizedMetricsPayload.includes('c2p_'), 'metrics payload must expose c2p metrics');

  const { cookieJar } = await loginAs('client@c2p.sn');
  const csrfToken = readCookie(cookieJar, 'c2p_csrf');
  assert(csrfToken, 'missing csrf cookie after login');

  const forbiddenUsers = await request('/auth/users', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenUsers.status === 401, `expected 401 on /auth/users, got ${forbiddenUsers.status}`);

  const adminPasswordHijack = await request('/auth/change-password', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      userId: 'usr-admin',
      currentPassword: PASSWORD,
      newPassword: 'Password!789',
    }),
  });
  assert(adminPasswordHijack.status === 401, `expected 401 on cross-user password change attempt, got ${adminPasswordHijack.status}`);

  const directoryResponse = await request('/auth/directory', {
    headers: { Cookie: cookieJar },
  });
  assert(directoryResponse.ok, `expected 200 on /auth/directory, got ${directoryResponse.status}`);
  const directoryPayload = await directoryResponse.json();
  assert(Array.isArray(directoryPayload), 'directory payload must be an array');
  assert(directoryPayload.every((entry) => typeof entry.email === 'undefined' && typeof entry.phone === 'undefined'), 'directory must not expose email or phone fields');
  assert(directoryPayload.every((entry) => typeof entry.passwordHash === 'undefined' && typeof entry.passwordHistory === 'undefined'), 'directory must not expose auth internals');

  const currentUserResponse = await request('/auth/me', {
    headers: { Cookie: cookieJar },
  });
  assert(currentUserResponse.ok, `expected 200 on /auth/me, got ${currentUserResponse.status}`);
  const currentUserPayload = await currentUserResponse.json();
  assertNoSensitiveUserFields(currentUserPayload, 'current user payload');

  const selfProfileResponse = await request('/auth/profile/usr-client', {
    headers: { Cookie: cookieJar },
  });
  assert(selfProfileResponse.ok, `expected 200 on /auth/profile/usr-client, got ${selfProfileResponse.status}`);
  const selfProfilePayload = await selfProfileResponse.json();
  assertNoSensitiveUserFields(selfProfilePayload, 'self profile payload');

  const selfEscalationAttempt = await request('/auth/profile/usr-client', {
    method: 'PATCH',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      role: 'admin',
      status: 'suspended',
      expertVerified: true,
      is2FAEnabled: true,
    }),
  });
  assert(selfEscalationAttempt.ok, `expected 200 on ignored self escalation attempt, got ${selfEscalationAttempt.status}`);
  const selfEscalationPayload = await selfEscalationAttempt.json();
  assert(selfEscalationPayload.role === selfProfilePayload.role, 'self profile patch must not change role');
  assert(selfEscalationPayload.status === selfProfilePayload.status, 'self profile patch must not change status');
  assert(Boolean(selfEscalationPayload.expertVerified) === Boolean(selfProfilePayload.expertVerified), 'self profile patch must not change expertVerified');
  assert(Boolean(selfEscalationPayload.is2FAEnabled) === Boolean(selfProfilePayload.is2FAEnabled), 'self profile patch must not change is2FAEnabled');

  const forbiddenSecurity = await request('/auth/security/usr-admin', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenSecurity.status === 401, `expected 401 on чужой security endpoint, got ${forbiddenSecurity.status}`);

  const scopedPayments = await request('/data/payment_transactions?eq_user_id=usr-admin', {
    headers: { Cookie: cookieJar },
  });
  assert(scopedPayments.ok, `expected 200 on scoped payments, got ${scopedPayments.status}`);
  const scopedPayload = await scopedPayments.json();
  assert(Array.isArray(scopedPayload), 'scoped payments payload must be an array');
  assert(scopedPayload.every((row) => row.user_id === 'usr-client'), 'client must not see payment rows from another user');

  const forbiddenAdminOverview = await request('/payments/admin/overview', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenAdminOverview.status === 401, `expected 401 on /payments/admin/overview for client, got ${forbiddenAdminOverview.status}`);

  const forbiddenDexPayAdmin = await request('/payments/admin/providers/dexpay/reconciliation-jobs', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenDexPayAdmin.status === 401, `expected 401 on DexPay admin route for client, got ${forbiddenDexPayAdmin.status}`);

  const missingCsrfMutation = await request('/data/bookings', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: 'usr-client',
      provider_id: 1,
      service: 'Test booking',
      status: 'pending',
      price: 15000,
    }),
  });
  assert(missingCsrfMutation.status === 403, `expected 403 without csrf, got ${missingCsrfMutation.status}`);

  const spoofedClientMutation = await request('/data/bookings', {
    method: 'POST',
    headers: {
      Cookie: cookieJar,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      client_id: 'usr-admin',
      provider_id: 1,
      service: 'Spoofed booking',
      status: 'pending',
      price: 15000,
    }),
  });
  assert(spoofedClientMutation.status === 401, `expected 401 on spoofed client_id, got ${spoofedClientMutation.status}`);

  const invalidResetChallenge = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'client@c2p.sn',
      code: '000000',
      newPassword: 'Password!456',
    }),
  });
  assert(invalidResetChallenge.status === 401, `expected 401 on invalid reset code, got ${invalidResetChallenge.status}`);

  const oversizedContactSubject = await request('/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Awa',
      lastName: 'Sarr',
      email: 'awa.sarr@c2p.sn',
      subject: 'X'.repeat(161),
      message: 'Je souhaite etre rappelee pour une mission urgente.',
    }),
  });
  assert(oversizedContactSubject.status === 400, `expected 400 on oversized public contact subject, got ${oversizedContactSubject.status}`);

  const oversizedContactEmail = await request('/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Awa',
      lastName: 'Sarr',
      email: `${'a'.repeat(250)}@c2p.sn`,
      subject: 'Besoin de rappel',
      message: 'Je souhaite etre rappelee pour une mission urgente.',
    }),
  });
  assert(oversizedContactEmail.status === 400, `expected 400 on oversized public contact email, got ${oversizedContactEmail.status}`);

  const newsletterEmail = `security-check-${Date.now()}@c2p.sn`;
  const firstNewsletterSubscription = await request('/public/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newsletterEmail, source: 'security-check' }),
  });
  assert(firstNewsletterSubscription.ok, `expected 200 on first newsletter subscription, got ${firstNewsletterSubscription.status}`);
  const firstNewsletterPayload = await firstNewsletterSubscription.json();
  assert(firstNewsletterPayload.alreadySubscribed === false, 'first newsletter subscription must not be marked as duplicate');

  const duplicateNewsletterSubscription = await request('/public/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newsletterEmail, source: 'security-check' }),
  });
  assert(duplicateNewsletterSubscription.ok, `expected 200 on duplicate newsletter subscription, got ${duplicateNewsletterSubscription.status}`);
  const duplicateNewsletterPayload = await duplicateNewsletterSubscription.json();
  assert(duplicateNewsletterPayload.alreadySubscribed === true, 'duplicate newsletter subscription must be marked as duplicate');

  const oversizedNewsletterEmail = await request('/public/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${'b'.repeat(250)}@c2p.sn`, source: 'security-check' }),
  });
  assert(oversizedNewsletterEmail.status === 400, `expected 400 on oversized newsletter email, got ${oversizedNewsletterEmail.status}`);

  const invalidPublicPlanRole = await request('/public/subscription-plans?role=admin');
  assert(invalidPublicPlanRole.status === 400, `expected 400 on invalid public subscription plan role, got ${invalidPublicPlanRole.status}`);

  const validPublicPlanRole = await request('/public/subscription-plans?role=prestataire');
  assert(validPublicPlanRole.ok, `expected 200 on valid public subscription plan role, got ${validPublicPlanRole.status}`);
  const validPublicPlanPayload = await validPublicPlanRole.json();
  assert(Array.isArray(validPublicPlanPayload), 'public subscription plans payload must be an array');
  assert(validPublicPlanPayload.every((plan) => plan.role === 'prestataire'), 'public subscription plans must stay scoped to the requested role');

  const uniqueEmail = `security-user-${Date.now()}@c2p.sn`;
  const registerResponse = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password!456',
      firstName: 'Securite',
      lastName: 'Check',
      phone: '+221771234567',
      role: 'client',
    }),
  });
  assert(registerResponse.ok, `expected 201 on auth register, got ${registerResponse.status}`);
  const registerPayload = await registerResponse.json();
  assert(registerPayload?.user?.id, 'registered user id must be present');
  const registeredUserId = registerPayload.user.id;

  const secondLogin = await loginAs(uniqueEmail, 'Password!456');
  const secondLoginCsrf = readCookie(secondLogin.cookieJar, 'c2p_csrf');
  assert(secondLoginCsrf, 'missing csrf cookie after second login');

  const preChangeSecurity = await request(`/auth/security/${encodeURIComponent(registeredUserId)}`, {
    headers: { Cookie: secondLogin.cookieJar },
  });
  assert(preChangeSecurity.ok, `expected 200 on pre-change security payload, got ${preChangeSecurity.status}`);
  const preChangeSecurityPayload = await preChangeSecurity.json();
  assert(Array.isArray(preChangeSecurityPayload.sessions), 'pre-change security sessions must be an array');
  assert(preChangeSecurityPayload.sessions.length >= 2, 'password-change test requires at least two active sessions');

  const passwordChangeResponse = await request('/auth/change-password', {
    method: 'POST',
    headers: {
      Cookie: secondLogin.cookieJar,
      'Content-Type': 'application/json',
      'X-CSRF-Token': secondLoginCsrf,
    },
    body: JSON.stringify({
      userId: registeredUserId,
      currentPassword: 'Password!456',
      newPassword: 'Password!789',
    }),
  });
  assert(passwordChangeResponse.ok, `expected 200 on self password change, got ${passwordChangeResponse.status}`);

  const postChangeSecurity = await request(`/auth/security/${encodeURIComponent(registeredUserId)}`, {
    headers: { Cookie: secondLogin.cookieJar },
  });
  assert(postChangeSecurity.ok, `expected 200 on post-change security payload, got ${postChangeSecurity.status}`);
  const postChangeSecurityPayload = await postChangeSecurity.json();
  assert(Array.isArray(postChangeSecurityPayload.sessions), 'post-change security sessions must be an array');
  assert(postChangeSecurityPayload.sessions.length === 1, 'password change must revoke all secondary sessions');
  assert(postChangeSecurityPayload.sessions[0]?.current === true, 'current session must remain active after password change');

  const oldPasswordLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password!456',
    }),
  });
  assert(oldPasswordLogin.status === 401, `expected 401 on old password login after change, got ${oldPasswordLogin.status}`);

  const newPasswordLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password!789',
    }),
  });
  assert(newPasswordLogin.ok, `expected 201 on new password login after change, got ${newPasswordLogin.status}`);
  const newPasswordCookieJar = mergeCookieJar(extractCookies(newPasswordLogin));

  const resetAuditBefore = await request(`/auth/security/${encodeURIComponent(registeredUserId)}`, {
    headers: { Cookie: newPasswordCookieJar },
  });
  assert(resetAuditBefore.ok, `expected 200 on security payload before forgot-password checks, got ${resetAuditBefore.status}`);
  const resetAuditBeforePayload = await resetAuditBefore.json();
  const resetRequestCountBefore = resetAuditBeforePayload.auditLogs.filter((entry) => entry.action === 'Demande de reinitialisation du mot de passe').length;
  const resetCooldownCountBefore = resetAuditBeforePayload.auditLogs.filter((entry) => entry.action === 'Demande de reinitialisation du mot de passe ignoree (cooldown)').length;

  const firstForgotPassword = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail }),
  });
  assert(firstForgotPassword.ok, `expected 200 on first forgot-password request, got ${firstForgotPassword.status}`);

  const secondForgotPassword = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail }),
  });
  assert(secondForgotPassword.ok, `expected 200 on second forgot-password request, got ${secondForgotPassword.status}`);

  const resetAuditAfterCooldown = await request(`/auth/security/${encodeURIComponent(registeredUserId)}`, {
    headers: { Cookie: newPasswordCookieJar },
  });
  assert(resetAuditAfterCooldown.ok, `expected 200 on security payload after forgot-password cooldown checks, got ${resetAuditAfterCooldown.status}`);
  const resetAuditAfterCooldownPayload = await resetAuditAfterCooldown.json();
  const resetRequestCountAfter = resetAuditAfterCooldownPayload.auditLogs.filter((entry) => entry.action === 'Demande de reinitialisation du mot de passe').length;
  const resetCooldownCountAfter = resetAuditAfterCooldownPayload.auditLogs.filter((entry) => entry.action === 'Demande de reinitialisation du mot de passe ignoree (cooldown)').length;
  assert(resetRequestCountAfter === resetRequestCountBefore + 1, 'forgot-password cooldown must allow only one effective reset request in the window');
  assert(resetCooldownCountAfter === resetCooldownCountBefore + 1, 'forgot-password cooldown must audit the throttled second request');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const invalidResetAttempt = await request('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        code: '000000',
        newPassword: 'Password!790',
      }),
    });
    assert(invalidResetAttempt.status === 401, `expected 401 on invalid reset attempt ${attempt + 1}, got ${invalidResetAttempt.status}`);
  }

  const blockedCorrectReset = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      code: '123456',
      newPassword: 'Password!790',
    }),
  });
  assert(blockedCorrectReset.status === 401, `expected 401 on correct code after exhausted reset attempts, got ${blockedCorrectReset.status}`);

  const thirdForgotPassword = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail }),
  });
  assert(thirdForgotPassword.ok, `expected 200 on forgot-password after exhausted challenge cleanup, got ${thirdForgotPassword.status}`);

  const successfulReset = await request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      code: '123456',
      newPassword: 'Password!790',
    }),
  });
  assert(successfulReset.ok, `expected 200 on successful reset after renewed challenge, got ${successfulReset.status}`);

  const revokedSessionAfterReset = await request('/auth/me', {
    headers: { Cookie: newPasswordCookieJar },
  });
  assert(revokedSessionAfterReset.ok, `expected 200 on /auth/me after reset revocation, got ${revokedSessionAfterReset.status}`);
  const revokedSessionPayload = await readJsonOrNull(revokedSessionAfterReset);
  assert(revokedSessionPayload === null, 'password reset must revoke previously active sessions');

  const resetPasswordLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password!790',
    }),
  });
  assert(resetPasswordLogin.ok, `expected 201 on login with reset password, got ${resetPasswordLogin.status}`);

  const { cookieJar: formateurCookies } = await loginAs('formateur@c2p.sn');
  const formateurCsrf = readCookie(formateurCookies, 'c2p_csrf');
  assert(formateurCsrf, 'missing csrf cookie after formateur login');

  const formateurCourses = await request('/data/courses', {
    headers: { Cookie: formateurCookies },
  });
  assert(formateurCourses.ok, `expected 200 on formateur courses, got ${formateurCourses.status}`);
  const formateurCoursesPayload = await formateurCourses.json();
  assert(Array.isArray(formateurCoursesPayload), 'formateur courses payload must be an array');
  assert(formateurCoursesPayload.every((row) => row.instructor_id === 'usr-formateur'), 'formateur must only see own courses');

  const spoofedCourseCreation = await request('/data/courses', {
    method: 'POST',
    headers: {
      Cookie: formateurCookies,
      'Content-Type': 'application/json',
      'X-CSRF-Token': formateurCsrf,
    },
    body: JSON.stringify({
      title: 'Cours pirate',
      instructor_id: 'usr-admin',
      category: 'Test',
      status: 'draft',
      duration: '2h',
      modules: 1,
    }),
  });
  assert(spoofedCourseCreation.status === 401, `expected 401 on spoofed instructor_id, got ${spoofedCourseCreation.status}`);

  const { cookieJar: adminCookies } = await loginAs('admin@c2p.sn');
  const adminOverview = await request('/payments/admin/overview', {
    headers: { Cookie: adminCookies },
  });
  assert(adminOverview.ok, `expected 200 on admin finance overview, got ${adminOverview.status}`);

  const adminUsers = await request('/auth/users', {
    headers: { Cookie: adminCookies },
  });
  assert(adminUsers.ok, `expected 200 on admin /auth/users, got ${adminUsers.status}`);
  const adminUsersPayload = await adminUsers.json();
  assert(Array.isArray(adminUsersPayload), 'admin users payload must be an array');
  assert(adminUsersPayload.every((entry) => typeof entry.passwordHash === 'undefined' && typeof entry.passwordHistory === 'undefined'), 'admin users must not expose auth internals');

  const adminDexPayJobs = await request('/payments/admin/providers/dexpay/reconciliation-jobs', {
    headers: { Cookie: adminCookies },
  });
  assert(adminDexPayJobs.ok, `expected 200 on DexPay admin jobs, got ${adminDexPayJobs.status}`);

  const forbiddenOutboxMetrics = await request('/outbox/metrics', {
    headers: { Cookie: cookieJar },
  });
  assert(forbiddenOutboxMetrics.status === 401, `expected 401 on outbox metrics for client, got ${forbiddenOutboxMetrics.status}`);

  const adminOutboxMetrics = await request('/outbox/metrics', {
    headers: { Cookie: adminCookies },
  });
  assert(adminOutboxMetrics.ok, `expected 200 on outbox metrics for admin, got ${adminOutboxMetrics.status}`);

  const invalidPrivatePlanRole = await request('/payments/subscription-plans?role=admin', {
    headers: { Cookie: adminCookies },
  });
  assert(invalidPrivatePlanRole.status === 400, `expected 400 on invalid authenticated subscription plan role, got ${invalidPrivatePlanRole.status}`);

  const validPrivatePlanRole = await request('/payments/subscription-plans?role=porteur', {
    headers: { Cookie: adminCookies },
  });
  assert(validPrivatePlanRole.ok, `expected 200 on valid authenticated subscription plan role, got ${validPrivatePlanRole.status}`);
  const validPrivatePlanPayload = await validPrivatePlanRole.json();
  assert(Array.isArray(validPrivatePlanPayload), 'authenticated subscription plans payload must be an array');
  assert(validPrivatePlanPayload.every((plan) => plan.role === 'porteur'), 'authenticated subscription plans must stay scoped to the requested role');

  const invalidCampaignAudience = await request('/communications/campaigns/dispatch', {
    method: 'POST',
    headers: {
      Cookie: adminCookies,
      'Content-Type': 'application/json',
      'X-CSRF-Token': readCookie(adminCookies, 'c2p_csrf') || '',
    },
    body: JSON.stringify({
      title: 'Audience invalide',
      type: 'email',
      target: 'everyone-now',
      content: 'Message de test invalide.',
    }),
  });
  assert(invalidCampaignAudience.status === 400, `expected 400 on invalid campaign audience, got ${invalidCampaignAudience.status}`);

  const contactSubmission = await request('/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Aida',
      lastName: 'Ndiaye',
      email: `aida.ndiaye+${Date.now()}@c2p.sn`,
      subject: 'Besoin de rappel',
      message: 'Merci de me rappeler pour un cadrage de besoin AlloPresta.',
    }),
  });
  assert(contactSubmission.ok, `expected 200 on valid public contact submission, got ${contactSubmission.status}`);

  const adminCsrf = readCookie(adminCookies, 'c2p_csrf');
  assert(adminCsrf, 'missing csrf cookie after admin login');

  const adminContactSubmissions = await request('/public/contact-submissions?limit=5', {
    headers: { Cookie: adminCookies },
  });
  assert(adminContactSubmissions.ok, `expected 200 on admin public contact submissions, got ${adminContactSubmissions.status}`);
  const adminContactSubmissionsPayload = await adminContactSubmissions.json();
  assert(Array.isArray(adminContactSubmissionsPayload), 'public contact submissions payload must be an array');
  const latestSubmission = adminContactSubmissionsPayload[0];
  assert(latestSubmission?.id, 'expected latest contact submission id');

  const firstHandled = await request(`/public/contact-submissions/${encodeURIComponent(latestSubmission.id)}/handled`, {
    method: 'PATCH',
    headers: {
      Cookie: adminCookies,
      'X-CSRF-Token': adminCsrf,
    },
  });
  assert(firstHandled.ok, `expected 200 on first contact submission handled, got ${firstHandled.status}`);
  const firstHandledPayload = await firstHandled.json();
  assert(firstHandledPayload.status === 'handled', 'contact submission must be handled after first patch');

  const secondHandled = await request(`/public/contact-submissions/${encodeURIComponent(latestSubmission.id)}/handled`, {
    method: 'PATCH',
    headers: {
      Cookie: adminCookies,
      'X-CSRF-Token': adminCsrf,
    },
  });
  assert(secondHandled.ok, `expected 200 on second contact submission handled patch, got ${secondHandled.status}`);
  const secondHandledPayload = await secondHandled.json();
  assert(secondHandledPayload.status === 'handled', 'contact submission must stay handled after second patch');
  assert(secondHandledPayload.handledAt === firstHandledPayload.handledAt, 'handled timestamp must stay stable on repeated patch');

  const securityPayload = await request('/auth/security/usr-admin', {
    headers: { Cookie: adminCookies },
  });
  assert(securityPayload.ok, `expected 200 on admin security payload, got ${securityPayload.status}`);
  const securityData = await securityPayload.json();
  assert(Array.isArray(securityData.backupCodes) && securityData.backupCodes.length === 0, 'security payload must not expose backup codes');

  console.log('security-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
