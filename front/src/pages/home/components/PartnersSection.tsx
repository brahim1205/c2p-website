import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

const partners = [
  { name: 'Orange', icon: 'ri-smartphone-line' },
  { name: 'Wave', icon: 'ri-bank-card-line' },
  { name: 'Free', icon: 'ri-wifi-line' },
  { name: 'Expresso', icon: 'ri-global-line' },
  { name: 'EcoBank', icon: 'ri-bank-line' },
  { name: 'Orabank', icon: 'ri-building-line' },
  { name: 'SENELEC', icon: 'ri-flashlight-line' },
  { name: 'TotalEnergies', icon: 'ri-oil-line' },
  { name: 'DHL', icon: 'ri-truck-line' },
  { name: 'SIMPLON', icon: 'ri-code-box-line' },
  { name: 'ONFP', icon: 'ri-government-line' },
  { name: '3FPT', icon: 'ri-graduation-cap-line' },
];

export default function PartnersSection() {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || hovered) return;
    let raf: number;
    const speed = 0.5;
    const step = () => {
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += speed;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  const duplicated = [...partners, ...partners];

  return (
    <section ref={sectionRef} className="py-20 lg:py-28 bg-[#ffffff] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 mb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Nos partenaires</span>
          </div>
          <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-4">
            Ils nous font <span className="text-[#5fa6f3]">confiance</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Des entreprises et institutions de premier plan qui accompagnent notre mission au quotidien.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex gap-8 overflow-x-hidden"
        style={{ scrollBehavior: 'auto' }}
      >
        {duplicated.map((partner, i) => (
          <div
            key={`${partner.name}-${i}`}
            className={`flex-shrink-0 w-[180px] h-[100px] bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-[#5fa6f3]/30 hover:shadow-md transition-all duration-300 cursor-default ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ transitionDelay: `${(i % 6) * 50}ms` }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#5fa6f3]/10 flex items-center justify-center">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`${partner.icon} text-[#5fa6f3] text-xl`}></i>
              </div>
            </div>
            <span className="text-[#06053a] font-semibold text-sm">{partner.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}