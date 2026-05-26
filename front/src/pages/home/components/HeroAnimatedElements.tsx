import { useEffect, useRef, useState } from 'react';

export function FloatingElement({ delay, size, top, left, color }: { delay: number; size: number; top: string; left: string; color: string }) {
  return (
    <div
      className="absolute rounded-full opacity-20 pointer-events-none animate-float-slow"
      style={{ width: size, height: size, top, left, background: color, animationDelay: `${delay}s`, filter: 'blur(1px)' }}
    />
  );
}

export function AnimatedCounter({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      const duration = 2000;
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        setCount(Math.floor((1 - Math.pow(1 - progress, 4)) * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-center group cursor-default">
      <div className="text-white font-bold text-2xl sm:text-3xl lg:text-5xl transition-transform duration-300 group-hover:scale-110">
        {count.toLocaleString('fr-FR')}{suffix}
      </div>
      <div className="text-white/60 text-[10px] sm:text-xs lg:text-sm mt-1 sm:mt-2 font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}
