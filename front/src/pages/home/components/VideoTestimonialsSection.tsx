import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const testimonials = [
  {
    id: 1,
    name: 'Aminata Diallo',
    role: 'Apprenante – Formation Développement Web',
    text: 'Grâce à C2P, j\'ai obtenu ma certification et trouvé un emploi en freelance en moins de 3 mois. La qualité des formateurs est exceptionnelle.',
    avatar: '/images/brand/image6.jpeg',
    stars: 5,
  },
  {
    id: 2,
    name: 'Moussa Sène',
    role: 'Porteur de projet – AgriTech Dakar',
    text: 'L\'incubation au ProjectCenter m\'a permis de structurer mon projet et de lever 15 millions de FCFA. Le mentorat est vraiment personnalisé.',
    avatar: '/images/brand/image7.jpeg',
    stars: 5,
  },
  {
    id: 3,
    name: 'Fatou Ndiaye',
    role: 'Prestataire – AlloPresta Design',
    text: 'AlloPresta m\'a donné accès à des clients que je n\'aurais jamais pu atteindre seule. La plateforme est fluide et les paiements sont sécurisés.',
    avatar: '/images/brand/image8.jpeg',
    stars: 5,
  },
  {
    id: 4,
    name: 'Ibrahim Sow',
    role: 'Formateur – C2P Espace Numérique',
    text: 'J\'ai formé plus de 800 apprenants à travers la plateforme. Les outils pédagogiques sont modernes et les évaluations bien structurées.',
    avatar: '/images/brand/images9.jpeg',
    stars: 5,
  },
  {
    id: 5,
    name: 'Marième Faye',
    role: 'Directrice RH – ECOBANK',
    text: 'Nous recrutons régulièrement des talents formés par C2P. Les compétences sont au niveau des standards internationaux.',
    avatar: '/images/brand/images10.jpeg',
    stars: 5,
  },
];

export default function VideoTestimonialsSection() {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>();
  const [activeIndex, setActiveIndex] = useState(0);

  const active = testimonials[activeIndex];

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-[#06053a] relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#5fa6f3]/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[#5fa6f3]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-white/60 text-sm font-medium uppercase tracking-wider">Témoignages</span>
          </div>
          <h2 className="text-white font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-4">
            Ce qu'ils disent de <span className="text-[#5fa6f3]">C2P</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Active testimonial */}
          <div
            className={`lg:col-span-3 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 lg:p-10">
              <div className="absolute -top-6 left-8 w-12 h-12 bg-[#5fa6f3] rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-double-quotes-l text-white text-2xl"></i>
                </div>
              </div>

              <div className="pt-6 mb-6">
                <p className="text-white/90 text-base lg:text-lg leading-relaxed italic">
                  "{active.text}"
                </p>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={active.avatar}
                  alt={active.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#5fa6f3]/30"
                />
                <div>
                  <div className="text-white font-semibold text-base">{active.name}</div>
                  <div className="text-white/60 text-sm">{active.role}</div>
                </div>
              </div>

              <div className="flex gap-1 mt-4">
                {[...Array(active.stars)].map((_, i) => (
                  <div key={i} className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-star-fill text-yellow-400"></i>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selector thumbnails */}
          <div className="lg:col-span-2 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 flex-shrink-0 text-left min-w-[240px] lg:min-w-0 ${
                  activeIndex === i
                    ? 'bg-[#5fa6f3]/20 border border-[#5fa6f3]/40'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <img
                  src={t.avatar}
                  alt={t.name}
                  className={`w-12 h-12 rounded-full object-cover border-2 transition-colors ${
                    activeIndex === i ? 'border-[#5fa6f3]' : 'border-white/20'
                  }`}
                />
                <div>
                  <div className={`text-sm font-semibold ${activeIndex === i ? 'text-[#5fa6f3]' : 'text-white/80'}`}>
                    {t.name}
                  </div>
                  <div className="text-white/50 text-xs line-clamp-1">{t.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
