import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Mission() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="py-20 lg:py-28 px-4 sm:px-6 lg:px-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left image */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="relative">
              <img
                src="/images/brand/images12.jpeg"
                alt="L'équipe C2P au travail"
                className="w-full h-[450px] md:h-[550px] object-cover object-top rounded-2xl"
              />
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -right-4 md:-right-8 bg-white rounded-2xl p-5 shadow-xl border border-gray-100 max-w-[200px]">
                <div className="text-[#5fa6f3] font-bold text-3xl mb-1">98%</div>
                <div className="text-gray-500 text-sm">de nos apprenants recommandent C2P à leur réseau</div>
              </div>
            </div>
          </div>

          {/* Right content */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
              <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Notre Mission</span>
            </div>

            <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[42px] leading-tight mb-6">
              Transformer les Talents Africains en <span className="text-[#5fa6f3]">Leaders</span>
            </h2>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
              C2P est né d'une conviction profonde : l'Afrique dispose d'un potentiel humain extraordinaire qui mérite d'être 
              développé, connecté et valorisé. Notre mission est de créer l'écosystème professionnel le plus complet du continent, 
              où chaque talent peut trouver sa voie et chaque projet peut prendre vie.
            </p>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-8">
              À travers trois piliers complémentaires — <strong className="text-[#06053a]">AlloPresta</strong> pour les services professionnels, 
              <strong className="text-[#06053a]"> l'Espace Numérique</strong> pour la formation continue, et 
              <strong className="text-[#06053a]"> ProjectCenter</strong> pour l'incubation de projets — nous offrons un parcours 
              complet du développement personnel à la création d'entreprise.
            </p>

            <div className="space-y-4">
              {[
                { icon: 'ri-check-double-line', text: "Plus de 2,500 professionnels actifs dans 45 pays" },
                { icon: 'ri-check-double-line', text: "150 startups accompagnées depuis la création" },
                { icon: 'ri-check-double-line', text: "98% de satisfaction parmi nos apprenants" },
                { icon: 'ri-check-double-line', text: "12M FCFA de financement mobilisés pour nos projets" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#5fa6f3]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className={`${item.icon} text-[#5fa6f3] text-sm`}></i>
                    </div>
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
