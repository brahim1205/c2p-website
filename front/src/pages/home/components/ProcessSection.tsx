import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    bg: 'bg-[#f5f1e8]',
    title: 'Inscription',
    desc: "Créez votre compte en quelques minutes et accédez à tous nos services. C'est simple, rapide et gratuit.",
    img: 'https://readdy.ai/api/search-image?query=person%20creating%20online%20profile%20account%20on%20laptop%20with%20registration%20form%20showing%20user%20signup%20process%20in%20clean%20minimal%20interface%20with%20simple%20warm%20background&width=400&height=500&seq=c2p-step1&orientation=portrait',
    number: '01',
    icon: 'ri-user-add-line',
  },
  {
    bg: 'bg-[#f0f7f6]',
    title: 'Recherche',
    desc: "Explorez nos services, formations et opportunités selon vos besoins. Filtrez par catégorie, prix et localisation.",
    img: 'https://readdy.ai/api/search-image?query=person%20searching%20and%20browsing%20services%20on%20computer%20screen%20with%20search%20interface%20showing%20professional%20service%20listings%20and%20filters%20in%20modern%20clean%20design%20with%20warm%20tones&width=400&height=500&seq=c2p-step2&orientation=portrait',
    number: '02',
    icon: 'ri-search-line',
  },
  {
    bg: 'bg-[#f5f1e8]',
    title: 'Collaboration',
    desc: 'Connectez-vous avec des professionnels et développez vos projets. Suivez vos progrès en temps réel.',
    img: 'https://readdy.ai/api/search-image?query=professionals%20collaborating%20and%20working%20together%20on%20project%20with%20handshake%20and%20teamwork%20in%20modern%20office%20environment%20showing%20partnership%20and%20cooperation%20with%20warm%20lighting&width=400&height=500&seq=c2p-step3&orientation=portrait',
    number: '03',
    icon: 'ri-team-line',
  },
  {
    bg: 'bg-[#f0f7f6]',
    title: 'Réussite',
    desc: 'Obtenez vos certifications et développez votre carrière. Rejoignez une communauté de réussite.',
    img: 'https://readdy.ai/api/search-image?query=professional%20receiving%20certificate%20of%20achievement%20and%20diploma%20with%20success%20celebration%20showing%20accomplishment%20and%20certification%20in%20bright%20positive%20atmosphere%20with%20warm%20tones&width=400&height=500&seq=c2p-step4&orientation=portrait',
    number: '04',
    icon: 'ri-award-line',
  },
];

function ProcessCard({ step, index, isVisible }: { step: typeof steps[0]; index: number; isVisible: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: `${index * 200}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connector line for desktop */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-32 left-[calc(100%-16px)] w-[calc(100%-32px)] h-[2px] z-0">
          <div className={`h-full bg-[#14B8A6]/20 rounded-full transition-all duration-1000 delay-[${index * 200 + 500}ms] ${isVisible ? 'w-full' : 'w-0'}`}></div>
        </div>
      )}

      <div className="relative bg-white rounded-[20px] overflow-hidden hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 z-10">
        <div className={`${step.bg} h-[240px] lg:h-[280px] flex items-center justify-center p-6 lg:p-8 relative overflow-hidden`}>
          {/* Large background number */}
          <div className="absolute top-3 right-4 text-7xl lg:text-8xl font-bold text-black/[0.04] font-serif select-none">
            {step.number}
          </div>

          {/* Floating icon */}
          <div
            className={`absolute top-4 left-4 w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${
              isHovered ? 'scale-110 rotate-6' : ''
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <i className={`${step.icon} text-white text-xl`}></i>
            </div>
          </div>

          <img
            src={step.img}
            alt={step.title}
            className="w-full h-full object-cover object-center rounded-xl group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center bg-[#14B8A6] text-white rounded-full text-sm font-bold shadow-md">
              {index + 1}
            </div>
            <div className="text-[#1a2b4a] font-bold text-lg">{step.title}</div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProcessSection() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();
  const [cardsVisible, setCardsVisible] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 px-4 sm:px-6 lg:px-20 bg-[#faf8f3] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-[#14B8A6]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-[300px] h-[300px] bg-[#1a2b4a]/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`mb-10 sm:mb-16 lg:mb-20 transition-all duration-1000 ease-out ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-3 h-3 bg-[#14B8A6] rotate-45"></div>
              <span className="text-[#1a2b4a] text-sm font-medium uppercase tracking-wider">Comment ça marche</span>
            </div>
            <h2 className="text-[#1a2b4a] text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-3 sm:mb-4">
              <span className="font-bold">4 Étapes Pour</span><br />
              <span className="font-serif italic text-[#14B8A6]">Votre Réussite</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-2 sm:px-0">
              Un parcours simple et structuré pour atteindre vos objectifs professionnels et entrepreneuriaux
            </p>
          </div>
        </div>

        {/* Steps grid */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <ProcessCard key={step.title} step={step} index={index} isVisible={cardsVisible} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-700 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-gray-600 text-base mb-6">
            Prêt à commencer votre parcours ?
          </p>
          <a
            href="/auth/register"
            className="group inline-flex items-center gap-3 bg-[#1a2b4a] text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-[#14B8A6] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap shadow-lg"
          >
            <span>Créer mon compte gratuitement</span>
            <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
              <i className="ri-arrow-right-line"></i>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}