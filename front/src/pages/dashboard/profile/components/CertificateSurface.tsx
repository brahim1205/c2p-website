import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCertificatePrintHtml } from './certificatePrint';
import type { CertificateData } from './certificateViewerTypes';

// A4 landscape at 96 dpi: the iframe renders the document at its real size, then is scaled.
const PAGE_WIDTH = 1123;
const PAGE_HEIGHT = 794;

/** On-screen certificate: the exact printable document, scaled to the available width. */
export default function CertificateSurface({ data }: { data: CertificateData }) {
  const html = useMemo(() => buildCertificatePrintHtml(data), [data]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const fit = () => setScale(host.clientWidth / PAGE_WIDTH);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="certificate-surface"
      className="relative mx-auto w-full max-w-[1120px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      <iframe
        title={`Certificat de ${data.studentName}`}
        srcDoc={html}
        sandbox=""
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, transform: `scale(${scale})` }}
      />
    </div>
  );
}
