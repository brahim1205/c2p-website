import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { SkeletonList } from '@/components/base/Skeleton';
import { backendClient } from '@/lib/backendClient';
import { createNotification } from '@/hooks/useCreateNotification';
import { useAuth } from '@/hooks/useAuth';

type EntityId = number | string;
type ExamType = 'quiz' | 'assignment' | 'project';
type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'open';

interface Exam {
  id: EntityId;
  course_id: EntityId | null;
  instructor_id?: string | null;
  title: string;
  course_name: string | null;
  type: ExamType;
  exam_date: string | null;
  participants: number;
  submitted: number;
  avg_grade: number | null;
  status: string;
  max_grade: number;
  questions_count?: number;
  open_questions_count?: number;
  auto_gradable?: boolean;
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
  choices_count?: number;
  correct_choices_count?: number;
}

interface QuizChoice {
  id: EntityId;
  question_id: EntityId;
  exam_id: EntityId;
  label: string;
  value: string;
  is_correct: boolean;
  position: number;
  question_type?: QuestionType;
}

interface QuizAnswer {
  question_id: EntityId;
  question_prompt: string;
  question_type: QuestionType;
  answer_text: string | null;
  selected_choice_ids: string[];
}

interface Submission {
  id: EntityId;
  exam_id: EntityId;
  student_id: string;
  student_name: string;
  student_avatar: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: string;
  file_name: string | null;
  file_url: string | null;
  answers?: QuizAnswer[] | null;
}

interface CourseOption {
  id: EntityId;
  title: string;
}

interface QuestionDraft {
  prompt: string;
  type: QuestionType;
  points: number;
  explanation: string;
  required: boolean;
}

interface ChoiceDraft {
  label: string;
  value: string;
  is_correct: boolean;
}

type ExamFormErrors = Partial<Record<'title' | 'course_id' | 'exam_date' | 'participants' | 'max_grade', string>>;
type GradeFormErrors = Partial<Record<'gradeValue' | 'feedbackValue', string>>;

const DEFAULT_NEW_EXAM: Partial<Exam> = {
  type: 'quiz',
  status: 'upcoming',
  max_grade: 20,
  participants: 0,
  submitted: 0,
  course_id: null,
  course_name: '',
};

