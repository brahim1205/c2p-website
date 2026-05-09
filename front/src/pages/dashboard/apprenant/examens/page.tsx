import { useState, useEffect, useCallback, useMemo } from 'react';
import { backendClient } from '@/lib/backendClient';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';

type EntityId = number | string;
type ExamType = 'quiz' | 'assignment' | 'project';
type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

interface Exam {
  id: EntityId;
  course_id: EntityId;
  title: string;
  course_name: string | null;
  instructor_id: string | null;
  type: ExamType;
  exam_date: string | null;
  max_grade: number;
  status: string;
  questions_count?: number;
  created_at: string;
}

interface QuizQuestion {
  id: EntityId;
  exam_id: EntityId;
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
  position: number;
}

interface QuizChoice {
  id: EntityId;
  question_id: EntityId;
  exam_id: EntityId;
  label: string;
  value: string;
  is_correct: boolean;
  position: number;
}

interface QuizAnswerPayload {
  question_id: EntityId;
  answer_text: string | null;
  selected_choice_ids: string[];
}

interface Submission {
  id: EntityId;
  exam_id: EntityId;
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

interface QuizAnswerDraft {
  answer_text: string;
  selected_choice_ids: string[];
}

function getTypeLabel(type: ExamType) {
  if (type === 'assignment') return 'Devoir';
  if (type === 'project') return 'Projet';
  return 'Quiz';
}

function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case 'single_choice':
      return 'Choix unique';
    case 'multiple_choice':
      return 'Choix multiples';
    case 'true_false':
      return 'Vrai/Faux';
    case 'open':
      return 'Réponse ouverte';
    default:
      return type;
  }
}

