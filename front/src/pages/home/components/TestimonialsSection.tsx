import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEffect, useRef, useState } from 'react';

const testimonials = [
  {
    name: 'Amadou Diallo',
    role: 'Entrepreneur, Startup incubée 2023',
    avatar: '/images/brand/image1.jpeg',
    rating: 5,
    quote: "Grâce à C2P, j'ai pu développer mes compétences et lancer mon entreprise avec un accompagnement de qualité. Le ProjectCenter a transformé mon idée en une vraie startup.",
    featured: true,
  },
  {
    name: 'Fatou Touré',
    role: 'Formatrice certifiée',
    avatar: '/images/brand/image2.jpeg',
    rating: 5,
    quote: "Une plateforme complète qui répond à tous mes besoins professionnels. J'enseigne ici et j'apprends aussi.",
    featured: false,
  },
  {
    name: 'Moussa Koné',
    role: 'Client AlloPresta',
    avatar: '/images/brand/image3.jpeg',
    rating: 5,
    quote: "J'ai trouvé des prestataires qualifiés rapidement et facilement. Le service client est impeccable.",
    featured: false,
  },
  {
    name: 'Khadija Ba',
    role: 'Apprenante Espace Numérique',
    avatar: '/images/brand/image5.jpeg',
    rating: 5,
    quote: "Les formations sont top ! J'ai obtenu mon premier certificat en 2 mois et j'ai décroché un emploi.",
    featured: false,
  },
];

export default function TestimonialsSection() {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLElement>();
  const [activeMini, setActiveMini] = useState(0);

  // Auto-rotate mini testimonials
  useEffect(() => {
    const others = testimonials.filter((t) => !t.featured);
    const interval = setInterval(() => {
      setActiveMini((prev) => (prev + 1) % others.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const featured = testimonials.find((t) => t.featured)!;
  const others = testimonials.filter((t) => !t.featured);

  return (
    <section ref={sectionRef} className="px-4 sm:px-6 lg:px-20 bg-[#f5f1e8] pb-24 lg:pb-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5fa6f3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Témoignages</span>
          </div>
          <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-3 sm:mb-4">
            Ils Ont Réussi Avec C2P
          </h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-2 sm:px-0">
            Découvrez les expériences de ceux qui ont transformé leur parcours grâce à notre plateforme
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Featured Testimonial - Large Card */}
          <div className={`lg:col-span-3 relative rounded-[20px] sm:rounded-[24px] overflow-hidden h-[300px] sm:h-[340px] lg:h-[420px] group transition-all duration-1000 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <img
              src={featured.avatar}
              alt={featured.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06053a]/95 via-[#06053a]/70 to-transparent"></div>

            {/* Quote icon decoration */}
            <div className="absolute top-6 right-6 text-white/10">
              <div className="w-20 h-20 flex items-center justify-center">
                <i className="ri-double-quotes-l text-7xl"></i>
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-10">
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="w-5 h-5 flex items-center justify-center">
                    <i className={`ri-star-fill text-base ${star <= featured.rating ? 'text-yellow-400' : 'text-gray-500'}`}></i>
                  </div>
                ))}
              </div>
              <p className="text-white text-lg lg:text-xl italic leading-relaxed mb-6 max-w-lg">
                &quot;{featured.quote}&quot;
              </p>
              <div>
                <div className="text-white font-semibold text-lg">{featured.name}</div>
                <div className="text-white/70 text-sm">{featured.role}</div>
              </div>
            </div>
          </div>

          {/* Mini Testimonials */}
          <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-5">
            {others.map((t, i) => (
              <button
                type="button"
                key={t.name}
                className={`bg-white rounded-[20px] p-5 lg:p-6 flex-1 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-500 cursor-pointer ${
                  activeMini === i ? 'ring-2 ring-[#5fa6f3]/30 shadow-lg' : ''
                } ${sectionVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                style={{ transitionDelay: `${(i + 1) * 200}ms` }}
                onClick={() => setActiveMini(i)}
              >
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="w-4 h-4 flex items-center justify-center">
                      <i className={`ri-star-fill text-sm ${star <= t.rating ? 'text-yellow-400' : 'text-gray-300'}`}></i>
                    </div>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#5fa6f3]/20" />
                  <div>
                    <div className="text-gray-900 font-semibold text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
