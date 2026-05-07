import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';


interface Certificate {
  id: number;
  student_name: string;
  student_avatar: string | null;
  course_id: number | null;
  course_name: string | null;
  completion_date: string | null;
  final_grade: number | null;
  status: string;
  certificate_id: string | null;
  issued_at: string | null;
  created_at: string;
}

export default function FormateurCertificatsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await backendClient
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCerts(data || []);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de charger les certificats.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchCerts();
  }, [fetchCerts]);

  const filteredCerts = filter === 'all' ? certs : certs.filter((c) => c.status === filter);

  const handleIssue = async (cert: Certificate) => {
    try {
      const newCertId = `C2P-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${String(cert.id).padStart(3, '0')}`;
      const { error: err } = await backendClient
        .from('certificates')
        .update({ status: 'issued', certificate_id: newCertId, issued_at: new Date().toISOString() })
        .eq('id', cert.id);

      if (err) throw err;
      success('Certificat délivré', `Le certificat pour ${cert.student_name} a été généré avec succès.`);
      fetchCerts();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de délivrer le certificat.');
      console.error(err);
    }
  };

  const handlePreview = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowPreviewModal(true);
  };

  const handleDownload = (cert: Certificate) => {
    if (cert.status !== 'issued') {
      error('Certificat non disponible', "Ce certificat n'a pas encore été délivré.");
      return;
    }

    const certificateHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Certificat ${cert.certificate_id ?? cert.id}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #111; color: #111; }
    .certificate { width: 1000px; min-height: 700px; margin: 40px auto; padding: 64px; background: #fffaf0; border: 12px double #d5b46f; box-sizing: border-box; text-align: center; }
    .eyebrow { color: #9a7a2f; letter-spacing: 6px; text-transform: uppercase; font-size: 13px; font-weight: 700; }
    h1 { margin: 36px 0 10px; font-size: 54px; }
    .student { margin: 32px 0 12px; font-size: 42px; font-weight: 700; color: #111; }
    .course { font-size: 24px; color: #444; }
    .meta { margin-top: 52px; display: flex; justify-content: space-between; color: #555; font-size: 15px; }
  </style>
</head>
<body>
  <main class="certificate">
    <p class="eyebrow">Centre C2P</p>
    <h1>Certificat de reussite</h1>
    <p>Ce certificat est decerne a</p>
    <div class="student">${cert.student_name}</div>
    <p class="course">${cert.course_name ?? 'Formation C2P'}</p>
    <div class="meta">
      <span>Identifiant: ${cert.certificate_id ?? cert.id}</span>
      <span>Note finale: ${cert.final_grade ?? '-'} / 20</span>
      <span>Date: ${cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span>
    </div>
  </main>
</body>
</html>`;

    const blob = new Blob([certificateHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cert.certificate_id ?? `certificat-${cert.id}`}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    success('Téléchargement', `Le certificat ${cert.certificate_id} a été généré.`);
  };

  const handleDelete = async (cert: Certificate) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le certificat de ${cert.student_name} ?`)) return;
    try {
      const { error: err } = await backendClient.from('certificates').delete().eq('id', cert.id);
      if (err) throw err;
      success('Supprimé', `Le certificat de ${cert.student_name} a été supprimé.`);
      fetchCerts();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer le certificat.');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: 'bg-green-100 text-green-700',
      issued: 'bg-teal-100 text-teal-700',
      pending: 'bg-amber-100 text-amber-700',
    };
    const labels: Record<string, string> = {
      ready: 'Prêt à délivrer',
      issued: 'Délivré',
      pending: 'En attente',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const totalCerts = certs.length;
  const issuedThisMonth = certs.filter(
    (c) => c.status === 'issued' && c.issued_at && new Date(c.issued_at).getMonth() === new Date().getMonth()
  ).length;
  const pendingCount = certs.filter((c) => c.status === 'pending').length;
  const readyCount = certs.filter((c) => c.status === 'ready').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Formateur', path: '/dashboard/formateur' }, { label: 'Certificats' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Certificats</h1>
          <p className="text-gray-600 text-sm md:text-base">Délivrez et gérez les certificats de vos apprenants</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total certificats', value: String(totalCerts), icon: 'ri-award-line', color: 'bg-teal-500' },
            { label: 'Délivrés ce mois', value: String(issuedThisMonth), icon: 'ri-check-double-line', color: 'bg-green-500' },
            { label: 'En attente', value: String(pendingCount), icon: 'ri-time-line', color: 'bg-amber-500' },
            { label: 'Prêts à délivrer', value: String(readyCount), icon: 'ri-file-check-line', color: 'bg-blue-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${stat.icon} text-white text-sm`}></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'ready', 'issued', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'ready' ? 'Prêts' : f === 'issued' ? 'Délivrés' : 'En attente'}
            </button>
          ))}
        </div>

        {/* Certificates Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonList count={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formation</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note finale</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Certificat</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {cert.student_avatar ? (
                            <img src={cert.student_avatar} alt={cert.student_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                              {cert.student_name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-sm">{cert.student_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cert.course_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cert.completion_date ? new Date(cert.completion_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cert.final_grade != null ? `${cert.final_grade}/20` : '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{cert.certificate_id || '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(cert.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(cert)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                            title="Aperçu"
                          >
                            <i className="ri-eye-line text-gray-600 text-sm"></i>
                          </button>
                          {cert.status === 'ready' && (
                            <button
                              onClick={() => handleIssue(cert)}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                            >
                              Délivrer
                            </button>
                          )}
                          {cert.status === 'issued' && (
                            <button
                              onClick={() => handleDownload(cert)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-teal-50 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <i className="ri-download-line text-teal-600 text-sm"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(cert)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <i className="ri-delete-bin-line text-red-500 text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredCerts.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-award-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun certificat trouvé</h3>
            <p className="text-gray-600">Ajustez vos filtres</p>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
              <div className="rounded-lg border-4 border-teal-100 bg-[#f5faf9] p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-award-line text-4xl text-white"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-teal-900 mb-1">CERTIFICAT DE RÉUSSITE</h2>
                  <p className="text-teal-600 text-sm mb-6">C2P - Compétences et Création de Projet</p>

                  <p className="text-gray-700 mb-4">Ce certificat est décerné à</p>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{selectedCert.student_name}</h3>
                  <p className="text-gray-600 mb-6">pour avoir complété avec succès la formation</p>
                  <h4 className="text-xl font-semibold text-teal-700 mb-4">{selectedCert.course_name || '-'}</h4>

                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedCert.final_grade != null ? `${selectedCert.final_grade}/20` : '-'}</p>
                      <p className="text-xs text-gray-500">Note finale</p>
                    </div>
                    <div className="w-px h-10 bg-gray-300"></div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {selectedCert.completion_date ? new Date(selectedCert.completion_date).toLocaleDateString('fr-FR') : '-'}
                      </p>
                      <p className="text-xs text-gray-500">Date d'obtention</p>
                    </div>
                  </div>

                  {selectedCert.certificate_id && (
                    <p className="text-xs text-gray-400 font-mono">N° {selectedCert.certificate_id}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => { setShowPreviewModal(false); setSelectedCert(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                {selectedCert.status === 'issued' && (
                  <button
                    onClick={() => handleDownload(selectedCert)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-download-line"></i>
                    Télécharger PDF
                  </button>
                )}
                {selectedCert.status === 'ready' && (
                  <button
                    onClick={() => { handleIssue(selectedCert); setShowPreviewModal(false); }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    Délivrer le certificat
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
