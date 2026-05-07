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
