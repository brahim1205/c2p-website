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
  const templateUrl = `${window.location.origin}/images/home/templatka_blog_bd195dc141.webp`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificat - ${course}</title>
  <style>
  @page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;width:297mm;height:210mm;font-family:Georgia,"Times New Roman",serif;background:#edf4ff}
  body{display:flex;align-items:center;justify-content:center;padding:0}
  .certificate{position:relative;width:297mm;height:167.0625mm;overflow:hidden;background:url('${templateUrl}') center/cover no-repeat}
  .veil{position:absolute;inset:0;background:rgba(255,255,255,.1)}
  .content{position:absolute;left:16.5%;top:12%;width:68%;text-align:center;color:#2d6c61}
  .school{font:600 5.2mm Arial,sans-serif}
  h1{margin:14mm 0 0;font:700 11.5mm Georgia,"Times New Roman",serif;text-transform:uppercase;letter-spacing:.04em}
  .presented{margin-top:8mm;font:600 5.2mm Arial,sans-serif;color:#557b73}
  .name{display:inline-block;min-width:46%;margin-top:5mm;padding:0 8mm 2mm;border-bottom:.8mm solid #8eafa7;font:400 15.5mm Georgia,"Times New Roman",serif;line-height:1;color:#2b695f}
  .statement{margin:11mm auto 0;max-width:83%;font:5.5mm Arial,sans-serif;line-height:1.45;color:#4a6f67}
  .statement strong{color:#2b695f}
  .meta{display:flex;justify-content:center;gap:4mm;flex-wrap:wrap;margin-top:9mm;font:600 4.2mm Arial,sans-serif;color:#fff}
  .meta span{background:#2f6f63;border-radius:2mm;padding:3mm 6mm;box-shadow:0 1mm 2mm rgba(0,0,0,.08)}
  .left-sign,.right-sign{position:absolute;bottom:13.4%;text-align:center;font:4.2mm Arial,sans-serif;color:#4a6f67}
  .left-sign{left:23.5%}.right-sign{right:23.8%}
  .left-sign p,.right-sign p{margin:0 0 1mm}
  </style></head><body><main class="certificate"><div class="veil"></div>
  <section class="content">
    <div class="school">C2P Academy</div>
    <h1>Certificat de formation créative</h1>
    <p class="presented">Est fièrement présenté à</p>
    <div class="name">${student}</div>
    <p class="statement">Pour son travail créatif et imaginatif durant la formation <strong>« ${course} »</strong>. Expertise appliquée, progression validée et compétences opérationnelles reconnues par C2P.</p>
    <div class="meta"><span>Date de délivrance : ${date}</span><span>N° série : ${id}</span></div>
  </section>
  <div class="left-sign"><p>Direction C2P</p><p><strong>Signature autorisée</strong></p></div>
  <div class="right-sign"><p>${instructor}</p><p><strong>Formateur principal</strong></p></div>
  </main></body></html>`;
}
