type DownloadValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, DownloadValue>;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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

function openBlobInNewWindow(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const preview = window.open(url, '_blank', 'noopener,noreferrer');
  if (!preview) {
    URL.revokeObjectURL(url);
    return null;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return preview;
}

function escapeCsvCell(value: DownloadValue) {
  const text = String(value ?? '');
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  triggerBlobDownload(filename, new Blob([content], { type: mimeType }));
}

export function downloadHtmlFile(filename: string, html: string) {
  downloadTextFile(filename, html, 'text/html;charset=utf-8');
}

export function downloadJsonFile(filename: string, value: unknown) {
  downloadTextFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'application/json;charset=utf-8');
}

export function downloadCsvFile(filename: string, rows: CsvRow[]) {
  if (!rows.length) {
    downloadTextFile(filename, 'Aucune donnee\n', 'text/csv;charset=utf-8');
    return;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\n');

  downloadTextFile(filename, `${csv}\n`, 'text/csv;charset=utf-8');
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

function wrapPdfLines(lines: string[], maxCharsPerLine = 78) {
  const wrapped: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) {
      wrapped.push('');
      continue;
    }

    let remaining = line.trim();
    while (remaining.length > maxCharsPerLine) {
      const chunk = remaining.slice(0, maxCharsPerLine + 1);
      const lastSpace = chunk.lastIndexOf(' ');
      const splitIndex = lastSpace > 20 ? lastSpace : maxCharsPerLine;
      wrapped.push(remaining.slice(0, splitIndex).trimEnd());
      remaining = remaining.slice(splitIndex).trimStart();
    }

    wrapped.push(remaining);
  }

  return wrapped;
}

export function downloadSimplePdf(filename: string, options: { title?: string; lines: string[] }) {
  const title = normalizePdfText(options.title?.trim() || 'Document');
  const lines = wrapPdfLines(options.lines);
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 56;
  const titleY = 780;
  const bodyStartY = 740;
  const bodyLineHeight = 18;
  const bodyFontSize = 12;
  const titleFontSize = 22;

  const contentLines = [
    'BT',
    `/F1 ${titleFontSize} Tf`,
    `${marginLeft} ${titleY} Td`,
    `(${title}) Tj`,
    `/F1 ${bodyFontSize} Tf`,
  ];

  let currentY = bodyStartY;
  for (const line of lines) {
    if (!line) {
      currentY -= bodyLineHeight;
      continue;
    }

    if (currentY < 60) {
      break;
    }

    contentLines.push(`1 0 0 1 ${marginLeft} ${currentY} Tm`);
    contentLines.push(`(${normalizePdfText(line)}) Tj`);
    currentY -= bodyLineHeight;
  }

  contentLines.push('ET');
  const stream = `${contentLines.join('\n')}\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
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

export function openHtmlPreview(title: string, html: string) {
  const preview = openBlobInNewWindow(new Blob([html], { type: 'text/html;charset=utf-8' }));
  if (!preview) {
    downloadHtmlFile(`${title}.html`, html);
    return false;
  }
  return true;
}

export function printHtmlDocument(title: string, html: string) {
  const preview = openBlobInNewWindow(new Blob([html], { type: 'text/html;charset=utf-8' }));
  if (!preview) {
    downloadHtmlFile(`${title}.html`, html);
    return false;
  }

  preview.focus();
  setTimeout(() => preview.print(), 250);
  return true;
}
