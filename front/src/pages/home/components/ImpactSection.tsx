import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

function AnimatedNumber({ end, suffix, label, sublabel }: { end: number; suffix: string; label: string; sublabel: string }) {
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
          const duration = 2500;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 5);
            setCount(Math.floor(ease * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-center group cursor-default">
      <div className="text-white font-bold text-3xl sm:text-5xl lg:text-7xl transition-transform duration-300 group-hover:scale-110">
        {count.toLocaleString('fr-FR')}{suffix}
      </div>
      <div className="text-white/90 text-xs sm:text-sm lg:text-base mt-1 sm:mt-2 font-medium">{label}</div>
      <div className="text-white/50 text-[10px] sm:text-xs mt-1">{sublabel}</div>
    </div>
  );
}

export default function ImpactSection() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} className="py-20 lg:py-32 px-4 sm:px-6 lg:px-20 bg-gradient-to-b from-[#0f3d3e] to-[#0a2a2b] relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#5fa6f3]/8 rounded-full blur-[150px] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#5fa6f3]/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className={`mb-12 lg:mb-20 transition-all duration-1000 ease-out ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block bg-[#5fa6f3]/20 px-6 py-2.5 rounded-full mb-6">
            <span className="text-[#5fa6f3] text-sm font-medium">/ Impact</span>
          </div>
          <h2 className="text-white font-bold text-2xl sm:text-3xl lg:text-[56px] leading-tight max-w-3xl mb-6">
            C2P en Chiffres : Notre Impact Sur l&apos;Écosystème Professionnel
          </h2>
          <p className="text-white/70 text-base lg:text-[17px] leading-relaxed max-w-3xl">
            Depuis notre création, nous avons accompagné des milliers de professionnels dans leur développement de carrière, la création d&apos;entreprises et l&apos;acquisition de nouvelles compétences.
          </p>
        </div>

        {/* Main impact display */}
        <div className={`flex flex-col lg:flex-row gap-12 lg:gap-16 items-center mb-20 transition-all duration-1000 delay-300 ease-out ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="w-full lg:w-[40%] relative group">
            <div className="absolute -inset-4 bg-[#5fa6f3]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img
              src="/images/brand/images12.jpeg"
              alt="Espace C2P"
              className="w-full aspect-square object-cover rounded-2xl relative z-10 group-hover:scale-[1.02] transition-transform duration-500"
            />
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-[#5fa6f3] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg animate-float z-20">
              +150 startups incubées
            </div>
          </div>

          <div className="flex-1">
            <AnimatedNumber end={2500} suffix="+" label="Professionnels Formés et Accompagnés" sublabel="Depuis notre création en 2020" />
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/auth/register"
                className="inline-flex items-center gap-2 bg-white text-[#0a2a2b] px-8 py-4 rounded-full text-base font-semibold hover:bg-[#5fa6f3] hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap shadow-lg"
              >
                <span>Rejoindre C2P</span>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-arrow-right-line"></i>
                </div>
              </Link>
              <Link
                to="/allopresta"
                className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap border border-white/20"
              >
                <span>Découvrir les services</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 transition-all duration-1000 delay-500 ease-out ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <AnimatedNumber end={500} suffix="+" label="Certifications délivrées" sublabel="Année 2024" />
          <AnimatedNumber end={98} suffix="%" label="Taux de réussite" sublabel="Aux examens finaux" />
          <AnimatedNumber end={45} suffix="" label="Pays représentés" sublabel="Communauté internationale" />
          <AnimatedNumber end={12} suffix="M" label="De CA généré" sublabel="Par nos entrepreneurs" />
        </div>
      </div>
    </section>
  );
}
