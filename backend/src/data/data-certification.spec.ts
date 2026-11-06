import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { store } from './data-app-store.js';
import { examPassGrade, syncCourseCertificate } from './data-certification.js';

const TABLES = ['courses', 'course_enrollments', 'exams', 'submissions', 'certificates', 'course_quiz_attempts', 'virtual_classes', 'class_attendance'] as const;
let saved: Record<string, unknown> = {};

function setup(course: Record<string, unknown> = {}) {
  store.courses = [{ id: 'c-spec', title: 'Excel', instructor_id: 'nobody', duration: '3 h', ...course }];
  store.course_enrollments = [{ id: 'e1', course_id: 'c-spec', student_id: 's-spec', student_name: 'Awa Ndiaye', progress: 0, status: 'active' }];
  store.exams = [
    { id: 'x1', course_id: 'c-spec', title: 'Quiz final', type: 'quiz', max_grade: 20, status: 'ongoing' },
    { id: 'x2', course_id: 'c-spec', title: 'Projet', type: 'assignment', max_grade: 20, passing_grade: 12, status: 'ongoing' },
  ];
  store.submissions = [];
  store.certificates = [];
  store.course_quiz_attempts = [];
  store.virtual_classes = [];
  store.class_attendance = [];
}

function certificate() {
  return store.certificates.find((row) => row.student_id === 's-spec');
}

describe('course certification', () => {
  beforeEach(() => {
    saved = Object.fromEntries(TABLES.map((table) => [table, store[table]]));
  });
  afterEach(() => {
    for (const table of TABLES) store[table] = saved[table] as never;
  });

  it('creates an in-progress certificate at enrolment, not verifiable yet', () => {
    setup();
    syncCourseCertificate('c-spec', 's-spec');
    const row = certificate();
    assert.equal(row?.status, 'in_progress');
    assert.equal(row?.student_name, 'Awa Ndiaye');
    assert.equal(row?.certificate_number, null);
  });

  it('does nothing for a course where certification is disabled', () => {
    setup({ certificate_enabled: false });
    assert.deepEqual(syncCourseCertificate('c-spec', 's-spec').rows, []);
    assert.equal(certificate(), undefined);
  });

  it('waits for every lesson and every exam, then delivers the certificate', () => {
    setup();
    syncCourseCertificate('c-spec', 's-spec');
    store.course_enrollments[0].progress = 100;
    store.submissions = [{ id: 'q', exam_id: 'x1', student_id: 's-spec', status: 'graded', grade: 15 }];
    let result = syncCourseCertificate('c-spec', 's-spec');
    assert.equal(result.issued, null, 'project not passed yet');
    const requirements = certificate()?.requirements as { exams: Array<{ exam_id: string; status: string }> };
    assert.equal(requirements.exams.find((exam) => exam.exam_id === 'x2')?.status, 'not_submitted');

    store.submissions.push({ id: 'p', exam_id: 'x2', student_id: 's-spec', status: 'graded', grade: 11 });
    result = syncCourseCertificate('c-spec', 's-spec');
    assert.equal(result.issued, null, '11/20 is below the 12/20 pass mark of the project');

    store.submissions[1].grade = 14;
    result = syncCourseCertificate('c-spec', 's-spec');
    assert.equal(result.issued?.status, 'issued');
    assert.match(String(certificate()?.certificate_number), /^C2P-\d{4}-/);
    assert.equal(certificate()?.final_grade, 14.5);
  });

  it('never takes back an issued certificate', () => {
    setup();
    store.course_enrollments[0].progress = 100;
    store.exams = [];
    syncCourseCertificate('c-spec', 's-spec');
    assert.equal(certificate()?.status, 'issued');
    store.course_enrollments[0].progress = 10;
    assert.deepEqual(syncCourseCertificate('c-spec', 's-spec').rows, []);
    assert.equal(certificate()?.status, 'issued');
  });

  it('moves a legacy "pending" certificate to "in_progress"', () => {
    setup();
    store.certificates = [{ id: 'old', course_id: 'c-spec', student_id: 's-spec', status: 'pending' }];
    syncCourseCertificate('c-spec', 's-spec');
    assert.equal(certificate()?.status, 'in_progress');
  });

  it('requires the minimum attendance to held sessions when the course sets one', () => {
    setup({ certificate_min_attendance: 50 });
    store.exams = [];
    store.course_enrollments[0].progress = 100;
    store.virtual_classes = [
      { id: 'v1', course_id: 'c-spec', status: 'ended' },
      { id: 'v2', course_id: 'c-spec', status: 'ended' },
      { id: 'v3', course_id: 'c-spec', status: 'scheduled' },
    ];
    syncCourseCertificate('c-spec', 's-spec');
    assert.equal(certificate()?.status, 'in_progress', 'no attendance yet');
    store.class_attendance = [{ id: 'a1', class_id: 'v1', student_id: 's-spec', present: true }];
    syncCourseCertificate('c-spec', 's-spec');
    assert.equal(certificate()?.status, 'issued', '1 of 2 held sessions = 50 %');
  });

  it('uses the course percentage when an exam has no explicit pass mark', () => {
    assert.equal(examPassGrade({ max_grade: 20 }, { certificate_pass_percentage: 70 }), 14);
    assert.equal(examPassGrade({ max_grade: 20, passing_grade: 8 }, { certificate_pass_percentage: 70 }), 8);
    assert.equal(examPassGrade({ max_grade: 10 }, {}), 5);
  });
});
