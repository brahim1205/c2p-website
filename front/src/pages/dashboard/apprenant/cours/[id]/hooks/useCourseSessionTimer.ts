import { useEffect, useRef, useState } from 'react';

type SyncLearningActivity = (
  learningTimeSecondsDelta: number,
  onError: (error: unknown) => void,
) => void;

type CourseSessionTimerArgs = {
  enabled: boolean;
  syncLearningActivity: SyncLearningActivity;
};

export function useCourseSessionTimer({
  enabled,
  syncLearningActivity,
}: CourseSessionTimerArgs) {
  const [sessionTimer, setSessionTimer] = useState(0);
  const [showSessionTimer, setShowSessionTimer] = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSessionSecondsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    setSessionTimer(0);
    pendingSessionSecondsRef.current = 0;
    setShowSessionTimer(true);

    sessionTimerRef.current = setInterval(() => {
      setSessionTimer((prev) => {
        const next = prev + 1;
        pendingSessionSecondsRef.current += 1;
        if (pendingSessionSecondsRef.current >= 30) {
          const delta = pendingSessionSecondsRef.current;
          pendingSessionSecondsRef.current = 0;
          syncLearningActivity(delta, (error) => {
            pendingSessionSecondsRef.current += delta;
            console.warn('Unable to sync learning activity', error);
          });
        }
        return next;
      });
    }, 1000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      const delta = pendingSessionSecondsRef.current;
      pendingSessionSecondsRef.current = 0;
      if (delta > 0) {
        syncLearningActivity(delta, (error) => {
          console.warn('Unable to flush learning activity', error);
        });
      }
    };
  }, [enabled, syncLearningActivity]);

  return {
    sessionTimer,
    showSessionTimer,
  };
}
