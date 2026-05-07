import { useState, useEffect, useCallback } from 'react';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';

interface Exam {
  id: number;
  course_id: number;
  title: string;
  course_name: string | null;
  instructor_id: string | null;
  type: string;
  exam_date: string | null;
  max_grade: number;
  status: string;
  created_at: string;
}

interface Submission {
  id: number;
  exam_id: number;
  student_id: string;
  grade: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string | null;
  file_name: string | null;
  file_url: string | null;
}

interface ExamWithStatus extends Exam {
  submitted: boolean;
  myGrade: number | null;
  myStatus: string | null;
}

export default function ApprenantExamensPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamWithStatus[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const studentId = user?.id ?? 'usr-apprenant';
  const studentName = user ? `${user.firstName} ${user.lastName}` : 'Ibrahim Toure';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsRes, subRes] = await Promise.all([
        backendClient.from('exams').select('*').eq('status', 'ongoing').order('exam_date', { ascending: false }),
        backendClient.from('submissions').select('*').eq('student_id', studentId).order('submitted_at', { ascending: false }),
      ]);

      if (examsRes.error) throw examsRes.error;
      if (subRes.error) throw subRes.error;

      const subs = subRes.data || [];
      setSubmissions(subs);

      const examsWithStatus: ExamWithStatus[] = (examsRes.data || []).map((e: Exam) => {
        const mySub = subs.find((s: Submission) => s.exam_id === e.id);
        return {
          ...e,
          submitted: !!mySub,
          myGrade: mySub?.grade ?? null,
          myStatus: mySub?.status ?? null,
        };
      });
      setExams(examsWithStatus);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    if (!answerText.trim()) {
      toastError('Réponse vide', 'Veuillez écrire votre réponse avant de soumettre.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await backendClient.from('submissions').insert({
        exam_id: selectedExam.id,
        student_id: studentId,
        student_name: studentName,
        file_name: 'Reponse texte',
        file_url: answerText.trim(),
        status: 'pending',
      });
      if (err) throw err;
      success('Soumission envoyée', 'Votre réponse a été soumise avec succès. Le formateur la corrigera prochainement.');

      // Notification formateur
      await backendClient.from('notifications').insert({
        user_id: selectedExam.instructor_id ?? 'usr-formateur',
        title: 'Nouvelle soumission à corriger',
        message: `Un apprenant a soumis sa réponse pour "${selectedExam.title}"`,
        type: 'evaluation',
        is_read: false,
        link: '/dashboard/formateur/evaluations',
      });

      setShowSubmitModal(false);
      setAnswerText('');
      setSelectedExam(null);
      fetchData();
    } catch (err: unknown) {
      toastError('Erreur', 'Impossible de soumettre votre réponse.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmit = (exam: Exam) => {
    setSelectedExam(exam);
    setShowSubmitModal(true);
    setAnswerText('');
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: 'Quiz',
      assignment: 'Devoir',
      project: 'Projet',
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Mes examens' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes examens</h1>
          <p className="text-gray-600 text-sm md:text-base">Consultez les examens de vos formations et soumettez vos réponses</p>
        </div>

        {/* My submissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Mes soumissions</h2>
          </div>
          {loading ? (
            <SkeletonList count={3} />
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune soumission pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Examen</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((sub) => {
                    const exam = exams.find((e) => e.id === sub.exam_id);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{exam?.title || 'Examen'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.grade !== null ? (
                            <span className={`${sub.grade >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                              {sub.grade}/{exam?.max_grade || 20}
                            </span>
                          ) : (
                            <span className="text-gray-400">En attente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sub.status === 'pending' && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">À corriger</span>
                          )}
                          {sub.status === 'graded' && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Corrigé</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Available exams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Examens disponibles</h2>
          </div>
          {loading ? (
            <SkeletonList count={3} />
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun examen disponible actuellement</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {exams.map((exam) => (
                <div key={exam.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">{exam.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded-md font-medium">{getTypeLabel(exam.type)}</span>
                      <span>{exam.course_name || '-'}</span>
                      <span>Note max : {exam.max_grade}/20</span>
                      {exam.exam_date && (
                        <span>Date : {new Date(exam.exam_date).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                    {exam.submitted && (
                      <div className="mt-2">
                        {exam.myStatus === 'graded' && exam.myGrade !== null ? (
                          <span className={`text-sm font-medium ${exam.myGrade >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                            Note reçue : {exam.myGrade}/{exam.max_grade}
                          </span>
                        ) : (
                          <span className="text-sm text-amber-600">Soumis - en attente de correction</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    {!exam.submitted ? (
                      <button
                        onClick={() => openSubmit(exam)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
                      >
                        Soumettre ma réponse
                      </button>
                    ) : exam.myStatus === 'graded' ? (
                      <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium whitespace-nowrap cursor-default">
                        Corrigé
                      </button>
                    ) : (
                      <button className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium whitespace-nowrap cursor-default">
                        En attente
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Modal */}
        {showSubmitModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Soumettre : {selectedExam.title}</h3>
                <button onClick={() => setShowSubmitModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Type : {getTypeLabel(selectedExam.type)} | Note max : {selectedExam.max_grade}/20
              </p>
              <form onSubmit={handleSubmitExam}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Votre réponse</label>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Écrivez votre réponse ici..."
                    rows={8}
                    maxLength={5000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{answerText.length}/5000 caractères</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <i className="ri-loader-4-line animate-spin"></i>
                        Envoi...
                      </span>
                    ) : (
                      'Soumettre'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
