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
    <section className="relative h-[500px] md:h-[600px] w-full overflow-hidden bg-[#1a2b4a]">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=panoramic%20view%20of%20modern%20african%20business%20district%20skyline%20at%20golden%20hour%20with%20contemporary%20glass%20buildings%20and%20warm%20sunlight%20showing%20economic%20growth%20and%20innovation%20in%20dakar%20senegal%20with%20teal%20sky%20reflections%20professional%20corporate%20atmosphere&width=1920&height=700&seq=c2p-about-hero&orientation=landscape"
          alt="C2P - Notre vision"
          className="w-full h-full object-cover object-center opacity-40"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a2b4a]/60 via-[#1a2b4a]/70 to-[#1a2b4a]"></div>

      {/* Decorative glow */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#14B8A6]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-[#14B8A6]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div
        ref={contentRef}
        className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center"
      >
        <div
          className={`transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 mb-6 bg-[#14B8A6]/20 backdrop-blur-sm border border-[#14B8A6]/30 text-[#14B8A6] px-4 py-2.5 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse"></span>
            <span>Notre histoire, notre vision</span>
          </div>

          <h1 className="text-white font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 max-w-4xl mx-auto">
            Bâtir l'Afrique de<br />
            <span className="text-[#14B8A6]">Demain, Aujourd'hui</span>
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