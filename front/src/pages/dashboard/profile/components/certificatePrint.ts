import { buildCertificateVerificationUrl, buildQrSvgMarkup } from '@/lib/certificateVerification';
import type { CertificateData } from './certificateViewerTypes';

const ISSUER = 'Groupe C2P Consulting L&M';

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** French "mention" from a grade out of 20. */
export function certificateMention(grade: number | null | undefined) {
  if (grade === null || grade === undefined || Number.isNaN(grade)) return null;
  if (grade >= 16) return 'Très bien';
  if (grade >= 14) return 'Bien';
  if (grade >= 12) return 'Assez bien';
  return 'Passable';
}

/** Round official stamp (cachet) drawn in SVG: issuer around the edge, C2P and the date inside. */
function stampSvg(date: string) {
  const ring = `${ISSUER.toUpperCase()} • DAKAR • SÉNÉGAL • `;
  return `<svg class="stamp" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Cachet ${escapeText(ISSUER)}">
    <defs><path id="ring" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"/></defs>
    <g fill="none" stroke="#1a6f6a" stroke-width="3"><circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="88" stroke-width="1.5"/><circle cx="100" cy="100" r="58" stroke-width="1.5"/></g>
    <text font-family="Arial, sans-serif" font-size="12.5" font-weight="700" letter-spacing="1.6" fill="#1a6f6a"><textPath href="#ring" startOffset="0">${escapeText(ring)}</textPath></text>
    <text x="100" y="94" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#1a6f6a">C2P</text>
    <text x="100" y="114" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#1a6f6a">CERTIFIÉ</text>
    <text x="100" y="131" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#1a6f6a">${escapeText(date)}</text>
  </svg>`;
}

/**
 * The certificate document (A4 landscape). Used both for the on-screen preview (iframe) and for
 * printing / saving as PDF, so both always look the same.
 */
