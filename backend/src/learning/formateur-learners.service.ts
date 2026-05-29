import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  clone,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { LearningAssessmentsReadService } from './learning-assessments-read.service.js';

@Injectable()
export class FormateurLearnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly learningAssessmentsReadService: LearningAssessmentsReadService,
  ) {}

  async getCertificates(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const prismaRows = await this.learningAssessmentsReadService.getFormateurCertificates(actor);
    if (prismaRows) return prismaRows;
    const courseIds = this.instructorCourseIds(actor);
    if (courseIds.size === 0) return [];
    return hydrateRows('certificates', this.accessibleRows('certificates', actor))
      .filter((certificate) => courseIds.has(String(certificate.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.issued_at, right.created_at ?? right.issued_at));
  }

  async issueCertificate(certId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const certificate = this.getInstructorCertificate(certId, actor);
    const previous = clone(certificate);
    const issuedAt = new Date().toISOString();
    const certificateId = this.buildCertificateId(certificate);
    const updated = patchAppRows('certificates', (row) => String(row.id) === String(certificate.id), {
      status: 'issued',
      certificate_id: certificateId,
      certificate_number: certificateId,
      issued_at: issuedAt,
    });
    await this.platformPersistenceService.persistRows({ certificates: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:certificate:issue',
      beforeRowsByTable: { certificates: [previous] },
      afterRowsByTable: { certificates: updated },
    });
    const prismaCertificate = await this.learningAssessmentsReadService.getCertificateById(String(certificate.id), actor);
    return { certificateId, issuedAt, certificate: prismaCertificate ?? updated[0] ?? null };
  }

  async deleteCertificate(certId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const certificate = this.getInstructorCertificate(certId, actor);
    store.certificates = (store.certificates ?? []).filter((row) => String(row.id) !== String(certificate.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ certificates: [String(certificate.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:certificate:delete',
      beforeRowsByTable: { certificates: [certificate] },
    });
    await this.learningAssessmentsReadService.assertCertificateDeleted(String(certificate.id));
    return certificate;
  }

  async getLearners(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor);
    const courseIds = new Set(courses.map((course) => String(course.id)));
    if (courseIds.size === 0) {
      return { courses: [], enrollments: [] };
    }
    const coursesById = new Map(courses.map((course) => [String(course.id), this.courseRelation(course)]));
    const enrollments = hydrateRows('course_enrollments', this.accessibleRows('course_enrollments', actor))
      .filter((enrollment) => courseIds.has(String(enrollment.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.last_active ?? left.enrolled_at, right.last_active ?? right.enrolled_at))
      .map((enrollment) => ({
        ...enrollment,
        courses: coursesById.get(String(enrollment.course_id)) ?? null,
      }));
    return { courses, enrollments };
  }

  async getLearnerDetail(studentId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor);
    const courseIds = new Set(courses.map((course) => String(course.id)));
    if (courseIds.size === 0) {
      return { enrollments: [], submissions: [], certificates: [] };
    }
    const coursesById = new Map(courses.map((course) => [String(course.id), this.courseRelation(course)]));
    const enrollments = hydrateRows('course_enrollments', this.accessibleRows('course_enrollments', actor))
      .filter((enrollment) => String(enrollment.student_id) === String(studentId) && courseIds.has(String(enrollment.course_id)))
      .sort((left, right) => this.compareNumbersDesc(left.progress, right.progress))
      .map((enrollment) => ({
        ...enrollment,
        courses: coursesById.get(String(enrollment.course_id)) ?? null,
      }));
    const prismaAssessments = await this.learningAssessmentsReadService.getFormateurLearnerAssessments(studentId, actor);
    if (prismaAssessments) return { enrollments, ...prismaAssessments };

    const exams = hydrateRows('exams', this.accessibleRows('exams', actor))
      .filter((exam) => courseIds.has(String(exam.course_id)));
    const examsById = new Map(exams.map((exam) => [String(exam.id), exam]));
    const examIds = new Set(exams.map((exam) => String(exam.id)));
    const submissions = hydrateRows('submissions', this.accessibleRows('submissions', actor))
      .filter((submission) => String(submission.student_id) === String(studentId) && examIds.has(String(submission.exam_id)))
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at))
      .map((submission) => ({
        ...submission,
        exam: examsById.get(String(submission.exam_id)) ?? null,
      }));
    const certificates = hydrateRows('certificates', this.accessibleRows('certificates', actor))
      .filter((certificate) => String(certificate.student_id) === String(studentId) && courseIds.has(String(certificate.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.issued_at ?? left.created_at, right.issued_at ?? right.created_at));
    return { enrollments, submissions, certificates };
  }

  private requireFormateurActor(user: AuthUser | null) {
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role !== 'formateur' && !isAdminRole(user)) {
      throw new ForbiddenException('Seul un formateur peut acceder a ces donnees.');
    }
    return user;
  }

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private getInstructorCourses(user: AuthUser) {
    return this.accessibleRows('courses', user)
      .filter((course) => isAdminRole(user) || String(course.instructor_id) === String(user.id));
  }

  private instructorCourseIds(user: AuthUser) {
    return new Set(this.getInstructorCourses(user).map((course) => String(course.id)));
  }

  private getInstructorCertificate(certId: string, user: AuthUser) {
    const courseIds = this.instructorCourseIds(user);
    const certificate = this.accessibleRows('certificates', user).find((row) =>
      String(row.id) === String(certId) && courseIds.has(String(row.course_id))
    );
    if (!certificate) {
      throw new NotFoundException('Certificat introuvable.');
    }
    return certificate;
  }

  private buildCertificateId(certificate: Row) {
    const existing = String(certificate.certificate_id ?? certificate.certificate_number ?? '').trim();
    if (existing) return existing;
    const slug = String(certificate.course_name ?? certificate.title ?? 'CERT')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .slice(0, 2)
      .join('-')
      .slice(0, 16) || 'CERT';
    return `C2P-${new Date().getFullYear()}-${slug}-${String(certificate.id).padStart(3, '0')}`;
  }

  private courseRelation(course: Row) {
    return {
      id: course.id,
      title: course.title,
      category: course.category ?? null,
      modules: course.modules ?? null,
      duration: course.duration ?? null,
      status: course.status,
    };
  }

  private compareNumbersDesc(left: unknown, right: unknown) {
    return Number(right ?? 0) - Number(left ?? 0);
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
    const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
    return normalizedRight - normalizedLeft;
  }
}
