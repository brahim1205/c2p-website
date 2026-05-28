import { buildCertificateVerificationUrl, buildQrPdfRectCommands } from '../certificateVerification';

function sanitizeFilename(filename: string) {
  const safeCharacters = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-');
  const normalized = [...filename].reduce((result, character) => {
    const nextCharacter = safeCharacters.has(character) ? character : '-';
    return nextCharacter === '-' && result.endsWith('-') ? result : `${result}${nextCharacter}`;
  }, '');
  return normalized.split('').filter((character, index, characters) => (
    character !== '-' || (index > 0 && index < characters.length - 1)
  )).join('');
}

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

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
  const railWidth = 132;
  const verificationUrl = buildCertificateVerificationUrl(options.certificateId);
  const commands = [
    'q',
    '1 1 1 rg',
    `0 0 ${pageWidth} ${pageHeight} re f`,
    'Q',
    'q',
    '0.024 0.157 0.239 rg',
    `0 0 ${railWidth} ${pageHeight} re f`,
    'Q',
    'q',
    '0.059 0.463 0.424 rg',
    `742 ${pageHeight - 24} 100 24 re f`,
    'Q',
    'q',
    '0.839 0.878 0.910 RG',
    '1 w',
    `0.5 0.5 ${pageWidth - 1} ${pageHeight - 1} re S`,
    `${railWidth + 42} ${pageHeight - 118} m ${pageWidth - 52} ${pageHeight - 118} l S`,
    `${railWidth + 42} 154 m 386 154 l S`,
    '438 154 m 650 154 l S',
    `${railWidth + 42} 82 m 365 82 l S`,
    'Q',
    'BT',
    '1 1 1 rg',
    '/F2 20 Tf',
    pdfTextAt('C2P', 34, 512),
    '/F1 9 Tf',
    pdfTextAt('ACADEMY', 34, 486),
    pdfTextAt('VERIFIED CREDENTIAL', 34, 472),
    pdfTextAt('CERTIFIED', 34, 92),
    '0.059 0.463 0.424 rg',
    '/F2 13 Tf',
    pdfTextAt('C2P ACADEMY', railWidth + 42, pageHeight - 72),
    '0.067 0.094 0.153 rg',
    '/F2 34 Tf',
    pdfTextAt('Certificate of Completion', railWidth + 42, pageHeight - 106),
    '0.294 0.333 0.408 rg',
    '/F1 11 Tf',
    pdfTextAt('AWARDED TO', railWidth + 42, 394),
    '0.067 0.094 0.153 rg',
    '/F2 40 Tf',
    pdfTextAt(options.studentName, railWidth + 42, 346),
    '0.420 0.447 0.502 rg',
    '/F1 16 Tf',
    pdfTextAt('For successfully completing the certified training', railWidth + 42, 304),
    '0.059 0.463 0.424 rg',
    '/F2 27 Tf',
    pdfTextAt(options.courseTitle, railWidth + 42, 264),
    '0.420 0.447 0.502 rg',
    '/F1 10 Tf',
    pdfTextAt('ISSUED BY', railWidth + 42, 136),
    '0.067 0.094 0.153 rg',
    '/F2 14 Tf',
    pdfTextAt(options.instructor, railWidth + 42, 114),
    '0.420 0.447 0.502 rg',
    '/F1 10 Tf',
    pdfTextAt('COMPLETION DATE', 438, 136),
    '0.067 0.094 0.153 rg',
    '/F2 14 Tf',
    pdfTextAt(options.date, 438, 114),
    '0.610 0.640 0.686 rg',
    '/F1 10 Tf',
    pdfTextAt('AUTHORIZED SIGNATURE', railWidth + 42, 60),
    pdfTextAt('CREDENTIAL ID', 618, 64),
    '/F2 10 Tf',
    pdfTextAt(options.certificateId, 618, 48),
    '0.067 0.094 0.153 rg',
    '/F1 10 Tf',
    pdfTextAt('VERIFY CREDENTIAL', 666, 486),
    pdfTextAt(options.certificateId, 666, 466),
    '/F1 7 Tf',
    pdfTextAt(verificationUrl, 666, 452),
    'ET',
    ...buildQrPdfRectCommands(verificationUrl, { x: 662, y: 392, size: 72 }),
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