export function buildCertificatePrintHtml(data: CertificateData) {
  const student = escapeText(data.studentName);
  const course = escapeText(data.courseTitle);
  const instructor = escapeText(data.instructor || 'Formateur C2P');
  const date = escapeText(data.date);
  const id = escapeText(data.certificateId);
  const verificationUrl = buildCertificateVerificationUrl(data.certificateId);
  const mention = certificateMention(data.finalGrade);
  const details = [
    data.duration ? `Durée : ${escapeText(data.duration)}` : null,
    data.finalGrade !== null && data.finalGrade !== undefined
      ? `Note finale : ${String(data.finalGrade).replace('.', ',')}/20${mention ? ` — Mention ${mention}` : ''}`
      : null,
    `Délivré le ${date}`,
  ].filter(Boolean).join('<span class="dot">•</span>');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://c2p.sn';
  const absolute = (url: string) => (url.startsWith('http') ? url : `${origin}${url}`);
  const signature = (url: string | null | undefined, fallback: string) => (url
    ? `<div class="signimg"><img src="${escapeText(absolute(url))}" alt="Signature" /></div>`
    : `<div class="script">${fallback}</div>`);
  const directorName = escapeText(data.directorName || 'La Direction');
  const directorTitle = escapeText(data.directorTitle || ISSUER);
  const stamp = data.stampUrl
    ? `<img class="stamp stampimg" src="${escapeText(absolute(data.stampUrl))}" alt="Cachet ${escapeText(ISSUER)}" />`
    : stampSvg(data.date);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Certificat - ${course}</title>
  <style>
  @page{size:A4 landscape;margin:0}
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff}
  .page{position:relative;width:297mm;height:210mm;overflow:hidden;background:#fffdf8;font-family:Arial,Helvetica,sans-serif;color:#0f1c35}
  .frame{position:absolute;inset:8mm;border:1.2mm solid #1a6f6a}
  .frame::after{content:"";position:absolute;inset:2mm;border:.4mm solid #c9a24a}
  .corner{position:absolute;width:26mm;height:26mm;border-color:#c9a24a;border-style:solid}
  .tl{top:13mm;left:13mm;border-width:1mm 0 0 1mm}.tr{top:13mm;right:13mm;border-width:1mm 1mm 0 0}
  .bl{bottom:13mm;left:13mm;border-width:0 0 1mm 1mm}.br{bottom:13mm;right:13mm;border-width:0 1mm 1mm 0}
  .head{position:absolute;top:19mm;left:24mm;right:24mm;display:flex;justify-content:space-between;align-items:center}
  .head img{height:15mm}
  .head .num{font-size:3.2mm;color:#5b6b7f;text-align:right;line-height:1.5}
  .head .num strong{color:#0f1c35;letter-spacing:.2mm}
  .body{position:absolute;top:40mm;left:30mm;right:30mm;text-align:center}
  .kicker{font-size:3.6mm;letter-spacing:1.6mm;text-transform:uppercase;color:#c9a24a;font-weight:700}
  h1{margin:2mm 0 0;font:700 12mm Georgia,"Times New Roman",serif;color:#1a6f6a;letter-spacing:.6mm;text-transform:uppercase}
  .to{margin-top:7mm;font-size:4.2mm;color:#5b6b7f}
  .name{display:inline-block;margin-top:3mm;padding:0 10mm 2.5mm;border-bottom:.5mm solid #c9a24a;font:400 13.5mm Georgia,"Times New Roman",serif;color:#0f1c35;line-height:1.1}
  .for{margin-top:6mm;font-size:4.2mm;color:#5b6b7f}
  .course{margin-top:2.5mm;font:700 7mm Georgia,"Times New Roman",serif;color:#0f1c35}
  .details{margin-top:5mm;font-size:3.6mm;color:#33475b}
  .dot{color:#c9a24a;margin:0 2.5mm}
  .foot{position:absolute;left:28mm;right:28mm;bottom:21mm;display:grid;grid-template-columns:1fr 46mm 1fr 34mm;align-items:end;gap:8mm}
  .sign{text-align:center;font-size:3.4mm;color:#33475b}
  .sign .script{font:italic 400 7mm "Brush Script MT","Segoe Script",cursive;color:#1a3d6b;height:9mm;line-height:9mm;white-space:nowrap;overflow:hidden}
  .sign .line{border-top:.35mm solid #0f1c35;margin:1mm 4mm 1.5mm}
  .sign .signimg{height:14mm;display:flex;align-items:flex-end;justify-content:center}
  .sign .signimg img{max-height:14mm;max-width:100%;object-fit:contain}
  .stampimg{object-fit:contain;transform:rotate(-8deg)}
  .sign strong{display:block;color:#0f1c35;font-size:3.6mm}
  .stamp{width:42mm;height:42mm;opacity:.88;transform:rotate(-12deg);justify-self:center;margin-bottom:-4mm}
  .qr{text-align:center;font-size:2.5mm;color:#5b6b7f;line-height:1.35}
  .qr svg{width:24mm;height:24mm;display:block;margin:0 auto 1mm}
  </style></head><body><main class="page">
  <div class="frame"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
  <header class="head">
    <img src="${origin}/images/brand/c2p-admin-logo.webp" alt="C2P" />
    <div class="num">Certificat n° <strong>${id}</strong><br/>${escapeText(ISSUER)}</div>
  </header>
  <section class="body">
    <div class="kicker">Certificat de réussite</div>
    <h1>Certificat</h1>
    <div class="to">Ce certificat est décerné à</div>
    <div class="name">${student}</div>
    <div class="for">pour avoir suivi l’intégralité et réussi toutes les évaluations de la formation</div>
    <div class="course">« ${course} »</div>
    <div class="details">${details}</div>
  </section>
  <footer class="foot">
    <div class="sign">${signature(data.instructorSignatureUrl, instructor)}<div class="line"></div><strong>${instructor}</strong>Responsable pédagogique</div>
    ${stamp}
    <div class="sign">${signature(data.directorSignatureUrl, 'C2P Consulting')}<div class="line"></div><strong>${directorName}</strong>${directorTitle}</div>
    <div class="qr">${buildQrSvgMarkup(verificationUrl, { title: 'QR code de vérification du certificat' })}Vérifier l’authenticité<br/>c2p.sn/certificats/verifier</div>
  </footer>
  </main></body></html>`;
}
