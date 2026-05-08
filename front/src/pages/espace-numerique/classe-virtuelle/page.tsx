import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { backendClient } from '@/lib/backendClient';


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
  title: string;
  duration: string;
  type: 'video' | 'quiz' | 'exercise' | 'pdf';
  completed: boolean;
  locked: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function ClasseVirtuellePage() {
  const { id } = useParams();
  const [vclass, setVclass] = useState<VirtualClass | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ author: string; avatar: string; text: string; time: string; isInstructor?: boolean }[]>([]);
  const [expandedModule, setExpandedModule] = useState<string>('1');

  const courseModules = useMemo<Module[]>(() => {
    if (!course) {
      return [];
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
  }, [course]);

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
          const { data: cData } = await backendClient
            .from('courses')
            .select('id,title,category,modules,duration,description')
            .eq('id', vData.course_id)
            .maybeSingle();
          setCourse(cData as Course | null);
        }
      } catch (err) { setError('Erreur de chargement'); console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (courseModules.length === 0) return;
    const firstUncompleted = courseModules[0]?.lessons.find(l => !l.completed && !l.locked);
    const fallbackLesson = firstUncompleted || courseModules[0]?.lessons[0] || null;
    setCurrentLesson((prev) => prev ?? fallbackLesson);
  }, [courseModules]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { author: 'Vous', avatar: 'https://readdy.ai/api/search-image?query=professional%20african%20student%20portrait%20casual%20modern%20background%20confident%20smile&width=40&height=40&seq=me-chat&orientation=squarish', text: chatInput.trim(), time: 'À l\'instant' }]);
    setChatInput('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return 'ri-play-circle-line';
      case 'quiz': return 'ri-question-line';
      case 'exercise': return 'ri-code-s-slash-line';
      case 'pdf': return 'ri-file-pdf-line';
      default: return 'ri-file-line';
    }
  };

  const totalLessons = courseModules.reduce((acc, module) => acc + module.lessons.length, 0);
  const completedLessons = courseModules.reduce((acc, module) =>
    acc + module.lessons.filter(l => l.completed).length, 0
  );
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const isLive = vclass?.status === 'live';
  const isEnded = vclass?.status === 'ended';
  const isScheduled = vclass?.status === 'scheduled';

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
                            : lesson.locked
                            ? 'text-gray-500 cursor-not-allowed'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {lesson.completed ? (
                            <i className="ri-checkbox-circle-fill text-base text-green-400"></i>
                          ) : lesson.locked ? (
                            <i className="ri-lock-line text-base"></i>
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
                  <i className="ri-file-text-line mr-2"></i>Mes notes
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap">
                  <i className="ri-download-line mr-2"></i>Ressources
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap">
                  <i className="ri-question-line mr-2"></i>Poser une question
                </button>
                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
                  <i className="ri-check-line mr-2"></i>Marquer comme terminé
                </button>
              </div>
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="max-w-5xl mx-auto">
                <h3 className="text-base font-bold text-white mb-3">Mes notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Prenez des notes pendant la leçon..."
                  className="w-full h-32 px-4 py-3 bg-gray-700 text-white text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  maxLength={500}
                ></textarea>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{notes.length}/500 caractères</span>
                  <button className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 hidden md:flex">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Discussion</h3>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Aucun message encore. Commencez la discussion !</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <img src={msg.avatar} alt={msg.author} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
                  <div className="flex-1">
                    <div className={`rounded-lg p-3 ${msg.isInstructor ? 'bg-teal-600' : 'bg-gray-700'}`}>
                      <div className={`text-sm font-medium mb-1 ${msg.isInstructor ? 'text-white' : 'text-white'}`}>
                        {msg.author}
                        {msg.isInstructor && <span className="ml-2 px-1.5 py-0.5 bg-teal-500 text-[10px] rounded-full">Formateur</span>}
                      </div>
                      <p className={`text-sm ${msg.isInstructor ? 'text-white' : 'text-gray-300'}`}>{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">{msg.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Écrire un message..."
                className="flex-1 px-4 py-2 bg-gray-700 text-white text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleSendChat}
                className="w-10 h-10 flex items-center justify-center bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <i className="ri-send-plane-fill text-base"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
