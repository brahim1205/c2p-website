import { printHtmlDocument } from '../downloads';
import { buildCertificatePrintHtml } from '@/pages/dashboard/profile/components/certificatePrint';

export function downloadCertificatePdf(filename: string, options: {
  studentName: string;
  courseTitle: string;
  instructor: string;
  date: string;
  certificateId: string;
}) {
  const title = filename.replace(/\.pdf$/i, '');
  printHtmlDocument(title, buildCertificatePrintHtml(options));
}
