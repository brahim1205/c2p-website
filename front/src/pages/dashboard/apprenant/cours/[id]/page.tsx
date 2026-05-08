import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { courseData } from './courseData';
import {
  loadCompletedLessons,
  loadBookmarks,
  loadNotes,
  loadLastViewedLesson,
  saveCompletedLessons,
  saveBookmarks,
  saveNotes,
  saveLastViewedLesson,
  loadUnlockedBadges,
  BADGES,
  resetCourseProgress,
  updateCourseHistory,
  addXP,
  XP_REWARDS,
  updateLeaderboardUser,
  checkAndAwardBadges,
  addCertificate,
  generateCertificateId,
  hasCertificate,
  loadCertificates,
  type CertificateEntry,
  addSessionTime,
  loadSessionTime,
  loadCourseHistory,
} from './storage';
import CertificateViewer, { type CertificateData } from '@/pages/dashboard/profile/components/CertificateViewer';
import { Lesson } from './types';
import CourseHeader from './components/CourseHeader';
import LessonsTab from './components/LessonsTab';
import QuizTab from './components/QuizTab';
import ResourcesTab from './components/ResourcesTab';
import DiscussionsTab from './components/DiscussionsTab';
import NotesModal from './components/NotesModal';
import CourseSidebar from './components/CourseSidebar';
import VideoPlayer from './components/VideoPlayer';

