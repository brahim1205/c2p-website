export interface CertificateData {
  /** Learner's full name, as printed. */
  studentName: string;
  courseTitle: string;
  /** Instructor in charge of the course (signs as "Responsable pédagogique"). */
  instructor: string;
  /** Delivery date, already formatted (e.g. "12 novembre 2026"). */
  date: string;
  /** Certificate number, also used by the public verification page. */
  certificateId: string;
  /** Course length shown on the certificate, e.g. "6 h 30 min". */
  duration?: string | null;
  /** Final grade out of 20, when the course has graded exams. */
  finalGrade?: number | null;
}
