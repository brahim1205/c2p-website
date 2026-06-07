import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

function AnimatedStat({ value, label, icon, delay }: { value: string; label: string; icon: string; delay: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl p-5 flex items-center gap-4 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="w-12 h-12 bg-[#5fa6f3]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#5fa6f3]/20 transition-colors">
        <div className="w-6 h-6 flex items-center justify-center">
          <i className={`${icon} text-[#5fa6f3] text-lg`}></i>
        </div>
      </div>
      <div>
        <p className="font-bold text-gray-900 text-lg">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function ServicesSection() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="services" ref={sectionRef} className="py-24 lg:py-32 px-4 sm:px-6 lg:px-20 bg-[#f5f1e8] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#5fa6f3]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-[#06053a]/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-10 sm:mb-16 lg:mb-20 transition-all duration-1000 ease-out ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-5 animate-fade-in-down" style={{ animationDelay: '0ms' }}>
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Nos Services</span>
          </div>
          <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-3 sm:mb-4">
            Trois Piliers Pour Votre Réussite
          </h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-2 sm:px-0">
            Un écosystème complet pour transformer votre parcours professionnel et entrepreneurial
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* AlloPresta Card */}
          <Link
            to="/allopresta"
            className={`group relative bg-[#06053a] rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[340px] sm:min-h-[440px] lg:min-h-[480px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-3 hover:shadow-2xl cursor-pointer ${sectionVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-10'}`}
            style={{ animationDelay: '100ms' }}
          >
            {/* Card background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5fa6f3]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:scale-150 group-hover:opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10 mb-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#5fa6f3]/30 transition-all duration-500 group-hover:rotate-3 group-hover:scale-110">
                <div className="w-8 h-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <i className="ri-service-line text-white text-2xl"></i>
                </div>
              </div>
              <h3 className="text-white font-bold text-2xl lg:text-3xl mb-3 group-hover:text-[#5fa6f3] transition-colors duration-300">AlloPresta</h3>
              <p className="text-gray-300 text-sm lg:text-[15px] leading-relaxed">
                Marketplace de prestations de services connectant professionnels qualifiés et clients. Trouvez le prestataire idéal pour vos besoins.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[#5fa6f3] text-sm font-medium group-hover:gap-4 transition-all duration-300">
              <span>Découvrir</span>
              <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-2">
                <i className="ri-arrow-right-line"></i>
              </div>
            </div>
          </Link>

          {/* Espace Numérique Card */}
          <Link
            to="/espace-numerique"
            className={`group relative bg-white rounded-[24px] overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-[#5fa6f3] hover:-translate-y-3 cursor-pointer ${sectionVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-10'}`}
            style={{ animationDelay: '250ms' }}
          >
            <div className="relative overflow-hidden min-h-[440px] lg:min-h-[480px]">
              <img
                src="/images/brand/image3.jpeg"
                alt="Formation professionnelle"
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent"></div>
              <div className="absolute top-6 left-6 lg:top-8 lg:left-8">
                <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 group-hover:bg-[#5fa6f3]/40 transition-all duration-500">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-graduation-cap-line text-white text-lg"></i>
                  </div>
                  <span className="text-white text-sm font-medium">Formation</span>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 lg:bottom-8 lg:left-8 lg:right-8">
                <h3 className="text-white font-bold text-2xl lg:text-3xl mb-2 group-hover:text-[#5fa6f3] transition-colors duration-300">Développez Vos Compétences</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-4">
                  Des formations certifiantes dispensées par des experts du domaine pour booster votre employabilité.
                </p>
                <div className="flex items-center gap-2 text-[#5fa6f3] text-sm font-medium group-hover:gap-4 transition-all duration-300">
                  <span>Explorer les formations</span>
                  <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-2">
                    <i className="ri-arrow-right-line"></i>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* ProjectCenter Card */}
          <Link
            to="/project-center"
            className={`group relative bg-white rounded-[24px] overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-[#06053a] hover:-translate-y-3 cursor-pointer ${sectionVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0 translate-y-10'}`}
            style={{ animationDelay: '400ms' }}
          >
            <div className="relative overflow-hidden min-h-[440px] lg:min-h-[480px]">
              <img
                src="/images/brand/image8.jpeg"
                alt="Incubation de projets"
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent"></div>
              <div className="absolute top-6 left-6 lg:top-8 lg:left-8">
                <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 group-hover:bg-[#06053a]/40 transition-all duration-500">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-rocket-line text-white text-lg"></i>
                  </div>
                  <span className="text-white text-sm font-medium">Incubation</span>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 lg:bottom-8 lg:left-8 lg:right-8">
                <h3 className="text-white font-bold text-2xl lg:text-3xl mb-2 group-hover:text-[#5fa6f3] transition-colors duration-300">ProjectCenter</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-4">
                  Centre d'incubation et de développement de projets entrepreneuriaux avec accompagnement personnalisé.
                </p>
                <div className="flex items-center gap-2 text-[#5fa6f3] text-sm font-medium group-hover:gap-4 transition-all duration-300">
                  <span>Proposer un projet</span>
                  <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-2">
                    <i className="ri-arrow-right-line"></i>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStat value="1,200+" label="Professionnels qualifiés" icon="ri-group-line" delay={0} />
          <AnimatedStat value="50+" label="Formations disponibles" icon="ri-graduation-cap-line" delay={100} />
          <AnimatedStat value="150+" label="Projets incubés" icon="ri-rocket-line" delay={200} />
          <AnimatedStat value="95%" label="Taux de satisfaction" icon="ri-star-line" delay={300} />
        </div>
      </div>
    </section>
  );
}
