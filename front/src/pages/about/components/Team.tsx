import { useScrollReveal } from '@/hooks/useScrollReveal';

const team = [
  {
    name: 'Amadou Diallo',
    role: 'Fondateur & CEO',
    bio: "Visionnaire passionné par l'éducation et l'entrepreneuriat africain. Ancien consultant en stratégie chez Deloitte.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20confident%20african%20businessman%20in%20dark%20navy%20suit%20with%20warm%20smile%20modern%20office%20background%20soft%20lighting%20headshot%20style&width=400&height=400&seq=c2p-team-1&orientation=squarish',
  },
  {
    name: 'Fatou Ndiaye',
    role: 'Directrice des Formations',
    bio: "Experte en pédagogie numérique avec 12 ans d'expérience. Ancienne responsable académique à l'Université Cheikh Anta Diop.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20elegant%20african%20businesswoman%20in%20teal%20blazer%20confident%20smile%20modern%20minimal%20background%20soft%20studio%20lighting%20headshot%20style&width=400&height=400&seq=c2p-team-2&orientation=squarish',
  },
  {
    name: 'Moussa Sow',
    role: 'Directeur AlloPresta',
    bio: "Serial entrepreneur avec 3 exits à son actif. Expert en marketplace et économie collaborative.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20young%20african%20male%20entrepreneur%20casual%20smart%20style%20modern%20startup%20office%20background%20confident%20expression%20headshot%20photography&width=400&height=400&seq=c2p-team-3&orientation=squarish',
  },
  {
    name: 'Aïssatou Ba',
    role: 'Responsable ProjectCenter',
    bio: "Experte en incubation et financement de startups. Ex-associée chez Partech Africa avec un réseau de 200+ investisseurs.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20confident%20african%20woman%20in%20white%20blouse%20modern%20office%20environment%20warm%20lighting%20headshot%20style%20corporate&width=400&height=400&seq=c2p-team-4&orientation=squarish',
  },
  {
    name: 'Omar Fall',
    role: 'CTO',
    bio: "Ingénieur en informatique de l'EPFL. 8 ans d'expérience en développement de plateformes à grande échelle.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20african%20male%20software%20engineer%20glasses%20smart%20casual%20modern%20tech%20office%20background%20warm%20lighting%20headshot%20style&width=400&height=400&seq=c2p-team-5&orientation=squarish',
  },
  {
    name: 'Marième Sall',
    role: 'Directrice Marketing',
    bio: "Stratège marketing digital avec une expertise en croissance. Ancienne responsable growth chez Wave Sénégal.",
    img: 'https://readdy.ai/api/search-image?query=professional%20portrait%20of%20african%20businesswoman%20in%20burgundy%20blazer%20warm%20smile%20creative%20agency%20background%20soft%20lighting%20headshot%20photography&width=400&height=400&seq=c2p-team-6&orientation=squarish',
  },
];

export default function Team() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="py-20 lg:py-28 px-4 sm:px-6 lg:px-20 bg-[#faf8f3] relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#14B8A6]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className={`text-center mb-14 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-[#14B8A6] rotate-45"></div>
            <span className="text-[#1a2b4a] text-sm font-medium uppercase tracking-wider">L'Équipe</span>
          </div>
          <h2 className="text-[#1a2b4a] font-bold text-2xl sm:text-3xl lg:text-[42px] leading-tight mb-4">
            Les Visages de <span className="text-[#14B8A6]">C2P</span>
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
            Une équipe pluridisciplinaire, passionnée et déterminée à transformer le paysage professionnel africain.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {team.map((member, i) => (
            <div
              key={i}
              className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#14B8A6]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#14B8A6]/5 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a2b4a]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <div className="p-5 lg:p-6">
                <h3 className="font-semibold text-[#1a2b4a] text-lg group-hover:text-[#14B8A6] transition-colors duration-300">
                  {member.name}
                </h3>
                <div className="text-[#14B8A6] text-sm font-medium mb-2">{member.role}</div>
                <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}