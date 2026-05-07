import { useRef } from 'react';
import { printHtmlDocument } from '@/lib/downloads';

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructor: string;
  date: string;
  certificateId: string;
}

interface Props {
  data: CertificateData;
  onClose: () => void;
}

export default function CertificateViewer({ data, onClose }: Props) {
  const certRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const html = certRef.current?.outerHTML ?? '';
    const documentHtml = `
      <html>
        <head>
          <title>Certificat — ${data.courseTitle}</title>
          <style>
            body { margin: 0; padding: 0; font-family: 'Georgia', serif; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
    printHtmlDocument(`certificat-${data.certificateId}`, documentHtml);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Votre certificat</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>

        <div
          ref={certRef}
          className="border-[6px] border-double border-amber-200 bg-amber-50/40 rounded-lg p-8 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300"></div>

          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-award-line text-amber-600 text-xl"></i>
          </div>
          <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold mb-2">
            Certificat de réussite
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{data.studentName}</h2>
          <p className="text-sm text-gray-600 mb-4">
            a complété avec succès la formation
          </p>
          <h3 className="text-lg font-bold text-teal-700 mb-1">{data.courseTitle}</h3>
          <p className="text-xs text-gray-500 mb-6">
            Déliveré par <span className="font-medium text-gray-700">{data.instructor}</span> le {data.date}
          </p>

          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="text-center">
              <div className="w-16 h-[1px] bg-gray-400 mb-1 mx-auto"></div>
              <p className="text-[10px] text-gray-500 uppercase">Signature instructeur</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-[1px] bg-gray-400 mb-1 mx-auto"></div>
              <p className="text-[10px] text-gray-500 uppercase">Plateforme LMS</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-3">ID certificat : {data.certificateId}</p>
        </div>

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
