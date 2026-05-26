import QRCode from 'qrcode';

export interface QrMatrix {
  size: number;
  cells: boolean[];
}

export function buildCertificateVerificationUrl(certificateId: string) {
  const baseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://c2p.sn')).replace(/\/$/, '');
  return `${baseUrl}/certificats/verifier/${encodeURIComponent(certificateId)}`;
}

export function createQrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const data = Array.from(qr.modules.data, Boolean);
  return {
    size: qr.modules.size,
    cells: data,
  };
}

export function buildQrSvgMarkup(value: string, options: { className?: string; title?: string } = {}) {
  const matrix = createQrMatrix(value);
  const quietZone = 2;
  const viewBoxSize = matrix.size + quietZone * 2;
  const cells = matrix.cells
    .map((filled, index) => {
      if (!filled) return '';
      const x = (index % matrix.size) + quietZone;
      const y = Math.floor(index / matrix.size) + quietZone;
      return `<rect x="${x}" y="${y}" width="1" height="1" />`;
    })
    .join('');

  return `<svg ${options.className ? `class="${options.className}" ` : ''}xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" role="img" aria-label="${options.title || 'QR code de verification'}"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#fff" /><g fill="#111827">${cells}</g></svg>`;
}

export function buildQrPdfRectCommands(value: string, input: { x: number; y: number; size: number }) {
  const matrix = createQrMatrix(value);
  const quietZone = 2;
  const totalModules = matrix.size + quietZone * 2;
  const unit = input.size / totalModules;
  const commands = [
    'q',
    '1 1 1 rg',
    `${input.x} ${input.y} ${input.size} ${input.size} re f`,
    '0.067 0.094 0.153 rg',
  ];

  matrix.cells.forEach((filled, index) => {
    if (!filled) return;
    const column = index % matrix.size;
    const row = Math.floor(index / matrix.size);
    const x = input.x + (column + quietZone) * unit;
    const y = input.y + input.size - (row + quietZone + 1) * unit;
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${unit.toFixed(2)} ${unit.toFixed(2)} re f`);
  });

  commands.push('Q');
  return commands;
}
