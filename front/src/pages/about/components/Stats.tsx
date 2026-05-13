import { useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

function StatItem({ end, suffix, label, icon, delay }: {
  end: number;
  suffix: string;
  label: string;
  icon: string;
  delay: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const start = performance.now();
          const animate = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            setCount(Math.floor(ease * end));
            if (p < 1) requestAnimationFrame(animate);
          };
          setTimeout(() => requestAnimationFrame(animate), delay);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, delay]);

  return (
    <div ref={ref} className="text-center group">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#5fa6f3]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#5fa6f3] group-hover:scale-110 transition-all duration-300">
        <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center">
          <i className={`${icon} text-xl md:text-2xl text-[#5fa6f3] group-hover:text-white transition-colors`}></i>
        </div>
      </div>
      <div className="text-[#06053a] font-bold text-3xl md:text-4xl lg:text-5xl transition-transform duration-300 group-hover:scale-105">
        {count.toLocaleString('fr-FR')}{suffix}
      </div>
      <div className="text-gray-500 text-xs md:text-sm mt-2 font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="py-16 lg:py-20 px-4 sm:px-6 lg:px-20 bg-[#06053a] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#5fa6f3]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[#5fa6f3]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className={`text-center mb-12 lg:mb-14 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl mb-3">
            C2P en <span className="text-[#5fa6f3]">Chiffres</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto">
            Des résultats concrets qui témoignent de notre impact sur le développement professionnel en Afrique.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <StatItem end={2500} suffix="+" label="Professionnels" icon="ri-user-star-line" delay={0} />
          <StatItem end={150} suffix="+" label="Startups incubées" icon="ri-rocket-line" delay={150} />
          <StatItem end={45} suffix="" label="Pays couverts" icon="ri-global-line" delay={300} />
          <StatItem end={98} suffix="%" label="Satisfaction" icon="ri-emotion-happy-line" delay={450} />
        </div>
      </div>
    </section>
  );
}