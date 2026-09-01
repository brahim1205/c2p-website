import type { CertificateData } from './certificateViewerTypes';

export default function CertificateSurface({ data }: { data: CertificateData }) {
  return (
    <div
      data-testid="certificate-surface"
      className="relative mx-auto aspect-[1200/675] w-full max-w-[1120px] overflow-hidden rounded-2xl bg-[#edf4ff] shadow-sm"
      style={{
        backgroundImage: 'url(/images/home/templatka_blog_bd195dc141.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-white/10" />

      <div className="absolute left-[16.5%] top-[12%] z-10 flex w-[68%] flex-col items-center text-center text-[#2d6c61]">
        <p className="text-[clamp(10px,1.3vw,18px)] font-semibold">C2P Academy</p>
        <h1 className="mt-[8.5%] text-[clamp(20px,3.1vw,46px)] font-bold uppercase tracking-[0.04em]">
          Certificat de formation créative
        </h1>
        <p className="mt-[4.2%] text-[clamp(10px,1.25vw,18px)] font-medium text-[#557b73]">Est fièrement présenté à</p>
        <h2 className="mt-[2.5%] min-w-[46%] border-b-2 border-[#8eafa7] px-6 pb-2 font-serif text-[clamp(24px,4.3vw,60px)] leading-none text-[#2b695f]">
          {data.studentName}
        </h2>

        <p className="mt-[5.3%] max-w-[83%] text-[clamp(10px,1.4vw,22px)] leading-[1.45] text-[#4a6f67]">
          Pour son travail créatif et imaginatif durant la formation
          <span className="font-semibold text-[#2b695f]"> « {data.courseTitle} »</span>.
          Expertise appliquée, progression validée et compétences opérationnelles reconnues par C2P.
        </p>

        <div className="mt-[4.6%] flex flex-wrap items-center justify-center gap-3 text-[clamp(9px,1.1vw,15px)] font-semibold text-white">
          <span className="rounded-[6px] bg-[#2f6f63] px-4 py-2 shadow-sm">Date de délivrance : {data.date}</span>
          <span className="rounded-[6px] bg-[#2f6f63] px-4 py-2 shadow-sm">N° série : {data.certificateId}</span>
        </div>
      </div>

      <div className="absolute bottom-[13.4%] left-[23.5%] z-10 text-center text-[clamp(10px,1.15vw,16px)] text-[#4a6f67]">
        <p className="font-medium">Direction C2P</p>
        <p className="font-semibold">Signature autorisée</p>
      </div>

      <div className="absolute bottom-[13.4%] right-[23.8%] z-10 text-center text-[clamp(10px,1.15vw,16px)] text-[#4a6f67]">
        <p className="font-medium">{data.instructor}</p>
        <p className="font-semibold">Formateur principal</p>
      </div>
    </div>
  );
}
