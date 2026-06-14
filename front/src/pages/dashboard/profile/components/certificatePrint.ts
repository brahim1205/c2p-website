import { buildCertificateVerificationUrl, buildQrSvgMarkup } from '@/lib/certificateVerification';
import type { CertificateData } from './certificateViewerTypes';

function escapeCertificateText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildCertificatePrintHtml(data: CertificateData) {
  const student = escapeCertificateText(data.studentName);
  const course = escapeCertificateText(data.courseTitle);
  const instructor = escapeCertificateText(data.instructor);
  const date = escapeCertificateText(data.date);
  const id = escapeCertificateText(data.certificateId);
  const verificationUrl = buildCertificateVerificationUrl(data.certificateId);
  const qr = buildQrSvgMarkup(verificationUrl, { className: 'qr', title: 'QR code de vérification du certificat' });

  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificat - ${course}</title>
  <style>
  @page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;width:297mm;height:210mm;background:#fffef8;color:#164f48;font-family:Georgia,"Times New Roman",serif}
  body{padding:8mm}.certificate{position:relative;width:281mm;height:194mm;border:10px double #477d73;outline:1px solid #477d73;outline-offset:-16px;padding:16mm 24mm 12mm;text-align:center;overflow:hidden}
  .corner{position:absolute;width:23mm;height:23mm;border:7px double #477d73;border-radius:50%;background:#fffef8}.tl{left:-6mm;top:-6mm}.tr{right:-6mm;top:-6mm}.bl{left:-6mm;bottom:-6mm}.br{right:-6mm;bottom:-6mm}
  .brand{color:#148dc1;font:bold 22px Arial;letter-spacing:.2em}.brand-sub{font:bold 9px Arial;text-transform:uppercase;letter-spacing:.12em}
  h1{margin:5mm 0 2mm;font-size:31px;text-transform:uppercase;letter-spacing:.03em}p{margin:0}.name{display:inline-block;min-width:145mm;margin:2mm 0 5mm;border-bottom:2px solid #477d73;padding:0 10mm 2mm;font-size:36px;font-weight:bold}
  .statement{font:16px Arial;color:#334155;line-height:1.45}.course{display:block;color:#164f48;font:bold 20px Georgia;margin-top:2mm}.meta{display:flex;justify-content:center;gap:5mm;margin-top:6mm;font:bold 12px Arial;color:white}.meta span{background:#236b60;border-radius:2mm;padding:3mm 7mm}
  .footer{position:absolute;left:28mm;right:28mm;bottom:13mm;display:grid;grid-template-columns:1fr auto 1fr;gap:14mm;align-items:end;font:12px Arial}.signature{border-top:1px solid #477d73;padding-top:2mm;line-height:1.5}
  .seal{width:28mm;height:28mm;border:7px solid #d7ad38;border-radius:50%;background:radial-gradient(circle,#fff4a8,#c8921e);display:flex;align-items:center;justify-content:center;font:bold 11px Arial}.qr{position:absolute;right:14mm;bottom:10mm;width:15mm;height:15mm;background:white;padding:1mm}
  </style></head><body><main class="certificate"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
  <div class="brand">C2P</div><div class="brand-sub">Centre de Promotion Professionnelle</div>
  <h1>Certificat de formation professionnelle</h1><p>Est fièrement décerné à</p><div class="name">${student}</div>
  <p class="statement">Pour avoir suivi avec succès et achevé la formation <strong class="course">« ${course} »</strong></p>
  <div class="meta"><span>Date de délivrance : ${date}</span><span>N° série : ${id}</span></div>
  <div class="footer"><div class="signature"><strong>Direction C2P</strong><br>Signature autorisée</div><div class="seal">C2P<br>CERTIFIÉ</div><div class="signature"><strong>${instructor}</strong><br>Formateur</div></div>
  ${qr}</main></body></html>`;
}
