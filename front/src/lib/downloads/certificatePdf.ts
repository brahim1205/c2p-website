import { buildCertificateVerificationUrl, buildQrPdfRectCommands } from '../certificateVerification';
import { triggerBlobDownload } from './browserDownload';

function normalizePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function pdfTextAt(value: string, x: number, y: number) {
  return `1 0 0 1 ${x} ${y} Tm\n(${normalizePdfText(value)}) Tj`;
}

export function downloadCertificatePdf(filename: string, options: {
  studentName: string;
  courseTitle: string;
  instructor: string;
  date: string;
  certificateId: string;
}) {
  const pageWidth = 842;
  const pageHeight = 595;
  const verificationUrl = buildCertificateVerificationUrl(options.certificateId);
  const commands = [
    'q',
    '1 1 1 rg',
    `0 0 ${pageWidth} ${pageHeight} re f`,
    'Q',
    'q',
    '0.278 0.490 0.451 RG',
    '8 w',
    `18 18 ${pageWidth - 36} ${pageHeight - 36} re S`,
    '1 w',
    `30 30 ${pageWidth - 60} ${pageHeight - 60} re S`,
    'Q',
    'q',
    '0.137 0.420 0.376 rg',
    '224 174 185 30 re f',
    '433 174 185 30 re f',
    'Q',
    'BT',
    '0.08 0.35 0.5 rg','/F2 20 Tf',pdfTextAt('C2P', 397, 535),
    '0.086 0.31 0.28 rg','/F1 9 Tf',pdfTextAt('CENTRE DE PROMOTION PROFESSIONNELLE', 325, 518),
    '/F2 29 Tf',pdfTextAt('CERTIFICAT DE FORMATION PROFESSIONNELLE', 119, 470),
    '/F1 13 Tf',pdfTextAt('Est fierement decerne a', 350, 435),
    '/F2 38 Tf',pdfTextAt(options.studentName, 250, 386),
    '/F1 15 Tf',pdfTextAt('Pour avoir suivi avec succes et acheve la formation', 260, 338),
    '/F2 23 Tf',pdfTextAt(options.courseTitle, 220, 300),
    '1 1 1 rg','/F2 12 Tf',pdfTextAt(`Date de delivrance : ${options.date}`, 242, 185),pdfTextAt(`N serie : ${options.certificateId}`, 450, 185),
    '0.086 0.31 0.28 rg','/F2 12 Tf',pdfTextAt('Direction C2P', 160, 92),pdfTextAt(options.instructor, 575, 92),
    '/F1 10 Tf',pdfTextAt('Signature autorisee', 157, 76),pdfTextAt('Formateur', 590, 76),
    '/F2 12 Tf',pdfTextAt('C2P CERTIFIE', 376, 86),
    'ET',
    ...buildQrPdfRectCommands(verificationUrl, { x: 748, y: 42, size: 48 }),
  ];

  const stream = `${commands.join('\n')}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  triggerBlobDownload(filename, new Blob([pdf], { type: 'application/pdf' }));
}
