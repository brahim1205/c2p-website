import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';
import { createNotification } from '@/hooks/useCreateNotification';


interface Exam {
  id: number;
  title: string;
  course_name: string | null;
  type: string;
  exam_date: string | null;
  participants: number;
  submitted: number;
  avg_grade: number | null;
  status: string;
  max_grade: number;
  created_at: string;
}

interface Submission {
  id: number;
  exam_id: number;
  student_id: string;
  student_name: string;
  student_avatar: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: string;
  file_name: string | null;
  file_url: string | null;
}

export default function FormateurEvaluationsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    type: 'quiz',
    status: 'upcoming',
    max_grade: 20,
    participants: 0,
    submitted: 0,
  });

  const fetchExams = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient.from('exams').select('*').order('exam_date', { ascending: false });
      if (err) throw err;
      setExams(data || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient.from('submissions').select('*').order('submitted_at', { ascending: false });
      if (err) throw err;
      setSubmissions(data || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchExams(), fetchSubmissions()]);
    setLoading(false);
  }, [fetchExams, fetchSubmissions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade ? submission.grade.toString() : '');
    setFeedbackValue(submission.feedback || '');
    setShowGradeModal(true);
  };

  const confirmGrade = async () => {
    const grade = parseFloat(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 20) {
      error('Note invalide', 'La note doit être comprise entre 0 et 20.');
      return;
    }
    if (!selectedSubmission) return;

    try {
      const { error: err } = await backendClient
        .from('submissions')
        .update({ grade, feedback: feedbackValue, status: 'graded' })
        .eq('id', selectedSubmission.id);

      if (err) throw err;
      success('Note attribuée', `La note de ${grade}/20 a été attribuée avec succès.`);

      // Notification auto à l'apprenant
      await createNotification(
        selectedSubmission.student_id,
        'Nouvelle note disponible',
        `Votre soumission "${exams.find((e) => e.id === selectedSubmission.exam_id)?.title || 'Examen'}" a été notée ${grade}/20.`,
        'evaluation',
        '/dashboard/apprenant/examens'
      );

      setShowGradeModal(false);
      setSelectedSubmission(null);
      setGradeValue('');
      setFeedbackValue('');
      fetchSubmissions();
      fetchExams();
    } catch (err: unknown) {
      error('Erreur', 'Impossible d\'attribuer la note.');
      console.error(err);
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.title || !newExam.exam_date) {
      error('Champs requis', 'Le titre et la date sont obligatoires.');
      return;
    }
    try {
      const { error: err } = await backendClient.from('exams').insert({
        title: newExam.title,
        course_name: newExam.course_name || null,
        type: newExam.type || 'quiz',
        exam_date: newExam.exam_date,
        participants: newExam.participants || 0,
        submitted: newExam.submitted || 0,
        avg_grade: null,
        status: newExam.status || 'upcoming',
        max_grade: newExam.max_grade || 20,
      });

      if (err) throw err;
      success('Examen créé', `"${newExam.title}" a été ajouté avec succès.`);
      setShowCreateExamModal(false);
      setNewExam({ type: 'quiz', status: 'upcoming', max_grade: 20, participants: 0, submitted: 0 });
      fetchExams();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de créer l\'examen.');
      console.error(err);
    }
  };

  const handleDeleteExam = async (exam: Exam) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${exam.title}" ?`)) return;
    try {
      const { error: err } = await backendClient.from('exams').delete().eq('id', exam.id);
      if (err) throw err;
      success('Supprimé', `"${exam.title}" a été supprimé.`);
      fetchExams();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer l\'examen.');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      graded: 'bg-purple-100 text-purple-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      upcoming: 'À venir',
      ongoing: 'En cours',
      graded: 'Noté',
      closed: 'Clôturé',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSubmissionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      graded: 'bg-green-100 text-green-700',
      late: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: 'À corriger',
      graded: 'Corrigé',
      late: 'En retard',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Formateur', path: '/dashboard/formateur' },
            { label: 'Évaluations' },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Évaluations</h1>
            <p className="text-gray-600 text-sm md:text-base">Créez des examens, quiz et corrigez les travaux des apprenants</p>
          </div>
          <button
            onClick={() => setShowCreateExamModal(true)}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-add-line text-base"></i>
            </div>
            Nouvel examen
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Examens créés', value: String(exams.length), icon: 'ri-file-list-3-line', color: 'bg-teal-500' },
            { label: 'Soumissions en attente', value: String(pendingCount), icon: 'ri-time-line', color: 'bg-amber-500' },
            {
              label: 'Moyenne générale',
              value: exams.filter((e) => e.avg_grade).length
                ? (exams.filter((e) => e.avg_grade).reduce((a, e) => a + (e.avg_grade || 0), 0) / exams.filter((e) => e.avg_grade).length).toFixed(1)
                : '0',
              icon: 'ri-bar-chart-line',
              color: 'bg-green-500',
            },
            {
              label: 'Taux de participation',
              value: exams.length
                ? Math.round((exams.reduce((a, e) => a + e.submitted, 0) / exams.reduce((a, e) => a + e.participants, 0)) * 100 || 0) + '%'
                : '0%',
              icon: 'ri-group-line',
              color: 'bg-blue-500',
            },
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

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'exams' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mes examens
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'submissions' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Soumissions à corriger
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">{pendingCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <SkeletonList count={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Examen</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formation</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Participants</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moyenne</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {exams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{exam.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{exam.course_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                            {exam.type === 'quiz' ? 'Quiz' : exam.type === 'assignment' ? 'Devoir' : 'Projet'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{exam.exam_date || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {exam.submitted}/{exam.participants}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {exam.avg_grade != null ? `${exam.avg_grade}/20` : '-'}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(exam.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteExam(exam)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <i className="ri-delete-bin-line text-red-500 text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {exams.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun examen. Créez-en un avec le bouton ci-dessus.</p>
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <SkeletonList count={6} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Examen</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date de soumission</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fichier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {sub.student_avatar ? (
                              <img src={sub.student_avatar} alt={sub.student_name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                                {sub.student_name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 text-sm">{sub.student_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {exams.find((e) => e.id === sub.exam_id)?.title || '-'}                            
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(sub.submitted_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          {sub.file_name ? (
                            <button
                              onClick={() => sub.file_url && window.open(sub.file_url, '_blank', 'noopener,noreferrer')}
                              className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                            >
                              <i className="ri-file-download-line"></i>
                              {sub.file_name}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.grade !== null ? `${sub.grade}/20` : '-'}
                        </td>
                        <td className="px-4 py-3">{getSubmissionStatusBadge(sub.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleGrade(sub)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              sub.status === 'pending'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {sub.status === 'pending' ? 'Corriger' : 'Modifier'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {submissions.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune soumission pour le moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Create Exam Modal */}
        {showCreateExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Nouvel examen</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={newExam.title || ''}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    placeholder="Ex: Quiz React - Module 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <input
                    type="text"
                    value={newExam.course_name || ''}
                    onChange={(e) => setNewExam({ ...newExam, course_name: e.target.value })}
                    placeholder="Ex: Développement Web React"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newExam.type || 'quiz'}
                      onChange={(e) => setNewExam({ ...newExam, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Devoir</option>
                      <option value="project">Projet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={newExam.exam_date || ''}
                      onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
                    <input
                      type="number"
                      min={0}
                      value={newExam.participants || 0}
                      onChange={(e) => setNewExam({ ...newExam, participants: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note max</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newExam.max_grade || 20}
                      onChange={(e) => setNewExam({ ...newExam, max_grade: parseInt(e.target.value) || 20 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={newExam.status || 'upcoming'}
                    onChange={(e) => setNewExam({ ...newExam, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                  >
                    <option value="upcoming">À venir</option>
                    <option value="ongoing">En cours</option>
                    <option value="graded">Noté</option>
                    <option value="closed">Clôturé</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateExamModal(false);
                    setNewExam({ type: 'quiz', status: 'upcoming', max_grade: 20, participants: 0, submitted: 0 });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateExam}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grade Modal */}
        {showGradeModal && selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Noter - {selectedSubmission.student_name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {exams.find((e) => e.id === selectedSubmission.exam_id)?.title || '-'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (/20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    placeholder="Ex: 16.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (facultatif)</label>
                  <textarea
                    value={feedbackValue}
                    onChange={(e) => setFeedbackValue(e.target.value)}
                    placeholder="Ajoutez un commentaire pour l'apprenant..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{feedbackValue.length}/500 caractères</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setSelectedSubmission(null);
                    setGradeValue('');
                    setFeedbackValue('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmGrade}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Attribuer la note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