function orderByPosition<T extends { position?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

function isSingleAnswerType(type: QuestionType) {
  return type === 'single_choice' || type === 'true_false';
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
  const [loadingQuizStructure, setLoadingQuizStructure] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizChoices, setQuizChoices] = useState<QuizChoice[]>([]);
  const [quizAnswerDrafts, setQuizAnswerDrafts] = useState<Record<string, QuizAnswerDraft>>({});
  const studentId = user?.id ?? 'usr-apprenant';
  const studentName = user ? `${user.firstName} ${user.lastName}` : 'Ibrahim Toure';

  const fetchQuizStructure = useCallback(async (examId: EntityId) => {
    const [questionsRes, choicesRes] = await Promise.all([
      backendClient.from<QuizQuestion>('quiz_questions').select('*').eq('exam_id', examId).order('position', { ascending: true }),
      backendClient.from<QuizChoice>('quiz_choices').select('*').eq('exam_id', examId).order('position', { ascending: true }),
    ]);

    if (questionsRes.error) throw questionsRes.error;
    if (choicesRes.error) throw choicesRes.error;

    return {
      questions: orderByPosition((questionsRes.data || []) as QuizQuestion[]),
      choices: orderByPosition((choicesRes.data || []) as QuizChoice[]),
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsRes, submissionsRes] = await Promise.all([
        backendClient.from<Exam>('exams').select('*').eq('status', 'ongoing').order('exam_date', { ascending: false }),
        backendClient.from<Submission>('submissions').select('*').eq('student_id', studentId).order('submitted_at', { ascending: false }),
      ]);

      if (examsRes.error) throw examsRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      const nextSubmissions = submissionsRes.data || [];
      setSubmissions(nextSubmissions);

      const examsWithStatus: ExamWithStatus[] = (examsRes.data || []).map((exam) => {
        const mySubmission = nextSubmissions.find((submission: Submission) => String(submission.exam_id) === String(exam.id));
        return {
          ...exam,
          submitted: !!mySubmission,
          myGrade: mySubmission?.grade ?? null,
          myStatus: mySubmission?.status ?? null,
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

  const quizChoicesByQuestion = useMemo(() => {
    const grouped = new Map<string, QuizChoice[]>();
    for (const choice of quizChoices) {
      const key = String(choice.question_id);
      const bucket = grouped.get(key) ?? [];
      bucket.push(choice);
      grouped.set(key, bucket);
    }
    return grouped;
  }, [quizChoices]);

  const resetSubmitState = () => {
    setShowSubmitModal(false);
    setSelectedExam(null);
    setAnswerText('');
    setQuizQuestions([]);
    setQuizChoices([]);
    setQuizAnswerDrafts({});
    setLoadingQuizStructure(false);
  };

  const initializeQuizDrafts = (questions: QuizQuestion[]) => {
    setQuizAnswerDrafts(
      Object.fromEntries(
        questions.map((question) => [
          String(question.id),
          {
            answer_text: '',
            selected_choice_ids: [],
          } satisfies QuizAnswerDraft,
        ]),
      ),
    );
  };

  const openSubmit = async (exam: Exam) => {
    if (exam.type === 'quiz' && (exam.questions_count ?? 0) === 0) {
      toastError('Quiz indisponible', 'Ce quiz n est pas encore configure par le formateur.');
      return;
    }

    setSelectedExam(exam);
    setShowSubmitModal(true);
    setAnswerText('');
    setQuizQuestions([]);
    setQuizChoices([]);
    setQuizAnswerDrafts({});

    if (exam.type === 'quiz') {
      setLoadingQuizStructure(true);
      try {
        const { questions, choices } = await fetchQuizStructure(exam.id);
        setQuizQuestions(questions);
        setQuizChoices(choices);
        initializeQuizDrafts(questions);
      } catch (err: unknown) {
        console.error(err);
        toastError('Erreur', 'Impossible de charger les questions du quiz.');
        resetSubmitState();
        return;
      } finally {
        setLoadingQuizStructure(false);
      }
    }
  };

  const handleQuizChoiceToggle = (question: QuizQuestion, choiceId: EntityId, checked: boolean) => {
    setQuizAnswerDrafts((current) => {
      const existing = current[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
      const nextSelected = isSingleAnswerType(question.type)
        ? (checked ? [String(choiceId)] : [])
        : (checked
          ? Array.from(new Set([...existing.selected_choice_ids, String(choiceId)]))
          : existing.selected_choice_ids.filter((entry) => entry !== String(choiceId)));

      return {
        ...current,
        [String(question.id)]: {
          ...existing,
          selected_choice_ids: nextSelected,
        },
      };
    });
  };

  const handleSubmitExam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedExam) return;

    let submissionPayload: Record<string, unknown>;

    if (selectedExam.type === 'quiz') {
      if (quizQuestions.length === 0) {
        toastError('Quiz indisponible', 'Ce quiz ne contient pas encore de questions.');
        return;
      }

      const answers: QuizAnswerPayload[] = quizQuestions.map((question) => {
        const draft = quizAnswerDrafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
        return {
          question_id: question.id,
          answer_text: question.type === 'open' ? draft.answer_text.trim() || null : null,
          selected_choice_ids: question.type === 'open' ? [] : draft.selected_choice_ids,
        };
      });

      const hasInvalidRequiredAnswer = quizQuestions.some((question) => {
        const draft = quizAnswerDrafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
        if (!question.required) return false;
        return question.type === 'open'
          ? draft.answer_text.trim().length === 0
          : draft.selected_choice_ids.length === 0;
      });

      if (hasInvalidRequiredAnswer) {
        toastError('Réponses incomplètes', 'Veuillez répondre à toutes les questions obligatoires avant de soumettre.');
        return;
      }

      submissionPayload = {
        exam_id: selectedExam.id,
        student_id: studentId,
        student_name: studentName,
        status: 'pending',
        answers,
      };
    } else {
      if (!answerText.trim()) {
        toastError('Réponse vide', 'Veuillez écrire votre réponse avant de soumettre.');
        return;
      }

      submissionPayload = {
        exam_id: selectedExam.id,
        student_id: studentId,
        student_name: studentName,
        file_name: 'Reponse texte',
        file_url: answerText.trim(),
        status: 'pending',
      };
    }

    setSubmitting(true);
    try {
      const { error: err } = await backendClient.from('submissions').insert(submissionPayload);
      if (err) throw err;

      success(
        'Soumission envoyée',
        selectedExam.type === 'quiz'
          ? 'Vos réponses ont été enregistrées. Le formateur pourra les corriger.'
          : 'Votre réponse a été soumise avec succès. Le formateur la corrigera prochainement.',
      );

      await backendClient.from('notifications').insert({
        user_id: selectedExam.instructor_id ?? 'usr-formateur',
        title: 'Nouvelle soumission à corriger',
        message: `Un apprenant a soumis sa réponse pour "${selectedExam.title}"`,
        type: 'evaluation',
        is_read: false,
        link: '/dashboard/formateur/evaluations',
      });

      resetSubmitState();
      await fetchData();
    } catch (err: unknown) {
      toastError('Erreur', 'Impossible de soumettre votre réponse.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Apprenant', path: '/dashboard/apprenant' }, { label: 'Mes examens' }]} />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Mes examens</h1>
          <p className="text-gray-600 text-sm md:text-base">Consultez les examens de vos formations et soumettez vos réponses</p>
        </div>

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
                  {submissions.map((submission) => {
                    const exam = exams.find((entry) => String(entry.id) === String(submission.exam_id));
                    return (
                      <tr key={String(submission.id)} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{exam?.title || 'Examen'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {submission.grade !== null ? (
                            <span className={submission.grade >= 10 ? 'text-green-600' : 'text-red-600'}>
                              {submission.grade}/{exam?.max_grade || 20}
                            </span>
                          ) : (
                            <span className="text-gray-400">En attente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {submission.status === 'pending' && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">À corriger</span>
                          )}
                          {submission.status === 'graded' && (
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
              {exams.map((exam) => {
                const quizReady = exam.type !== 'quiz' || (exam.questions_count ?? 0) > 0;
                return (
                  <div key={String(exam.id)} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-base">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-md font-medium">{getTypeLabel(exam.type)}</span>
                        <span>{exam.course_name || '-'}</span>
                        <span>Note max : {exam.max_grade}</span>
                        {exam.type === 'quiz' && (
                          <span>{exam.questions_count || 0} question{(exam.questions_count || 0) > 1 ? 's' : ''}</span>
                        )}
                        {exam.exam_date && <span>Date : {new Date(exam.exam_date).toLocaleDateString('fr-FR')}</span>}
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
                      {!quizReady && (
                        <div className="mt-2 text-sm text-gray-500">Ce quiz est encore en cours de configuration.</div>
                      )}
                    </div>
                    <div>
                      {!exam.submitted ? (
                        <button
                          onClick={() => openSubmit(exam)}
                          disabled={!quizReady}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
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
                );
              })}
            </div>
          )}
        </div>

        {showSubmitModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Soumettre : {selectedExam.title}</h3>
                <button onClick={resetSubmitState} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Type : {getTypeLabel(selectedExam.type)} | Note max : {selectedExam.max_grade}
              </p>
              <form onSubmit={handleSubmitExam}>
                {selectedExam.type === 'quiz' ? (
                  loadingQuizStructure ? (
                    <SkeletonList count={3} />
                  ) : (
                    <div className="space-y-5">
                      {quizQuestions.map((question, index) => {
                        const draft = quizAnswerDrafts[String(question.id)] ?? { answer_text: '', selected_choice_ids: [] };
                        const questionChoices = orderByPosition(quizChoicesByQuestion.get(String(question.id)) ?? []);
                        return (
                          <div key={String(question.id)} className="border border-gray-200 rounded-xl p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                Question {index + 1}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                                {getQuestionTypeLabel(question.type)}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                {question.points} point{question.points > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{question.prompt}</div>
                            {question.explanation && (
                              <p className="text-xs text-gray-500 mt-1">{question.explanation}</p>
                            )}
                            {question.type === 'open' ? (
                              <textarea
                                value={draft.answer_text}
                                onChange={(event) => setQuizAnswerDrafts((current) => ({
                                  ...current,
                                  [String(question.id)]: {
                                    ...draft,
                                    answer_text: event.target.value,
                                  },
                                }))}
                                rows={5}
                                maxLength={5000}
                                placeholder="Écrivez votre réponse..."
                                className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
                              />
                            ) : (
                              <div className="mt-3 space-y-2">
                                {questionChoices.map((choice) => {
                                  const checked = draft.selected_choice_ids.includes(String(choice.id));
                                  return (
                                    <label key={String(choice.id)} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer">
                                      <input
                                        type={isSingleAnswerType(question.type) ? 'radio' : 'checkbox'}
                                        name={`question-${String(question.id)}`}
                                        checked={checked}
                                        onChange={(event) => handleQuizChoiceToggle(question, choice.id, event.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                      />
                                      <span className="text-sm text-gray-800">{choice.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Votre réponse</label>
                    <textarea
                      value={answerText}
                      onChange={(event) => setAnswerText(event.target.value)}
                      placeholder="Écrivez votre réponse ici..."
                      rows={8}
                      maxLength={5000}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">{answerText.length}/5000 caractères</p>
                  </div>
                )}
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={resetSubmitState}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || loadingQuizStructure}
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
