import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDate } from '@/lib/formatters';
import { verifyPublicCertificate, type PublicCertificateVerification } from '@/lib/publicApi';

export default function CertificateVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<PublicCertificateVerification | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    verifyPublicCertificate(id)
      .then(setCertificate)
      .catch(() => setCertificate({ valid: false, certificateId: id }))
      .finally(() => setLoading(false));
  }, [id]);

  const completionDate = certificate?.completionDate || certificate?.issuedAt || null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
          certificate?.valid ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'
        }`}>
          <i className={`${certificate?.valid ? 'ri-shield-check-line' : 'ri-shield-cross-line'} text-3xl`} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">C2P Academy</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
            {loading ? 'Verification du certificat' : certificate?.valid ? 'Certificat authentique' : 'Certificat introuvable'}
          </h1>
          <p className="mt-3 text-slate-600">
            {loading
              ? 'Controle de l identifiant de certification en cours.'
              : certificate?.valid
                ? 'Ce certificat a bien ete emis par C2P Academy.'
                : 'Cet identifiant ne correspond a aucun certificat emis.'}
          </p>
        </div>

        {!loading && certificate?.valid && (
          <dl className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Apprenant</dt>
              <dd className="mt-1 font-semibold text-slate-900">{certificate.studentName || 'Apprenant certifie'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Formation</dt>
              <dd className="mt-1 font-semibold text-slate-900">{certificate.courseName || 'Formation C2P'}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Emetteur</dt>
                <dd className="mt-1 font-semibold text-slate-900">{certificate.issuer || 'C2P Academy'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</dt>
                <dd className="mt-1 font-semibold text-slate-900">{completionDate ? formatDate(completionDate) : '-'}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Credential ID</dt>
              <dd className="mt-1 break-all font-mono text-sm text-slate-700">{certificate.certificateId}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 flex justify-center">
          <Link to="/" className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">
            Retour a C2P
          </Link>
        </div>
      </section>
    </main>
  );
}
