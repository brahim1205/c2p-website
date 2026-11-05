import { Injectable } from '@nestjs/common';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { appendAppRows, withId } from '../data/data-app-store.js';
import { syncCertificates } from '../data/data-certification.js';
import { prepareInsert } from '../data/data-runtime.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';

type Pair = { courseId: unknown; studentId: unknown };

/**
 * Persists certificate changes computed by `syncCertificates` and tells the learner (and the
 * instructor) when a certificate has just been delivered.
 */
@Injectable()
export class LearningCertificationService {
  constructor(private readonly platformPersistenceService: PlatformPersistenceService) {}

  /**
   * Computes the certificate rows to write. Callers that already persist rows in the same
   * transaction merge `rowsByTable` into their own write; others call `syncAndPersist`.
   */
  collect(pairs: Pair[]) {
    const result = syncCertificates(pairs);
    const rowsByTable: Record<string, Row[]> = {};
    const beforeRowsByTable: Record<string, Row[]> = {};
    if (result.rows.length) {
      rowsByTable.certificates = result.rows;
      if (result.before.length) beforeRowsByTable.certificates = result.before;
    }
    const issuedRows = result.rows.filter((row) => String(row.status) === 'issued');
    const notifications = issuedRows.flatMap((certificate) => this.issuedNotifications(certificate));
    if (notifications.length) rowsByTable.notifications = appendAppRows('notifications', notifications);
    return { rowsByTable, beforeRowsByTable, issued: issuedRows };
  }

  async syncAndPersist(pairs: Pair[], actorId: string, reason: string) {
    const { rowsByTable, beforeRowsByTable, issued } = this.collect(pairs);
    if (!Object.keys(rowsByTable).length) return { issued };
    await this.platformPersistenceService.persistRows(rowsByTable, {
      actorId,
      reason,
      beforeRowsByTable,
      afterRowsByTable: rowsByTable,
    });
    return { issued };
  }

  private issuedNotifications(certificate: Row) {
    const course = String(certificate.course_name ?? 'votre formation');
    const rows = [withId(prepareInsert('notifications', createAppNotificationRow({
      userId: String(certificate.student_id),
      title: 'Votre certificat est disponible',
      message: `Félicitations ! Vous avez validé toutes les étapes de « ${course} ». Votre certificat n° ${String(certificate.certificate_number)} est prêt.`,
      type: 'formation',
      link: '/dashboard/apprenant/certificats',
      metadata: { certificate_id: certificate.id, course_id: certificate.course_id },
    })))];
    if (certificate.instructor_id) {
      rows.push(withId(prepareInsert('notifications', createAppNotificationRow({
        userId: String(certificate.instructor_id),
        title: 'Certificat délivré',
        message: `${String(certificate.student_name ?? 'Un apprenant')} a obtenu le certificat de « ${course} ».`,
        type: 'formation',
        link: '/dashboard/formateur/certificats',
        metadata: { certificate_id: certificate.id, course_id: certificate.course_id, student_id: certificate.student_id },
      }))));
    }
    return rows;
  }
}
