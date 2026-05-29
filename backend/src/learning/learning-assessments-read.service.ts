import { Injectable } from '@nestjs/common';
import type { LearningCertificate, LearningExam, LearningQuizChoice, LearningQuizQuestion, LearningSubmission, Prisma } from '@prisma/client';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PrismaService } from '../database/prisma.service.js';
import { toNumber, trimText } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

@Injectable()
export class LearningAssessmentsReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getApprenantExamsSnapshot(user: AuthUser) {
    if (!(await this.hasProjection())) return null;
    const courseIds = await this.studentCourseIds(user);
    const exams = courseIds.length > 0
      ? await this.prisma.learningExam.findMany({ where: { source: 'app_row', courseId: { in: courseIds }, status: 'ongoing' } })
      : [];
    const submissions = await this.prisma.learningSubmission.findMany({ where: { source: 'app_row', ...this.studentFilter(user) } });
    const questionCounts = await this.questionCounts(exams.map((exam) => exam.id));
    return {
      exams: exams.map((exam): Row => ({ ...this.mapExam(exam), questions_count: questionCounts.get(String(exam.id)) ?? 0 }))
        .sort((left, right) => this.compareDatesDesc(left.exam_date ?? left.created_at, right.exam_date ?? right.created_at)),
      submissions: submissions.map((row) => this.mapSubmission(row))
        .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at)),
    };
  }

  async getApprenantCertificates(user: AuthUser, options: { limit?: number; status?: string } = {}) {
    if (!(await this.hasProjection())) return null;
    const certificates = await this.prisma.learningCertificate.findMany({
      where: { source: 'app_row', ...this.studentFilter(user), ...(options.status ? { status: options.status } : {}) },
    });
    const rows = certificates.map((row) => this.mapCertificate(row))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.issued_at, right.created_at ?? right.issued_at));
    return typeof options.limit === 'number' ? rows.slice(0, options.limit) : rows;
  }

  async getApprenantSubmissions(user: AuthUser) {
    if (!(await this.hasProjection())) return null;
    const submissions = await this.prisma.learningSubmission.findMany({ where: { source: 'app_row', ...this.studentFilter(user) } });
    return submissions.map((row) => this.mapSubmission(row))
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
  }

  async getCertificatesForStudents(studentIds: string[]) {
    if (!(await this.hasProjection())) return null;
    if (studentIds.length === 0) return [];
    const certificates = await this.prisma.learningCertificate.findMany({ where: { source: 'app_row', studentId: { in: studentIds } } });
    return certificates.map((row) => this.mapCertificate(row))
      .sort((left, right) => this.compareDatesDesc(left.issued_at ?? left.completion_date, right.issued_at ?? right.completion_date));
  }

  async getQuizStructure(examId: string, user: AuthUser, options: { includeCorrect?: boolean } = {}) {
    if (!(await this.hasProjection())) return null;
    const exam = await this.findAccessibleExam(examId, user);
    if (!exam) return null;
    const [questions, choices] = await Promise.all([
      this.prisma.learningQuizQuestion.findMany({ where: { source: 'app_row', examId: String(examId) } }),
      this.prisma.learningQuizChoice.findMany({ where: { source: 'app_row', examId: String(examId) } }),
    ]);
    const questionIds = new Set(questions.map((question) => String(question.id)));
    return {
      questions: questions.map((row) => this.mapQuestion(row)).sort((left, right) => this.position(left) - this.position(right)),
      choices: choices.filter((choice) => questionIds.has(String(choice.questionId)))
        .map((row) => this.mapChoice(row, options.includeCorrect))
        .sort((left, right) => this.position(left) - this.position(right)),
    };
  }

  async getFormateurEvaluationsSnapshot(user: AuthUser) {
    if (!(await this.hasProjection())) return null;
    const courses = await this.instructorCourses(user);
    const courseIds = courses.map((course) => String(course.id));
    const exams = courseIds.length > 0
      ? await this.prisma.learningExam.findMany({ where: { source: 'app_row', courseId: { in: courseIds } } })
      : [];
    const examIds = exams.map((exam) => String(exam.id));
    const submissions = examIds.length > 0
      ? await this.prisma.learningSubmission.findMany({ where: { source: 'app_row', examId: { in: examIds } } })
      : [];
    return {
      exams: exams.map((row) => this.mapExam(row)).sort((left, right) => this.compareDatesDesc(left.exam_date ?? left.created_at, right.exam_date ?? right.created_at)),
      submissions: submissions.map((row) => this.mapSubmission(row)).sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at)),
      courses: courses.map((course) => ({ id: this.idValue(course.id), title: course.title, delivery_mode: course.deliveryMode ?? null })),
    };
  }

  async getFormateurCertificates(user: AuthUser) {
    if (!(await this.hasProjection())) return null;
    const courses = await this.instructorCourses(user);
    const courseIds = courses.map((course) => String(course.id));
    if (courseIds.length === 0) return [];
    const certificates = await this.prisma.learningCertificate.findMany({ where: { source: 'app_row', courseId: { in: courseIds } } });
    return certificates.map((row) => this.mapCertificate(row))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.issued_at, right.created_at ?? right.issued_at));
  }

  async getFormateurLearnerAssessments(studentId: string, user: AuthUser) {
    if (!(await this.hasProjection())) return null;
    const courses = await this.instructorCourses(user);
    const courseIds = courses.map((course) => String(course.id));
    if (courseIds.length === 0) return { submissions: [], certificates: [] };
    const exams = await this.prisma.learningExam.findMany({ where: { source: 'app_row', courseId: { in: courseIds } } });
    const examsById = new Map(exams.map((exam) => [String(exam.id), this.mapExam(exam)]));
    const examIds = exams.map((exam) => String(exam.id));
    const [submissions, certificates] = await Promise.all([
      examIds.length > 0 ? this.prisma.learningSubmission.findMany({ where: { source: 'app_row', studentId: String(studentId), examId: { in: examIds } } }) : [],
      this.prisma.learningCertificate.findMany({ where: { source: 'app_row', studentId: String(studentId), courseId: { in: courseIds } } }),
    ]);
    return {
      submissions: submissions.map((row): Row => ({ ...this.mapSubmission(row), exam: examsById.get(String(row.examId)) ?? null }))
        .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at)),
      certificates: certificates.map((row) => this.mapCertificate(row))
        .sort((left, right) => this.compareDatesDesc(left.issued_at ?? left.created_at, right.issued_at ?? right.created_at)),
    };
  }

  private async hasProjection() {
    return (await this.prisma.learningExam.count({ where: { source: 'app_row' } })) > 0
      || (await this.prisma.learningCertificate.count({ where: { source: 'app_row' } })) > 0;
  }

  private async studentCourseIds(user: AuthUser) {
    if (isAdminRole(user)) {
      const courses = await this.prisma.learningCourse.findMany({ where: { source: 'app_row' }, select: { id: true } });
      return courses.map((course) => String(course.id));
    }
    const enrollments = await this.prisma.learningCourseEnrollment.findMany({ where: { source: 'app_row', studentId: String(user.id) }, select: { courseId: true } });
    return enrollments.map((enrollment) => String(enrollment.courseId));
  }

  private studentFilter(user: AuthUser) {
    return isAdminRole(user) ? {} : { studentId: String(user.id) };
  }

  private async findAccessibleExam(examId: string, user: AuthUser) {
    const exam = await this.prisma.learningExam.findFirst({ where: { source: 'app_row', id: String(examId) } });
    if (!exam) return null;
    if (isAdminRole(user)) return exam;
    if (user.role === 'formateur') return String(exam.instructorId) === String(user.id) ? exam : null;
    if (user.role !== 'apprenant') return null;
    const enrollment = await this.prisma.learningCourseEnrollment.findFirst({
      where: { source: 'app_row', courseId: String(exam.courseId), studentId: String(user.id) },
    });
    return enrollment ? exam : null;
  }

  private async instructorCourses(user: AuthUser) {
    return this.prisma.learningCourse.findMany({
      where: { source: 'app_row', ...(isAdminRole(user) ? {} : { instructorId: String(user.id) }) },
    });
  }

  private async questionCounts(examIds: string[]) {
    if (examIds.length === 0) return new Map<string, number>();
    const groups = await this.prisma.learningQuizQuestion.groupBy({
      by: ['examId'],
      where: { source: 'app_row', examId: { in: examIds } },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [String(group.examId), group._count._all]));
  }

  private mapExam(exam: LearningExam): Row {
    const row = this.metadataRow(exam.metadata);
    row.id = this.idValue(row.id ?? exam.id);
    row.course_id = this.idValue(row.course_id ?? exam.courseId);
    row.course_name = exam.courseName ?? row.course_name ?? null;
    row.instructor_id = exam.instructorId ?? row.instructor_id ?? null;
    row.title = exam.title;
    row.type = exam.examType;
    row.exam_date = this.iso(row.exam_date, exam.examDate);
    row.participants = exam.participants;
    row.submitted = exam.submitted;
    row.avg_grade = exam.avgGrade;
    row.status = exam.status;
    row.max_grade = exam.maxGrade;
    row.instructions = exam.instructions;
    row.attachments = exam.attachments ?? row.attachments ?? [];
    row.created_at = this.iso(row.created_at, exam.createdAt);
    row.updated_at = this.iso(row.updated_at, exam.updatedAt);
    return row;
  }

  private mapQuestion(question: LearningQuizQuestion): Row {
    const row = this.metadataRow(question.metadata);
    row.id = this.idValue(row.id ?? question.id);
    row.exam_id = this.idValue(row.exam_id ?? question.examId);
    row.course_id = question.courseId ? this.idValue(row.course_id ?? question.courseId) : null;
    row.instructor_id = question.instructorId ?? row.instructor_id ?? null;
    row.prompt = question.prompt;
    row.type = question.questionType;
    row.points = question.points;
    row.explanation = question.explanation;
    row.required = question.required;
    row.position = question.position;
    row.created_at = this.iso(row.created_at, question.createdAt);
    row.updated_at = this.iso(row.updated_at, question.updatedAt);
    return row;
  }

  private mapChoice(choice: LearningQuizChoice, includeCorrect = true): Row {
    const row = this.metadataRow(choice.metadata);
    row.id = this.idValue(row.id ?? choice.id);
    row.question_id = this.idValue(row.question_id ?? choice.questionId);
    row.exam_id = this.idValue(row.exam_id ?? choice.examId);
    row.course_id = choice.courseId ? this.idValue(row.course_id ?? choice.courseId) : null;
    row.instructor_id = choice.instructorId ?? row.instructor_id ?? null;
    row.label = choice.label;
    row.value = choice.value;
    if (includeCorrect) row.is_correct = choice.isCorrect;
    else delete row.is_correct;
    row.position = choice.position;
    row.created_at = this.iso(row.created_at, choice.createdAt);
    row.updated_at = this.iso(row.updated_at, choice.updatedAt);
    return row;
  }

  private mapSubmission(submission: LearningSubmission): Row {
    const row = this.metadataRow(submission.metadata);
    row.id = this.idValue(row.id ?? submission.id);
    row.exam_id = this.idValue(row.exam_id ?? submission.examId);
    row.course_id = submission.courseId ? this.idValue(row.course_id ?? submission.courseId) : row.course_id ?? null;
    row.student_id = submission.studentId;
    row.student_name = submission.studentName;
    row.student_avatar = trimText(submission.studentAvatar);
    row.submitted_at = this.iso(row.submitted_at, submission.submittedAt);
    row.grade = submission.grade;
    row.feedback = submission.feedback;
    row.status = submission.status;
    row.file_name = submission.fileName;
    row.file_url = submission.fileUrl;
    row.answers = submission.answers ?? row.answers ?? null;
    row.graded_at = this.iso(row.graded_at, submission.gradedAt);
    row.created_at = this.iso(row.created_at, submission.createdAt);
    row.updated_at = this.iso(row.updated_at, submission.updatedAt);
    return row;
  }

  private mapCertificate(certificate: LearningCertificate): Row {
    const row = this.metadataRow(certificate.metadata);
    row.id = this.idValue(row.id ?? certificate.id);
    row.student_id = certificate.studentId;
    row.student_name = certificate.studentName;
    row.student_avatar = trimText(certificate.studentAvatar);
    row.course_id = this.idValue(row.course_id ?? certificate.courseId);
    row.course_name = certificate.courseName;
    row.title = certificate.title;
    row.completion_date = this.iso(row.completion_date, certificate.completionDate);
    row.final_grade = certificate.finalGrade;
    row.grade = certificate.grade;
    row.status = certificate.status;
    row.certificate_id = certificate.certificateId;
    row.certificate_number = certificate.certificateNumber;
    row.issued_at = this.iso(row.issued_at, certificate.issuedAt);
    row.created_at = this.iso(row.created_at, certificate.createdAt);
    row.updated_at = this.iso(row.updated_at, certificate.updatedAt);
    return row;
  }

  private metadataRow(metadata: Prisma.JsonValue | null): Row {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? structuredClone(metadata as Record<string, unknown>)
      : {};
  }

  private idValue(value: unknown) {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) ? numberValue : String(value);
  }

  private iso(value: unknown, fallback?: Date | null) {
    if (typeof value === 'string' && value.trim()) return value;
    return fallback ? fallback.toISOString() : null;
  }

  private position(row: Row) {
    return toNumber(row.position) ?? 0;
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    return this.dateTime(right) - this.dateTime(left);
  }

  private dateTime(value: unknown) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
    return 0;
  }
}
