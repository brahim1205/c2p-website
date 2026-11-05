import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import CertificateRequirements from '@/components/feature/CertificateRequirements';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/formatters';
import { downloadCertificatePdf } from '@/lib/downloads';
import { buildCertificateVerificationUrl } from '@/lib/certificateVerification';
import CertificateViewer, { type CertificateData } from '../../profile/components/CertificateViewer';
import { fetchApprenantCertificates, type ApprenantCertificate as Certificate } from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

function toCertificateData(certificate: Certificate): CertificateData {
  return {
    studentName: certificate.student_name?.trim() || 'Apprenant C2P',
    courseTitle: certificate.course_name || certificate.title || 'Formation C2P',
    instructor: certificate.instructor_name || 'Formateur C2P',
    date: formatDate(certificate.issued_at || certificate.completion_date || new Date().toISOString()),
    certificateId: String(certificate.certificate_number || certificate.certificate_id),
    duration: certificate.course_duration ?? null,
    finalGrade: certificate.final_grade ?? certificate.grade ?? null,
  };
}

export default function ApprenantCertificatsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [viewerData, setViewerData] = useState<CertificateData | null>(null);

  const { data: certificates = [], isError, isLoading } = useQuery<Certificate[]>({
    queryKey: queryKeys.apprenant.certificates(user?.id),
    queryFn: () => fetchApprenantCertificates(user?.id ?? ''),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (isError) error('Erreur', 'Impossible de charger vos certificats.');
  }, [error, isError]);

  // Only certificates delivered by C2P (status "issued") are documents; the others show progress.
  const issued = useMemo(() => certificates.filter((certificate) => certificate.status === 'issued'), [certificates]);
  const inProgress = useMemo(() => certificates.filter((certificate) => certificate.status !== 'issued'), [certificates]);

  const download = (certificate: Certificate) => {
    const data = toCertificateData(certificate);
    downloadCertificatePdf(`certificat-${data.certificateId}.pdf`, data);
    success('Certificat prêt', 'La version imprimable s’ouvre : choisissez « Enregistrer en PDF ».');
  };

  const copyLink = async (certificate: Certificate) => {
    const url = buildCertificateVerificationUrl(String(certificate.certificate_number || certificate.certificate_id));
    try {
      await navigator.clipboard.writeText(url);
      success('Lien copié', 'Partagez-le (LinkedIn, CV…) : il permet de vérifier votre certificat.');
    } catch {
      error('Copie impossible', url);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Certificats' }]} />
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Mes certificats</h1>
          <p className="text-gray-600">
            Chaque formation certifiante vous ouvre un certificat dès l’inscription. Il vous est délivré automatiquement quand vous avez suivi toutes les leçons et réussi toutes les évaluations.
          </p>
        </div>

        {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-gray-100" /> : null}

        {!isLoading ? (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Certificats obtenus <span className="text-gray-400">({issued.length})</span></h2>
            {issued.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {issued.map((certificate) => (
                  <article key={String(certificate.id)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                        <i className="ri-award-fill text-2xl" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{certificate.course_name || certificate.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          N° {certificate.certificate_number} · délivré le {certificate.issued_at ? formatDate(certificate.issued_at) : '–'}
                        </p>
                        {certificate.final_grade != null ? (
                          <p className="mt-1 text-sm text-gray-700">Note finale : <strong>{String(certificate.final_grade).replace('.', ',')}/20</strong></p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => void copyLink(certificate)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <i className="ri-link mr-1" aria-hidden="true" />Lien de vérification
                      </button>
                      <button type="button" onClick={() => setViewerData(toCertificateData(certificate))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Voir
                      </button>
                      <button type="button" onClick={() => download(certificate)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                        <i className="ri-download-2-line mr-1" aria-hidden="true" />Télécharger (PDF)
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
                Pas encore de certificat obtenu. Terminez les étapes ci-dessous pour décrocher le premier.
              </p>
            )}
          </section>
        ) : null}

        {!isLoading && inProgress.length ? (
          <section>
            <h2 className="mb-4 text-lg font-bold text-gray-900">En cours <span className="text-gray-400">({inProgress.length})</span></h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {inProgress.map((certificate) => (
                <article key={String(certificate.id)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <p className="font-semibold text-gray-900">{certificate.course_name || certificate.title}</p>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">En cours</span>
                  </div>
                  <CertificateRequirements requirements={certificate.requirements} />
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Link to="/dashboard/apprenant/examens" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Mes évaluations</Link>
                    {certificate.course_id ? (
                      <Link to={`/dashboard/apprenant/cours/${encodeURIComponent(String(certificate.course_id))}`} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                        Continuer la formation
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && !certificates.length ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-14 text-center">
            <i className="ri-award-line text-4xl text-gray-400" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">Aucun certificat pour l’instant</h2>
            <p className="mt-1 text-sm text-gray-500">Inscrivez-vous à une formation certifiante : votre certificat apparaîtra ici.</p>
            <Link to="/espace-numerique" className="mt-4 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Découvrir les formations
            </Link>
          </div>
        ) : null}
      </div>

      {viewerData ? <CertificateViewer data={viewerData} onClose={() => setViewerData(null)} /> : null}
    </DashboardLayout>
  );
}
