import { SkeletonList } from '@/components/base/Skeleton';
import {
  certificateFilters,
  formatCertificateGrade,
  getCertificateFilterLabel,
  getCertificateStats,
  getCertificateStatusMeta,
  type Certificate,
  type CertificateFilter,
} from './certificatesModel';

export function CertificateStatsGrid({ certs }: { certs: Certificate[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {getCertificateStats(certs).map((stat) => (
        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
              <i className={`${stat.icon} text-sm text-white`}></i>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CertificateFilters({ filter, onFilterChange }: { filter: CertificateFilter; onFilterChange: (filter: CertificateFilter) => void }) {
  return (
    <div className="mb-6 flex gap-2">
      {certificateFilters.map((nextFilter) => (
        <button
          key={nextFilter}
          onClick={() => onFilterChange(nextFilter)}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === nextFilter ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {getCertificateFilterLabel(nextFilter)}
        </button>
      ))}
    </div>
  );
}

export function CertificatesTable({
  certs,
  loading,
  onDelete,
  onDownload,
  onIssue,
  onPreview,
}: {
  certs: Certificate[];
  loading: boolean;
  onDelete: (cert: Certificate) => void;
  onDownload: (cert: Certificate) => void;
  onIssue: (cert: Certificate) => void;
  onPreview: (cert: Certificate) => void;
}) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Apprenant', 'Formation', 'Date', 'Note finale', 'N° Certificat', 'Statut', 'Actions'].map((head) => (
                    <th key={head} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${head === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certs.map((cert) => (
                  <CertificateRow
                    key={cert.id}
                    cert={cert}
                    onDelete={onDelete}
                    onDownload={onDownload}
                    onIssue={onIssue}
                    onPreview={onPreview}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {certs.length === 0 && !loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <i className="ri-award-line text-2xl text-gray-400"></i>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun certificat trouvé</h3>
          <p className="text-gray-600">Ajustez vos filtres</p>
        </div>
      ) : null}
    </>
  );
}

export function CertificatePreviewModal({
  cert,
  onClose,
  onDownload,
  onIssue,
}: {
  cert: Certificate;
  onClose: () => void;
  onDownload: (cert: Certificate) => void;
  onIssue: (cert: Certificate) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-xl">
        <div className="rounded-lg border-4 border-teal-100 bg-[#f5faf9] p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-600">
              <i className="ri-award-line text-4xl text-white"></i>
            </div>
            <h2 className="mb-1 text-2xl font-bold text-teal-900">CERTIFICAT DE RÉUSSITE</h2>
            <p className="mb-6 text-sm text-teal-600">C2P - Compétences et Création de Projet</p>

            <p className="mb-4 text-gray-700">Ce certificat est décerné à</p>
            <h3 className="mb-2 text-3xl font-bold text-gray-900">{cert.student_name}</h3>
            <p className="mb-6 text-gray-600">pour avoir complété avec succès la formation</p>
            <h4 className="mb-4 text-xl font-semibold text-teal-700">{cert.course_name || '-'}</h4>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCertificateGrade(cert.final_grade)}</p>
                <p className="text-xs text-gray-500">Note finale</p>
              </div>
              <div className="h-10 w-px bg-gray-300"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {cert.completion_date ? new Date(cert.completion_date).toLocaleDateString('fr-FR') : '-'}
                </p>
                <p className="text-xs text-gray-500">Date d'obtention</p>
              </div>
            </div>

            {cert.certificate_id ? <p className="font-mono text-xs text-gray-400">N° {cert.certificate_id}</p> : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
            Fermer
          </button>
          {cert.status === 'issued' ? (
            <button
              onClick={() => onDownload(cert)}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <i className="ri-download-line"></i>
              Télécharger PDF
            </button>
          ) : null}
          {cert.status === 'ready' ? (
            <button onClick={() => onIssue(cert)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
              Délivrer le certificat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CertificateRow({
  cert,
  onDelete,
  onDownload,
  onIssue,
  onPreview,
}: {
  cert: Certificate;
  onDelete: (cert: Certificate) => void;
  onDownload: (cert: Certificate) => void;
  onIssue: (cert: Certificate) => void;
  onPreview: (cert: Certificate) => void;
}) {
  const statusMeta = getCertificateStatusMeta(cert.status);
  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {cert.student_avatar ? (
            <img src={cert.student_avatar} alt={cert.student_name} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {cert.student_name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-medium text-gray-900">{cert.student_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{cert.course_name || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{cert.completion_date ? new Date(cert.completion_date).toLocaleDateString('fr-FR') : '-'}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCertificateGrade(cert.final_grade)}</td>
      <td className="px-4 py-3 font-mono text-sm text-gray-600">{cert.certificate_id || '-'}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta.style}`}>{statusMeta.label}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onPreview(cert)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100" title="Aperçu">
            <i className="ri-eye-line text-sm text-gray-600"></i>
          </button>
          {cert.status === 'ready' ? (
            <button onClick={() => onIssue(cert)} className="whitespace-nowrap rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700">
              Délivrer
            </button>
          ) : null}
          {cert.status === 'issued' ? (
            <button onClick={() => onDownload(cert)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-teal-50" title="Télécharger">
              <i className="ri-download-line text-sm text-teal-600"></i>
            </button>
          ) : null}
          <button onClick={() => onDelete(cert)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50">
            <i className="ri-delete-bin-line text-sm text-red-500"></i>
          </button>
        </div>
      </td>
    </tr>
  );
}
