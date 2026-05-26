import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchApprenantEnrollments, type ApprenantEnrollment } from '@/lib/apprenantDashboardApi';
import { queryKeys } from '@/lib/queryKeys';

interface ResumeCourseEntry {
  courseId: number;
  title: string;
  progress: number;
}

export default function ResumeCourseBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissedCourseId, setDismissedCourseId] = useState<number | null>(null);

  const { data: enrollments = [] } = useQuery({
    queryKey: queryKeys.apprenant.enrollments(user?.id),
    queryFn: () => fetchApprenantEnrollments(user?.id ?? ''),
    enabled: Boolean(user?.id),
    refetchInterval: 30_000,
  });

  const entry = useMemo<ResumeCourseEntry | null>(() => {
    const candidates = enrollments
      .map((enrollment: ApprenantEnrollment) => ({
        enrollment,
        progress: Math.max(0, Math.min(100, Math.round(Number(enrollment.progress || 0)))),
      }))
      .filter(({ progress, enrollment }) => progress > 0 && progress < 100 && enrollment.courses?.id)
      .sort((a, b) => new Date(b.enrollment.last_active).getTime() - new Date(a.enrollment.last_active).getTime());
    const top = candidates[0] ?? null;
    const courseId = top?.enrollment.courses?.id;
    if (!top || !courseId || dismissedCourseId === courseId) return null;
    return {
      courseId,
      title: top.enrollment.courses?.title || top.enrollment.course_name || 'Formation',
      progress: top.progress,
    };
  }, [dismissedCourseId, enrollments]);

  useEffect(() => {
    setVisible(Boolean(entry));
  }, [entry]);

  useEffect(() => {
    setDismissedCourseId(null);
  }, [user?.id]);

  const handleDismiss = () => {
    if (entry) setDismissedCourseId(entry.courseId);
    setVisible(false);
  };

  if (!visible || !entry) return null;

  return (
    <div className="bg-teal-600 text-white rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm animate-[slideDown_0.4s_ease-out]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="ri-play-circle-line text-lg text-white"></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            Continuer où vous vous êtes arrêté
          </p>
          <p className="text-xs text-teal-100 truncate">
            {entry.title} — {entry.progress}% complété
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/dashboard/apprenant/cours/${entry.courseId}`}
          className="px-4 py-2 bg-white text-teal-700 rounded-lg text-sm font-semibold hover:bg-teal-50 transition-colors whitespace-nowrap"
        >
          Reprendre
        </Link>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          aria-label="Masquer"
        >
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}
