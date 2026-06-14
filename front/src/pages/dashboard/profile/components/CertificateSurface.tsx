import { buildCertificateVerificationUrl, createQrMatrix } from '@/lib/certificateVerification';
import type { CertificateData } from './certificateViewerTypes';

export default function CertificateSurface({ data }: { data: CertificateData }) {
  const verificationUrl = buildCertificateVerificationUrl(data.certificateId);
  const qr = createQrMatrix(verificationUrl);
  const quietZone = 2;
  const viewBoxSize = qr.size + quietZone * 2;

  return (
    <div data-testid="certificate-surface" className="relative mx-auto aspect-[297/210] w-full max-w-[920px] overflow-hidden bg-[#fffef8] p-[3.5%] text-center text-[#164f48] shadow-sm">
      <div className="pointer-events-none absolute inset-[1.4%] border-[10px] border-double border-[#477d73]" />
      <div className="pointer-events-none absolute inset-[3.3%] border border-[#477d73]" />
      {['left-3 top-3', 'right-3 top-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((position) => (
        <div key={position} className={`absolute ${position} h-16 w-16 rounded-full border-[7px] border-double border-[#477d73] bg-[#fffef8]`} />
      ))}

      <div className="relative z-10 flex h-full flex-col items-center px-[7%] py-[2%]">
        <div className="text-lg font-black tracking-[0.2em] text-[#148dc1]">C2P</div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#477d73]">Centre de Promotion Professionnelle</p>
        <h1 className="mt-3 text-[clamp(20px,3vw,39px)] font-black uppercase tracking-wide">Certificat de formation professionnelle</h1>
        <p className="mt-2 text-sm">Est fièrement décerné à</p>
        <h2 className="mt-1 min-w-[55%] border-b-2 border-[#477d73] px-8 pb-1 text-[clamp(24px,4vw,46px)] font-bold">{data.studentName}</h2>
        <p className="mt-4 max-w-[78%] text-[clamp(11px,1.6vw,17px)] leading-relaxed text-slate-700">
          Pour avoir suivi avec succès et achevé la formation
          <strong className="block text-[#164f48]">« {data.courseTitle} »</strong>
        </p>

        <div className="mt-4 flex gap-3 text-[clamp(9px,1.2vw,13px)] font-bold text-white">
          <span className="rounded bg-[#236b60] px-5 py-2">Date de délivrance : {data.date}</span>
          <span className="rounded bg-[#236b60] px-5 py-2">N° série : {data.certificateId}</span>
        </div>

        <div className="mt-auto grid w-full grid-cols-[1fr_auto_1fr] items-end gap-6 px-[5%]">
          <div className="border-t border-[#477d73] pt-2 text-xs"><strong>Direction C2P</strong><br />Signature autorisée</div>
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-[7px] border-[#d7ad38] bg-gradient-to-br from-[#fff4a8] to-[#c8921e] text-[10px] font-black text-[#164f48] shadow-md">
            C2P<br /><span className="text-sm">CERTIFIÉ</span>
          </div>
          <div className="border-t border-[#477d73] pt-2 text-xs"><strong>{data.instructor}</strong><br />Formateur</div>
        </div>
      </div>

      <div className="absolute bottom-[6%] right-[5%] z-20 bg-white p-1">
        <svg className="h-12 w-12" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} role="img" aria-label="QR code de vérification">
          <rect width={viewBoxSize} height={viewBoxSize} fill="#fff" />
          <g fill="#164f48">
            {qr.cells.map((filled, index) => filled ? (
              <rect key={index} x={(index % qr.size) + quietZone} y={Math.floor(index / qr.size) + quietZone} width="1" height="1" />
            ) : null)}
          </g>
        </svg>
      </div>
    </div>
  );
}
