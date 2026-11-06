import { SkeletonList } from '@/components/base/Skeleton';
import CertificateRequirements from '@/components/feature/CertificateRequirements';
import CertificateSurface from '@/pages/dashboard/profile/components/CertificateSurface';
import { useCertificateBranding } from '@/hooks/useCertificateBranding';
import { CertificateNumberCell } from './CertificateNumberCell';
import {
  certificateFilters,
  certificateProgressLabel,
  toCertificateData,
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
  onPreview,
}: {
  certs: Certificate[];
  loading: boolean;
  onDelete: (cert: Certificate) => void;
  onDownload: (cert: Certificate) => void;
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
  const issued = cert.status === 'issued';
  const branding = useCertificateBranding();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`Certificat de ${cert.student_name}`}>
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{cert.student_name}</h2>
            <p className="text-sm text-gray-500">{cert.course_name || '-'}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>
        {issued ? (
          <CertificateSurface data={toCertificateData(cert, branding)} />
        ) : cert.status === 'revoked' ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Certificat révoqué : {cert.revoked_reason || 'sans motif précisé'}.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">Le certificat sera délivré automatiquement quand toutes les étapes seront validées :</p>
            <CertificateRequirements requirements={cert.requirements} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
            Fermer
          </button>
          {issued ? (
            <button onClick={() => onDownload(cert)} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
              <i className="ri-download-line"></i>
              Télécharger PDF
            </button>
          ) : (
            <button onClick={() => onIssue(cert)} className="rounded-lg border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50">
              Délivrer manuellement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificateRow({
  cert,
  onDelete,
  onDownload,
  onPreview,
}: {
  cert: Certificate;
  onDelete: (cert: Certificate) => void;
  onDownload: (cert: Certificate) => void;
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
      <td className="px-4 py-3 text-sm text-gray-600">{cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('fr-FR') : '-'}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCertificateGrade(cert.final_grade)}</td>
      <td className="px-4 py-3"><CertificateNumberCell value={cert.certificate_number || cert.certificate_id} /></td>
      <td className="px-4 py-3">
        <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusMeta.style}`}>{statusMeta.label}</span>
        {cert.status !== 'issued' && cert.status !== 'revoked' && certificateProgressLabel(cert) ? (
          <span className="mt-1 block text-xs text-gray-500">{certificateProgressLabel(cert)}</span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onPreview(cert)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100" title="Aperçu">
            <i className="ri-eye-line text-sm text-gray-600"></i>
          </button>
          {cert.status === 'issued' ? (
            <button onClick={() => onDownload(cert)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-teal-50" title="Télécharger">
              <i className="ri-download-line text-sm text-teal-600"></i>
            </button>
          ) : null}
          {cert.status === 'issued' ? (
            <button onClick={() => onDelete(cert)} title="Révoquer le certificat" aria-label="Révoquer le certificat" className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50">
              <i className="ri-forbid-line text-sm text-red-500"></i>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
