import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useState } from 'react';

export default function AboutHero() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { ref: contentRef, isVisible } = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative h-[500px] md:h-[600px] w-full overflow-hidden bg-[#06053a]">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="/images/home/hero.jpg"
          alt="C2P - Notre vision"
          className="w-full h-full object-cover object-center opacity-40"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#06053a]/60 via-[#06053a]/70 to-[#06053a]"></div>

      {/* Decorative glow */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#5fa6f3]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-[#5fa6f3]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div
        ref={contentRef}
        className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center"
      >
        <div
          className={`transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 mb-6 bg-[#5fa6f3]/20 backdrop-blur-sm border border-[#5fa6f3]/30 text-[#5fa6f3] px-4 py-2.5 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-[#5fa6f3] rounded-full animate-pulse"></span>
            <span>Notre histoire, notre vision</span>
          </div>

          <h1 className="text-white font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 max-w-4xl mx-auto">
            Bâtir l'Afrique de<br />
            <span className="text-[#5fa6f3]">Demain, Aujourd'hui</span>
          </h1>

          <p
            className={`text-white/70 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Depuis 2019, C2P accompagne des milliers de professionnels africains dans leur développement 
            à travers la formation, les services et l'incubation de projets.
          </p>
        </div>
      </div>
    </section>
  );
}
