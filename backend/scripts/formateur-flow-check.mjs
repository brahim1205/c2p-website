#!/usr/bin/env node
// Formateur end-to-end API check: every formateur read route, then a full lifecycle on a
// throw-away course (wizard draft, course, program, assets, reorder, quiz, virtual class,
// community FAQ) plus role and moderation guards. Records every failure, cleans up after itself.
const API = (process.env.API_URL || 'http://localhost:3003/api').replace(/\/$/, '');
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
const FORMATEUR_EMAIL = process.env.C2P_FORMATEUR_EMAIL || 'formateur@c2p.sn';
const RUN_ID = `${Date.now()}`;
const failures = [];
const passed = [];

async function login(email) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login ${email} -> ${response.status} ${await response.text()}`);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
  return {
    cookie: cookies.join('; '),
    csrf: cookies.find((cookie) => cookie.startsWith('c2p_csrf='))?.split('=')[1],
  };
}

async function call(session, method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, ok: response.ok, body: payload };
}

async function step(name, run) {
  try {
    await run();
    passed.push(name);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectOk(result, label) {
  expect(result.ok, `${label} -> ${result.status} ${JSON.stringify(result.body).slice(0, 300)}`);
  return result.body;
}

const enc = (value) => encodeURIComponent(String(value));

async function main() {
  const formateur = await login(FORMATEUR_EMAIL);
  const apprenant = await login('apprenant@c2p.sn');
  const state = {};

  // 1. Every read route of the formateur dashboard.
  for (const path of ['courses', 'evaluations', 'certificates', 'community', 'learners', 'virtual-classes', 'course-wizard-draft']) {
    await step(`GET formateur/${path}`, async () => {
      state[path] = expectOk(await call(formateur, 'GET', `/learning/formateur/${path}`), path);
    });
  }
  await step('GET formateur/courses/:id/program (cours existant)', async () => {
    const course = (state.courses ?? [])[0];
    expect(course, 'aucun cours seed pour le formateur');
    expectOk(await call(formateur, 'GET', `/learning/formateur/courses/${enc(course.id)}/program`), 'program');
  });
  await step('GET formateur/learners/:studentId', async () => {
    const enrollment = (state.learners?.enrollments ?? [])[0];
    expect(enrollment, 'aucun apprenant inscrit dans les cours du formateur');
    const studentId = enrollment.student_id ?? enrollment.user_id ?? enrollment.studentId;
    const detail = expectOk(await call(formateur, 'GET', `/learning/formateur/learners/${enc(studentId)}`), 'learner detail');
    expect(detail && typeof detail === 'object', 'detail apprenant vide');
  });
  await step('GET formateur/exams/:examId/quiz (examen existant)', async () => {
    const evaluations = state.evaluations;
    const exams = Array.isArray(evaluations) ? evaluations : (evaluations?.exams ?? []);
    const quiz = exams.find((exam) => String(exam.type) === 'quiz') ?? exams[0];
    expect(quiz, 'aucun examen seed');
    expectOk(await call(formateur, 'GET', `/learning/formateur/exams/${enc(quiz.id)}/quiz`), 'quiz structure');
  });

  // 2. Course wizard draft.
  await step('brouillon assistant: enregistrer / relire / effacer', async () => {
    const draft = { step: 2, title: `Brouillon ${RUN_ID}` };
    expectOk(await call(formateur, 'PUT', '/learning/formateur/course-wizard-draft', { draft }), 'PUT draft');
    const saved = expectOk(await call(formateur, 'GET', '/learning/formateur/course-wizard-draft'), 'GET draft');
    expect(saved?.draft?.title === draft.title, `brouillon relu = ${JSON.stringify(saved)}`);
    expectOk(await call(formateur, 'DELETE', '/learning/formateur/course-wizard-draft'), 'DELETE draft');
    const cleared = expectOk(await call(formateur, 'GET', '/learning/formateur/course-wizard-draft'), 'GET draft after delete');
    expect(cleared?.draft == null, 'brouillon toujours present apres suppression');
  });

  await step('creation invalide: aucune formation fantome', async () => {
    const ghostTitle = `Fantome ${RUN_ID}`;
    const result = await call(formateur, 'POST', '/learning/formateur/courses/bundle', {
      course: { title: ghostTitle, description: 'd', category: 'Dev', level: 'debutant', duration: '1 sem', delivery_mode: 'online', price: 0, is_free: true },
      sections: [{ id: 'g-s', title: 'S', description: '', status: 'draft', lessons: [{ id: 'g-l', title: 'L', type: 'INVALIDE', status: 'draft' }] }],
    });
    expect(result.status === 400, `bundle invalide -> ${result.status}`);
    const courses = expectOk(await call(formateur, 'GET', '/learning/formateur/courses'), 'courses');
    expect(!courses.some((course) => course.title === ghostTitle), 'formation fantome visible apres un echec');
  });

  // 3. Throw-away course.
  const courseTitle = `QA formateur ${RUN_ID}`;
  await step('creer une formation (bundle)', async () => {
    const created = expectOk(await call(formateur, 'POST', '/learning/formateur/courses/bundle', {
      course: {
        title: courseTitle,
        description: 'Formation temporaire du test formateur.',
        category: 'Developpement',
        level: 'debutant',
        duration: '4 semaines',
        delivery_mode: 'online',
        language: 'fr',
        price: 0,
        is_free: true,
      },
      sections: [{
        id: 'draft-section-1',
        title: 'Introduction',
        description: 'Premiere partie',
        status: 'draft',
        lessons: [{ id: 'draft-lesson-1', title: 'Bienvenue', description: 'Lecon 1', type: 'article', content: 'Bonjour', status: 'draft' }],
      }],
    }), 'bundle');
    state.course = created;
    expect(created?.id, 'formation creee sans id');
    const courses = expectOk(await call(formateur, 'GET', '/learning/formateur/courses'), 'courses after create');
    expect(courses.some((course) => String(course.id) === String(created.id)), 'formation absente de la liste');
  });

  if (state.course?.id) {
    const courseId = state.course.id;
    const base = `/learning/formateur/courses/${enc(courseId)}`;

    await step('modifier la formation', async () => {
      const updated = expectOk(await call(formateur, 'PATCH', base, { title: `${courseTitle} modifie` }), 'PATCH course');
      expect(String(updated.title).endsWith('modifie'), `titre = ${updated.title}`);
    });

    await step('moderation: un formateur ne peut pas publier seul', async () => {
      const result = await call(formateur, 'PATCH', `${base}/workflow`, { status: 'published' });
      expect(!result.ok, `publication directe acceptee (${result.status})`);
    });

    await step('workflow: soumission en revision (ou refus motive si incomplet)', async () => {
      const result = await call(formateur, 'PATCH', `${base}/workflow`, { status: 'review' });
      expect(result.ok || result.status === 400, `review -> ${result.status} ${JSON.stringify(result.body)}`);
      state.reviewResult = result.ok ? 'acceptee' : `refusee: ${result.body?.message}`;
      if (result.ok) expectOk(await call(formateur, 'PATCH', `${base}/workflow`, { status: 'draft' }), 'retour brouillon');
    });

    await step('programme: sections et lecons (ajout, modif, reordonnancement, suppression)', async () => {
      const program = expectOk(await call(formateur, 'GET', `${base}/program`), 'program');
      const sections = program.sections ?? [];
      expect(sections.length === 1, `sections du bundle = ${sections.length}`);
      const second = expectOk(await call(formateur, 'POST', `${base}/sections`, { title: 'Partie 2', description: 'Suite', status: 'draft' }), 'POST section');
      expectOk(await call(formateur, 'PATCH', `${base}/sections/${enc(second.id)}`, { title: 'Partie 2 modifiee', description: 'Suite', status: 'draft' }), 'PATCH section');
      const lesson = expectOk(await call(formateur, 'POST', `${base}/lessons`, {
        section_id: String(second.id), title: 'Lecon A', description: 'A', type: 'article', duration: '10 min', content: 'Contenu',
        code_language: 'markdown', code_sample: null, exercise_instructions: null, is_preview: false, status: 'draft',
      }), 'POST lesson');
      const lessonB = expectOk(await call(formateur, 'POST', `${base}/lessons`, {
        section_id: String(second.id), title: 'Lecon B', description: 'B', type: 'article', duration: '5 min', content: 'Contenu B',
        code_language: 'markdown', code_sample: null, exercise_instructions: null, is_preview: false, status: 'draft',
      }), 'POST lesson B');
      expectOk(await call(formateur, 'PATCH', `${base}/lessons/${enc(lesson.id)}`, { section_id: String(second.id), title: 'Lecon A modifiee', description: 'A', type: 'article', status: 'draft' }), 'PATCH lesson');
      expectOk(await call(formateur, 'PATCH', `${base}/sections/actions/reorder`, { current: { id: String(second.id), position: second.position }, target: { id: String(sections[0].id), position: sections[0].position } }), 'reorder sections');
      expectOk(await call(formateur, 'PATCH', `${base}/lessons/actions/reorder`, { current: { id: String(lessonB.id), position: lessonB.position }, target: { id: String(lesson.id), position: lesson.position } }), 'reorder lessons');

      const asset = expectOk(await call(formateur, 'POST', `${base}/assets`, {
        lesson_id: String(lesson.id), title: 'Support PDF', asset_type: 'pdf', url: 'https://example.com/support.pdf',
        thumbnail_url: null, mime_type: 'application/pdf', size_bytes: 1024, status: 'ready',
      }), 'POST asset');
      expectOk(await call(formateur, 'PATCH', `${base}/assets/${enc(asset.id)}`, { lesson_id: String(lesson.id), title: 'Support PDF v2', asset_type: 'pdf', url: 'https://example.com/support-v2.pdf', status: 'ready' }), 'PATCH asset');

      const after = expectOk(await call(formateur, 'GET', `${base}/program`), 'program after edits');
      const titles = JSON.stringify(after);
      expect(titles.includes('Partie 2 modifiee') && titles.includes('Lecon A modifiee') && titles.includes('Support PDF v2'), 'modifications absentes du programme relu');

      expectOk(await call(formateur, 'DELETE', `${base}/assets/${enc(asset.id)}`), 'DELETE asset');
      expectOk(await call(formateur, 'DELETE', `${base}/lessons/${enc(lessonB.id)}`), 'DELETE lesson');
      expectOk(await call(formateur, 'DELETE', `${base}/sections/${enc(second.id)}`), 'DELETE section');
      const final = expectOk(await call(formateur, 'GET', `${base}/program`), 'program after deletes');
      expect((final.sections ?? []).length === 1, `sections restantes = ${(final.sections ?? []).length}`);
    });

    await step('quiz: questions et choix (modif, reordonnancement, suppression)', async () => {
      const exam = expectOk(await call(formateur, 'POST', '/learning/formateur/exams', {
        course_id: courseId, course_name: courseTitle, title: `Quiz ${RUN_ID}`, type: 'quiz',
        exam_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), participants: 0, submitted: 0,
        status: 'upcoming', max_grade: 20, instructions: 'Quiz temporaire', attachments: [],
      }), 'POST exam');
      state.examId = exam.id;
      const examBase = `/learning/formateur/exams/${enc(exam.id)}/quiz`;
      const q1 = expectOk(await call(formateur, 'POST', `${examBase}/questions`, { prompt: 'Q1', type: 'single_choice', points: 10, explanation: '', required: true }), 'POST q1');
      const q2 = expectOk(await call(formateur, 'POST', `${examBase}/questions`, { prompt: 'Q2', type: 'single_choice', points: 10, explanation: '', required: true }), 'POST q2');
      const c1 = expectOk(await call(formateur, 'POST', `${examBase}/choices`, { questionId: q1.id, label: 'A', value: 'a', is_correct: true }), 'POST c1');
      const c2 = expectOk(await call(formateur, 'POST', `${examBase}/choices`, { questionId: q1.id, label: 'B', value: 'b', is_correct: false }), 'POST c2');
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/quiz/questions/${enc(q1.id)}`, { prompt: 'Q1 modifiee', type: 'single_choice', points: 5, required: true }), 'PATCH question');
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/quiz/choices/${enc(c2.id)}`, { questionId: q1.id, label: 'B modifie', value: 'b', is_correct: false }), 'PATCH choice');
      expectOk(await call(formateur, 'PATCH', `${examBase}/questions/reorder`, { currentId: q2.id, targetId: q1.id }), 'reorder questions');
      expectOk(await call(formateur, 'PATCH', `${examBase}/choices/reorder`, { currentId: c2.id, targetId: c1.id }), 'reorder choices');
      const quiz = expectOk(await call(formateur, 'GET', examBase), 'GET quiz');
      const text = JSON.stringify(quiz);
      expect(text.includes('Q1 modifiee') && text.includes('B modifie'), 'modifications du quiz absentes');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/exams/${enc(exam.id)}/quiz/choices/${enc(c2.id)}`), 'DELETE choice');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/quiz/questions/${enc(q2.id)}`), 'DELETE question');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/exams/${enc(exam.id)}`), 'DELETE exam');
      state.examId = null;
    });

    await step('classe virtuelle: creer, modifier, changer de statut, supprimer', async () => {
      const created = expectOk(await call(formateur, 'POST', '/learning/formateur/virtual-classes', {
        course_id: courseId, title: `Live ${RUN_ID}`, course_name: courseTitle,
        class_date: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10), class_time: '10:00', duration: '60 min',
        max_students: 30, provider: 'jitsi', meeting_slug: null, room_link: null, recording_enabled: false,
        recording_url: null, instructor_notes: null, allow_chat: true, status: 'scheduled',
      }), 'POST virtual class');
      state.classId = created.id;
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/virtual-classes/${enc(created.id)}`, { title: `Live ${RUN_ID} modifie` }), 'PATCH virtual class');
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/virtual-classes/${enc(created.id)}/status`, { status: 'live' }), 'PATCH status live');
      const snapshot = expectOk(await call(formateur, 'GET', '/learning/formateur/virtual-classes'), 'GET virtual classes');
      expect(JSON.stringify(snapshot).includes(`Live ${RUN_ID} modifie`), 'classe modifiee absente de la liste');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/virtual-classes/${enc(created.id)}`), 'DELETE virtual class');
      state.classId = null;
    });

    await step('communaute: FAQ creer, publier, supprimer', async () => {
      const faq = expectOk(await call(formateur, 'POST', '/learning/formateur/community/faqs', {
        course_id: courseId, question: `Question ${RUN_ID} ?`, answer: 'Reponse.', status: 'draft',
      }), 'POST faq');
      state.faqId = faq.id;
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/community/faqs/${enc(faq.id)}`, { status: 'published' }), 'PATCH faq');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/community/faqs/${enc(faq.id)}`), 'DELETE faq');
      state.faqId = null;
    });

    await step('securite: une creation ignore l id fourni par le client (formateur)', async () => {
      const victimCourse = (state.courses ?? []).find((course) => String(course.id) !== String(courseId));
      expect(victimCourse, 'aucun autre cours pour le test');
      const victimProgram = expectOk(await call(formateur, 'GET', `/learning/formateur/courses/${enc(victimCourse.id)}/program`), 'victim program');
      const victimSection = (victimProgram.sections ?? [])[0];
      expect(victimSection, 'cours sans section');
      const created = expectOk(await call(formateur, 'POST', `${base}/sections`, { id: victimSection.id, title: 'Section piratee', description: '', status: 'draft' }), 'POST section with foreign id');
      expect(String(created.id) !== String(victimSection.id), `id client accepte (${created.id})`);
      const after = expectOk(await call(formateur, 'GET', `/learning/formateur/courses/${enc(victimCourse.id)}/program`), 'victim program after');
      const kept = (after.sections ?? []).find((section) => String(section.id) === String(victimSection.id));
      expect(kept && kept.title === victimSection.title && String(kept.course_id) === String(victimCourse.id), 'section d origine modifiee');
      await call(formateur, 'DELETE', `${base}/sections/${enc(created.id)}`);
    });

    await step('securite: une copie ne peut pas reprendre l id d une autre copie (apprenant)', async () => {
      const enrollments = expectOk(await call(apprenant, 'GET', '/learning/apprenant/enrollments'), 'enrollments');
      const enrolled = (Array.isArray(enrollments) ? enrollments : (enrollments?.enrollments ?? []))[0];
      const enrolledCourseId = enrolled?.course_id ?? enrolled?.course?.id;
      expect(enrolledCourseId, 'apprenant sans inscription');
      const evaluationsBefore = expectOk(await call(formateur, 'GET', '/learning/formateur/evaluations'), 'evaluations');
      const submissions = evaluationsBefore?.submissions ?? [];
      const foreign = submissions.find((submission) => String(submission.student_id) !== 'usr-apprenant');
      expect(foreign, 'aucune copie d un autre eleve visible');
      const exam = expectOk(await call(formateur, 'POST', '/learning/formateur/exams', {
        course_id: enrolledCourseId, title: `Garde copie ${RUN_ID}`, type: 'quiz', exam_date: '2027-01-01', participants: 1,
        submitted: 0, status: 'ongoing', max_grade: 20, instructions: 'x', attachments: [],
      }), 'POST exam');
      state.guardExamId = exam.id;
      const question = expectOk(await call(formateur, 'POST', `/learning/formateur/exams/${enc(exam.id)}/quiz/questions`, { prompt: 'Q', type: 'single_choice', points: 20, explanation: '', required: true }), 'POST question');
      const choice = expectOk(await call(formateur, 'POST', `/learning/formateur/exams/${enc(exam.id)}/quiz/choices`, { questionId: question.id, label: 'A', value: 'a', is_correct: true }), 'POST choice');
      const submitted = expectOk(await call(apprenant, 'POST', `/learning/apprenant/exams/${enc(exam.id)}/submissions`, {
        id: foreign.id, exam_id: exam.id, status: 'pending',
        answers: [{ question_id: question.id, question_prompt: 'Q', question_type: 'single_choice', answer_text: null, selected_choice_ids: [String(choice.id)] }],
      }), 'POST submission with foreign id');
      expect(String(submitted.id) !== String(foreign.id), `id de la copie d un autre eleve accepte (${submitted.id})`);
      const evaluationsAfter = expectOk(await call(formateur, 'GET', '/learning/formateur/evaluations'), 'evaluations after');
      const kept = (evaluationsAfter?.submissions ?? []).find((submission) => String(submission.id) === String(foreign.id));
      expect(kept && String(kept.student_id) === String(foreign.student_id) && String(kept.grade) === String(foreign.grade), 'copie de l autre eleve modifiee');
      expectOk(await call(formateur, 'DELETE', `/learning/formateur/exams/${enc(exam.id)}`), 'DELETE guard exam');
      state.guardExamId = null;
    });

    await step('securite: un apprenant ne peut pas modifier la formation', async () => {
      const result = await call(apprenant, 'PATCH', base, { title: 'pirate' });
      expect(result.status === 401 || result.status === 403, `apprenant PATCH -> ${result.status}`);
      const list = await call(apprenant, 'GET', '/learning/formateur/courses');
      expect(list.status === 401 || list.status === 403, `apprenant GET formateur/courses -> ${list.status}`);
    });

    await step('securite: anonyme refuse', async () => {
      const result = await call(null, 'GET', '/learning/formateur/courses');
      expect(result.status === 401 || result.status === 403, `anonyme -> ${result.status}`);
    });

    // Cleanup, even if earlier steps failed.
    if (state.classId) await call(formateur, 'DELETE', `/learning/formateur/virtual-classes/${enc(state.classId)}`);
    if (state.faqId) await call(formateur, 'DELETE', `/learning/formateur/community/faqs/${enc(state.faqId)}`);
    if (state.examId) await call(formateur, 'DELETE', `/learning/formateur/exams/${enc(state.examId)}`);
    if (state.guardExamId) await call(formateur, 'DELETE', `/learning/formateur/exams/${enc(state.guardExamId)}`);
    await step('supprimer la formation', async () => {
      expectOk(await call(formateur, 'DELETE', base), 'DELETE course');
      const courses = expectOk(await call(formateur, 'GET', '/learning/formateur/courses'), 'courses after delete');
      expect(!courses.some((course) => String(course.id) === String(courseId)), 'formation toujours listee');
    });
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    passed: passed.length,
    failed: failures.length,
    reviewSubmission: state.reviewResult ?? null,
    failures,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('formateur-flow-check: FAIL', error);
  process.exitCode = 1;
});
