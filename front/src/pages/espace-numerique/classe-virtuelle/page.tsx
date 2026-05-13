import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';


interface VirtualClass {
  id: number;
  title: string;
  course_id: number;
  course_name: string;
  class_date: string;
  class_time: string;
  duration: string;
  max_students: number;
  students_count: number;
  status: string;
  room_link: string | null;
  recording_url: string | null;
  recording_status?: 'none' | 'pending' | 'processing' | 'ready';
  instructor_notes?: string | null;
  provider?: 'jitsi' | 'custom';
}

interface Course {
  id: number;
  title: string;
  category: string;
  modules: number;
  duration: string;
  description: string | null;
}

interface Lesson {
  id: string;
  sectionId?: string;
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'exercise' | 'pdf' | 'article' | 'live' | 'coding' | 'practice' | 'assignment';
  completed: boolean;
  locked: boolean;
  progress?: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function ClasseVirtuellePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [vclass, setVclass] = useState<VirtualClass | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Array<{ id: string | number; title: string }>>([]);
  const [lessons, setLessons] = useState<Array<{ id: string | number; section_id: string | number; title: string; duration: string | null; type: Lesson['type']; is_preview?: boolean }>>([]);
  const [lessonProgressRecords, setLessonProgressRecords] = useState<Array<{ id: string | number; lesson_id: string | number; section_id?: string | number; progress: number; completed: boolean }>>([]);
  const [enrollment, setEnrollment] = useState<{ id: string | number; progress?: number; status?: string } | null>(null);
  const [comments, setComments] = useState<Array<{ id: string | number; user_name: string; user_role: string; content: string; created_at: string; pinned?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string>('1');
  const progressByLesson = useMemo(() => {
    const map = new Map<string, { id: string | number; progress: number; completed: boolean }>();
    lessonProgressRecords.forEach((entry) => {
      map.set(String(entry.lesson_id), {
        id: entry.id,
        progress: Number(entry.progress || 0),
        completed: Boolean(entry.completed) || Number(entry.progress || 0) >= 100,
      });
    });
    return map;
  }, [lessonProgressRecords]);

  const courseModules = useMemo<Module[]>(() => {
    if (!course) {
      return [];
    }

    if (sections.length > 0) {
      return sections.map((section, sectionIndex) => ({
        id: String(section.id),
        title: section.title || `Module ${sectionIndex + 1}`,
        lessons: lessons
          .filter((lesson) => String(lesson.section_id) === String(section.id))
          .map((lesson, lessonIndex) => ({
            id: String(lesson.id),
            sectionId: String(section.id),
            title: lesson.title,
            duration: lesson.duration || 'A definir',
            type: lesson.type === 'assignment' ? 'exercise' : lesson.type,
            completed: Boolean(progressByLesson.get(String(lesson.id))?.completed),
            locked: false,
            progress: Number(progressByLesson.get(String(lesson.id))?.progress ?? 0),
          })),
      }));
    }

    return [
      {
        id: '1',
        title: `Module 1: Introduction ${course.title}`,
        lessons: [
          { id: '1-1', title: 'Introduction à la formation', duration: '45 min', type: 'video', completed: true, locked: false },
          { id: '1-2', title: 'Concepts fondamentaux', duration: '1h 20min', type: 'video', completed: true, locked: false },
          { id: '1-3', title: 'Pratique guidée', duration: '1h 30min', type: 'video', completed: true, locked: false },
          { id: '1-4', title: 'Récapitulatif', duration: '1h 15min', type: 'video', completed: false, locked: false },
          { id: '1-5', title: 'Quiz Module 1', duration: '20 min', type: 'quiz', completed: false, locked: true }
        ]
      },
      {
        id: '2',
        title: 'Module 2: Approfondissement',
        lessons: [
          { id: '2-1', title: 'Techniques avancées', duration: '50 min', type: 'video', completed: false, locked: true },
          { id: '2-2', title: 'Études de cas', duration: '1h 10min', type: 'video', completed: false, locked: true },
          { id: '2-3', title: 'Exercices pratiques', duration: '1h 25min', type: 'exercise', completed: false, locked: true },
          { id: '2-4', title: 'Quiz Module 2', duration: '30 min', type: 'quiz', completed: false, locked: true },
        ]
      },
      {
        id: '3',
        title: 'Module 3: Expertise',
        lessons: [
          { id: '3-1', title: 'Maîtrise avancée', duration: '1h', type: 'video', completed: false, locked: true },
          { id: '3-2', title: 'Projet final', duration: '2h', type: 'exercise', completed: false, locked: true },
          { id: '3-3', title: 'Évaluation finale', duration: '1h', type: 'quiz', completed: false, locked: true },
        ]
      }
    ];
  }, [course, lessons, progressByLesson, sections]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setError('ID de classe manquant'); setLoading(false); return; }
      try {
        const { data: vData } = await backendClient
          .from('virtual_classes')
          .select('*')
          .eq('id', Number(id))
          .maybeSingle();
        if (!vData) { setError('Classe virtuelle introuvable'); setLoading(false); return; }
        setVclass(vData as VirtualClass);

        if (vData.course_id) {
          const [courseRes, sectionsRes, lessonsRes, progressRes, enrollmentRes] = await Promise.all([
            backendClient
              .from('courses')
              .select('id,title,category,modules,duration,description')
              .eq('id', vData.course_id)
              .maybeSingle(),
            backendClient
              .from('course_sections')
              .select('id,title,position')
              .eq('course_id', vData.course_id)
              .order('position', { ascending: true }),
            backendClient
              .from('course_lessons')
              .select('id,section_id,title,duration,type,is_preview,position')
              .eq('course_id', vData.course_id)
              .order('position', { ascending: true }),
            user?.id
              ? backendClient
                  .from('lesson_progress')
                  .select('*')
                  .eq('course_id', vData.course_id)
                  .eq('student_id', user.id)
                  .order('last_viewed_at', { ascending: false })
              : Promise.resolve({ data: [], error: null }),
            user?.id
              ? backendClient
                  .from('course_enrollments')
                  .select('id,progress,status')
                  .eq('course_id', vData.course_id)
                  .eq('student_id', user.id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);
          setCourse(courseRes.data as Course | null);
          setSections((sectionsRes.data || []) as Array<{ id: string | number; title: string }>);
          setLessons((lessonsRes.data || []) as Array<{ id: string | number; section_id: string | number; title: string; duration: string | null; type: Lesson['type']; is_preview?: boolean }>);
          setLessonProgressRecords((progressRes.data || []) as Array<{ id: string | number; lesson_id: string | number; section_id?: string | number; progress: number; completed: boolean }>);
          setEnrollment((enrollmentRes.data as { id: string | number; progress?: number; status?: string } | null) || null);
        }
      } catch (err) { setError('Erreur de chargement'); console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, user?.id]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!currentLesson?.id || !user?.id) {
        setComments([]);
        return;
      }
      setLoadingComments(true);
      try {
        const { data, error } = await backendClient
          .from('lesson_comments')
          .select('*')
          .eq('lesson_id', currentLesson.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setComments((data || []) as Array<{ id: string | number; user_name: string; user_role: string; content: string; created_at: string; pinned?: boolean }>);
      } catch (err) {
        console.error(err);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    void fetchComments();
  }, [currentLesson?.id, user?.id]);

  useEffect(() => {
    if (courseModules.length === 0) return;
    const firstUncompleted = courseModules[0]?.lessons.find(l => !l.completed && !l.locked);
    const fallbackLesson = firstUncompleted || courseModules[0]?.lessons[0] || null;
    setCurrentLesson((prev) => prev ?? fallbackLesson);
  }, [courseModules]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return 'ri-play-circle-line';
      case 'quiz': return 'ri-question-line';
      case 'exercise': return 'ri-code-s-slash-line';
      case 'coding': return 'ri-code-s-slash-line';
      case 'practice': return 'ri-tools-line';
      case 'article': return 'ri-file-text-line';
      case 'live': return 'ri-live-line';
      case 'pdf': return 'ri-file-pdf-line';
      default: return 'ri-file-line';
    }
  };

  const totalLessons = courseModules.reduce((acc, module) => acc + module.lessons.length, 0);
  const completedLessons = courseModules.reduce((acc, module) =>
    acc + module.lessons.filter(l => l.completed).length, 0
  );
  const progress = totalLessons > 0
    ? Math.round(
        courseModules
          .flatMap((module) => module.lessons)
          .reduce((sum, lesson) => sum + Number(lesson.progress ?? 0), 0) / totalLessons,
      )
    : 0;
  const canTrackProgress = Boolean(user?.id && (user.role === 'admin' || user.role === 'apprenant') && (user.role === 'admin' || enrollment));

  const handleMarkLessonComplete = async () => {
    if (!currentLesson || !course?.id) return;
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour suivre votre progression.');
      return;
    }
    if (!canTrackProgress) {
      info('Inscription requise', 'Inscrivez-vous a la formation pour enregistrer votre progression.');
      return;
    }

    setProgressSaving(true);
    try {
      const existingProgress = progressByLesson.get(String(currentLesson.id));
      const payload = {
        course_id: course.id,
        section_id: currentLesson.sectionId,
        lesson_id: currentLesson.id,
        student_id: user.id,
        progress: 100,
        completed: true,
      };

      if (existingProgress) {
        const { data, error } = await backendClient.from('lesson_progress').update(payload).eq('id', existingProgress.id);
        if (error) throw error;
        const updated = (Array.isArray(data) ? data[0] : data) as { id: string | number; lesson_id: string | number; section_id?: string | number; progress: number; completed: boolean };
        setLessonProgressRecords((current) => current.map((entry) => (String(entry.id) === String(updated.id) ? updated : entry)));
      } else {
        const { data, error } = await backendClient.from('lesson_progress').insert(payload);
        if (error) throw error;
        const created = (Array.isArray(data) ? data[0] : data) as { id: string | number; lesson_id: string | number; section_id?: string | number; progress: number; completed: boolean };
        setLessonProgressRecords((current) => [created, ...current]);
      }

      success('Progression mise a jour', `La lecon "${currentLesson.title}" est marquee comme terminee.`);
    } catch (err) {
      console.error(err);
      toastError('Erreur', 'Impossible d enregistrer votre progression pour cette lecon.');
    } finally {
      setProgressSaving(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentLesson?.id) return;
    const content = commentInput.trim();
    if (!content) return;
    if (!user?.id) {
      toastError('Connexion requise', 'Connectez-vous pour poser une question sur cette lecon.');
      return;
    }
    if (user.role === 'apprenant' && !enrollment) {
      info('Inscription requise', 'Inscrivez-vous au parcours pour participer aux echanges.');
      return;
    }

    setCommentSubmitting(true);
    try {
      const { data, error } = await backendClient.from('lesson_comments').insert({
        lesson_id: currentLesson.id,
        content,
      });
      if (error) throw error;
      const created = (Array.isArray(data) ? data[0] : data) as { id: string | number; user_name: string; user_role: string; content: string; created_at: string; pinned?: boolean };
      setComments((current) => [created, ...current]);
      setCommentInput('');
      success('Question envoyee', 'Votre message est maintenant visible sur cette lecon.');
    } catch (err) {
      console.error(err);
      toastError('Erreur', 'Impossible d envoyer cette question pour le moment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const isLive = vclass?.status === 'live';
  const isEnded = vclass?.status === 'ended';
  const isScheduled = vclass?.status === 'scheduled';
  const isReplayProcessing = isEnded && !vclass?.recording_url && vclass?.recording_status === 'processing';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de la classe virtuelle...</p>
        </div>
      </div>
    );
  }

  if (error || !vclass) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-gray-400"></i>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{error || 'Classe introuvable'}</h2>
          <Link to="/espace-numerique" className="text-teal-400 hover:text-teal-300 font-medium">
            Retour à l&apos;espace numérique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Class Header Info */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white font-bold text-lg">{vclass.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <i className="ri-book-line"></i> {vclass.course_name || course?.title || 'Formation'}
              </span>
              <span className="flex items-center gap-1">
                <i className="ri-calendar-line"></i> {new Date(vclass.class_date).toLocaleDateString('fr-FR')}
              </span>
              <span className="flex items-center gap-1">
                <i className="ri-time-line"></i> {vclass.class_time} ({vclass.duration})
              </span>
              <span className="flex items-center gap-1">
                <i className="ri-user-line"></i> {vclass.students_count}/{vclass.max_students} participants
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                En direct
              </span>
            )}
            {isEnded && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
                <i className="ri-check-line"></i> Terminée
              </span>
            )}
            {isScheduled && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-teal-600/20 text-teal-400 rounded-full text-sm font-medium">
                <i className="ri-calendar-check-line"></i> Programmée
              </span>
            )}
            {vclass.room_link && (isLive || isScheduled) && (
              <a
                href={vclass.room_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-video-line mr-1"></i> Rejoindre
              </a>
            )}
            {vclass.recording_url && isEnded && (
              <a
                href={vclass.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-play-circle-line mr-1"></i> Replay
              </a>
            )}
          </div>
        </div>
        {vclass.instructor_notes ? (
          <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900/70 px-4 py-3 text-sm text-gray-300">
            <span className="font-medium text-white">Notes du formateur:</span> {vclass.instructor_notes}
          </div>
        ) : null}
        <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
          Cette page reste un <strong>viewer enrichi</strong> : acces au direct ou au replay, lecture du programme,
          progression de lecon cote serveur et questions asynchrones. Le chat temps reel, la presence live et la
          synchronisation de session en direct ne sont pas encore branches.
        </div>
      </div>

      <div className="flex h-[calc(100vh-56px-60px)]">
        {/* Sidebar - Course Content */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0 hidden lg:block">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-base font-bold text-white mb-3">Contenu de la formation</h2>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">{completedLessons} / {totalLessons} leçons</span>
                <span className="text-sm font-bold text-teal-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {courseModules.map((module) => (
              <div key={module.id} className="bg-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedModule(expandedModule === module.id ? '' : module.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-600 transition-colors"
                >
                  <span className="text-sm font-medium text-white">{module.title}</span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`text-gray-400 ${expandedModule === module.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                  </div>
                </button>
                {expandedModule === module.id && (
                  <div className="border-t border-gray-600">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => !lesson.locked && setCurrentLesson(lesson)}
                        disabled={lesson.locked}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          currentLesson?.id === lesson.id
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {lesson.completed ? (
                            <i className="ri-checkbox-circle-fill text-base text-green-400"></i>
                          ) : (
                            <i className={`${getTypeIcon(lesson.type)} text-base`}></i>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{lesson.title}</div>
                          <div className="text-xs opacity-75">{lesson.duration}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - Video Player */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-black flex items-center justify-center">
            {isScheduled && !isLive ? (
              <div className="text-center px-6">
                <div className="w-20 h-20 flex items-center justify-center bg-teal-600 rounded-full mx-auto mb-4">
                  <i className="ri-calendar-check-line text-4xl text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{vclass.title}</h3>
                <p className="text-gray-400 mb-4">
                  La classe commence le {new Date(vclass.class_date).toLocaleDateString('fr-FR')} à {vclass.class_time}
                </p>
                <p className="text-sm text-gray-500">Revenez à l&apos;heure prévue pour accéder au direct</p>
              </div>
            ) : isReplayProcessing ? (
              <div className="text-center px-6">
                <div className="w-20 h-20 flex items-center justify-center bg-amber-500 rounded-full mx-auto mb-4">
                  <i className="ri-loader-4-line animate-spin text-4xl text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Replay en préparation</h3>
                <p className="text-sm text-gray-400">Le formateur a terminé la session. L’enregistrement sera disponible ici dès qu’il sera prêt.</p>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="w-20 h-20 flex items-center justify-center bg-teal-600 rounded-full mx-auto mb-4">
                  <i className="ri-play-fill text-4xl text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{currentLesson?.title || vclass.title}</h3>
                <p className="text-sm text-gray-400">Durée: {currentLesson?.duration || vclass.duration}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                  <i className="ri-skip-back-line mr-2"></i>
                  Leçon précédente
                </button>
                <div className="flex items-center gap-4">
                  <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <i className="ri-speed-line text-lg"></i>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <i className="ri-volume-up-line text-lg"></i>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <i className="ri-fullscreen-line text-lg"></i>
                  </button>
                </div>
                <button className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                  Leçon suivante
                  <i className="ri-skip-forward-line ml-2"></i>
                </button>
              </div>

              <div className="flex items-center gap-4 overflow-x-auto">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${showNotes ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  <i className="ri-file-text-line mr-2"></i>Notes locales
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap">
                  <i className="ri-download-line mr-2"></i>Ressources
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg whitespace-nowrap">
                  <i className="ri-question-line mr-2"></i>Questions async
                </button>
                <button
                  onClick={handleMarkLessonComplete}
                  disabled={!canTrackProgress || !currentLesson || progressSaving || currentLesson.completed}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="ri-check-line mr-2"></i>
                  {currentLesson?.completed ? 'Lecon terminee' : (progressSaving ? 'Enregistrement...' : 'Marquer terminee')}
                </button>
              </div>
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="max-w-5xl mx-auto">
                <h3 className="text-base font-bold text-white mb-1">Mes notes</h3>
                <p className="mb-3 text-xs text-gray-400">Brouillon local a cette session. Rien n est encore synchronise cote serveur.</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Prenez des notes pendant la leçon..."
                  className="w-full h-32 px-4 py-3 bg-gray-700 text-white text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                ></textarea>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{notes.length}/500 caractères</span>
                  <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg whitespace-nowrap">
                    Conserver localement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 hidden md:flex">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Statut du direct</h3>
            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
              isLive ? 'bg-red-600/20 text-red-400' : isScheduled ? 'bg-teal-600/20 text-teal-300' : 'bg-gray-700 text-gray-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : isScheduled ? 'bg-teal-400' : 'bg-gray-400'}`}></span>
              {isLive ? 'Live' : isScheduled ? 'Planifie' : isEnded ? 'Replay' : 'Viewer'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
              <h4 className="text-sm font-semibold text-white">Ce qui est branché</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Acces a la salle live quand le lien est publie.</span></li>
                <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Replay quand l enregistrement est pret.</span></li>
                <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 text-teal-400"></i><span>Programme et lecons relies au cours.</span></li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <h4 className="text-sm font-semibold text-white">Ce qui reste a brancher</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Chat temps reel partagé.</span></li>
                <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Presence live et participation synchronisee.</span></li>
                <li className="flex items-start gap-2"><i className="ri-subtract-line mt-0.5 text-amber-300"></i><span>Notes personnelles synchronisees cote serveur.</span></li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-white">Questions sur la lecon</h4>
                <span className="text-xs text-gray-400">{comments.length} message{comments.length > 1 ? 's' : ''}</span>
              </div>
              {user?.id ? (
                <div className="mt-3">
                  <textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    rows={3}
                    placeholder="Poser une question ou laisser un retour au formateur..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-teal-500"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={commentSubmitting || commentInput.trim().length === 0}
                    className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commentSubmitting ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-400">Connectez-vous pour poser une question sur cette lecon.</p>
              )}

              <div className="mt-4 space-y-3">
                {loadingComments ? (
                  <p className="text-sm text-gray-400">Chargement des questions...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun message pour cette lecon pour le moment.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{comment.user_name}</p>
                          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-300">
                            {comment.user_role}
                          </span>
                          {comment.pinned ? (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">Epingle</span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-gray-500">{new Date(comment.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-300">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
