import { useEffect, useRef, useState } from 'react';

/** Countdown of a timed quiz; calls `onTimeUp` once when it reaches zero. */
export default function QuizCountdown({ deadline, onTimeUp }: { deadline: string; onTimeUp: () => void }) {
  const end = Date.parse(deadline);
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, end - Date.now());
      setLeft(remaining);
      if (remaining === 0 && !fired.current) {
        fired.current = true;
        onTimeUp();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [end, onTimeUp]);

  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  const urgent = left < 60_000;
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={`sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold ${urgent ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}
    >
      <span><i className="ri-timer-line mr-1.5" aria-hidden="true" />Temps restant</span>
      <span className="font-mono text-base tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
}
