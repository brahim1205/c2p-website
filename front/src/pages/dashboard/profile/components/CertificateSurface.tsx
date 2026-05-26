import { buildCertificateVerificationUrl, createQrMatrix } from '@/lib/certificateVerification';
import type { CertificateData } from './certificateViewerTypes';

export default function CertificateSurface({ data }: { data: CertificateData }) {
  const verificationUrl = buildCertificateVerificationUrl(data.certificateId);
  const qr = createQrMatrix(verificationUrl);
  const quietZone = 2;
  const viewBoxSize = qr.size + quietZone * 2;

  return (
    <div data-testid="certificate-surface" className="relative mx-auto aspect-[297/210] w-full max-w-[920px] overflow-hidden border border-slate-300 bg-white text-left">
      <div className="absolute right-0 top-0 h-6 w-40 bg-teal-700"></div>
      <aside className="absolute inset-y-0 left-0 flex w-[16%] flex-col justify-between bg-gradient-to-b from-[#06283d] to-teal-700 px-6 py-8 text-white">
        <div>
          <div className="text-xl font-extrabold tracking-[0.18em]">C2P</div>
          <p className="mt-3 text-[11px] uppercase leading-5 tracking-[0.12em] text-white/75">
            Academy<br />Verified Credential
          </p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/70 text-4xl font-extrabold">
          ✓
        </div>
      </aside>

      <section className="ml-[16%] flex h-full flex-col px-12 py-9">
        <div className="flex items-start justify-between gap-10 border-b border-slate-200 pb-8">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-teal-700">C2P Academy</div>
            <div className="mt-4 text-[34px] font-extrabold leading-tight text-slate-900">Certificate of Completion</div>
          </div>
          <div className="min-w-[150px] border border-slate-200 p-4 text-center">
            <svg className="mx-auto mb-3 h-24 w-24" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} role="img" aria-label="QR code de verification du certificat">
              <rect width={viewBoxSize} height={viewBoxSize} fill="#fff" />
              <g fill="#111827">
                {qr.cells.map((filled, index) => {
                  if (!filled) return null;
                  return (
                    <rect
                      key={index}
                      x={(index % qr.size) + quietZone}
                      y={Math.floor(index / qr.size) + quietZone}
                      width="1"
                      height="1"
                    />
                  );
                })}
              </g>
            </svg>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-900">Verify Credential</p>
            <p className="mt-1 break-all text-[10px] text-slate-500">{data.certificateId}</p>
            <p className="mt-1 break-all text-[8px] text-teal-700">{verificationUrl}</p>
            <p className="sr-only">{verificationUrl}</p>
          </div>
        </div>

        <div className="pt-10">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Awarded to</div>
          <h2 className="mt-4 text-[42px] font-extrabold leading-tight text-slate-900">{data.studentName}</h2>
          <p className="mt-7 text-lg text-slate-600">For successfully completing the certified training</p>
          <h3 className="mt-4 text-[29px] font-extrabold leading-tight text-teal-700">{data.courseTitle}</h3>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Issued by</p>
            <p className="mt-2 text-[15px] font-bold text-slate-900">{data.instructor}</p>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Completion date</p>
            <p className="mt-2 text-[15px] font-bold text-slate-900">{data.date}</p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-10">
          <div className="min-w-[220px] border-t border-slate-400 pt-3 text-[11px] uppercase tracking-[0.1em] text-slate-500">
            Authorized signature
          </div>
          <div className="text-right text-xs text-slate-500">
            Credential ID<br />
            <strong className="text-slate-700">{data.certificateId}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