export default function ApprenantCoursDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<'lessons' | 'quiz' | 'resources' | 'discussions'>('lessons');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesTargetLesson, setNotesTargetLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [xpGained, setXpGained] = useState(0);
  const [showXpToast, setShowXpToast] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSessionTimer, setShowSessionTimer] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);

  const course = id ? courseData[id] : null;
  const courseId = course?.id ?? null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (course) {
        const defaultCompleted = new Set<number>();
        course.modules.forEach((m) => {
          m.lessons.forEach((l) => {
            if (l.completed) defaultCompleted.add(l.id);
          });
        });
        const savedCompleted = loadCompletedLessons(course.id);
        if (savedCompleted.size > 0) {
          setCompletedLessons(new Set(savedCompleted));
        } else {
          setCompletedLessons(defaultCompleted);
          saveCompletedLessons(course.id, defaultCompleted);
        }

        setBookmarkedLessons(loadBookmarks(course.id));
        setNotes(loadNotes(course.id));

        const lastViewed = loadLastViewedLesson(course.id);
        if (lastViewed) {
          for (const mod of course.modules) {
            const lesson = mod.lessons.find((l) => l.id === lastViewed);
            if (lesson) {
              setActiveLesson(lesson);
              break;
            }
          }
        }

        const totalCompleted = savedCompleted.size > 0 ? savedCompleted.size : defaultCompleted.size;
        updateCourseHistory({
          courseId: course.id,
          title: course.title,
          category: course.category,
          thumbnail: course.thumbnail,
          instructor: course.instructor,
          totalLessons: course.totalLessons,
          completedLessons: totalCompleted,
          progress: Math.round((totalCompleted / course.totalLessons) * 100),
          lastAccessed: new Date().toISOString(),
        });

        // Seed leaderboard with current user if not present
        updateLeaderboardUser({
          id: 'current-user',
          name: 'Vous',
          avatar: '',
          xp: addXP(0),
          streak: 0,
          coursesCompleted: 0,
          lessonsCompleted: totalCompleted,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [course]);

  // Session timer effect
  useEffect(() => {
    if (!courseId) return;
    // Load previous session time
    const prevTime = loadSessionTime(courseId);
    setSessionTimer(prevTime);
    setShowSessionTimer(true);

    sessionTimerRef.current = setInterval(() => {
      setSessionTimer((prev) => {
        const next = prev + 1;
        addSessionTime(courseId, 1);
        return next;
      });
    }, 1000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [courseId]);

  // Detect 100% completion and auto-generate certificate
  useEffect(() => {
    if (!course) return;
    const progress = Math.round((completedLessons.size / course.totalLessons) * 100);
    if (progress === 100 && !courseCompleted && !hasCertificate(course.id)) {
      setCourseCompleted(true);
      // Auto-generate certificate
      const certId = generateCertificateId(course.id);
      const certEntry: CertificateEntry = {
        id: certId,
        courseId: course.id,
        courseTitle: course.title,
        instructor: course.instructor,
        category: course.category,
        issueDate: new Date().toISOString().split('T')[0],
        grade: Math.round(14 + Math.random() * 6),
        skills: course.modules.map(m => m.title).slice(0, 4),
        status: 'active',
        autoGenerated: true,
      };
      addCertificate(certEntry);
      // Award course completion XP
      const newTotal = addXP(XP_REWARDS.courseComplete);
      setXpGained(XP_REWARDS.courseComplete);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      // Update leaderboard
      updateLeaderboardUser({
        id: 'current-user',
        name: 'Vous',
        avatar: '',
        xp: newTotal,
        streak: 0,
        coursesCompleted: loadCourseHistory().filter(h => h.progress === 100).length + 1,
        lessonsCompleted: completedLessons.size,
      });
      // Check completion badges
      const newBadges = checkAndAwardBadges(
        course.id,
        completedLessons,
        bookmarkedLessons,
        notes,
        undefined,
        course.totalLessons,
      );
      if (newBadges.length > 0) {
        setNewBadges(newBadges);
        setShowBadgeModal(true);
      }
      // Show certificate modal after a short delay
      setTimeout(() => {
        setCertificateData({
          studentName: 'Amadou Diop',
          courseTitle: course.title,
          instructor: course.instructor,
          date: certEntry.issueDate,
          certificateId: certId,
        });
        setShowCertificateModal(true);
      }, 1500);
      // Show persistent toast notification for certificate
      setTimeout(() => {
        success('Certificat généré !', 'Votre certificat de fin de cours a été créé automatiquement. Consultez-le dans votre profil.');
      }, 500);
      // Update course history with certificate
      updateCourseHistory({
        courseId: course.id,
        title: course.title,
        category: course.category,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        totalLessons: course.totalLessons,
        completedLessons: course.totalLessons,
        progress: 100,
        lastAccessed: new Date().toISOString(),
        certificateId: certId,
        certificateDate: certEntry.issueDate,
      });
    }
  }, [bookmarkedLessons, completedLessons, course, courseCompleted, notes, success]);

  // Format session timer
  const formatSessionTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!course) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-book-open-line text-2xl text-gray-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Formation non trouvée</h2>
            <Link to="/dashboard/apprenant/mes-cours" className="text-teal-600 hover:text-teal-700 font-medium">
              Retour à mes formations
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleOpenNotes = (lesson: Lesson) => {
    setNotesTargetLesson(lesson);
    setNotesModalOpen(true);
  };

  const handleSaveNote = (lessonId: number, note: string) => {
    setNotes((prev) => {
      const next = { ...prev, [lessonId]: note };
      if (!note.trim()) {
        delete next[lessonId];
      }
      saveNotes(course.id, next);
      return next;
    });
    success('Note enregistrée', 'Votre annotation a été sauvegardée.');
  };

  const handleCompleteLesson = (lessonId: number) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
        info('Leçon marquée non complétée', '');
      } else {
        next.add(lessonId);
        // Award XP
        const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
        let xp = XP_REWARDS.lessonComplete;
        if (lesson?.type === 'reading') xp = XP_REWARDS.readingComplete;
        if (lesson?.type === 'exercise') xp = XP_REWARDS.exerciseComplete;
        if (lesson?.type === 'quiz') xp = XP_REWARDS.quizComplete;
        const newTotal = addXP(xp);
        setXpGained(xp);
        setShowXpToast(true);
        setTimeout(() => setShowXpToast(false), 2500);

        // Update leaderboard
        updateLeaderboardUser({
          id: 'current-user',
          name: 'Vous',
          avatar: '',
          xp: newTotal,
          streak: 0,
          coursesCompleted: 0,
          lessonsCompleted: next.size,
        });

        // Check badges
        const newBadges = checkAndAwardBadges(
          course.id,
          next,
          bookmarkedLessons,
          notes,
          undefined,
          course.totalLessons,
        );
        if (newBadges.length > 0) {
          setNewBadges(newBadges);
          setShowBadgeModal(true);
        }

        success(`+${xp} XP — Leçon complétée`, 'Votre progression a été enregistrée.');
      }
      saveCompletedLessons(course.id, next);

      // Update history
      updateCourseHistory({
        courseId: course.id,
        title: course.title,
        category: course.category,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        totalLessons: course.totalLessons,
        completedLessons: next.size,
        progress: Math.round((next.size / course.totalLessons) * 100),
        lastAccessed: new Date().toISOString(),
      });

      return next;
    });
  };

  const toggleBookmark = (lessonId: number) => {
    setBookmarkedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
        info('Favori retiré', '');
      } else {
        next.add(lessonId);
        success('Ajouté aux favoris', 'Cette leçon est maintenant dans vos marque-pages.');
      }
      saveBookmarks(course.id, next);
      return next;
    });
  };

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    saveLastViewedLesson(course.id, lesson.id);
    setActiveTab('lessons');
    updateCourseHistory({
      courseId: course.id,
      title: course.title,
      category: course.category,
      thumbnail: course.thumbnail,
      instructor: course.instructor,
      totalLessons: course.totalLessons,
      completedLessons: completedLessons.size,
      progress: Math.round((completedLessons.size / course.totalLessons) * 100),
      lastAccessed: new Date().toISOString(),
    });
  };

  const handleResetProgress = () => {
    if (!course) return;
    resetCourseProgress(course.id);
    setCompletedLessons(new Set());
    setBookmarkedLessons(new Set());
    setNotes({});
    setActiveLesson(null);
    setShowResetConfirm(false);
    info('Progression réinitialisée', 'Toutes vos données de progression pour ce cours ont été remises à zéro.');
  };

  const handleBadgesUnlocked = (badgeIds: string[]) => {
    setNewBadges(badgeIds);
    setShowBadgeModal(true);
  };

  const handleQuizComplete = (score: number, total: number) => {
    const xp = score === total ? XP_REWARDS.quizPerfect : XP_REWARDS.quizComplete;
    const newTotal = addXP(xp);
    setXpGained(xp);
    setShowXpToast(true);
    setTimeout(() => setShowXpToast(false), 2500);

    updateLeaderboardUser({
      id: 'current-user',
      name: 'Vous',
      avatar: '',
      xp: newTotal,
      streak: 0,
      coursesCompleted: 0,
      lessonsCompleted: completedLessons.size,
    });

    const newBadges = checkAndAwardBadges(
      course.id,
      completedLessons,
      bookmarkedLessons,
      notes,
      { score, total },
      course.totalLessons,
    );
    if (newBadges.length > 0) {
      setNewBadges(newBadges);
      setShowBadgeModal(true);
    }
  };

  const tabs = [
    { key: 'lessons' as const, label: 'Leçon', icon: 'ri-book-open-line' },
    { key: 'quiz' as const, label: 'Quiz', icon: 'ri-question-line' },
    { key: 'resources' as const, label: 'Ressources', icon: 'ri-download-line' },
    { key: 'discussions' as const, label: 'Discussions', icon: 'ri-chat-3-line' },
  ];

  const currentProgress = Math.round((completedLessons.size / course.totalLessons) * 100);

  return (
    <DashboardLayout>
      <div className="max-w-[1440px] mx-auto">
        <div className="px-4 lg:px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Apprenant', path: '/dashboard/apprenant' },
              { label: 'Mes formations', path: '/dashboard/apprenant/mes-cours' },
              { label: course.title },
            ]}
          />
        </div>

        {/* XP Toast */}
        {showXpToast && (
          <div className="fixed top-4 right-4 z-50 animate-bounce">
            <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <i className="ri-fire-line text-lg"></i>
              <span className="text-sm font-bold">+{xpGained} XP</span>
            </div>
          </div>
        )}

        {/* Session Timer Banner */}
        {showSessionTimer && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs">
              <i className="ri-timer-line text-teal-400"></i>
              <span className="font-mono">{formatSessionTime(sessionTimer)}</span>
              <span className="text-white/60">de session</span>
            </div>
          </div>
        )}

        {/* Course Completed Banner */}
        {currentProgress === 100 && !showCertificateModal && (
          <div className="mx-4 lg:mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-award-line text-amber-600 text-lg"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Cours terminé !</p>
                <p className="text-xs text-gray-500">Votre certificat a été généré automatiquement</p>
              </div>
            </div>
            <button
              onClick={() => {
                const cert = loadCertificates().find(c => c.courseId === course.id);
                if (cert) {
                  setCertificateData({
                    studentName: 'Amadou Diop',
                    courseTitle: course.title,
                    instructor: course.instructor,
                    date: cert.issueDate,
                    certificateId: cert.id,
                  });
                  setShowCertificateModal(true);
                }
              }}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-award-line mr-1"></i>
              Voir mon certificat
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 px-4 lg:px-6 pb-8">
          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Course header compact */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{course.title}</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <i className="ri-user-line"></i>
                  {course.instructor}
                </span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                  {course.category}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-bar-chart-line"></i>
                  {currentProgress}% complété
                </span>
              </div>
            </div>

            {/* Video player always visible when a video lesson is active */}
            {activeLesson?.type === 'video' && activeTab === 'lessons' && (
              <div className="mb-4">
                <VideoPlayer
                  duration={activeLesson.duration}
                  title={activeLesson.title}
                  isCompleted={completedLessons.has(activeLesson.id)}
                  onComplete={() => handleCompleteLesson(activeLesson.id)}
                  chapters={activeLesson.chapters}
                  thumbnail={activeLesson.thumbnail}
                />
              </div>
            )}

            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-3">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <i className="ri-list-check text-sm"></i>
                Afficher le contenu du cours
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 mb-4">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === tab.key
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className={`${tab.icon} text-sm`}></i>
                    </div>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeTab === 'lessons' && (
                  <LessonsTab
                    course={course}
                    completedLessons={completedLessons}
                    bookmarkedLessons={bookmarkedLessons}
                    activeLesson={activeLesson}
                    notes={notes}
                    onOpenNotes={handleOpenNotes}
                    onToggleComplete={handleCompleteLesson}
                    onToggleBookmark={toggleBookmark}
                  />
                )}
                {activeTab === 'quiz' && (
                  <QuizTab
                    course={course}
                    completedLessons={completedLessons}
                    bookmarkedLessons={bookmarkedLessons}
                    notes={notes}
                    onBadgesUnlocked={handleBadgesUnlocked}
                    onQuizComplete={handleQuizComplete}
                  />
                )}
                {activeTab === 'resources' && <ResourcesTab course={course} />}
                {activeTab === 'discussions' && <DiscussionsTab course={course} />}
              </div>
            </div>

            {/* Navigation prev/next */}
            {activeLesson && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const all = course.modules.flatMap((m) => m.lessons);
                    const idx = all.findIndex((l) => l.id === activeLesson.id);
                    if (idx > 0) selectLesson(all[idx - 1]);
                  }}
                  disabled={
                    course.modules.flatMap((m) => m.lessons).findIndex((l) => l.id === activeLesson.id) === 0
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ri-arrow-left-line"></i>
                  Précédent
                </button>
                <button
                  onClick={() => {
                    const all = course.modules.flatMap((m) => m.lessons);
                    const idx = all.findIndex((l) => l.id === activeLesson.id);
                    if (idx < all.length - 1) selectLesson(all[idx + 1]);
                  }}
                  disabled={
                    course.modules.flatMap((m) => m.lessons).findIndex((l) => l.id === activeLesson.id) ===
                    course.modules.flatMap((m) => m.lessons).length - 1
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Suivant
                  <i className="ri-arrow-right-line"></i>
                </button>
              </div>
            )}

            {/* Reset */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">Progression sauvegardée localement</p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1"></i>
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Sidebar desktop */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <div className="sticky top-4">
              <CourseSidebar
                course={course}
                completedLessons={completedLessons}
                bookmarkedLessons={bookmarkedLessons}
                activeLesson={activeLesson}
                notes={notes}
                onSelectLesson={selectLesson}
                onToggleComplete={handleCompleteLesson}
                onToggleBookmark={toggleBookmark}
                onOpenNotes={handleOpenNotes}
              />
            </div>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowMobileSidebar(false)}
            ></div>
            <div className="relative ml-auto w-full max-w-sm h-full">
              <CourseSidebar
                showMobile={true}
                onCloseMobile={() => setShowMobileSidebar(false)}
                course={course}
                completedLessons={completedLessons}
                bookmarkedLessons={bookmarkedLessons}
                activeLesson={activeLesson}
                notes={notes}
                onSelectLesson={(lesson) => {
                  selectLesson(lesson);
                  setShowMobileSidebar(false);
                }}
                onToggleComplete={handleCompleteLesson}
                onToggleBookmark={toggleBookmark}
                onOpenNotes={(lesson) => {
                  handleOpenNotes(lesson);
                  setShowMobileSidebar(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Notes Modal */}
        <NotesModal
          isOpen={notesModalOpen}
          lesson={notesTargetLesson}
          initialNote={notesTargetLesson ? notes[notesTargetLesson.id] ?? '' : ''}
          onClose={() => {
            setNotesModalOpen(false);
            setNotesTargetLesson(null);
          }}
          onSave={handleSaveNote}
        />

        {/* Reset Progress Confirmation */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-delete-bin-line text-red-600 text-lg"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Réinitialiser la progression</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">Cette action supprimera définitivement :</p>
              <ul className="text-sm text-gray-500 mb-6 space-y-1 ml-4 list-disc">
                <li>Vos leçons complétées</li>
                <li>Vos favoris</li>
                <li>Vos notes personnelles</li>
                <li>Votre historique de quiz</li>
                <li>Votre dernière leçon vue</li>
              </ul>
              <p className="text-sm text-red-600 font-medium mb-6">Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleResetProgress}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Badge Unlock Modal */}
        {showBadgeModal && newBadges.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <i className="ri-trophy-line text-amber-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {newBadges.length === 1
                  ? 'Nouveau badge débloqué !'
                  : `${newBadges.length} nouveaux badges débloqués !`}
              </h3>
              <p className="text-sm text-gray-500 mb-6">Félicitations pour vos accomplissements.</p>
              <div className="space-y-3 mb-6">
                {newBadges.map((badgeId) => {
                  const badge = BADGES.find((b) => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <div
                      key={badgeId}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-${badge.color}-50 border border-${badge.color}-200`}
                    >
                      <div
                        className={`w-10 h-10 bg-${badge.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}
                      >
                        <i className={`${badge.icon} text-${badge.color}-600 text-lg`}></i>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
                        <p className="text-xs text-gray-500">{badge.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Super !
              </button>
            </div>
          </div>
        )}

        {/* Certificate Modal */}
        {showCertificateModal && certificateData && (
          <CertificateViewer
            data={certificateData}
            onClose={() => setShowCertificateModal(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
