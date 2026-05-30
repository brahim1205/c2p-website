const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');
const FORMATEUR_EMAIL = process.env.C2P_FORMATEUR_EMAIL || 'formateur@c2p.sn';
const APPRENANT_EMAIL = process.env.C2P_APPRENANT_EMAIL || 'apprenant@c2p.sn';
const RUN_ID = `eval-e2e-${Date.now()}`;

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
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await response.text();
  assert(response.ok, `login failed for ${email} (${response.status}) ${body}`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function readJson(path, { cookieJar, csrfToken, method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookieJar ? { Cookie: cookieJar } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      'X-Request-Id': `${RUN_ID}:${method}:${path}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  return { response, payload };
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function firstCourseId(enrollments) {
  if (!Array.isArray(enrollments)) return null;
  const row = enrollments.find((entry) => entry?.course_id || entry?.courses?.id);
  return row?.course_id ?? row?.courses?.id ?? null;
}

async function cleanupExam(formateurSession, examId) {
  if (!examId) return;
  const cleanup = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(examId))}`, {
    ...formateurSession,
    method: 'DELETE',
  });
  assert(
    cleanup.response.ok || cleanup.response.status === 404,
    `cleanup exam failed (${cleanup.response.status}) ${JSON.stringify(cleanup.payload)}`,
  );
}

async function main() {
  const formateur = await loginAs(FORMATEUR_EMAIL);
  const apprenant = await loginAs(APPRENANT_EMAIL);
  let createdExamId = null;

  try {
    const initialSnapshot = await readJson('/learning/formateur/evaluations', formateur);
    assert(initialSnapshot.response.ok, `formateur evaluations read failed (${initialSnapshot.response.status})`);
    assert(Array.isArray(initialSnapshot.payload?.courses), 'formateur evaluations must expose courses');
    assert(Array.isArray(initialSnapshot.payload?.exams), 'formateur evaluations must expose exams');
    assert(Array.isArray(initialSnapshot.payload?.submissions), 'formateur evaluations must expose submissions');

    let course = initialSnapshot.payload.courses[0] ?? null;
    const enrollments = await readJson('/learning/apprenant/enrollments', apprenant);
    assert(enrollments.response.ok, `apprenant enrollments read failed (${enrollments.response.status})`);
    const enrolledCourseId = firstCourseId(enrollments.payload);
    const enrolledFormateurCourse = initialSnapshot.payload.courses.find((entry) => (
      enrolledCourseId != null && String(entry.id) === String(enrolledCourseId)
    ));
    course = enrolledFormateurCourse ?? course;
    assert(course?.id, 'formateur must have at least one course to create an evaluation');

    if (!enrolledFormateurCourse) {
      const enrollment = await readJson(`/learning/apprenant/courses/${encodeURIComponent(String(course.id))}/enroll`, {
        ...apprenant,
        method: 'POST',
      });
      assert(
        enrollment.response.ok || enrollment.response.status === 409,
        `apprenant enrollment failed (${enrollment.response.status}) ${JSON.stringify(enrollment.payload)}`,
      );
    }

    const examTitle = `E2E Evaluation ${RUN_ID}`;
    const createdExam = await readJson('/learning/formateur/exams', {
      ...formateur,
      method: 'POST',
      body: {
        course_id: course.id,
        course_name: course.title,
        title: examTitle,
        type: 'quiz',
        exam_date: tomorrowDate(),
        participants: 1,
        submitted: 0,
        status: 'ongoing',
        max_grade: 20,
        instructions: 'Evaluation temporaire generee par le test de bout en bout.',
        attachments: [],
      },
    });
    assert(createdExam.response.ok, `create exam failed (${createdExam.response.status}) ${JSON.stringify(createdExam.payload)}`);
    createdExamId = createdExam.payload.id;
    assert(createdExam.payload.title === examTitle, 'created exam title mismatch');

    const createdQuestion = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(createdExamId))}/quiz/questions`, {
      ...formateur,
      method: 'POST',
      body: {
        prompt: `Question ${RUN_ID}`,
        type: 'single_choice',
        points: 10,
        explanation: 'La bonne reponse est le choix A.',
        required: true,
      },
    });
    assert(createdQuestion.response.ok, `create question failed (${createdQuestion.response.status}) ${JSON.stringify(createdQuestion.payload)}`);

    const wrongChoice = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(createdExamId))}/quiz/choices`, {
      ...formateur,
      method: 'POST',
      body: {
        questionId: createdQuestion.payload.id,
        label: 'Choix B',
        value: 'b',
        is_correct: false,
      },
    });
    assert(wrongChoice.response.ok, `create wrong choice failed (${wrongChoice.response.status}) ${JSON.stringify(wrongChoice.payload)}`);

    const correctChoice = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(createdExamId))}/quiz/choices`, {
      ...formateur,
      method: 'POST',
      body: {
        questionId: createdQuestion.payload.id,
        label: 'Choix A',
        value: 'a',
        is_correct: true,
        resetOtherCorrectChoices: [],
      },
    });
    assert(correctChoice.response.ok, `create correct choice failed (${correctChoice.response.status}) ${JSON.stringify(correctChoice.payload)}`);

    const formateurQuiz = await readJson(`/learning/formateur/exams/${encodeURIComponent(String(createdExamId))}/quiz`, formateur);
    assert(formateurQuiz.response.ok, `formateur quiz read failed (${formateurQuiz.response.status})`);
    assert(formateurQuiz.payload.questions.length === 1, 'formateur quiz must expose created question');
    assert(formateurQuiz.payload.choices.length >= 2, 'formateur quiz must expose created choices');
    assert(formateurQuiz.payload.choices.some((choice) => choice.is_correct === true), 'formateur quiz must expose correct choice');

    const apprenantQuiz = await readJson(`/learning/apprenant/exams/${encodeURIComponent(String(createdExamId))}/quiz`, apprenant);
    assert(apprenantQuiz.response.ok, `apprenant quiz read failed (${apprenantQuiz.response.status}) ${JSON.stringify(apprenantQuiz.payload)}`);
    assert(
      apprenantQuiz.payload.choices.every((choice) => !Object.prototype.hasOwnProperty.call(choice, 'is_correct')),
      'apprenant quiz must not expose correct answers',
    );

    const submission = await readJson(`/learning/apprenant/exams/${encodeURIComponent(String(createdExamId))}/submissions`, {
      ...apprenant,
      method: 'POST',
      body: {
        exam_id: createdExamId,
        status: 'pending',
        answers: [
          {
            question_id: createdQuestion.payload.id,
            question_prompt: createdQuestion.payload.prompt,
            question_type: createdQuestion.payload.type,
            answer_text: null,
            selected_choice_ids: [String(correctChoice.payload.id)],
          },
        ],
      },
    });
    assert(submission.response.ok, `submit exam failed (${submission.response.status}) ${JSON.stringify(submission.payload)}`);
    assert(String(submission.payload.exam_id) === String(createdExamId), 'submission exam id mismatch');
    assert(String(submission.payload.student_id) === 'usr-apprenant', 'submission student id must come from session');

    const snapshotBeforeGrade = await readJson('/learning/formateur/evaluations', formateur);
    assert(snapshotBeforeGrade.response.ok, `pre-grade formateur evaluations read failed (${snapshotBeforeGrade.response.status})`);
    const currentExam = snapshotBeforeGrade.payload.exams.find((entry) => String(entry.id) === String(createdExamId));
    const maxGrade = Number(currentExam?.max_grade ?? createdExam.payload.max_grade ?? 20);
    assert(Number.isFinite(maxGrade) && maxGrade > 0, 'current exam max grade must be positive');

    const graded = await readJson(`/learning/formateur/submissions/${encodeURIComponent(String(submission.payload.id))}/grade`, {
      ...formateur,
      method: 'PATCH',
      body: {
        submissionId: submission.payload.id,
        examId: createdExamId,
        studentId: submission.payload.student_id,
        examTitle,
        grade: maxGrade,
        maxGrade,
        feedback: 'Correction E2E valide.',
      },
    });
    assert(graded.response.ok, `grade submission failed (${graded.response.status}) ${JSON.stringify(graded.payload)}`);
    assert(graded.payload.status === 'graded', 'graded submission must have graded status');
    assert(Number(graded.payload.grade) === maxGrade, 'graded submission must store the grade');

    const finalSnapshot = await readJson('/learning/formateur/evaluations', formateur);
    assert(finalSnapshot.response.ok, `final formateur evaluations read failed (${finalSnapshot.response.status})`);
    assert(
      finalSnapshot.payload.submissions.some((entry) => String(entry.id) === String(submission.payload.id) && entry.status === 'graded'),
      'final snapshot must expose the graded submission',
    );

    console.log(JSON.stringify({
      ok: true,
      runId: RUN_ID,
      courseId: course.id,
      examId: createdExamId,
      submissionId: submission.payload.id,
      checked: [
        'formateur snapshot',
        'exam creation',
        'quiz question creation',
        'quiz choice creation',
        'formateur quiz read with answers',
        'apprenant quiz read without answers',
        'apprenant submission',
        'formateur grading',
        'final snapshot',
      ],
    }, null, 2));
  } finally {
    await cleanupExam(formateur, createdExamId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
