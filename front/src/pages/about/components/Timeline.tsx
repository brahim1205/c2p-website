import { useScrollReveal } from '@/hooks/useScrollReveal';

const milestones = [
  {
    year: '2019',
    title: 'Création de C2P',
    desc: "Fondation du Centre de Développement et de Prestations Professionnels à Dakar par une équipe de 5 entrepreneurs passionnés par l'éducation et le développement économique.",
    icon: 'ri-rocket-line',
  },
  {
    year: '2020',
    title: 'Lancement AlloPresta',
    desc: 'Mise en ligne de la marketplace de services AlloPresta, connectant les premiers 50 prestataires avec des clients au Sénégal.',
    icon: 'ri-store-2-line',
  },
  {
    year: '2021',
    title: 'Espace Numérique',
    desc: "Lancement de la plateforme de formation en ligne avec 20 cours certifiants. Plus de 500 apprenants inscrits dès la première année.",
    icon: 'ri-graduation-cap-line',
  },
  {
    year: '2022',
    title: 'ProjectCenter',
    desc: "Ouverture de l'incubateur ProjectCenter avec un espace de coworking de 500m² et le premier programme d'accompagnement de 12 startups.",
    icon: 'ri-building-2-line',
  },
  {
    year: '2023',
    title: 'Expansion Régionale',
    desc: "C2P s'étend à 10 pays d'Afrique de l'Ouest avec des partenariats stratégiques. Le réseau compte désormais 1,500 professionnels actifs.",
    icon: 'ri-map-pin-add-line',
  },
  {
    year: '2024',
    title: '2,500+ Membres',
    desc: "Cap des 2,500 membres franchi. Lancement du programme de mentorat international et des bourses de formation pour les jeunes talents.",
    icon: 'ri-trophy-line',
  },
  {
    year: '2025',
    title: 'Certification Internationale',
    desc: "C2P obtient la reconnaissance internationale pour ses programmes de formation. Partenariats avec 12 universités africaines et 5 incubateurs européens.",
    icon: 'ri-award-line',
  },
  {
    year: '2026',
    title: 'Vision 2030',
    desc: "Objectif : 10,000 professionnels formés, 500 projets incubés et une présence dans 25 pays africains. C2P devient le leader du développement professionnel en Afrique.",
    icon: 'ri-eye-line',
  },
];

export default function Timeline() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="py-20 lg:py-28 px-4 sm:px-6 lg:px-20 bg-white relative overflow-hidden">
      <div className="absolute top-40 left-1/2 w-[2px] h-[calc(100%-200px)] bg-gray-200 -translate-x-1/2 hidden lg:block"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Notre Parcours</span>
          </div>
          <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[42px] leading-tight mb-4">
            Une Histoire de <span className="text-[#5fa6f3]">Croissance</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            De la fondation à la vision 2030, découvrez les étapes clés qui ont façonné C2P.
          </p>
        </div>

        <div className="space-y-10 lg:space-y-0">
          {milestones.map((m, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div
                key={i}
                className={`relative flex flex-col lg:flex-row items-center gap-6 lg:gap-0 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Left content */}
                <div className={`lg:w-[calc(50%-40px)] ${isLeft ? 'lg:text-right lg:pr-12' : 'lg:order-3 lg:text-left lg:pl-12'}`}>
                  <div className="bg-[#ffffff] rounded-2xl p-5 lg:p-6 border border-gray-100 hover:border-[#5fa6f3]/20 hover:shadow-lg transition-all duration-300 group">
                    <span className="inline-block text-[#5fa6f3] font-bold text-sm mb-2 bg-[#5fa6f3]/10 px-3 py-1 rounded-full">
                      {m.year}
                    </span>
                    <h3 className="font-semibold text-[#06053a] text-lg mb-2 group-hover:text-[#5fa6f3] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="hidden lg:flex lg:w-20 items-center justify-center lg:order-2 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-[#5fa6f3] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className={`${m.icon} text-[#5fa6f3] text-lg`}></i>
                    </div>
                  </div>
                </div>

                {/* Right spacer (when left has content) */}
                <div className={`hidden lg:block lg:w-[calc(50%-40px)] ${isLeft ? 'lg:order-3' : 'lg:order-1'}`}></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
