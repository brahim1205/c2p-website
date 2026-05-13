import { useScrollReveal } from '@/hooks/useScrollReveal';

const values = [
  {
    icon: 'ri-lightbulb-flash-line',
    title: 'Innovation',
    desc: 'Nous repoussons constamment les limites pour proposer des solutions adaptées aux réalités africaines et aux besoins spécifiques de chaque professionnel.',
  },
  {
    icon: 'ri-team-line',
    title: 'Collaboration',
    desc: "La force de C2P réside dans son écosystème. Nous connectons apprenants, formateurs, prestataires et investisseurs pour créer de la valeur ensemble.",
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Excellence',
    desc: "Chaque formation, chaque service et chaque projet incubé doit répondre à nos standards de qualité les plus élevés. L'excellence n'est pas une option.",
  },
  {
    icon: 'ri-global-line',
    title: 'Impact Social',
    desc: "Au-delà du profit, nous mesurons notre succès par le nombre de vies transformées, d'emplois créés et de projets qui voient le jour grâce à C2P.",
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Accessibilité',
    desc: "Nous croyons que le développement professionnel doit être accessible à tous. Nos tarifs adaptés et notre présence dans 45 pays en témoignent.",
  },
  {
    icon: 'ri-seedling-line',
    title: 'Durabilité',
    desc: "Nous investissons dans des projets à long terme qui créent des emplois durables et contribuent au développement économique des communautés locales.",
  },
];

export default function Values() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="py-20 lg:py-28 px-4 sm:px-6 lg:px-20 bg-[#ffffff] relative overflow-hidden">
      <div className="absolute top-20 right-0 w-[350px] h-[350px] bg-[#5fa6f3]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`text-center mb-14 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-[#5fa6f3] rotate-45"></div>
            <span className="text-[#06053a] text-sm font-medium uppercase tracking-wider">Nos Valeurs</span>
          </div>
          <h2 className="text-[#06053a] font-bold text-2xl sm:text-3xl lg:text-[42px] leading-tight mb-4">
            Ce qui nous <span className="text-[#5fa6f3]">Anime</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Six valeurs fondamentales guident chacune de nos décisions et actions au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {values.map((v, i) => (
            <div
              key={i}
              className={`group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 hover:border-[#5fa6f3]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#5fa6f3]/5 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#5fa6f3]/10 flex items-center justify-center mb-5 group-hover:bg-[#5fa6f3] group-hover:scale-110 transition-all duration-300">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className={`${v.icon} text-xl text-[#5fa6f3] group-hover:text-white transition-colors duration-300`}></i>
                </div>
              </div>
              <h3 className="font-semibold text-[#06053a] text-lg mb-2 group-hover:text-[#5fa6f3] transition-colors duration-300">
                {v.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}