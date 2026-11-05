#!/usr/bin/env node
// Certification end-to-end check (Udemy / OpenClassrooms style) on a throw-away hybrid course:
// instructor enrolls a learner -> "in progress" certificate (not verifiable) -> assignment
// submitted (self-grading refused) -> failed grade -> new version requested -> resubmitted ->
// passed -> lessons completed -> certificate delivered automatically and publicly verifiable.
const API = (process.env.API_URL || 'http://localhost:3003/api').replace(/\/$/, '');
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
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
  return { cookie: cookies.join('; '), csrf: cookies.find((cookie) => cookie.startsWith('c2p_csrf='))?.split('=')[1] };
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
    throw error;
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
  const formateur = await login('formateur@c2p.sn');
  const admin = await login('admin@c2p.sn');
  const apprenant = await login('apprenant@c2p.sn');
  const state = {};

  const learnerCertificate = async () => {
    const rows = expectOk(await call(apprenant, 'GET', '/learning/apprenant/certificates'), 'GET apprenant certificates');
    const list = Array.isArray(rows) ? rows : (rows?.certificates ?? []);
    return list.find((row) => String(row.course_id) === String(state.courseId));
  };

  try {
    await step('formation certifiante hybride publiee', async () => {
      const course = expectOk(await call(formateur, 'POST', '/learning/formateur/courses/bundle', {
        course: {
          title: `Certif QA ${RUN_ID}`, description: 'Formation temporaire de certification.', category: 'informatique',
          level: 'beginner', duration: '2 h', delivery_mode: 'hybrid', price: 0, is_free: true,
          thumbnail: 'https://c2p.sn/images/brand/logo-c2p.webp', certificate_pass_percentage: 50,
        },
        sections: [{ id: 's', title: 'Partie unique', description: '', status: 'published', lessons: [
          { id: 'l', title: 'Lecon unique', description: '', type: 'article', content: 'Contenu', status: 'published' },
        ] }],
      }), 'POST bundle');
      state.courseId = course.id;
      expect(course.certificate_enabled === true, 'formation certifiante par defaut');
      expectOk(await call(admin, 'PATCH', `/learning/formateur/courses/${enc(course.id)}`, { status: 'published' }), 'admin publish');
      const program = expectOk(await call(formateur, 'GET', `/learning/formateur/courses/${enc(course.id)}/program`), 'program');
      state.lesson = program.lessons[0];
      const exam = expectOk(await call(formateur, 'POST', '/learning/formateur/exams', {
        course_id: course.id, title: `Projet ${RUN_ID}`, type: 'assignment', exam_date: '2027-06-01',
        participants: 1, submitted: 0, status: 'ongoing', max_grade: 20, passing_grade: 12, instructions: 'Rendre un PDF', attachments: [],
      }), 'POST assignment');
      state.examId = exam.id;
      expect(Number(exam.passing_grade) === 12, `note de passage = ${exam.passing_grade}`);
    });

    await step('le formateur inscrit un apprenant par email', async () => {
      const unknown = await call(formateur, 'POST', `/learning/formateur/courses/${enc(state.courseId)}/learners`, { email: `inconnu-${RUN_ID}@example.com` });
      expect(unknown.status === 404, `email inconnu -> ${unknown.status}`);
      const notLearner = await call(formateur, 'POST', `/learning/formateur/courses/${enc(state.courseId)}/learners`, { email: 'client@c2p.sn' });
      expect(notLearner.status === 400, `compte client -> ${notLearner.status}`);
      const enrolled = expectOk(await call(formateur, 'POST', `/learning/formateur/courses/${enc(state.courseId)}/learners`, { email: 'apprenant@c2p.sn' }), 'enroll learner');
      expect(enrolled.enrollment_source === 'instructor', `source = ${enrolled.enrollment_source}`);
      const again = await call(formateur, 'POST', `/learning/formateur/courses/${enc(state.courseId)}/learners`, { email: 'apprenant@c2p.sn' });
      expect(again.status === 409, `double inscription -> ${again.status}`);
    });

    await step('certificat cree « en cours » des l inscription, non verifiable', async () => {
      const certificate = await learnerCertificate();
      expect(certificate?.status === 'in_progress', `certificat = ${JSON.stringify(certificate)}`);
      expect(!certificate.certificate_number, 'numero attribue trop tot');
      const verify = expectOk(await call(null, 'GET', `/public/certificates/${enc(certificate.id)}/verify`), 'verify in progress');
      expect(verify.valid === false, 'un certificat en cours ne doit pas etre valide');
    });

    await step('devoir rendu : l apprenant ne peut pas se noter lui-meme', async () => {
      const submission = expectOk(await call(apprenant, 'POST', `/learning/apprenant/exams/${enc(state.examId)}/submissions`, {
        file_name: 'devoir.pdf', file_url: 'https://example.com/devoir.pdf', status: 'graded', grade: 20, feedback: 'parfait',
      }), 'submit assignment');
      state.submissionId = submission.id;
      expect(submission.status === 'pending' && (submission.grade === null || submission.grade === undefined), `auto-notation acceptee: ${JSON.stringify(submission)}`);
    });

    await step('note insuffisante puis nouvelle version demandee', async () => {
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/submissions/${enc(state.submissionId)}/grade`, { grade: 8, feedback: 'Trop court' }), 'grade 8');
      let certificate = await learnerCertificate();
      expect(certificate?.status === 'in_progress', 'certificat delivre malgre 8/20');
      const noFeedback = await call(formateur, 'PATCH', `/learning/formateur/submissions/${enc(state.submissionId)}/resubmit`, { feedback: ' ' });
      expect(noFeedback.status === 400, `resubmit sans commentaire -> ${noFeedback.status}`);
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/submissions/${enc(state.submissionId)}/resubmit`, { feedback: 'Ajoutez un exemple chiffre.' }), 'resubmit');
      const snapshot = expectOk(await call(apprenant, 'GET', '/learning/apprenant/exams'), 'apprenant exams');
      const mine = (snapshot.submissions ?? []).find((row) => String(row.id) === String(state.submissionId));
      expect(mine?.status === 'resubmit' && mine?.can_retry === true, `copie = ${JSON.stringify(mine)}`);
      certificate = await learnerCertificate();
      const requirement = certificate?.requirements?.exams?.find((exam) => String(exam.exam_id) === String(state.examId));
      expect(requirement?.status === 'resubmit', `exigence = ${JSON.stringify(requirement)}`);
    });

    await step('nouvelle version rendue et reussie', async () => {
      const second = expectOk(await call(apprenant, 'POST', `/learning/apprenant/exams/${enc(state.examId)}/submissions`, {
        file_name: 'devoir-v2.pdf', file_url: 'https://example.com/devoir-v2.pdf',
      }), 'resubmit assignment');
      expect(String(second.id) === String(state.submissionId) && Number(second.attempt) === 2 && second.status === 'pending', `v2 = ${JSON.stringify(second)}`);
      const third = await call(apprenant, 'POST', `/learning/apprenant/exams/${enc(state.examId)}/submissions`, { file_name: 'x.pdf', file_url: 'https://example.com/x.pdf' });
      expect(third.status === 409, `troisieme envoi sans demande -> ${third.status}`);
      expectOk(await call(formateur, 'PATCH', `/learning/formateur/submissions/${enc(state.submissionId)}/grade`, { grade: 15, feedback: 'Tres bien' }), 'grade 15');
      const certificate = await learnerCertificate();
      expect(certificate?.status === 'in_progress', 'certificat delivre avant la fin des lecons');
    });

    await step('lecons terminees : certificat delivre automatiquement et verifiable', async () => {
      expectOk(await call(apprenant, 'PATCH', `/learning/apprenant/courses/${enc(state.courseId)}/lessons/${enc(state.lesson.id)}/progress`, {
        progress: 100, completed: true, section_id: state.lesson.section_id,
      }), 'complete lesson');
      const certificate = await learnerCertificate();
      expect(certificate?.status === 'issued' && /^C2P-/.test(String(certificate.certificate_number)), `certificat = ${JSON.stringify(certificate)}`);
      expect(certificate.instructor_name && certificate.student_name, 'nom du formateur ou de l apprenant manquant');
      const verify = expectOk(await call(null, 'GET', `/public/certificates/${enc(certificate.certificate_number)}/verify`), 'verify issued');
      expect(verify.valid === true, `verification = ${JSON.stringify(verify)}`);
      const formateurView = expectOk(await call(formateur, 'GET', '/learning/formateur/certificates'), 'formateur certificates');
      expect((formateurView ?? []).some((row) => String(row.id) === String(certificate.id) && row.status === 'issued'), 'certificat absent cote formateur');
    });
  } catch {
    // failure already recorded by step()
  } finally {
    if (state.courseId) await call(formateur, 'DELETE', `/learning/formateur/courses/${enc(state.courseId)}`);
  }

  const result = { ok: failures.length === 0, passed: passed.length, failed: failures.length, failures };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error('certification-flow-check: FAIL', error);
  process.exitCode = 1;
});
