import { printHtmlDocument } from '@/lib/downloads';
import { buildCertificatePrintHtml } from './certificatePrint';
import CertificateSurface from './CertificateSurface';
import type { CertificateData } from './certificateViewerTypes';

export type { CertificateData } from './certificateViewerTypes';

interface Props {
  data: CertificateData;
  onClose: () => void;
}

export default function CertificateViewer({ data, onClose }: Props) {
  const handlePrint = () => {
    printHtmlDocument(`certificat-${data.certificateId}`, buildCertificatePrintHtml(data));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Votre certificat</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>

        <CertificateSurface data={data} />

        <div className="flex gap-3 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-printer-line mr-1.5"></i>
            Imprimer / PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
