const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
const apiBaseHref = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
const apiBaseUrl = new URL(apiBaseHref);

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
    body: JSON.stringify({
      email,
      password: PASSWORD,
    }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function request(path, init = {}) {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`invalid API path: ${path}`);
  }
  const url = new URL(path.slice(1), apiBaseUrl);
  if (url.origin !== apiBaseUrl.origin) {
    throw new Error(`invalid API origin: ${url.origin}`);
  }
  if (!url.pathname.startsWith(apiBaseUrl.pathname)) {
    throw new Error(`invalid API prefix: ${url.pathname}`);
  }
  return fetch(url, init);
}

async function readJson(path, init = {}) {
  const response = await request(path, init);
  const payload = await response.json();
  return { response, payload };
}

async function main() {
  const anonymousUnknownTable = await request('/data/__unknown_table__');
  assert(anonymousUnknownTable.status === 404, `expected 404 on anonymous unknown table, got ${anonymousUnknownTable.status}`);

  const anonymousCourses = await readJson('/data/courses');
  assert(anonymousCourses.response.ok, `expected 200 on public courses, got ${anonymousCourses.response.status}`);
  assert(Array.isArray(anonymousCourses.payload), 'public courses payload must be an array');
  assert(anonymousCourses.payload.length > 0, 'public courses payload must not be empty');
  assert(anonymousCourses.payload.length <= 200, 'public courses payload must be capped by the default data read limit');
  assert(
    anonymousCourses.payload.every((row) => String(row.status) === 'published'),
    'anonymous users must only receive published courses',
  );

  const invalidLimit = await request('/data/courses?limit=-1');
  assert(invalidLimit.status === 400, `expected 400 on invalid data limit, got ${invalidLimit.status}`);

  const cappedLimit = await readJson('/data/courses?limit=999999');
  assert(cappedLimit.response.ok, `expected 200 on capped data limit, got ${cappedLimit.response.status}`);
  assert(Array.isArray(cappedLimit.payload) && cappedLimit.payload.length <= 500, 'data read limit must be capped at 500 rows');

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

  const anonymousProject = await readJson('/data/projects?eq_id=4001&single=true');
  assert(anonymousProject.response.ok, `expected 200 on anonymous public project, got ${anonymousProject.response.status}`);
  assert(anonymousProject.payload && String(anonymousProject.payload.id) === '4001', 'anonymous public project lookup must return the requested project');
  assert(!('owner_id' in anonymousProject.payload), 'anonymous public project rows must not expose owner_id');
  assert(!('valuation' in anonymousProject.payload), 'anonymous public project rows must not expose valuation');
  assert(!('revenue' in anonymousProject.payload), 'anonymous public project rows must not expose revenue');

  const publicProjectCenterProjects = await readJson('/project-center/projects');
  assert(publicProjectCenterProjects.response.ok, `expected 200 on public project-center projects, got ${publicProjectCenterProjects.response.status}`);
  assert(Array.isArray(publicProjectCenterProjects.payload), 'public project-center projects payload must be an array');
  assert(publicProjectCenterProjects.payload.length > 0, 'public project-center projects payload must not be empty');
  assert(
    publicProjectCenterProjects.payload.every((row) =>
      !('owner_id' in row)
      && !('valuation' in row)
      && !('revenue' in row)
      && !('business_plan' in row)
      && !('pitch_deck' in row)
    ),
    'public project-center endpoint must not expose project owner or diligence fields',
  );

  const publicProjectCenterSearch = await readJson('/project-center/projects?search=AgroLink&limit=2');
  assert(publicProjectCenterSearch.response.ok, `expected 200 on public project-center search, got ${publicProjectCenterSearch.response.status}`);
  assert(
    publicProjectCenterSearch.payload.length > 0 && publicProjectCenterSearch.payload.length <= 2,
    'public project-center search must filter and respect limit',
  );

  const publicProjectCenterDetail = await readJson('/project-center/projects/4001');
  assert(publicProjectCenterDetail.response.ok, `expected 200 on public project-center detail, got ${publicProjectCenterDetail.response.status}`);
  assert(
    publicProjectCenterDetail.payload.project && String(publicProjectCenterDetail.payload.project.id) === '4001',
    'public project-center detail must return requested project',
  );
  assert(
    !('owner_id' in publicProjectCenterDetail.payload.project)
    && !('valuation' in publicProjectCenterDetail.payload.project)
    && !('revenue' in publicProjectCenterDetail.payload.project),
    'public project-center detail project must not expose owner or private finance fields',
  );
  assert(
    publicProjectCenterDetail.payload.milestones.every((row) => !('tasks' in row)),
    'public project-center detail milestones must not expose internal tasks',
  );
  assert(
    Array.isArray(publicProjectCenterDetail.payload.documents) && publicProjectCenterDetail.payload.documents.length === 0,
    'public project-center detail must not expose private documents',
  );
  assert(
    publicProjectCenterDetail.payload.rounds.every((row) =>
      !('valuation' in row)
      && !('revenue' in row)
      && !('burn_rate' in row)
      && !('runway' in row)
      && !('business_plan' in row)
      && !('pitch_deck' in row)
    ),
    'public project-center detail rounds must not expose diligence fields',
  );
  assert(
    Array.isArray(publicProjectCenterDetail.payload.investors) && publicProjectCenterDetail.payload.investors.length === 0,
    'public project-center detail must not expose investor ledger rows',
  );

  const anonymousProjectMilestones = await readJson('/data/project_milestones?eq_project_id=4001');
  assert(anonymousProjectMilestones.response.ok, `expected 200 on anonymous public project milestones, got ${anonymousProjectMilestones.response.status}`);
  assert(
    anonymousProjectMilestones.payload.every((row) => !('tasks' in row)),
    'anonymous project milestones must not expose internal task checklist',
  );

  const anonymousProjectDocuments = await readJson('/data/project_documents?eq_project_id=4001');
  assert(anonymousProjectDocuments.response.ok, `expected 200 on anonymous public project documents, got ${anonymousProjectDocuments.response.status}`);
  assert(
    Array.isArray(anonymousProjectDocuments.payload) && anonymousProjectDocuments.payload.length === 0,
    'anonymous project documents must not leak business plan or private file metadata',
  );

  const anonymousProjectFundingRounds = await readJson('/data/project_funding_rounds?eq_project_id=4001');
  assert(anonymousProjectFundingRounds.response.ok, `expected 200 on anonymous public funding rounds, got ${anonymousProjectFundingRounds.response.status}`);
  assert(
    anonymousProjectFundingRounds.payload.every((row) =>
      !('valuation' in row)
      && !('revenue' in row)
      && !('burn_rate' in row)
      && !('runway' in row)
      && !('business_plan' in row)
      && !('pitch_deck' in row)
    ),
    'anonymous funding rounds must not expose internal financial diligence fields',
  );

  const anonymousFundingInvestors = await readJson('/data/funding_investors?eq_funding_round_id=4401');
  assert(anonymousFundingInvestors.response.ok, `expected 200 on anonymous funding investors, got ${anonymousFundingInvestors.response.status}`);
  assert(
    Array.isArray(anonymousFundingInvestors.payload) && anonymousFundingInvestors.payload.length === 0,
    'anonymous funding investors must not leak investor ledger details',
  );

  const anonymousCreateProject = await request('/data/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Projet anonyme' }),
  });
  assert(anonymousCreateProject.status === 401, `expected 401 on anonymous project create, got ${anonymousCreateProject.status}`);

  const anonymousProjectSubmission = await request('/project-center/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName: 'Projet anonyme' }),
  });
  assert(
    anonymousProjectSubmission.status === 401,
    `expected 401 on anonymous project-center submission, got ${anonymousProjectSubmission.status}`,
  );
  const anonymousOwnerProjects = await request('/project-center/owner/projects');
  assert(
    anonymousOwnerProjects.status === 401,
    `expected 401 on anonymous project-center owner projects, got ${anonymousOwnerProjects.status}`,
  );
  const anonymousPartnerProjects = await request('/project-center/partner/tracked-projects');
  assert(
    anonymousPartnerProjects.status === 401,
    `expected 401 on anonymous project-center partner projects, got ${anonymousPartnerProjects.status}`,
  );
  const anonymousAdminProjectSummary = await request('/project-center/admin/dashboard-summary');
  assert(
    anonymousAdminProjectSummary.status === 401,
    `expected 401 on anonymous project-center admin dashboard summary, got ${anonymousAdminProjectSummary.status}`,
  );
  const anonymousPartnerSupportConversation = await request('/project-center/partner/support-conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 4001, projectTitle: 'AgroLink' }),
  });
  assert(
    anonymousPartnerSupportConversation.status === 401,
    `expected 401 on anonymous project-center partner support conversation, got ${anonymousPartnerSupportConversation.status}`,
  );

  const { cookieJar: apprenantCookies, csrfToken: apprenantCsrfToken } = await loginAs('apprenant@c2p.sn');
  assert(apprenantCsrfToken, 'missing csrf cookie for apprenant');
  const apprenantUnknownTable = await request('/data/__unknown_table__', {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantUnknownTable.status === 404, `expected 404 on authenticated unknown table read, got ${apprenantUnknownTable.status}`);

  const apprenantUnknownCreate = await request('/data/__unknown_table__', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ arbitrary: true }),
  });
  assert(apprenantUnknownCreate.status === 404, `expected 404 on authenticated unknown table create, got ${apprenantUnknownCreate.status}`);

  const unscopedProgressPatch = await request('/data/lesson_progress', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ completed: true }),
  });
  assert(unscopedProgressPatch.status === 400, `expected 400 on unscoped data patch, got ${unscopedProgressPatch.status}`);

  const unscopedProgressDelete = await request('/data/lesson_progress', {
    method: 'DELETE',
    headers: {
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
  });
  assert(unscopedProgressDelete.status === 400, `expected 400 on unscoped data delete, got ${unscopedProgressDelete.status}`);

  const tooManyScopedProgressPatch = await request(`/data/lesson_progress?in_id=${Array.from({ length: 60 }, (_, index) => `progress-${index}`).join(',')}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ completed: true }),
  });
  assert(
    tooManyScopedProgressPatch.status === 400,
    `expected 400 on oversized data patch filter, got ${tooManyScopedProgressPatch.status}`,
  );

  const apprenantEnrollments = await readJson('/data/course_enrollments', {
    headers: { Cookie: apprenantCookies },
  });
  assert(apprenantEnrollments.response.ok, `expected 200 on apprenant enrollments, got ${apprenantEnrollments.response.status}`);
  assert(
    apprenantEnrollments.payload.every((row) => String(row.student_id) === 'usr-apprenant'),
    'apprenant must only receive own enrollments',
  );

  const apprenantNotifications = await readJson('/notifications/me', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantNotifications.response.ok && Array.isArray(apprenantNotifications.payload),
    `notifications self endpoint must return own notifications array, got ${apprenantNotifications.response.status}`,
  );
  const createdNotification = await readJson('/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({
      userId: 'usr-apprenant',
      title: `Notification smoke ${Date.now()}`,
      message: 'Notification creee par smoke test.',
      type: 'system',
    }),
  });
  assert(
    createdNotification.response.ok
      && String(createdNotification.payload.user_id) === 'usr-apprenant'
      && createdNotification.payload.is_read === false,
    `notifications create endpoint must create scoped notification, got ${createdNotification.response.status}`,
  );
  const readNotification = await readJson(`/notifications/${encodeURIComponent(String(createdNotification.payload.id))}/read`, {
    method: 'PATCH',
    headers: {
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
  });
  assert(
    readNotification.response.ok && readNotification.payload.is_read === true,
    `notifications read endpoint must mark own notification as read, got ${readNotification.response.status}`,
  );
  const providerRecipient = await readJson('/notifications/provider-recipients/3', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    providerRecipient.response.ok && typeof providerRecipient.payload.userId !== 'undefined',
    `notifications provider recipient endpoint must return provider user id, got ${providerRecipient.response.status}`,
  );
  const deletedNotification = await readJson(`/notifications/${encodeURIComponent(String(createdNotification.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
  });
  assert(
    deletedNotification.response.ok && String(deletedNotification.payload.id) === String(createdNotification.payload.id),
    `notifications delete endpoint must remove own notification, got ${deletedNotification.response.status}`,
  );

  const createdConversation = await readJson('/messaging/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({
      name: `Conversation smoke ${Date.now()}`,
      role: 'Support C2P',
      participants: ['usr-admin'],
      type: 'individual',
    }),
  });
  assert(
    createdConversation.response.ok
      && String(createdConversation.payload.id)
      && createdConversation.payload.participants.includes('usr-apprenant'),
    `messaging conversation create endpoint must include actor as participant, got ${createdConversation.response.status}`,
  );
  const apprenantConversations = await readJson('/messaging/conversations?summaryOnly=true', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantConversations.response.ok
      && Array.isArray(apprenantConversations.payload)
      && apprenantConversations.payload.some((conversation) => String(conversation.id) === String(createdConversation.payload.id)),
    `messaging conversations endpoint must return own conversations, got ${apprenantConversations.response.status}`,
  );
  const createdMessage = await readJson(`/messaging/conversations/${encodeURIComponent(String(createdConversation.payload.id))}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ content: `Message smoke ${Date.now()}` }),
  });
  assert(
    createdMessage.response.ok
      && String(createdMessage.payload.conversationId) === String(createdConversation.payload.id)
      && String(createdMessage.payload.senderId) === 'usr-apprenant',
    `messaging messages endpoint must create own message, got ${createdMessage.response.status}`,
  );
  const conversationMessages = await readJson(`/messaging/conversations/${encodeURIComponent(String(createdConversation.payload.id))}/messages`, {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    conversationMessages.response.ok
      && Array.isArray(conversationMessages.payload)
      && conversationMessages.payload.some((message) => String(message.id) === String(createdMessage.payload.id)),
    `messaging messages endpoint must list conversation messages, got ${conversationMessages.response.status}`,
  );
  const readConversation = await readJson(`/messaging/conversations/${encodeURIComponent(String(createdConversation.payload.id))}/read`, {
    method: 'PATCH',
    headers: {
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
  });
  assert(
    readConversation.response.ok && Array.isArray(readConversation.payload),
    `messaging read endpoint must return updated messages array, got ${readConversation.response.status}`,
  );

  const anonymousLearningCourse = await request('/learning/apprenant/courses/201');
  assert(anonymousLearningCourse.status === 401, `expected 401 on anonymous learning course detail, got ${anonymousLearningCourse.status}`);
  const publicLearningCourses = await readJson('/learning/public/courses');
  assert(
    publicLearningCourses.response.ok
      && Array.isArray(publicLearningCourses.payload)
      && publicLearningCourses.payload.length > 0
      && publicLearningCourses.payload.every((course) => String(course.status ?? '').toLowerCase() === 'published'),
    `learning public courses endpoint must return published catalog, got ${publicLearningCourses.response.status}`,
  );
  const publicLearningCourse = await readJson('/learning/public/courses/201');
  assert(
    publicLearningCourse.response.ok
      && String(publicLearningCourse.payload.course?.id) === '201'
      && Array.isArray(publicLearningCourse.payload.sections)
      && Array.isArray(publicLearningCourse.payload.lessons)
      && Array.isArray(publicLearningCourse.payload.reviews)
      && Array.isArray(publicLearningCourse.payload.virtualClasses),
    `learning public course detail endpoint must return course structure, got ${publicLearningCourse.response.status}`,
  );
  const publicVirtualClass = await readJson('/learning/public/virtual-classes/6002');
  assert(
    publicVirtualClass.response.ok
      && String(publicVirtualClass.payload.virtualClass?.id) === '6002'
      && String(publicVirtualClass.payload.course?.id) === '201'
      && Array.isArray(publicVirtualClass.payload.sections)
      && Array.isArray(publicVirtualClass.payload.lessons),
    `learning public virtual class endpoint must return class course structure, got ${publicVirtualClass.response.status}`,
  );
  const apprenantLearningCourse = await readJson('/learning/apprenant/courses/201', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningCourse.response.ok
      && apprenantLearningCourse.payload.id === 201
      && Array.isArray(apprenantLearningCourse.payload.modules)
      && apprenantLearningCourse.payload.modules.length > 0,
    'learning apprenant course detail endpoint must return hydrated course modules',
  );
  assert(
    apprenantLearningCourse.payload.modules.every((module) =>
      Array.isArray(module.lessons)
      && module.lessons.every((lesson) => Array.isArray(lesson.resources) && Array.isArray(lesson.contentBlocks)),
    ),
    'learning apprenant course detail endpoint must hydrate lessons, resources and content blocks',
  );
  const smokeCompletedLessonIds = apprenantLearningCourse.payload.modules
    .flatMap((module) => module.lessons)
    .slice(0, 2)
    .map((lesson) => lesson.id);
  const apprenantLearningProgress = await readJson('/learning/apprenant/courses/201/progress', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ progress: 50, completedLessons: 2, completedLessonIds: smokeCompletedLessonIds }),
  });
  assert(
    apprenantLearningProgress.response.ok
      && String(apprenantLearningProgress.payload.student_id) === 'usr-apprenant'
      && String(apprenantLearningProgress.payload.course_id) === '201'
      && Number(apprenantLearningProgress.payload.progress) === 50,
    'learning apprenant progress endpoint must update only the authenticated learner enrollment',
  );
  const apprenantLearningContext = await readJson('/learning/apprenant/courses/201/context', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningContext.response.ok
      && String(apprenantLearningContext.payload.enrollment?.student_id) === 'usr-apprenant'
      && Array.isArray(apprenantLearningContext.payload.lessonProgress),
    'learning apprenant course context endpoint must return scoped enrollment and lesson progress',
  );
  const lessonProgressUpdate = await readJson('/learning/apprenant/courses/201/lessons/2301/progress', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ progress: 100, completed: true, section_id: 2201 }),
  });
  assert(
    lessonProgressUpdate.response.ok
      && String(lessonProgressUpdate.payload.lesson_id) === '2301'
      && String(lessonProgressUpdate.payload.student_id) === 'usr-apprenant'
      && Number(lessonProgressUpdate.payload.progress) === 100,
    `learning apprenant lesson progress endpoint must upsert own progress, got ${lessonProgressUpdate.response.status}`,
  );
  const lessonComments = await readJson('/learning/apprenant/lessons/2301/comments', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    lessonComments.response.ok && Array.isArray(lessonComments.payload),
    `learning apprenant lesson comments endpoint must return comments, got ${lessonComments.response.status}`,
  );
  const createdLessonComment = await readJson('/learning/apprenant/lessons/2301/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ content: `Question smoke ${Date.now()}` }),
  });
  assert(
    createdLessonComment.response.ok
      && String(createdLessonComment.payload.lesson_id) === '2301'
      && String(createdLessonComment.payload.user_id) === 'usr-apprenant',
    `learning apprenant lesson comment endpoint must create own comment, got ${createdLessonComment.response.status}`,
  );
  const courseReview = await readJson('/learning/apprenant/courses/201/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify({ rating: 5, comment: `Avis smoke ${Date.now()}` }),
  });
  assert(
    courseReview.response.ok
      && String(courseReview.payload.course_id) === '201'
      && String(courseReview.payload.student_id) === 'usr-apprenant'
      && Number(courseReview.payload.rating) === 5,
    `learning apprenant course review endpoint must upsert own review, got ${courseReview.response.status}`,
  );
  const enrollExistingCourse = await readJson('/learning/apprenant/courses/201/enroll', {
    method: 'POST',
    headers: {
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
  });
  assert(
    enrollExistingCourse.response.ok
      && String(enrollExistingCourse.payload.course_id) === '201'
      && String(enrollExistingCourse.payload.student_id) === 'usr-apprenant',
    `learning apprenant enroll endpoint must return existing own enrollment, got ${enrollExistingCourse.response.status}`,
  );
  const apprenantLearningEnrollments = await readJson('/learning/apprenant/enrollments?limit=2', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningEnrollments.response.ok
      && Array.isArray(apprenantLearningEnrollments.payload)
      && apprenantLearningEnrollments.payload.length <= 2
      && apprenantLearningEnrollments.payload.every((row) => String(row.student_id) === 'usr-apprenant' && row.courses),
    'learning apprenant enrollments endpoint must return hydrated own enrollments',
  );
  const apprenantLearningCertificates = await readJson('/learning/apprenant/certificates', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningCertificates.response.ok
      && Array.isArray(apprenantLearningCertificates.payload)
      && apprenantLearningCertificates.payload.every((row) => String(row.student_id) === 'usr-apprenant'),
    'learning apprenant certificates endpoint must return own certificates',
  );
  const apprenantLearningDashboard = await readJson('/learning/apprenant/dashboard', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningDashboard.response.ok
      && Array.isArray(apprenantLearningDashboard.payload.enrollments)
      && Array.isArray(apprenantLearningDashboard.payload.certificates),
    'learning apprenant dashboard endpoint must return enrollments and certificates',
  );
  const apprenantLearningProgression = await readJson('/learning/apprenant/progression', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningProgression.response.ok
      && Array.isArray(apprenantLearningProgression.payload.enrollments)
      && Array.isArray(apprenantLearningProgression.payload.certificates)
      && Array.isArray(apprenantLearningProgression.payload.submissions),
    'learning apprenant progression endpoint must return enrollments, certificates and submissions',
  );
  const anonymousParentDashboard = await request('/learning/parent/dashboard');
  assert(anonymousParentDashboard.status === 401, `expected 401 on anonymous parent dashboard, got ${anonymousParentDashboard.status}`);
  const { cookieJar: parentCookies } = await loginAs('parent@c2p.sn');
  const parentDashboard = await readJson('/learning/parent/dashboard', {
    headers: { Cookie: parentCookies },
  });
  assert(
    parentDashboard.response.ok
      && Array.isArray(parentDashboard.payload.links)
      && Array.isArray(parentDashboard.payload.enrollments)
      && Array.isArray(parentDashboard.payload.certificates)
      && parentDashboard.payload.links.every((link) => String(link.parent_id) === 'usr-parent')
      && parentDashboard.payload.enrollments.every((enrollment) =>
        parentDashboard.payload.links.some((link) => String(link.student_id) === String(enrollment.student_id))
      ),
    'learning parent dashboard endpoint must return only linked student data',
  );
  const anonymousLearningExams = await request('/learning/apprenant/exams');
  assert(anonymousLearningExams.status === 401, `expected 401 on anonymous learning exams, got ${anonymousLearningExams.status}`);
  const apprenantLearningExams = await readJson('/learning/apprenant/exams', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    apprenantLearningExams.response.ok
      && Array.isArray(apprenantLearningExams.payload.exams)
      && Array.isArray(apprenantLearningExams.payload.submissions)
      && apprenantLearningExams.payload.exams.every((exam) => String(exam.status) === 'ongoing'),
    'learning apprenant exams endpoint must return only the learner ongoing evaluations and submissions',
  );
  const quizStructure = await readJson('/learning/apprenant/exams/7001/quiz', {
    headers: { Cookie: apprenantCookies },
  });
  assert(
    quizStructure.response.ok
      && Array.isArray(quizStructure.payload.questions)
      && quizStructure.payload.questions.length > 0
      && Array.isArray(quizStructure.payload.choices)
      && quizStructure.payload.choices.every((choice) => choice.is_correct === undefined),
    'learning apprenant quiz endpoint must return questions and hide correct choices before submission',
  );
  const quizSubmissionPayload = {
    answers: [
      { question_id: 7101, selected_choice_ids: ['7201'], answer_text: null },
      { question_id: 7102, selected_choice_ids: ['7204', '7205'], answer_text: null },
    ],
  };
  const apprenantQuizSubmission = await readJson('/learning/apprenant/exams/7001/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: apprenantCookies,
      'X-CSRF-Token': apprenantCsrfToken,
    },
    body: JSON.stringify(quizSubmissionPayload),
  });
  assert(
    (apprenantQuizSubmission.response.ok
      && String(apprenantQuizSubmission.payload.student_id) === 'usr-apprenant'
      && String(apprenantQuizSubmission.payload.exam_id) === '7001'
      && String(apprenantQuizSubmission.payload.status) === 'graded')
      || apprenantQuizSubmission.response.status === 409,
    `learning apprenant submission endpoint must auto-grade a quiz or reject duplicate, got ${apprenantQuizSubmission.response.status}`,
  );

  const anonymousFormateurEvaluations = await request('/learning/formateur/evaluations');
  assert(
    anonymousFormateurEvaluations.status === 401,
    `expected 401 on anonymous formateur evaluations, got ${anonymousFormateurEvaluations.status}`,
  );
  const { cookieJar: formateurCookies, csrfToken: formateurCsrfToken } = await loginAs('formateur@c2p.sn');
  assert(formateurCsrfToken, 'missing csrf cookie for formateur');
  const formateurEvaluations = await readJson('/learning/formateur/evaluations', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurEvaluations.response.ok
      && Array.isArray(formateurEvaluations.payload.courses)
      && Array.isArray(formateurEvaluations.payload.exams)
      && Array.isArray(formateurEvaluations.payload.submissions)
      && formateurEvaluations.payload.courses.every((course) => String(course.id)),
    'learning formateur evaluations endpoint must return instructor scoped courses, exams and submissions',
  );
  assert(
    formateurEvaluations.payload.exams.every((exam) => String(exam.instructor_id ?? 'usr-formateur') === 'usr-formateur'),
    'learning formateur evaluations endpoint must not leak other instructors exams',
  );

  const createdFormateurExam = await readJson('/learning/formateur/exams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      course_id: 201,
      title: `Smoke quiz ${Date.now()}`,
      course_name: 'Marketing digital avance',
      type: 'quiz',
      instructions: 'Question de smoke test CI.',
      attachments: [],
      exam_date: '2099-01-01',
      participants: 1,
      submitted: 0,
      status: 'upcoming',
      max_grade: 20,
    }),
  });
  assert(
    createdFormateurExam.response.ok && createdFormateurExam.payload.id,
    `learning formateur exam create endpoint must create an instructor exam, got ${createdFormateurExam.response.status}`,
  );
  const smokeExamId = createdFormateurExam.payload.id;

  const createdQuizQuestion = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(smokeExamId))}/quiz/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      prompt: 'Quel endpoint remplace le data-layer generique ?',
      type: 'single_choice',
      points: 2,
      explanation: 'Les evaluations formateur passent par /learning/formateur.',
      required: true,
    }),
  });
  assert(
    createdQuizQuestion.response.ok && createdQuizQuestion.payload.id,
    `learning formateur question create endpoint must create quiz question, got ${createdQuizQuestion.response.status}`,
  );

  const createdQuizChoice = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(smokeExamId))}/quiz/choices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      questionId: createdQuizQuestion.payload.id,
      label: '/learning/formateur/evaluations',
      value: 'learning-formateur',
      is_correct: true,
    }),
  });
  assert(
    createdQuizChoice.response.ok && createdQuizChoice.payload.id,
    `learning formateur choice create endpoint must create quiz choice, got ${createdQuizChoice.response.status}`,
  );

  const formateurQuizStructure = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(smokeExamId))}/quiz`, {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurQuizStructure.response.ok
      && formateurQuizStructure.payload.questions.some((question) => String(question.id) === String(createdQuizQuestion.payload.id))
      && formateurQuizStructure.payload.choices.some((choice) =>
        String(choice.id) === String(createdQuizChoice.payload.id) && choice.is_correct === true
      ),
    'learning formateur quiz endpoint must return instructor quiz questions and correct choices',
  );

  const gradedFormateurSubmission = await readJson('/learning/formateur/submissions/8001/grade', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      examTitle: 'Marketing digital avance',
      grade: 16,
      maxGrade: 20,
      feedback: 'Correction smoke test.',
    }),
  });
  assert(
    gradedFormateurSubmission.response.ok
      && String(gradedFormateurSubmission.payload.status) === 'graded'
      && Number(gradedFormateurSubmission.payload.grade) === 16,
    `learning formateur grade endpoint must grade instructor submission, got ${gradedFormateurSubmission.response.status}`,
  );

  const deletedFormateurExam = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(smokeExamId))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedFormateurExam.response.ok && String(deletedFormateurExam.payload.id) === String(smokeExamId),
    `learning formateur exam delete endpoint must remove smoke exam, got ${deletedFormateurExam.response.status}`,
  );

  const anonymousFormateurCourses = await request('/learning/formateur/courses');
  assert(
    anonymousFormateurCourses.status === 401,
    `expected 401 on anonymous formateur courses, got ${anonymousFormateurCourses.status}`,
  );
  const formateurCourses = await readJson('/learning/formateur/courses', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurCourses.response.ok
      && Array.isArray(formateurCourses.payload)
      && formateurCourses.payload.some((course) => String(course.id) === '201'),
    'learning formateur courses endpoint must return instructor scoped courses',
  );
  const formateurCourseProgram = await readJson('/learning/formateur/courses/201/program', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurCourseProgram.response.ok
      && String(formateurCourseProgram.payload.course.id) === '201'
      && Array.isArray(formateurCourseProgram.payload.sections)
      && Array.isArray(formateurCourseProgram.payload.lessons)
      && Array.isArray(formateurCourseProgram.payload.assets),
    'learning formateur course program endpoint must return course structure',
  );
  const createdCourseBundle = await readJson('/learning/formateur/courses/bundle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      course: {
        title: `Smoke formation ${Date.now()}`,
        category: 'Smoke QA',
        level: 'beginner',
        delivery_mode: 'online',
        description: 'Formation creee par smoke test.',
        duration: '1h',
        is_free: true,
        price: 0,
        promotion_percentage: 0,
        trailer_url: '',
        thumbnail: '',
        objectives: ['Valider le flux'],
        prerequisites: [],
        tools: [],
      },
      sections: [{
        id: 'draft-section-1',
        title: 'Chapitre smoke',
        description: 'Chapitre de test.',
        status: 'draft',
        position: 1,
        lessons: [{
          id: 'draft-lesson-1',
          title: 'Lecon smoke',
          description: 'Lecon de test.',
          type: 'article',
          duration: '10 min',
          content: 'Contenu smoke.',
          code_language: 'markdown',
          code_sample: '',
          exercise_instructions: '',
          is_preview: true,
          status: 'draft',
          position: 1,
        }],
      }],
      assets: [],
      exams: [],
    }),
  });
  assert(
    createdCourseBundle.response.ok
      && createdCourseBundle.payload.id
      && String(createdCourseBundle.payload.instructor_id) === 'usr-formateur',
    `learning formateur course bundle endpoint must create instructor course, got ${createdCourseBundle.response.status}`,
  );
  const smokeCourseId = createdCourseBundle.payload.id;
  const createdCourseProgram = await readJson(`/learning/formateur/courses/${encodeURIComponent(String(smokeCourseId))}/program`, {
    headers: { Cookie: formateurCookies },
  });
  assert(
    createdCourseProgram.response.ok
      && String(createdCourseProgram.payload.course.id) === String(smokeCourseId)
      && createdCourseProgram.payload.sections.some((section) => section.title === 'Chapitre smoke')
      && createdCourseProgram.payload.lessons.some((lesson) => lesson.title === 'Lecon smoke'),
    `learning formateur course bundle must be readable with its created program, got ${createdCourseProgram.response.status}`,
  );
  const formateurCoursesAfterBundle = await readJson('/learning/formateur/courses', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurCoursesAfterBundle.response.ok
      && formateurCoursesAfterBundle.payload.some((course) => String(course.id) === String(smokeCourseId)),
    'learning formateur courses endpoint must display the created course bundle',
  );
  const updatedCourse = await readJson(`/learning/formateur/courses/${encodeURIComponent(String(smokeCourseId))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ title: 'Smoke formation mise a jour' }),
  });
  assert(
    updatedCourse.response.ok
      && String(updatedCourse.payload.id) === String(smokeCourseId)
      && updatedCourse.payload.title === 'Smoke formation mise a jour',
    `learning formateur course update endpoint must update instructor course, got ${updatedCourse.response.status}`,
  );
  const createdSection = await readJson('/learning/formateur/courses/201/sections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      title: `Chapitre smoke ${Date.now()}`,
      description: 'Chapitre cree par smoke test.',
      status: 'draft',
    }),
  });
  assert(
    createdSection.response.ok
      && createdSection.payload.id
      && String(createdSection.payload.course_id) === '201',
    `learning formateur section create endpoint must create instructor section, got ${createdSection.response.status}`,
  );
  const createdLesson = await readJson('/learning/formateur/courses/201/lessons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      section_id: createdSection.payload.id,
      title: 'Lecon smoke runtime',
      description: 'Lecon creee par smoke test.',
      type: 'article',
      duration: '5 min',
      content: 'Contenu de test.',
      code_language: 'markdown',
      code_sample: '',
      exercise_instructions: '',
      is_preview: false,
      status: 'draft',
    }),
  });
  assert(
    createdLesson.response.ok
      && createdLesson.payload.id
      && String(createdLesson.payload.section_id) === String(createdSection.payload.id),
    `learning formateur lesson create endpoint must create instructor lesson, got ${createdLesson.response.status}`,
  );
  const createdAsset = await readJson('/learning/formateur/courses/201/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      lesson_id: createdLesson.payload.id,
      title: 'Ressource smoke',
      asset_type: 'link',
      url: 'https://c2p.sn/smoke-resource',
      thumbnail_url: '',
      mime_type: 'text/html',
      size_bytes: 0,
      status: 'ready',
    }),
  });
  assert(
    createdAsset.response.ok
      && createdAsset.payload.id
      && String(createdAsset.payload.lesson_id) === String(createdLesson.payload.id),
    `learning formateur asset create endpoint must create instructor asset, got ${createdAsset.response.status}`,
  );
  const deletedAsset = await readJson(`/learning/formateur/courses/201/assets/${encodeURIComponent(String(createdAsset.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedAsset.response.ok && String(deletedAsset.payload.id) === String(createdAsset.payload.id),
    `learning formateur asset delete endpoint must remove smoke asset, got ${deletedAsset.response.status}`,
  );
  const deletedSection = await readJson(`/learning/formateur/courses/201/sections/${encodeURIComponent(String(createdSection.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedSection.response.ok && String(deletedSection.payload.id) === String(createdSection.payload.id),
    `learning formateur section delete endpoint must remove smoke section and cascade lesson, got ${deletedSection.response.status}`,
  );
  const deletedCourseBundle = await readJson(`/learning/formateur/courses/${encodeURIComponent(String(smokeCourseId))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedCourseBundle.response.ok && String(deletedCourseBundle.payload.id) === String(smokeCourseId),
    `learning formateur course delete endpoint must remove smoke course, got ${deletedCourseBundle.response.status}`,
  );

  const anonymousFormateurCertificates = await request('/learning/formateur/certificates');
  assert(
    anonymousFormateurCertificates.status === 401,
    `expected 401 on anonymous formateur certificates, got ${anonymousFormateurCertificates.status}`,
  );
  const formateurCertificates = await readJson('/learning/formateur/certificates', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurCertificates.response.ok
      && Array.isArray(formateurCertificates.payload)
      && formateurCertificates.payload.every((certificate) => ['201', '202', '203', '204'].includes(String(certificate.course_id))),
    'learning formateur certificates endpoint must return instructor scoped certificates',
  );
  const pendingCertificate = formateurCertificates.payload.find((certificate) => String(certificate.status) !== 'issued');
  if (pendingCertificate?.id) {
    const issuedCertificate = await readJson(`/learning/formateur/certificates/${encodeURIComponent(String(pendingCertificate.id))}/issue`, {
      method: 'PATCH',
      headers: {
        Cookie: formateurCookies,
        'X-CSRF-Token': formateurCsrfToken,
      },
    });
    assert(
      issuedCertificate.response.ok
        && issuedCertificate.payload.certificateId
        && issuedCertificate.payload.issuedAt,
      `learning formateur certificate issue endpoint must issue instructor certificate, got ${issuedCertificate.response.status}`,
    );
  }
  const createdCertificateRow = pendingCertificate ?? formateurCertificates.payload.find((certificate) => certificate.id);
  if (createdCertificateRow?.id) {
    const deletedCertificate = await readJson(`/learning/formateur/certificates/${encodeURIComponent(String(createdCertificateRow.id))}`, {
      method: 'DELETE',
      headers: {
        Cookie: formateurCookies,
        'X-CSRF-Token': formateurCsrfToken,
      },
    });
    assert(
      deletedCertificate.response.ok && String(deletedCertificate.payload.id) === String(createdCertificateRow.id),
      `learning formateur certificate delete endpoint must delete instructor certificate, got ${deletedCertificate.response.status}`,
    );
  }
  const anonymousFormateurLearners = await request('/learning/formateur/learners');
  assert(
    anonymousFormateurLearners.status === 401,
    `expected 401 on anonymous formateur learners, got ${anonymousFormateurLearners.status}`,
  );
  const formateurLearners = await readJson('/learning/formateur/learners', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurLearners.response.ok
      && Array.isArray(formateurLearners.payload.courses)
      && Array.isArray(formateurLearners.payload.enrollments)
      && formateurLearners.payload.enrollments.some((enrollment) => String(enrollment.student_id) === 'usr-apprenant'),
    'learning formateur learners endpoint must return instructor scoped enrollments',
  );
  const formateurLearnerDetail = await readJson('/learning/formateur/learners/usr-apprenant', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurLearnerDetail.response.ok
      && Array.isArray(formateurLearnerDetail.payload.enrollments)
      && Array.isArray(formateurLearnerDetail.payload.submissions)
      && Array.isArray(formateurLearnerDetail.payload.certificates),
    'learning formateur learner detail endpoint must return enrollments, submissions and certificates',
  );

  const anonymousFormateurVirtualClasses = await request('/learning/formateur/virtual-classes');
  assert(
    anonymousFormateurVirtualClasses.status === 401,
    `expected 401 on anonymous formateur virtual classes, got ${anonymousFormateurVirtualClasses.status}`,
  );
  const formateurVirtualClasses = await readJson('/learning/formateur/virtual-classes', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurVirtualClasses.response.ok
      && Array.isArray(formateurVirtualClasses.payload.classes)
      && Array.isArray(formateurVirtualClasses.payload.courses)
      && formateurVirtualClasses.payload.courses.some((course) => String(course.id) === '201'),
    'learning formateur virtual classes endpoint must return instructor scoped classes and courses',
  );
  const createdVirtualClass = await readJson('/learning/formateur/virtual-classes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      course_id: 201,
      title: `Classe smoke ${Date.now()}`,
      class_date: '2099-01-02',
      class_time: '10:30',
      duration: '1h',
      max_students: 12,
      provider: 'jitsi',
      meeting_slug: '',
      recording_enabled: true,
      instructor_notes: 'Classe virtuelle créée par smoke test.',
      allow_chat: true,
    }),
  });
  assert(
    createdVirtualClass.response.ok
      && createdVirtualClass.payload.id
      && String(createdVirtualClass.payload.course_id) === '201'
      && String(createdVirtualClass.payload.status) === 'scheduled',
    `learning formateur virtual class create endpoint must create an instructor class, got ${createdVirtualClass.response.status}`,
  );
  const smokeVirtualClassId = createdVirtualClass.payload.id;
  const updatedVirtualClass = await readJson(`/learning/formateur/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      title: 'Classe smoke mise a jour',
      class_date: '2099-01-03',
      class_time: '11:00',
    }),
  });
  assert(
    updatedVirtualClass.response.ok
      && String(updatedVirtualClass.payload.id) === String(smokeVirtualClassId)
      && updatedVirtualClass.payload.title === 'Classe smoke mise a jour',
    `learning formateur virtual class update endpoint must update an instructor class, got ${updatedVirtualClass.response.status}`,
  );
  const liveVirtualClass = await readJson(`/learning/formateur/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ status: 'live' }),
  });
  assert(
    liveVirtualClass.response.ok
      && String(liveVirtualClass.payload.status) === 'live'
      && liveVirtualClass.payload.started_at,
    `learning formateur virtual class status endpoint must start an instructor class, got ${liveVirtualClass.response.status}`,
  );
  const endedVirtualClass = await readJson(`/learning/formateur/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ status: 'ended' }),
  });
  assert(
    endedVirtualClass.response.ok
      && String(endedVirtualClass.payload.status) === 'ended'
      && endedVirtualClass.payload.ended_at
      && String(endedVirtualClass.payload.recording_status) === 'processing',
    `learning formateur virtual class status endpoint must end an instructor class and prepare replay, got ${endedVirtualClass.response.status}`,
  );
  const replayUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
  const replayReadyVirtualClass = await readJson(`/learning/formateur/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ recording_url: replayUrl }),
  });
  assert(
    replayReadyVirtualClass.response.ok
      && String(replayReadyVirtualClass.payload.recording_url) === replayUrl
      && String(replayReadyVirtualClass.payload.recording_status) === 'ready',
    `learning formateur virtual class replay update must mark replay ready, got ${replayReadyVirtualClass.response.status}`,
  );
  const publicReplayVirtualClass = await readJson(`/learning/public/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}`);
  assert(
    publicReplayVirtualClass.response.ok
      && !publicReplayVirtualClass.payload.virtualClass?.recording_url
      && !publicReplayVirtualClass.payload.virtualClass?.room_link
      && !publicReplayVirtualClass.payload.virtualClass?.meeting_slug
      && (publicReplayVirtualClass.payload.lessons ?? []).every((lesson) => Boolean(lesson.is_preview)),
    `public virtual class detail must hide protected links and non-preview lessons, got ${publicReplayVirtualClass.response.status}`,
  );
  const authorizedReplayVirtualClass = await readJson(`/learning/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}`, {
    headers: { Cookie: formateurCookies },
  });
  assert(
    authorizedReplayVirtualClass.response.ok
      && String(authorizedReplayVirtualClass.payload.virtualClass?.recording_url) === replayUrl
      && String(authorizedReplayVirtualClass.payload.virtualClass?.recording_status) === 'ready',
    `authorized virtual class detail must expose ready replay, got ${authorizedReplayVirtualClass.response.status}`,
  );
  const deletedVirtualClass = await readJson(`/learning/formateur/virtual-classes/${encodeURIComponent(String(smokeVirtualClassId))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedVirtualClass.response.ok && String(deletedVirtualClass.payload.id) === String(smokeVirtualClassId),
    `learning formateur virtual class delete endpoint must remove smoke class, got ${deletedVirtualClass.response.status}`,
  );

  const anonymousFormateurCommunity = await request('/learning/formateur/community');
  assert(
    anonymousFormateurCommunity.status === 401,
    `expected 401 on anonymous formateur community, got ${anonymousFormateurCommunity.status}`,
  );
  const formateurCommunity = await readJson('/learning/formateur/community', {
    headers: { Cookie: formateurCookies },
  });
  assert(
    formateurCommunity.response.ok
      && Array.isArray(formateurCommunity.payload.courses)
      && Array.isArray(formateurCommunity.payload.comments)
      && Array.isArray(formateurCommunity.payload.faqs),
    'learning formateur community endpoint must return instructor scoped courses, comments and FAQ rows',
  );
  const smokeComment = formateurCommunity.payload.comments.find((comment) => !comment.parent_id);
  assert(smokeComment?.id, 'learning formateur community smoke needs at least one root comment');
  const moderatedComment = await readJson(`/learning/formateur/community/comments/${encodeURIComponent(String(smokeComment.id))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ status: 'visible', pinned: false }),
  });
  assert(
    moderatedComment.response.ok
      && String(moderatedComment.payload.id) === String(smokeComment.id)
      && String(moderatedComment.payload.status) === 'visible',
    `learning formateur comment moderation endpoint must update an instructor comment, got ${moderatedComment.response.status}`,
  );
  const createdReply = await readJson(`/learning/formateur/community/comments/${encodeURIComponent(String(smokeComment.id))}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ content: 'Reponse smoke test formateur.' }),
  });
  assert(
    createdReply.response.ok
      && createdReply.payload.id
      && String(createdReply.payload.parent_id) === String(smokeComment.id),
    `learning formateur comment reply endpoint must create an instructor reply, got ${createdReply.response.status}`,
  );
  const deletedReply = await readJson(`/learning/formateur/community/comments/${encodeURIComponent(String(createdReply.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedReply.response.ok && String(deletedReply.payload.id) === String(createdReply.payload.id),
    `learning formateur comment delete endpoint must remove smoke reply, got ${deletedReply.response.status}`,
  );
  const createdFaq = await readJson('/learning/formateur/community/faqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({
      course_id: 201,
      question: `FAQ smoke ${Date.now()} ?`,
      answer: 'Reponse FAQ smoke test.',
      status: 'draft',
    }),
  });
  assert(
    createdFaq.response.ok
      && createdFaq.payload.id
      && String(createdFaq.payload.course_id) === '201',
    `learning formateur FAQ create endpoint must create an instructor FAQ, got ${createdFaq.response.status}`,
  );
  const updatedFaq = await readJson(`/learning/formateur/community/faqs/${encodeURIComponent(String(createdFaq.payload.id))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
    body: JSON.stringify({ status: 'published' }),
  });
  assert(
    updatedFaq.response.ok
      && String(updatedFaq.payload.id) === String(createdFaq.payload.id)
      && String(updatedFaq.payload.status) === 'published',
    `learning formateur FAQ update endpoint must update an instructor FAQ, got ${updatedFaq.response.status}`,
  );
  const deletedFaq = await readJson(`/learning/formateur/community/faqs/${encodeURIComponent(String(createdFaq.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: formateurCookies,
      'X-CSRF-Token': formateurCsrfToken,
    },
  });
  assert(
    deletedFaq.response.ok && String(deletedFaq.payload.id) === String(createdFaq.payload.id),
    `learning formateur FAQ delete endpoint must remove smoke FAQ, got ${deletedFaq.response.status}`,
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
  const partnerTrackedEndpoint = await readJson('/project-center/partner/tracked-projects', {
    headers: { Cookie: partenaireCookies },
  });
  assert(
    partnerTrackedEndpoint.response.ok
      && Array.isArray(partnerTrackedEndpoint.payload)
      && partnerTrackedEndpoint.payload.every((row) => String(row.partner_id) === 'usr-partenaire'),
    'project-center partner tracked endpoint must only return authenticated partner rows',
  );
  const partnerSnapshotEndpoint = await readJson('/project-center/partner/snapshot', {
    headers: { Cookie: partenaireCookies },
  });
  assert(
    partnerSnapshotEndpoint.response.ok
      && Array.isArray(partnerSnapshotEndpoint.payload.trackedProjects)
      && Array.isArray(partnerSnapshotEndpoint.payload.collaborations)
      && Array.isArray(partnerSnapshotEndpoint.payload.openProjects),
    'project-center partner snapshot endpoint must return dashboard arrays',
  );
  const partnerTrackedDetailEndpoint = await readJson('/project-center/partner/tracked-projects/4001', {
    headers: { Cookie: partenaireCookies },
  });
  assert(
    partnerTrackedDetailEndpoint.response.ok
      && String(partnerTrackedDetailEndpoint.payload.tracked.partner_id) === 'usr-partenaire'
      && String(partnerTrackedDetailEndpoint.payload.detail.project.id) === '4001',
    'project-center partner tracked detail endpoint must return a tracked project detail',
  );
  const partnerCollaborationsEndpoint = await readJson('/project-center/partner/collaborations', {
    headers: { Cookie: partenaireCookies },
  });
  assert(
    partnerCollaborationsEndpoint.response.ok
      && Array.isArray(partnerCollaborationsEndpoint.payload)
      && partnerCollaborationsEndpoint.payload.every((row) => String(row.partner_id) === 'usr-partenaire'),
    'project-center partner collaborations endpoint must only return authenticated partner rows',
  );
  const partnerOpenProjectsEndpoint = await readJson('/project-center/partner/open-projects', {
    headers: { Cookie: partenaireCookies },
  });
  assert(
    partnerOpenProjectsEndpoint.response.ok
      && Array.isArray(partnerOpenProjectsEndpoint.payload)
      && partnerOpenProjectsEndpoint.payload.every((row) =>
        !('owner_id' in row)
        && !('valuation' in row)
        && !('revenue' in row)
        && String(row.status ?? '').toLowerCase() !== 'termine'
      ),
    'project-center partner open projects endpoint must return public non-finished projects',
  );
  const partnerExistingInterest = await readJson('/project-center/partner/interests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partenaireCookies,
      'X-CSRF-Token': readCookie(partenaireCookies, 'c2p_csrf'),
    },
    body: JSON.stringify({ projectId: 4001, partnerType: 'financier' }),
  });
  assert(
    partnerExistingInterest.response.ok && partnerExistingInterest.payload.alreadyTracked === true,
    'project-center partner interest endpoint must be idempotent for already tracked projects',
  );
  const firstPartnerCollaboration = partnerCollaborationsEndpoint.payload[0];
  const partnerCollaborationPatch = await readJson(`/project-center/partner/collaborations/${encodeURIComponent(String(firstPartnerCollaboration.id))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partenaireCookies,
      'X-CSRF-Token': readCookie(partenaireCookies, 'c2p_csrf'),
    },
    body: JSON.stringify({
      status: firstPartnerCollaboration.status,
      meetings: firstPartnerCollaboration.meetings,
    }),
  });
  assert(
    partnerCollaborationPatch.response.ok
      && String(partnerCollaborationPatch.payload.id) === String(firstPartnerCollaboration.id)
      && String(partnerCollaborationPatch.payload.partner_id) === 'usr-partenaire',
    'project-center partner collaboration patch endpoint must update only authenticated partner rows',
  );
  const partnerSupportConversation = await readJson('/project-center/partner/support-conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: partenaireCookies,
      'X-CSRF-Token': readCookie(partenaireCookies, 'c2p_csrf'),
    },
    body: JSON.stringify({ projectId: 4001, projectTitle: 'AgroLink' }),
  });
  assert(
    partnerSupportConversation.response.ok
      && partnerSupportConversation.payload.conversationId
      && partnerSupportConversation.payload.messageId,
    'project-center partner support conversation endpoint must open or reuse a C2P conversation',
  );

  const { cookieJar: porteurCookies, csrfToken: porteurCsrfToken } = await loginAs('porteur@c2p.sn');
  assert(porteurCsrfToken, 'missing csrf cookie for porteur');
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

  const porteurProjectDocuments = await readJson('/data/project_documents?eq_project_id=4001', {
    headers: { Cookie: porteurCookies },
  });
  assert(porteurProjectDocuments.response.ok, `expected 200 on owner project documents, got ${porteurProjectDocuments.response.status}`);
  assert(
    Array.isArray(porteurProjectDocuments.payload) && porteurProjectDocuments.payload.length > 0,
    'porteur must receive private documents for owned projects',
  );
  assert(
    porteurProjectDocuments.payload.some((row) => String(row.category) === 'finance'),
    'porteur project documents must keep private categories for owner dashboards',
  );

  const porteurFundingRounds = await readJson('/data/project_funding_rounds?eq_project_id=4001', {
    headers: { Cookie: porteurCookies },
  });
  assert(porteurFundingRounds.response.ok, `expected 200 on owner funding rounds, got ${porteurFundingRounds.response.status}`);
  assert(
    porteurFundingRounds.payload.some((row) => 'valuation' in row && 'burn_rate' in row),
    'porteur funding rounds must keep internal financial diligence fields for owner dashboards',
  );

  const projectSubmissionTitle = `Smoke ProjectCenter ${Date.now()}`;
  const projectSubmission = await readJson('/project-center/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: porteurCookies,
      'X-CSRF-Token': porteurCsrfToken,
    },
    body: JSON.stringify({
      projectName: projectSubmissionTitle,
      category: 'Technologies',
      stage: 'prototype',
      location: 'Dakar, Senegal',
      shortDescription: 'Projet smoke pour verifier le flux de soumission metier.',
      problemStatement: 'Les porteurs ont besoin d un flux de test fiable.',
      solution: 'Centraliser la soumission via ProjectCenter.',
      targetMarket: 'PME et entrepreneurs locaux.',
      businessModel: 'Commission et accompagnement.',
      competition: 'Solutions manuelles.',
      founderName: 'Cheikh Ba',
      founderEmail: 'porteur@c2p.sn',
      founderPhone: '+221771234567',
      founderBio: 'Porteur de projet C2P.',
      teamSize: '2-3',
      fundingGoal: '2500000',
      fundingType: 'mixte',
      currentFunding: '250000',
      useOfFunds: 'Produit, operations et lancement commercial.',
      partnerNeeds: ['Partenaire financier'],
      businessPlan: 'business-plan.pdf',
      pitchDeck: 'pitch.pdf',
      financialProjections: 'projection.xlsx',
    }),
  });
  assert(projectSubmission.response.ok, `expected 200/201 on project-center submission, got ${projectSubmission.response.status}`);
  assert(
    projectSubmission.payload.project && projectSubmission.payload.project.id && projectSubmission.payload.project.title === projectSubmissionTitle,
    'project-center submission must return the created project summary',
  );
  const submittedProjectId = projectSubmission.payload.project.id;
  const submittedProjectOwnerRead = await readJson(`/data/projects?eq_id=${encodeURIComponent(String(submittedProjectId))}&single=true`, {
    headers: { Cookie: porteurCookies },
  });
  assert(submittedProjectOwnerRead.response.ok, `expected 200 on submitted project owner read, got ${submittedProjectOwnerRead.response.status}`);
  assert(
    submittedProjectOwnerRead.payload
      && String(submittedProjectOwnerRead.payload.id) === String(submittedProjectId)
      && String(submittedProjectOwnerRead.payload.owner_id) === 'usr-porteur',
    'submitted project must be persisted with the authenticated porteur as owner',
  );
  const ownerProjectEndpoint = await readJson(`/project-center/owner/projects/${encodeURIComponent(String(submittedProjectId))}`, {
    headers: { Cookie: porteurCookies },
  });
  assert(
    ownerProjectEndpoint.response.ok
      && ownerProjectEndpoint.payload.project
      && String(ownerProjectEndpoint.payload.project.owner_id) === 'usr-porteur',
    'project-center owner detail endpoint must return private owned project data',
  );
  assert(
    ownerProjectEndpoint.payload.documents.length === 3
      && ownerProjectEndpoint.payload.milestones.some((row) => Array.isArray(row.tasks)),
    'project-center owner detail endpoint must include private documents and milestone tasks',
  );
  const submittedProjectDocuments = await readJson(`/data/project_documents?eq_project_id=${encodeURIComponent(String(submittedProjectId))}`, {
    headers: { Cookie: porteurCookies },
  });
  assert(
    submittedProjectDocuments.response.ok
      && Array.isArray(submittedProjectDocuments.payload)
      && submittedProjectDocuments.payload.length === 3,
    'project-center submission must persist attached document metadata for the owner',
  );
  const ownerProjectsEndpoint = await readJson('/project-center/owner/projects', {
    headers: { Cookie: porteurCookies },
  });
  assert(
    ownerProjectsEndpoint.response.ok
      && ownerProjectsEndpoint.payload.some((row) => String(row.id) === String(submittedProjectId)),
    'project-center owner projects endpoint must include submitted project',
  );
  const ownerSnapshotEndpoint = await readJson('/project-center/owner/snapshot', {
    headers: { Cookie: porteurCookies },
  });
  assert(
    ownerSnapshotEndpoint.response.ok
      && ownerSnapshotEndpoint.payload.projects.some((row) => String(row.id) === String(submittedProjectId)),
    'project-center owner snapshot endpoint must include submitted project',
  );
  const ownerPatchEndpoint = await readJson(`/project-center/owner/projects/${encodeURIComponent(String(submittedProjectId))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: porteurCookies,
      'X-CSRF-Token': porteurCsrfToken,
    },
    body: JSON.stringify({
      title: `${projectSubmissionTitle} maj`,
      description: 'Description mise a jour par endpoint metier owner.',
      status: 'incubation',
    }),
  });
  assert(
    ownerPatchEndpoint.response.ok
      && ownerPatchEndpoint.payload.title === `${projectSubmissionTitle} maj`
      && ownerPatchEndpoint.payload.status === 'incubation',
    'project-center owner update endpoint must update owned project only',
  );
  const ownerFundingRoundsEndpoint = await readJson('/project-center/owner/funding-rounds', {
    headers: { Cookie: porteurCookies },
  });
  const submittedRound = ownerFundingRoundsEndpoint.payload.find((row) => String(row.project_id) === String(submittedProjectId));
  assert(
    ownerFundingRoundsEndpoint.response.ok && submittedRound,
    'project-center owner funding rounds endpoint must include submitted project funding round',
  );
  const ownerFundingRoundDetailEndpoint = await readJson(`/project-center/owner/funding-rounds/${encodeURIComponent(String(submittedRound.id))}`, {
    headers: { Cookie: porteurCookies },
  });
  assert(
    ownerFundingRoundDetailEndpoint.response.ok
      && ownerFundingRoundDetailEndpoint.payload.round
      && String(ownerFundingRoundDetailEndpoint.payload.round.project_id) === String(submittedProjectId),
    'project-center owner funding round detail endpoint must return owned funding round detail',
  );
  const ownerFundingRoundCreateEndpoint = await readJson('/project-center/owner/funding-rounds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: porteurCookies,
      'X-CSRF-Token': porteurCsrfToken,
    },
    body: JSON.stringify({
      projectId: submittedProjectId,
      type: 'amorçage',
      targetAmount: 1000000,
      deadline: '2026-12-31',
      description: 'Tour additionnel de smoke test.',
    }),
  });
  assert(
    ownerFundingRoundCreateEndpoint.response.ok
      && String(ownerFundingRoundCreateEndpoint.payload.project_id) === String(submittedProjectId),
    'project-center owner funding round create endpoint must persist an owned funding round',
  );
  const ownerPartnershipsEndpoint = await readJson('/project-center/owner/partnerships', {
    headers: { Cookie: porteurCookies },
  });
  assert(
    ownerPartnershipsEndpoint.response.ok && Array.isArray(ownerPartnershipsEndpoint.payload),
    'project-center owner partnerships endpoint must return an array',
  );
  const cleanupSubmittedProject = await request(`/project-center/owner/projects/${encodeURIComponent(String(submittedProjectId))}`, {
    method: 'DELETE',
    headers: {
      Cookie: porteurCookies,
      'X-CSRF-Token': porteurCsrfToken,
    },
  });
  assert(
    cleanupSubmittedProject.ok,
    `expected cleanup delete for submitted project to succeed, got ${cleanupSubmittedProject.status}`,
  );

  const anonymousMarketplaceClient = await request('/marketplace/client/dashboard');
  assert(
    anonymousMarketplaceClient.status === 401,
    `expected 401 on anonymous marketplace client dashboard, got ${anonymousMarketplaceClient.status}`,
  );
  const anonymousMarketplacePrestataire = await request('/marketplace/prestataire/dashboard');
  assert(
    anonymousMarketplacePrestataire.status === 401,
    `expected 401 on anonymous marketplace prestataire dashboard, got ${anonymousMarketplacePrestataire.status}`,
  );
  const publicProviders = await readJson('/marketplace/providers/public');
  assert(
    publicProviders.response.ok
      && Array.isArray(publicProviders.payload)
      && publicProviders.payload.length > 0,
    `marketplace public providers endpoint must return providers, got ${publicProviders.response.status}`,
  );
  const firstProviderId = publicProviders.payload[0]?.id;
  const publicProviderDetail = await readJson(`/marketplace/providers/public/${encodeURIComponent(String(firstProviderId))}`);
  assert(
    publicProviderDetail.response.ok
      && String(publicProviderDetail.payload?.id) === String(firstProviderId),
    `marketplace public provider detail endpoint must return requested provider, got ${publicProviderDetail.response.status}`,
  );
  const publicProviderReviews = await readJson(`/marketplace/providers/public/${encodeURIComponent(String(firstProviderId))}/reviews`);
  assert(
    publicProviderReviews.response.ok && Array.isArray(publicProviderReviews.payload),
    `marketplace public provider reviews endpoint must return review list, got ${publicProviderReviews.response.status}`,
  );
  const anonymousProviderReviewWrite = await readJson(`/marketplace/client/providers/${encodeURIComponent(String(firstProviderId))}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 5, comment: 'anonymous smoke must fail' }),
  });
  assert(
    anonymousProviderReviewWrite.response.status === 401,
    `expected 401 on anonymous provider review write, got ${anonymousProviderReviewWrite.response.status}`,
  );
  const publicInstructorCourses = await readJson('/learning/public/instructors/usr-formateur/courses');
  assert(
    publicInstructorCourses.response.ok
      && Array.isArray(publicInstructorCourses.payload)
      && publicInstructorCourses.payload.every((course) =>
        String(course.instructor_id) === 'usr-formateur'
        && String(course.status ?? '').toLowerCase() === 'published'
      ),
    `learning public instructor courses endpoint must return published instructor courses, got ${publicInstructorCourses.response.status}`,
  );

  const { cookieJar: clientCookies, csrfToken: clientCsrfToken } = await loginAs('client@c2p.sn');
  assert(clientCsrfToken, 'missing csrf cookie for client');
  const clientPublicProject = await readJson('/data/projects?eq_id=4001&single=true', {
    headers: { Cookie: clientCookies },
  });
  assert(clientPublicProject.response.ok, `expected 200 on client public project read, got ${clientPublicProject.response.status}`);
  assert(
    clientPublicProject.payload && !('owner_id' in clientPublicProject.payload) && !('valuation' in clientPublicProject.payload),
    'non-owner authenticated users must receive only public project fields',
  );

  const clientForbiddenFinanceReads = [
    '/data/payment_transactions?eq_user_id=usr-admin',
    '/data/wallet_accounts?eq_user_id=usr-admin',
    '/data/invoices?eq_user_id=usr-admin',
    '/data/user_subscriptions?eq_user_id=usr-admin',
  ];
  for (const path of clientForbiddenFinanceReads) {
    const sensitiveRows = await readJson(path, {
      headers: { Cookie: clientCookies },
    });
    assert(
      sensitiveRows.response.ok || sensitiveRows.response.status === 401,
      `expected 200 filtered or 401 on finance read ${path}, got ${sensitiveRows.response.status}`,
    );
    if (sensitiveRows.response.status === 401) {
      continue;
    }
    assert(
      Array.isArray(sensitiveRows.payload) && sensitiveRows.payload.length === 0,
      `client must not receive another user's finance rows for ${path}`,
    );
  }

  const marketplaceClientDashboard = await readJson('/marketplace/client/dashboard', {
    headers: { Cookie: clientCookies },
  });
  assert(
    marketplaceClientDashboard.response.ok
      && Array.isArray(marketplaceClientDashboard.payload.bookings)
      && Array.isArray(marketplaceClientDashboard.payload.orders)
      && Array.isArray(marketplaceClientDashboard.payload.favorites),
    'marketplace client dashboard endpoint must return scoped bookings, orders and favorites',
  );
  const marketplaceClientBookings = await readJson('/marketplace/client/bookings', {
    headers: { Cookie: clientCookies },
  });
  assert(
    marketplaceClientBookings.response.ok
      && Array.isArray(marketplaceClientBookings.payload.bookings)
      && marketplaceClientBookings.payload.bookings.every((row) => String(row.client_id) === 'usr-client')
      && marketplaceClientBookings.payload.providers,
    'marketplace client bookings endpoint must return own bookings and provider map',
  );
  const marketplaceClientProviders = await readJson('/marketplace/client/providers', {
    headers: { Cookie: clientCookies },
  });
  assert(
    marketplaceClientProviders.response.ok
      && Array.isArray(marketplaceClientProviders.payload.providers)
      && Array.isArray(marketplaceClientProviders.payload.favorites),
    'marketplace client providers endpoint must return providers and own favorites',
  );
  const favoriteProvider = marketplaceClientProviders.payload.providers.find((provider) =>
    !marketplaceClientProviders.payload.favorites.some((favorite) => String(favorite.provider_id) === String(provider.id))
  );
  if (favoriteProvider) {
    const createdFavorite = await readJson('/marketplace/client/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: clientCookies,
        'X-CSRF-Token': clientCsrfToken,
      },
      body: JSON.stringify({ providerId: favoriteProvider.id }),
    });
    assert(
      createdFavorite.response.ok
        && createdFavorite.payload.id
        && String(createdFavorite.payload.client_id) === 'usr-client',
      `marketplace client favorite endpoint must create a favorite, got ${createdFavorite.response.status}`,
    );
    const deletedFavorite = await readJson(`/marketplace/client/favorites/${encodeURIComponent(String(createdFavorite.payload.id))}`, {
      method: 'DELETE',
      headers: {
        Cookie: clientCookies,
        'X-CSRF-Token': clientCsrfToken,
      },
    });
    assert(
      deletedFavorite.response.ok && String(deletedFavorite.payload.id) === String(createdFavorite.payload.id),
      `marketplace client favorite delete endpoint must remove smoke favorite, got ${deletedFavorite.response.status}`,
    );
  }

  const { cookieJar: prestataireCookies, csrfToken: prestataireCsrfToken } = await loginAs('prestataire@c2p.sn');
  assert(prestataireCsrfToken, 'missing csrf cookie for prestataire');
  const marketplacePrestataireDashboard = await readJson('/marketplace/prestataire/dashboard', {
    headers: { Cookie: prestataireCookies },
  });
  assert(
    marketplacePrestataireDashboard.response.ok
      && marketplacePrestataireDashboard.payload.provider
      && Array.isArray(marketplacePrestataireDashboard.payload.bookings)
      && Array.isArray(marketplacePrestataireDashboard.payload.reviews),
    'marketplace prestataire dashboard endpoint must return scoped provider, bookings and reviews',
  );
  const marketplaceProviderByUser = await readJson('/marketplace/providers/by-user/usr-prestataire', {
    headers: { Cookie: prestataireCookies },
  });
  assert(
    marketplaceProviderByUser.response.ok
      && String(marketplaceProviderByUser.payload?.user_id) === 'usr-prestataire',
    `marketplace provider by user endpoint must return prestataire provider, got ${marketplaceProviderByUser.response.status}`,
  );
  const marketplacePrestataireServices = await readJson('/marketplace/prestataire/services', {
    headers: { Cookie: prestataireCookies },
  });
  assert(
    marketplacePrestataireServices.response.ok
      && marketplacePrestataireServices.payload.providerId
      && Array.isArray(marketplacePrestataireServices.payload.services),
    'marketplace prestataire services endpoint must return provider services',
  );
  const createdProviderService = await readJson('/marketplace/prestataire/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: prestataireCookies,
      'X-CSRF-Token': prestataireCsrfToken,
    },
    body: JSON.stringify({
      title: `Service smoke ${Date.now()}`,
      category: 'Smoke QA',
      description: 'Service cree par smoke test.',
      price: '1000 FCFA',
      price_type: 'fixed',
      status: 'active',
    }),
  });
  assert(
    createdProviderService.response.ok
      && createdProviderService.payload.id
      && String(createdProviderService.payload.provider_id) === String(marketplacePrestataireServices.payload.providerId),
    `marketplace prestataire service create endpoint must create provider service, got ${createdProviderService.response.status}`,
  );
  const updatedProviderServiceStatus = await readJson(`/marketplace/prestataire/services/${encodeURIComponent(String(createdProviderService.payload.id))}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: prestataireCookies,
      'X-CSRF-Token': prestataireCsrfToken,
    },
    body: JSON.stringify({ status: 'paused' }),
  });
  assert(
    updatedProviderServiceStatus.response.ok
      && String(updatedProviderServiceStatus.payload.status) === 'paused',
    `marketplace prestataire service status endpoint must update status, got ${updatedProviderServiceStatus.response.status}`,
  );
  const deletedProviderService = await readJson(`/marketplace/prestataire/services/${encodeURIComponent(String(createdProviderService.payload.id))}`, {
    method: 'DELETE',
    headers: {
      Cookie: prestataireCookies,
      'X-CSRF-Token': prestataireCsrfToken,
    },
  });
  assert(
    deletedProviderService.response.ok && String(deletedProviderService.payload.id) === String(createdProviderService.payload.id),
    `marketplace prestataire service delete endpoint must remove smoke service, got ${deletedProviderService.response.status}`,
  );

  const { cookieJar: adminCookies, csrfToken: adminCsrfToken } = await loginAs('admin@c2p.sn');
  assert(adminCsrfToken, 'missing csrf cookie for admin');
  const adminProjectSummary = await readJson('/project-center/admin/dashboard-summary', {
    headers: { Cookie: adminCookies },
  });
  assert(
    adminProjectSummary.response.ok
      && Array.isArray(adminProjectSummary.payload.projects)
      && Array.isArray(adminProjectSummary.payload.history),
    'project-center admin dashboard summary endpoint must return projects and history arrays',
  );
  assert(
    adminProjectSummary.payload.projects.length > 0
      && adminProjectSummary.payload.history.length <= 6,
    'project-center admin dashboard summary endpoint must expose bounded admin project data',
  );
  const adminAccreditations = await readJson('/admin/resources/accreditations', {
    headers: { Cookie: adminCookies },
  });
  assert(
    adminAccreditations.response.ok && Array.isArray(adminAccreditations.payload),
    `admin resources endpoint must return accreditation rows, got ${adminAccreditations.response.status}`,
  );
  const adminFeatureFlags = await readJson('/admin/resources/featureFlags', {
    headers: { Cookie: adminCookies },
  });
  assert(
    adminFeatureFlags.response.ok
      && Array.isArray(adminFeatureFlags.payload)
      && adminFeatureFlags.payload.some((row) => String(row.id) === 'maintenance_mode'),
    `admin feature flags endpoint must return maintenance flag, got ${adminFeatureFlags.response.status}`,
  );
  const maintenanceFlag = adminFeatureFlags.payload.find((row) => String(row.id) === 'maintenance_mode');
  const updatedMaintenanceFlag = await readJson(`/admin/resources/featureFlags/${encodeURIComponent(String(maintenanceFlag.id))}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({ enabled: Boolean(maintenanceFlag.enabled) }),
  });
  assert(
    updatedMaintenanceFlag.response.ok
      && String(updatedMaintenanceFlag.payload.id) === 'maintenance_mode'
      && Boolean(updatedMaintenanceFlag.payload.enabled) === Boolean(maintenanceFlag.enabled),
    `admin resource update endpoint must patch a feature flag idempotently, got ${updatedMaintenanceFlag.response.status}`,
  );
  const adminDashboardData = await readJson('/admin/dashboard-data', {
    headers: { Cookie: adminCookies },
  });
  assert(
    adminDashboardData.response.ok
      && Array.isArray(adminDashboardData.payload.courses)
      && Array.isArray(adminDashboardData.payload.bookings)
      && Array.isArray(adminDashboardData.payload.providers),
    `admin dashboard-data endpoint must return courses, bookings and providers, got ${adminDashboardData.response.status}`,
  );
  const adminAnalyticsData = await readJson('/admin/analytics-data', {
    headers: { Cookie: adminCookies },
  });
  assert(
    adminAnalyticsData.response.ok
      && Array.isArray(adminAnalyticsData.payload.bookings)
      && Array.isArray(adminAnalyticsData.payload.enrollments)
      && Array.isArray(adminAnalyticsData.payload.providers),
    `admin analytics-data endpoint must return bookings, enrollments and providers, got ${adminAnalyticsData.response.status}`,
  );
  const commandOnlyWriteTables = [
    'payment_transactions',
    'wallet_accounts',
    'invoices',
    'payout_accounts',
    'payout_requests',
    'commission_ledger',
    'escrow_cases',
    'provider_visibility_orders',
    'user_subscriptions',
    'provider_visibility_passes',
    'provider_visibility_products',
    'subscription_plans',
    'conversations',
    'messages',
    'notifications',
    'admin_accreditations',
    'admin_content_items',
    'admin_campaigns',
    'admin_reports',
    'admin_platform_categories',
    'admin_platform_rules',
    'admin_feature_flags',
    'admin_integrations',
    'admin_backups',
    'admin_security_alerts',
    'admin_audit_logs',
    'auth_users',
    'auth_sessions',
  ];

  for (const table of commandOnlyWriteTables) {
    const genericPost = await request(`/data/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookies,
        'X-CSRF-Token': adminCsrfToken,
      },
      body: JSON.stringify({ id: `blocked-${table}-${Date.now()}` }),
    });
    assert(
      genericPost.status === 400,
      `expected 400 on command-only table generic POST ${table}, got ${genericPost.status}`,
    );

    const genericPatch = await request(`/data/${table}?eq_id=blocked-${table}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookies,
        'X-CSRF-Token': adminCsrfToken,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert(
      genericPatch.status === 400,
      `expected 400 on command-only table generic PATCH ${table}, got ${genericPatch.status}`,
    );

    const genericDelete = await request(`/data/${table}?eq_id=blocked-${table}`, {
      method: 'DELETE',
      headers: {
        Cookie: adminCookies,
        'X-CSRF-Token': adminCsrfToken,
      },
    });
    assert(
      genericDelete.status === 400,
      `expected 400 on command-only table generic DELETE ${table}, got ${genericDelete.status}`,
    );
  }

  console.log('data-access-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
