import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

function FloatingBadge({ icon, text, top, left, delay }: { icon: string; text: string; top: string; left: string; delay: number }) {
  return (
    <div
      className="absolute hidden lg:flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-medium text-[#06053a] animate-float-slow pointer-events-none z-20"
      style={{ top, left, animationDelay: `${delay}s` }}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        <i className={`${icon} text-[#5fa6f3]`}></i>
      </div>
      <span>{text}</span>
    </div>
  );
}

export default function CTASection() {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mouse parallax for background
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[600px] lg:h-[700px] w-full overflow-hidden">
      {/* Background with parallax */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px) scale(1.05)` }}
      >
        <img
          src="/images/home/hero.jpg"
          alt="Rejoignez C2P"
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#06053a]/85 via-[#06053a]/60 to-transparent"></div>

      {/* Animated glow */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#5fa6f3]/15 rounded-full blur-[150px] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute top-0 left-1/3 w-[300px] h-[300px] bg-[#5fa6f3]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '3s' }}></div>

      {/* Floating badges */}
      <FloatingBadge icon="ri-shield-check-line" text="100% Sécurisé" top="15%" left="60%" delay={0} />
      <FloatingBadge icon="ri-time-line" text="2 min d'inscription" top="35%" left="55%" delay={2} />
      <FloatingBadge icon="ri-award-line" text="Certifications reconnues" top="55%" left="65%" delay={4} />

      <div className="absolute inset-0 flex flex-col lg:flex-row items-center justify-center px-6 sm:px-12 lg:px-20">
        <div className={`max-w-3xl text-center lg:text-left transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 mb-6 bg-[#5fa6f3]/20 backdrop-blur-sm px-4 py-2.5 rounded-full">
            <span className="w-2 h-2 bg-[#5fa6f3] rounded-full animate-pulse"></span>
            <span className="text-[#5fa6f3] text-sm font-medium">Rejoignez-nous dès aujourd'hui</span>
          </div>

          <h2 className="text-white font-bold text-3xl sm:text-4xl lg:text-[64px] leading-tight mb-4 sm:mb-6">
            Prêt à Transformer<br />
            <span className="text-[#5fa6f3]">Votre Parcours ?</span>
          </h2>

          <p className="text-white/75 text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-10 max-w-xl">
            Accédez à un écosystème complet de services, formations et opportunités professionnelles. Plus de 2,500 membres nous font déjà confiance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              to="/auth/register"
              className="group inline-flex items-center justify-center gap-3 bg-[#5fa6f3] text-white px-8 py-4 rounded-full font-semibold text-base hover:bg-[#27346b] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap shadow-lg shadow-[#5fa6f3]/30 hover:shadow-[#5fa6f3]/50"
            >
              <span>Créer Mon Compte</span>
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-arrow-right-line"></i>
              </div>
            </Link>
            <Link
              to="/espace-numerique"
              className="group inline-flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-base hover:bg-white/20 hover:border-white/50 hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
            >
              <span>Explorer les formations</span>
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                <i className="ri-compass-3-line"></i>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-10 text-white/50 text-sm">
            <div className="flex items-center gap-2 hover:text-white/80 transition-colors">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-shield-check-line"></i>
              </div>
              <span>100% sécurisé</span>
            </div>
            <div className="flex items-center gap-2 hover:text-white/80 transition-colors">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-time-line"></i>
              </div>
              <span>Inscription en 2 min</span>
            </div>
            <div className="flex items-center gap-2 hover:text-white/80 transition-colors">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-award-line"></i>
              </div>
              <span>Certifications reconnues</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
