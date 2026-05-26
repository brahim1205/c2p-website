import { buildCertificateVerificationUrl, buildQrSvgMarkup } from '@/lib/certificateVerification';
import type { CertificateData } from './certificateViewerTypes';

function escapeCertificateText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildCertificatePrintHtml(data: CertificateData) {
  const studentName = escapeCertificateText(data.studentName);
  const courseTitle = escapeCertificateText(data.courseTitle);
  const instructor = escapeCertificateText(data.instructor);
  const date = escapeCertificateText(data.date);
  const certificateId = escapeCertificateText(data.certificateId);
  const verificationUrl = buildCertificateVerificationUrl(data.certificateId);
  const escapedVerificationUrl = escapeCertificateText(verificationUrl);
  const verificationQr = buildQrSvgMarkup(verificationUrl, { className: 'qr', title: 'QR code de verification du certificat' });

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Certificat - ${courseTitle}</title>
        <style>
          @page { size: A4 landscape; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            min-height: 100%;
            background: #f8fafc;
            color: #111827;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
          }
          .certificate {
            position: relative;
            width: 297mm;
            height: 210mm;
            border: 1px solid #d6dde7;
            border-radius: 0;
            background: #ffffff;
            overflow: hidden;
            text-align: left;
            padding: 0 0 0 48mm;
          }
          .rail {
            position: absolute;
            inset: 0 auto 0 0;
            width: 42mm;
            background: linear-gradient(180deg, #06283d 0%, #0f766e 100%);
            color: #fff;
            padding: 20mm 8mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .rail-mark {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.18em;
          }
          .rail-caption {
            font-size: 11px;
            line-height: 1.5;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.78);
          }
          .seal {
            width: 28mm;
            height: 28mm;
            border: 2px solid rgba(255,255,255,0.75);
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 800;
          }
          .content {
            height: 100%;
            padding: 22mm 22mm 18mm;
            display: flex;
            flex-direction: column;
          }
          .topline {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18mm;
            border-bottom: 1px solid #d9e2ec;
            padding-bottom: 10mm;
          }
          .brand {
            color: #0f766e;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.2em;
            text-transform: uppercase;
          }
          .credential {
            margin-top: 5mm;
            color: #111827;
            font-size: 34px;
            line-height: 1.1;
            font-weight: 800;
          }
          .verify-box {
            min-width: 46mm;
            border: 1px solid #d9e2ec;
            padding: 6mm;
            text-align: center;
          }
          .qr {
            width: 22mm;
            height: 22mm;
            margin: 0 auto 4mm;
            display: block;
          }
          .verify-title {
            margin: 0;
            color: #111827;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .verify-id {
            margin: 2mm 0 0;
            color: #64748b;
            font-size: 10px;
          }
          .verify-link {
            margin: 2mm 0 0;
            color: #0f766e;
            font-size: 8px;
            overflow-wrap: anywhere;
          }
          .recipient {
            padding-top: 16mm;
          }
          .label {
            color: #64748b;
            font-size: 12px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }
          h1 {
            margin: 4mm 0 0;
            color: #0f172a;
            font-size: 42px;
            line-height: 1.05;
            font-weight: 800;
          }
          .statement {
            margin: 8mm 0 0;
            color: #475569;
            font-size: 17px;
          }
          h2 {
            margin: 5mm 0 0;
            color: #0f766e;
            font-size: 29px;
            line-height: 1.15;
            font-weight: 800;
          }
          .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7mm;
            margin-top: 12mm;
          }
          .meta-card {
            border-top: 1px solid #d9e2ec;
            padding-top: 4mm;
          }
          .meta-title {
            margin: 0 0 2mm;
            color: #64748b;
            font-size: 11px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .meta-value {
            margin: 0;
            color: #111827;
            font-size: 15px;
            font-weight: 700;
          }
          .footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 12mm;
          }
          .signature-line {
            min-width: 54mm;
            border-top: 1px solid #94a3b8;
            padding-top: 3mm;
            color: #64748b;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }
          .credential-id {
            color: #64748b;
            font-size: 12px;
            text-align: right;
          }
          .accent {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 42mm;
            height: 6mm;
            background: #0f766e;
          }
          @media print {
            html, body {
              width: 297mm;
              height: 210mm;
              background: #fff;
              padding: 0;
            }
            .certificate {
              width: 297mm;
              height: 210mm;
              box-shadow: none;
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="certificate">
          <div class="accent"></div>
          <aside class="rail">
            <div>
              <div class="rail-mark">C2P</div>
              <p class="rail-caption">Academy<br />Verified Credential</p>
            </div>
            <div class="seal">✓</div>
          </aside>
          <section class="content">
            <div class="topline">
              <div>
                <div class="brand">C2P Academy</div>
                <div class="credential">Certificate of Completion</div>
              </div>
              <div class="verify-box">
                ${verificationQr}
                <p class="verify-title">Verify Credential</p>
                <p class="verify-id">${certificateId}</p>
                <p class="verify-link">${escapedVerificationUrl}</p>
              </div>
            </div>
            <div class="recipient">
              <div class="label">Awarded to</div>
              <h1>${studentName}</h1>
              <p class="statement">For successfully completing the certified training</p>
              <h2>${courseTitle}</h2>
            </div>
            <div class="meta">
              <div class="meta-card">
                <p class="meta-title">Issued by</p>
                <p class="meta-value">${instructor}</p>
              </div>
              <div class="meta-card">
                <p class="meta-title">Completion date</p>
                <p class="meta-value">${date}</p>
              </div>
            </div>
            <div class="footer">
              <div class="signature-line">Authorized signature</div>
              <div class="credential-id">Credential ID<br /><strong>${certificateId}</strong></div>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}