function getFieldClass(hasError?: boolean) {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
    hasError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'
  }`;
}

function isPastDate(value: string) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(`${value}T00:00:00`);
  return Number.isNaN(candidate.getTime()) || candidate.getTime() < today.getTime();
}

function validateExamForm(form: Partial<Exam>, availableCourseIds: Set<string>) {
  const errors: ExamFormErrors = {};
  const title = String(form.title ?? '').trim();
  const courseId = String(form.course_id ?? '').trim();
  const examDate = String(form.exam_date ?? '').trim();
  const participants = Number(form.participants ?? 0);
  const maxGrade = Number(form.max_grade ?? 0);

  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length < 3) errors.title = 'Le titre doit contenir au moins 3 caractères.';

  if (!courseId) errors.course_id = 'La formation associée est obligatoire.';
  else if (!availableCourseIds.has(courseId)) errors.course_id = 'Sélectionnez une formation valide.';

  if (!examDate) errors.exam_date = 'La date est obligatoire.';
  else if (isPastDate(examDate)) errors.exam_date = 'Choisissez une date du jour ou future.';

  if (!Number.isFinite(participants) || participants < 0) {
    errors.participants = 'Le nombre de participants doit être positif.';
  }

  if (!Number.isFinite(maxGrade) || maxGrade < 1 || maxGrade > 100) {
    errors.max_grade = 'La note maximale doit être comprise entre 1 et 100.';
  }

  return errors;
}

function validateGradeForm(gradeValue: string, feedbackValue: string, maxGrade: number) {
  const errors: GradeFormErrors = {};
  const grade = parseFloat(gradeValue);

  if (Number.isNaN(grade) || grade < 0 || grade > maxGrade) {
    errors.gradeValue = `La note doit être comprise entre 0 et ${maxGrade}.`;
  }
  if (feedbackValue.length > 500) {
    errors.feedbackValue = 'Le commentaire ne peut pas dépasser 500 caractères.';
  }

  return errors;
}

function makeQuestionDraft(type: QuestionType = 'single_choice'): QuestionDraft {
  return {
    prompt: '',
    type,
    points: 10,
    explanation: '',
    required: true,
  };
}

function makeChoiceDraft(): ChoiceDraft {
  return {
    label: '',
    value: '',
    is_correct: false,
  };
}

function formatExamGrade(grade: number | null, maxGrade: number) {
  return grade != null ? `${grade}/${maxGrade}` : '-';
}

function getExamTypeLabel(type: ExamType) {
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

function buildQuestionDrafts(questions: QuizQuestion[]) {
  return Object.fromEntries(
    questions.map((question) => [
      String(question.id),
      {
        prompt: question.prompt,
        type: question.type,
        points: question.points,
        explanation: question.explanation || '',
        required: Boolean(question.required),
      } satisfies QuestionDraft,
    ]),
  );
}

function buildChoiceDrafts(choices: QuizChoice[]) {
  return Object.fromEntries(
    choices.map((choice) => [
      String(choice.id),
      {
        label: choice.label,
        value: choice.value || choice.label,
        is_correct: Boolean(choice.is_correct),
      } satisfies ChoiceDraft,
    ]),
  );
}

export default function FormateurEvaluationsPage() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [instructorCourses, setInstructorCourses] = useState<CourseOption[]>([]);
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedSubmissionQuestions, setSelectedSubmissionQuestions] = useState<QuizQuestion[]>([]);
  const [selectedSubmissionChoices, setSelectedSubmissionChoices] = useState<QuizChoice[]>([]);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>(DEFAULT_NEW_EXAM);
  const [showQuizBuilderModal, setShowQuizBuilderModal] = useState(false);
  const [loadingQuizBuilder, setLoadingQuizBuilder] = useState(false);
  const [selectedQuizExam, setSelectedQuizExam] = useState<Exam | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizChoices, setQuizChoices] = useState<QuizChoice[]>([]);
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(makeQuestionDraft());
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, ChoiceDraft>>({});
  const [newChoiceDrafts, setNewChoiceDrafts] = useState<Record<string, ChoiceDraft>>({});
  const [createExamErrors, setCreateExamErrors] = useState<ExamFormErrors>({});
  const [gradeErrors, setGradeErrors] = useState<GradeFormErrors>({});
  const [createExamMessage, setCreateExamMessage] = useState<string | null>(null);
  const [gradeFormMessage, setGradeFormMessage] = useState<string | null>(null);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const availableCourseIds = new Set(instructorCourses.map((course) => String(course.id)));

  const updateNewExam = <K extends keyof Exam>(field: K, value: Exam[K] | undefined) => {
    setNewExam((current) => ({ ...current, [field]: value }));
    setCreateExamErrors((current) => ({ ...current, [field]: undefined }));
    setCreateExamMessage(null);
  };

  const fetchExams = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient.from<Exam>('exams').select('*').order('exam_date', { ascending: false });
      if (err) throw err;
      setExams(data || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient.from<Submission>('submissions').select('*').order('submitted_at', { ascending: false });
      if (err) throw err;
      setSubmissions(data || []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const { data, error: err } = await backendClient
        .from<CourseOption>('courses')
        .select('id, title')
        .order('title', { ascending: true });
      if (err) throw err;
      setInstructorCourses((data || []) as CourseOption[]);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

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

  const refreshQuizStructure = useCallback(async (examId: EntityId) => {
    const { questions, choices } = await fetchQuizStructure(examId);
    setQuizQuestions(questions);
    setQuizChoices(choices);
    setQuestionDrafts(buildQuestionDrafts(questions));
    setChoiceDrafts(buildChoiceDrafts(choices));
    setNewChoiceDrafts((previous) => {
      const next: Record<string, ChoiceDraft> = {};
      for (const question of questions) {
        next[String(question.id)] = previous[String(question.id)] ?? makeChoiceDraft();
      }
      return next;
    });
  }, [fetchQuizStructure]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchExams(), fetchSubmissions(), fetchCourses()]);
    setLoading(false);
  }, [fetchCourses, fetchExams, fetchSubmissions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedExam = selectedSubmission ? exams.find((exam) => String(exam.id) === String(selectedSubmission.exam_id)) || null : null;
  const selectedExamMaxGrade = selectedExam?.max_grade || 20;

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

  const selectedSubmissionChoicesByQuestion = useMemo(() => {
    const grouped = new Map<string, QuizChoice[]>();
    for (const choice of selectedSubmissionChoices) {
      const key = String(choice.question_id);
      const bucket = grouped.get(key) ?? [];
      bucket.push(choice);
      grouped.set(key, bucket);
    }
    return grouped;
  }, [selectedSubmissionChoices]);

  const selectedSubmissionAnswers = useMemo(
    () => (selectedSubmission && Array.isArray(selectedSubmission.answers) ? selectedSubmission.answers : []),
    [selectedSubmission],
  );

  const pendingCount = submissions.filter((submission) => submission.status === 'pending').length;
  const averageGradePercent = exams.filter((exam) => exam.avg_grade != null && exam.max_grade > 0).length
    ? Math.round(
      exams
        .filter((exam) => exam.avg_grade != null && exam.max_grade > 0)
        .reduce((sum, exam) => sum + (((exam.avg_grade || 0) / exam.max_grade) * 100), 0)
      / exams.filter((exam) => exam.avg_grade != null && exam.max_grade > 0).length,
    )
    : 0;

  const resetQuizBuilder = () => {
    setShowQuizBuilderModal(false);
    setSelectedQuizExam(null);
    setQuizQuestions([]);
    setQuizChoices([]);
    setNewQuestionDraft(makeQuestionDraft());
    setQuestionDrafts({});
    setChoiceDrafts({});
    setNewChoiceDrafts({});
  };

  const openQuizBuilder = async (exam: Exam) => {
    if (exam.type !== 'quiz') return;
    setSelectedQuizExam(exam);
    setShowQuizBuilderModal(true);
    setLoadingQuizBuilder(true);
    try {
      await refreshQuizStructure(exam.id);
    } catch (err: unknown) {
      console.error(err);
      error('Erreur', 'Impossible de charger les questions du quiz.');
      resetQuizBuilder();
      return;
    } finally {
      setLoadingQuizBuilder(false);
    }
  };

  const handleGrade = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade != null ? submission.grade.toString() : '');
    setFeedbackValue(submission.feedback || '');
    setGradeErrors({});
    setGradeFormMessage(null);
    setSelectedSubmissionQuestions([]);
    setSelectedSubmissionChoices([]);

    const exam = exams.find((entry) => String(entry.id) === String(submission.exam_id)) || null;
    if (exam?.type === 'quiz') {
      try {
        const { questions, choices } = await fetchQuizStructure(exam.id);
        setSelectedSubmissionQuestions(questions);
        setSelectedSubmissionChoices(choices);
      } catch (err: unknown) {
        console.error(err);
      }
    }

    setShowGradeModal(true);
  };

  const confirmGrade = async () => {
    if (!selectedSubmission) return;
    const nextErrors = validateGradeForm(gradeValue, feedbackValue, selectedExamMaxGrade);
    setGradeErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setGradeFormMessage('Corrigez les champs signalés avant d’attribuer la note.');
      return;
    }
    const grade = parseFloat(gradeValue);

    setIsGrading(true);
    try {
      const { error: err } = await backendClient
        .from('submissions')
        .update({ grade, feedback: feedbackValue, status: 'graded' })
        .eq('id', selectedSubmission.id);

      if (err) throw err;
      success('Note attribuée', `La note de ${grade}/${selectedExamMaxGrade} a été attribuée avec succès.`);

      await createNotification(
        selectedSubmission.student_id,
        'Nouvelle note disponible',
        `Votre soumission "${selectedExam?.title || 'Examen'}" a été notée ${grade}/${selectedExamMaxGrade}.`,
        'evaluation',
        '/dashboard/apprenant/examens',
      );

      setShowGradeModal(false);
      setSelectedSubmission(null);
      setSelectedSubmissionQuestions([]);
      setSelectedSubmissionChoices([]);
      setGradeValue('');
      setFeedbackValue('');
      setGradeErrors({});
      setGradeFormMessage(null);
      await Promise.all([fetchSubmissions(), fetchExams()]);
    } catch (err: unknown) {
      setGradeFormMessage('Impossible d attribuer la note.');
      error('Erreur', 'Impossible d attribuer la note.');
      console.error(err);
    } finally {
      setIsGrading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!user?.id) {
      error('Session invalide', 'Impossible d identifier le formateur.');
      return;
    }
    const nextErrors = validateExamForm(newExam, availableCourseIds);
    setCreateExamErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateExamMessage('Corrigez les champs signalés avant de créer l’examen.');
      return;
    }

    const selectedCourse = instructorCourses.find((course) => String(course.id) === String(newExam.course_id));
    if (!selectedCourse) {
      setCreateExamErrors((current) => ({ ...current, course_id: 'Sélectionnez une formation valide.' }));
      setCreateExamMessage('Corrigez les champs signalés avant de créer l’examen.');
      error('Formation invalide', 'Veuillez selectionner une formation valide.');
      return;
    }

    setIsCreatingExam(true);
    try {
      const { error: err } = await backendClient.from('exams').insert({
        instructor_id: user.id,
        course_id: newExam.course_id,
        title: newExam.title,
        course_name: selectedCourse.title,
        type: newExam.type || 'quiz',
        exam_date: newExam.exam_date,
        participants: newExam.participants || 0,
        submitted: newExam.submitted || 0,
        avg_grade: null,
        status: newExam.status || 'upcoming',
        max_grade: newExam.max_grade || 20,
      });

      if (err) throw err;

      success(
        'Examen créé',
        newExam.type === 'quiz'
          ? `"${newExam.title}" a été ajouté. Configurez maintenant ses questions.`
          : `"${newExam.title}" a été ajouté avec succès.`,
      );
      setShowCreateExamModal(false);
      setNewExam(DEFAULT_NEW_EXAM);
      setCreateExamErrors({});
      setCreateExamMessage(null);
      await fetchExams();
    } catch (err: unknown) {
      setCreateExamMessage('Impossible de créer l examen.');
      error('Erreur', 'Impossible de créer l examen.');
      console.error(err);
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleDeleteExam = async (exam: Exam) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${exam.title}" ?`)) return;

    try {
      const { error: err } = await backendClient.from('exams').delete().eq('id', exam.id);
      if (err) throw err;
      success('Supprimé', `"${exam.title}" a été supprimé.`);
      await fetchExams();
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer l examen.');
      console.error(err);
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedQuizExam) return;
    if (!newQuestionDraft.prompt.trim()) {
      error('Question invalide', 'L intitule de la question est obligatoire.');
      return;
    }

    try {
      const { data, error: err } = await backendClient.from<QuizQuestion>('quiz_questions').insert({
        exam_id: selectedQuizExam.id,
        prompt: newQuestionDraft.prompt.trim(),
        type: newQuestionDraft.type,
        points: newQuestionDraft.points,
        explanation: newQuestionDraft.explanation.trim(),
        required: newQuestionDraft.required,
      });

      if (err) throw err;

      const createdQuestionId = data && typeof data === 'object' && 'id' in data ? (data.id as EntityId) : null;
      if (createdQuestionId && newQuestionDraft.type === 'true_false') {
        await backendClient.from('quiz_choices').insert([
          {
            question_id: createdQuestionId,
            label: 'Vrai',
            value: 'true',
            is_correct: false,
          },
          {
            question_id: createdQuestionId,
            label: 'Faux',
            value: 'false',
            is_correct: false,
          },
        ]);
      }

      success('Question ajoutée', 'La question a été ajoutée au quiz.');
      setNewQuestionDraft(makeQuestionDraft());
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible d ajouter la question.');
      console.error(err);
    }
  };

  const handleSaveQuestion = async (question: QuizQuestion) => {
    if (!selectedQuizExam) return;
    const draft = questionDrafts[String(question.id)];
    if (!draft || !draft.prompt.trim()) {
      error('Question invalide', 'L intitule de la question est obligatoire.');
      return;
    }

    try {
      const existingChoices = quizChoicesByQuestion.get(String(question.id)) ?? [];
      const { error: err } = await backendClient.from('quiz_questions').update({
        prompt: draft.prompt.trim(),
        type: draft.type,
        points: draft.points,
        explanation: draft.explanation.trim(),
        required: draft.required,
      }).eq('id', question.id);

      if (err) throw err;

      if (draft.type === 'open' && existingChoices.length > 0) {
        const { error: deleteErr } = await backendClient.from('quiz_choices').delete().eq('question_id', question.id);
        if (deleteErr) throw deleteErr;
      }

      if (draft.type === 'true_false' && existingChoices.length === 0) {
        const { error: createChoicesErr } = await backendClient.from('quiz_choices').insert([
          {
            question_id: question.id,
            label: 'Vrai',
            value: 'true',
            is_correct: false,
          },
          {
            question_id: question.id,
            label: 'Faux',
            value: 'false',
            is_correct: false,
          },
        ]);
        if (createChoicesErr) throw createChoicesErr;
      }

      success('Question mise à jour', 'Les modifications ont été enregistrées.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de mettre à jour la question.');
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (question: QuizQuestion) => {
    if (!selectedQuizExam) return;
    if (!window.confirm('Supprimer cette question du quiz ?')) return;

    try {
      const { error: err } = await backendClient.from('quiz_questions').delete().eq('id', question.id);
      if (err) throw err;
      success('Question supprimée', 'La question a été retirée du quiz.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer la question.');
      console.error(err);
    }
  };

  const handleMoveQuestion = async (question: QuizQuestion, direction: -1 | 1) => {
    if (!selectedQuizExam) return;
    const orderedQuestions = orderByPosition(quizQuestions);
    const currentIndex = orderedQuestions.findIndex((entry) => String(entry.id) === String(question.id));
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedQuestions.length) return;

    const targetQuestion = orderedQuestions[targetIndex];
    try {
      const [firstRes, secondRes] = await Promise.all([
        backendClient.from('quiz_questions').update({ position: targetQuestion.position }).eq('id', question.id),
        backendClient.from('quiz_questions').update({ position: question.position }).eq('id', targetQuestion.id),
      ]);
      if (firstRes.error) throw firstRes.error;
      if (secondRes.error) throw secondRes.error;
      await refreshQuizStructure(selectedQuizExam.id);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de reordonner les questions.');
      console.error(err);
    }
  };

  const handleCreateChoice = async (question: QuizQuestion) => {
    if (!selectedQuizExam) return;
    const draft = newChoiceDrafts[String(question.id)] ?? makeChoiceDraft();
    if (!draft.label.trim()) {
      error('Choix invalide', 'Le libelle du choix est obligatoire.');
      return;
    }

    const existingChoices = quizChoicesByQuestion.get(String(question.id)) ?? [];
    if (question.type === 'true_false' && existingChoices.length >= 2) {
      error('Limite atteinte', 'Une question vrai/faux ne peut contenir que deux choix.');
      return;
    }

    try {
      if (draft.is_correct && isSingleAnswerType(question.type)) {
        await Promise.allSettled(
          existingChoices
            .filter((choice) => choice.is_correct)
            .map((choice) => backendClient.from('quiz_choices').update({ is_correct: false }).eq('id', choice.id)),
        );
      }

      const { error: err } = await backendClient.from('quiz_choices').insert({
        question_id: question.id,
        label: draft.label.trim(),
        value: draft.value.trim() || draft.label.trim(),
        is_correct: draft.is_correct,
      });

      if (err) throw err;
      success('Choix ajouté', 'Le choix a été ajouté à la question.');
      setNewChoiceDrafts((previous) => ({
        ...previous,
        [String(question.id)]: makeChoiceDraft(),
      }));
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible d ajouter le choix.');
      console.error(err);
    }
  };

  const handleSaveChoice = async (question: QuizQuestion, choice: QuizChoice) => {
    if (!selectedQuizExam) return;
    const draft = choiceDrafts[String(choice.id)];
    if (!draft || !draft.label.trim()) {
      error('Choix invalide', 'Le libelle du choix est obligatoire.');
      return;
    }

    const siblingChoices = (quizChoicesByQuestion.get(String(question.id)) ?? []).filter(
      (entry) => String(entry.id) !== String(choice.id),
    );

    try {
      if (draft.is_correct && isSingleAnswerType(question.type)) {
        await Promise.allSettled(
          siblingChoices
            .filter((entry) => entry.is_correct)
            .map((entry) => backendClient.from('quiz_choices').update({ is_correct: false }).eq('id', entry.id)),
        );
      }

      const { error: err } = await backendClient.from('quiz_choices').update({
        label: draft.label.trim(),
        value: draft.value.trim() || draft.label.trim(),
        is_correct: draft.is_correct,
      }).eq('id', choice.id);

      if (err) throw err;
      success('Choix mis à jour', 'Le choix a été mis à jour.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de mettre à jour le choix.');
      console.error(err);
    }
  };

  const handleDeleteChoice = async (choice: QuizChoice) => {
    if (!selectedQuizExam) return;
    if (!window.confirm('Supprimer ce choix ?')) return;

    try {
      const { error: err } = await backendClient.from('quiz_choices').delete().eq('id', choice.id);
      if (err) throw err;
      success('Choix supprimé', 'Le choix a été retiré.');
      await Promise.all([refreshQuizStructure(selectedQuizExam.id), fetchExams()]);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de supprimer le choix.');
      console.error(err);
    }
  };

  const handleMoveChoice = async (question: QuizQuestion, choice: QuizChoice, direction: -1 | 1) => {
    if (!selectedQuizExam) return;
    const orderedChoices = orderByPosition(quizChoicesByQuestion.get(String(question.id)) ?? []);
    const currentIndex = orderedChoices.findIndex((entry) => String(entry.id) === String(choice.id));
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedChoices.length) return;

    const targetChoice = orderedChoices[targetIndex];
    try {
      const [firstRes, secondRes] = await Promise.all([
        backendClient.from('quiz_choices').update({ position: targetChoice.position }).eq('id', choice.id),
        backendClient.from('quiz_choices').update({ position: choice.position }).eq('id', targetChoice.id),
      ]);
      if (firstRes.error) throw firstRes.error;
      if (secondRes.error) throw secondRes.error;
      await refreshQuizStructure(selectedQuizExam.id);
    } catch (err: unknown) {
      error('Erreur', 'Impossible de reordonner les choix.');
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
            <p className="text-gray-600 text-sm md:text-base">Créez des examens, structurez vos quiz et corrigez les travaux des apprenants</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Examens créés', value: String(exams.length), icon: 'ri-file-list-3-line', color: 'bg-teal-500' },
            { label: 'Soumissions en attente', value: String(pendingCount), icon: 'ri-time-line', color: 'bg-amber-500' },
            {
              label: 'Moyenne générale',
              value: `${averageGradePercent}%`,
              icon: 'ri-bar-chart-line',
              color: 'bg-green-500',
            },
            {
              label: 'Taux de participation',
              value: exams.length
                ? Math.round((exams.reduce((sum, exam) => sum + exam.submitted, 0) / exams.reduce((sum, exam) => sum + exam.participants, 0)) * 100 || 0) + '%'
                : '0%',
              icon: 'ri-group-line',
              color: 'bg-blue-500',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
                      <tr key={String(exam.id)} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{exam.title}</div>
                          {exam.type === 'quiz' && (
                            <div className="text-xs text-gray-500 mt-1">
                              {exam.questions_count || 0} question{(exam.questions_count || 0) > 1 ? 's' : ''} • note max {exam.max_grade}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{exam.course_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                            {getExamTypeLabel(exam.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{exam.exam_date || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {exam.submitted}/{exam.participants}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatExamGrade(exam.avg_grade, exam.max_grade)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(exam.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {exam.type === 'quiz' && (
                              <button
                                title="Configurer le quiz"
                                onClick={() => openQuizBuilder(exam)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-teal-50 rounded-lg transition-colors"
                              >
                                <i className="ri-list-check-3 text-teal-600 text-sm"></i>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteExam(exam)}
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
            {exams.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun examen. Créez-en un avec le bouton ci-dessus.</p>
              </div>
            )}
          </div>
        )}

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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenu</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((submission) => {
                      const submissionExam = exams.find((exam) => String(exam.id) === String(submission.exam_id));
                      const hasStructuredAnswers = Array.isArray(submission.answers) && submission.answers.length > 0;
                      return (
                        <tr key={String(submission.id)} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {submission.student_avatar ? (
                                <img src={submission.student_avatar} alt={submission.student_name} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                                  {submission.student_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium text-gray-900 text-sm">{submission.student_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{submissionExam?.title || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(submission.submitted_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            {hasStructuredAnswers ? (
                              <span className="text-sm text-gray-600">Réponses intégrées</span>
                            ) : submission.file_name ? (
                              <button
                                onClick={() => submission.file_url && window.open(submission.file_url, '_blank', 'noopener,noreferrer')}
                                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                              >
                                <i className="ri-file-download-line"></i>
                                {submission.file_name}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {formatExamGrade(submission.grade, submissionExam?.max_grade || 20)}
                          </td>
                          <td className="px-4 py-3">{getSubmissionStatusBadge(submission.status)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleGrade(submission)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                                submission.status === 'pending'
                                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {submission.status === 'pending' ? 'Corriger' : 'Modifier'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

        {showCreateExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Nouvel examen</h3>
              {createExamMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createExamMessage}
                </div>
              ) : null}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={newExam.title || ''}
                    onChange={(event) => updateNewExam('title', event.target.value)}
                    placeholder="Ex: Quiz React - Module 3"
                    aria-invalid={Boolean(createExamErrors.title)}
                    className={getFieldClass(Boolean(createExamErrors.title))}
                  />
                  {createExamErrors.title ? <p className="mt-1 text-xs text-red-600">{createExamErrors.title}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formation associée</label>
                  <select
                    value={String(newExam.course_id ?? '')}
                    onChange={(event) => {
                      const selectedCourse = instructorCourses.find((course) => String(course.id) === event.target.value);
                      setNewExam((current) => ({
                        ...current,
                        course_id: event.target.value ? event.target.value : null,
                        course_name: selectedCourse?.title || '',
                      }));
                      setCreateExamErrors((current) => ({ ...current, course_id: undefined }));
                      setCreateExamMessage(null);
                    }}
                    aria-invalid={Boolean(createExamErrors.course_id)}
                    className={getFieldClass(Boolean(createExamErrors.course_id))}
                  >
                    <option value="">Sélectionner une formation</option>
                    {instructorCourses.map((course) => (
                      <option key={String(course.id)} value={String(course.id)}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {createExamErrors.course_id ? <p className="mt-1 text-xs text-red-600">{createExamErrors.course_id}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newExam.type || 'quiz'}
                      onChange={(event) => updateNewExam('type', event.target.value as ExamType)}
                      className={getFieldClass(false)}
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
                      onChange={(event) => updateNewExam('exam_date', event.target.value)}
                      aria-invalid={Boolean(createExamErrors.exam_date)}
                      className={getFieldClass(Boolean(createExamErrors.exam_date))}
                    />
                    {createExamErrors.exam_date ? <p className="mt-1 text-xs text-red-600">{createExamErrors.exam_date}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
                    <input
                      type="number"
                      min={0}
                      value={newExam.participants || 0}
                      onChange={(event) => updateNewExam('participants', parseInt(event.target.value, 10) || 0)}
                      aria-invalid={Boolean(createExamErrors.participants)}
                      className={getFieldClass(Boolean(createExamErrors.participants))}
                    />
                    {createExamErrors.participants ? <p className="mt-1 text-xs text-red-600">{createExamErrors.participants}</p> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note max</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newExam.max_grade || 20}
                      onChange={(event) => updateNewExam('max_grade', parseInt(event.target.value, 10) || 20)}
                      aria-invalid={Boolean(createExamErrors.max_grade)}
                      className={getFieldClass(Boolean(createExamErrors.max_grade))}
                    />
                    {createExamErrors.max_grade ? <p className="mt-1 text-xs text-red-600">{createExamErrors.max_grade}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={newExam.status || 'upcoming'}
                    onChange={(event) => updateNewExam('status', event.target.value)}
                    className={getFieldClass(false)}
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
                    setNewExam(DEFAULT_NEW_EXAM);
                    setCreateExamErrors({});
                    setCreateExamMessage(null);
                  }}
                  disabled={isCreatingExam}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateExam}
                  disabled={isCreatingExam}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingExam ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuizBuilderModal && selectedQuizExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Configuration du quiz</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedQuizExam.title}</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                      {quizQuestions.length} question{quizQuestions.length > 1 ? 's' : ''}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {quizQuestions.reduce((sum, question) => sum + question.points, 0)} points cumulés
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {selectedQuizExam.course_name || 'Formation'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={resetQuizBuilder}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <i className="ri-close-line text-xl text-gray-500"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingQuizBuilder ? (
                  <div className="p-6">
                    <SkeletonList count={4} />
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h4 className="text-base font-bold text-gray-900">Nouvelle question</h4>
                          <p className="text-sm text-gray-600">Ajoutez la structure du quiz avant de l ouvrir aux apprenants.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé</label>
                          <textarea
                            value={newQuestionDraft.prompt}
                            onChange={(event) => setNewQuestionDraft((current) => ({ ...current, prompt: event.target.value }))}
                            rows={3}
                            placeholder="Ex: Quel indicateur permet de mesurer le cout d acquisition ?"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                          />
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={newQuestionDraft.type}
                              onChange={(event) => setNewQuestionDraft((current) => ({ ...current, type: event.target.value as QuestionType }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                            >
                              <option value="single_choice">Choix unique</option>
                              <option value="multiple_choice">Choix multiples</option>
                              <option value="true_false">Vrai/Faux</option>
                              <option value="open">Réponse ouverte</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={newQuestionDraft.points}
                              onChange={(event) => setNewQuestionDraft((current) => ({ ...current, points: parseInt(event.target.value, 10) || 1 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                            />
                          </div>
                          <label className="md:col-span-2 flex items-center gap-3 text-sm text-gray-700 pt-7">
                            <input
                              type="checkbox"
                              checked={newQuestionDraft.required}
                              onChange={(event) => setNewQuestionDraft((current) => ({ ...current, required: event.target.checked }))}
                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            Réponse obligatoire
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Consigne / correction (facultatif)</label>
                          <textarea
                            value={newQuestionDraft.explanation}
                            onChange={(event) => setNewQuestionDraft((current) => ({ ...current, explanation: event.target.value }))}
                            rows={2}
                            placeholder="Contexte ou explication attendue pour cette question..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={handleCreateQuestion}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                          >
                            Ajouter la question
                          </button>
                        </div>
                      </div>
                    </div>

                    {quizQuestions.length === 0 ? (
                      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                        <p className="text-gray-600">Aucune question pour le moment. Ajoutez-en une pour structurer le quiz.</p>
                      </div>
                    ) : (
                      orderByPosition(quizQuestions).map((question, index) => {
                        const questionDraft = questionDrafts[String(question.id)] ?? makeQuestionDraft(question.type);
                        const questionChoices = orderByPosition(quizChoicesByQuestion.get(String(question.id)) ?? []);
                        const canAddMoreTrueFalseChoices = question.type !== 'true_false' || questionChoices.length < 2;

                        return (
                          <div key={String(question.id)} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                    Question {index + 1}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                                    {getQuestionTypeLabel(questionDraft.type)}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                    {questionDraft.points} point{questionDraft.points > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  title="Monter la question"
                                  onClick={() => handleMoveQuestion(question, -1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <i className="ri-arrow-up-line text-gray-600"></i>
                                </button>
                                <button
                                  title="Descendre la question"
                                  onClick={() => handleMoveQuestion(question, 1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <i className="ri-arrow-down-line text-gray-600"></i>
                                </button>
                                <button
                                  onClick={() => handleSaveQuestion(question)}
                                  className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(question)}
                                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé</label>
                                <textarea
                                  value={questionDraft.prompt}
                                  onChange={(event) => setQuestionDrafts((current) => ({
                                    ...current,
                                    [String(question.id)]: { ...questionDraft, prompt: event.target.value },
                                  }))}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                                />
                              </div>
                              <div className="grid md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                  <select
                                    value={questionDraft.type}
                                    onChange={(event) => setQuestionDrafts((current) => ({
                                      ...current,
                                      [String(question.id)]: { ...questionDraft, type: event.target.value as QuestionType },
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                                  >
                                    <option value="single_choice">Choix unique</option>
                                    <option value="multiple_choice">Choix multiples</option>
                                    <option value="true_false">Vrai/Faux</option>
                                    <option value="open">Réponse ouverte</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={questionDraft.points}
                                    onChange={(event) => setQuestionDrafts((current) => ({
                                      ...current,
                                      [String(question.id)]: { ...questionDraft, points: parseInt(event.target.value, 10) || 1 },
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                                  />
                                </div>
                                <label className="md:col-span-2 flex items-center gap-3 text-sm text-gray-700 pt-7">
                                  <input
                                    type="checkbox"
                                    checked={questionDraft.required}
                                    onChange={(event) => setQuestionDrafts((current) => ({
                                      ...current,
                                      [String(question.id)]: { ...questionDraft, required: event.target.checked },
                                    }))}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  Réponse obligatoire
                                </label>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consigne / correction</label>
                                <textarea
                                  value={questionDraft.explanation}
                                  onChange={(event) => setQuestionDrafts((current) => ({
                                    ...current,
                                    [String(question.id)]: { ...questionDraft, explanation: event.target.value },
                                  }))}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
                                />
                              </div>
                            </div>

                            {questionDraft.type === 'open' ? (
                              <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
                                Cette question sera repondue en texte libre par l apprenant.
                              </div>
                            ) : (
                              <div className="mt-5">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900">Choix de réponse</h5>
                                    <p className="text-xs text-gray-500">
                                      {isSingleAnswerType(questionDraft.type)
                                        ? 'Une seule bonne réponse doit être cochée.'
                                        : 'Cochez toutes les bonnes réponses attendues.'}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {questionChoices.map((choice) => {
                                    const choiceDraft = choiceDrafts[String(choice.id)] ?? makeChoiceDraft();
                                    return (
                                      <div key={String(choice.id)} className="border border-gray-200 rounded-xl p-3">
                                        <div className="flex flex-col lg:flex-row gap-3">
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              value={choiceDraft.label}
                                              onChange={(event) => setChoiceDrafts((current) => ({
                                                ...current,
                                                [String(choice.id)]: {
                                                  ...choiceDraft,
                                                  label: event.target.value,
                                                  value: choiceDraft.value || event.target.value,
                                                },
                                              }))}
                                              placeholder="Texte du choix"
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                                            />
                                          </div>
                                          <label className="flex items-center gap-2 text-sm text-gray-700">
                                            <input
                                              type="checkbox"
                                              checked={choiceDraft.is_correct}
                                              onChange={(event) => setChoiceDrafts((current) => ({
                                                ...current,
                                                [String(choice.id)]: { ...choiceDraft, is_correct: event.target.checked },
                                              }))}
                                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            Bonne réponse
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <button
                                              title="Monter le choix"
                                              onClick={() => handleMoveChoice(question, choice, -1)}
                                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                              <i className="ri-arrow-up-line text-gray-600"></i>
                                            </button>
                                            <button
                                              title="Descendre le choix"
                                              onClick={() => handleMoveChoice(question, choice, 1)}
                                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                              <i className="ri-arrow-down-line text-gray-600"></i>
                                            </button>
                                            <button
                                              onClick={() => handleSaveChoice(question, choice)}
                                              className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-black transition-colors"
                                            >
                                              Enregistrer
                                            </button>
                                            <button
                                              onClick={() => handleDeleteChoice(choice)}
                                              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                            >
                                              Supprimer
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {canAddMoreTrueFalseChoices && (
                                    <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50">
                                      <div className="flex flex-col lg:flex-row gap-3">
                                        <div className="flex-1">
                                          <input
                                            type="text"
                                            value={(newChoiceDrafts[String(question.id)] ?? makeChoiceDraft()).label}
                                            onChange={(event) => setNewChoiceDrafts((current) => ({
                                              ...current,
                                              [String(question.id)]: {
                                                ...(current[String(question.id)] ?? makeChoiceDraft()),
                                                label: event.target.value,
                                                value: (current[String(question.id)]?.value || event.target.value),
                                              },
                                            }))}
                                            placeholder="Nouveau choix"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white"
                                          />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                          <input
                                            type="checkbox"
                                            checked={(newChoiceDrafts[String(question.id)] ?? makeChoiceDraft()).is_correct}
                                            onChange={(event) => setNewChoiceDrafts((current) => ({
                                              ...current,
                                              [String(question.id)]: {
                                                ...(current[String(question.id)] ?? makeChoiceDraft()),
                                                is_correct: event.target.checked,
                                              },
                                            }))}
                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                          />
                                          Bonne réponse
                                        </label>
                                        <button
                                          onClick={() => handleCreateChoice(question)}
                                          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                                        >
                                          Ajouter
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showGradeModal && selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Noter - {selectedSubmission.student_name}</h3>
              <p className="text-sm text-gray-600 mb-4">{selectedExam?.title || '-'}</p>
              {gradeFormMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {gradeFormMessage}
                </div>
              ) : null}

              {selectedSubmissionAnswers.length > 0 && (
                <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Réponses soumises</h4>
                  <div className="space-y-4">
                    {selectedSubmissionAnswers.map((answer, index) => {
                      const relatedChoices = selectedSubmissionChoicesByQuestion.get(String(answer.question_id)) ?? [];
                      const selectedLabels = relatedChoices
                        .filter((choice) => answer.selected_choice_ids.map(String).includes(String(choice.id)))
                        .map((choice) => choice.label);
                      return (
                        <div key={`${String(answer.question_id)}-${index}`} className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="text-sm font-medium text-gray-900">{answer.question_prompt}</div>
                          <div className="text-xs text-gray-500 mt-1">{getQuestionTypeLabel(answer.question_type)}</div>
                          <div className="mt-2 text-sm text-gray-700">
                            {answer.question_type === 'open'
                              ? (answer.answer_text || 'Aucune réponse')
                              : selectedLabels.length > 0
                                ? selectedLabels.join(', ')
                                : 'Aucune réponse'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (/{selectedExamMaxGrade})</label>
                  <input
                    type="number"
                    min="0"
                    max={String(selectedExamMaxGrade)}
                    step="0.5"
                    value={gradeValue}
                    onChange={(event) => {
                      setGradeValue(event.target.value);
                      setGradeErrors((current) => ({ ...current, gradeValue: undefined }));
                      setGradeFormMessage(null);
                    }}
                    placeholder="Ex: 16.5"
                    aria-invalid={Boolean(gradeErrors.gradeValue)}
                    className={getFieldClass(Boolean(gradeErrors.gradeValue))}
                  />
                  {gradeErrors.gradeValue ? <p className="mt-1 text-xs text-red-600">{gradeErrors.gradeValue}</p> : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (facultatif)</label>
                  <textarea
                    value={feedbackValue}
                    onChange={(event) => {
                      setFeedbackValue(event.target.value);
                      setGradeErrors((current) => ({ ...current, feedbackValue: undefined }));
                      setGradeFormMessage(null);
                    }}
                    placeholder="Ajoutez un commentaire pour l'apprenant..."
                    rows={3}
                    maxLength={500}
                    aria-invalid={Boolean(gradeErrors.feedbackValue)}
                    className={`${getFieldClass(Boolean(gradeErrors.feedbackValue))} resize-none`}
                  />
                  <p className="text-xs text-gray-500 mt-1">{feedbackValue.length}/500 caractères</p>
                  {gradeErrors.feedbackValue ? <p className="mt-1 text-xs text-red-600">{gradeErrors.feedbackValue}</p> : null}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setSelectedSubmission(null);
                    setSelectedSubmissionQuestions([]);
                    setSelectedSubmissionChoices([]);
                    setGradeValue('');
                    setFeedbackValue('');
                    setGradeErrors({});
                    setGradeFormMessage(null);
                  }}
                  disabled={isGrading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmGrade}
                  disabled={isGrading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGrading ? 'Attribution...' : 'Attribuer la note'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
