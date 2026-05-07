const pillars = [
  {
    title: 'Services qualifies',
    text: 'AlloPresta connecte les clients aux prestataires capables de livrer des missions avec un niveau de confiance professionnel.',
    icon: 'ri-shield-check-line',
  },
  {
    title: 'Formation continue',
    text: 'L Espace Numerique structure les competences, les parcours et les certifications pour accelerer la progression des talents.',
    icon: 'ri-graduation-cap-line',
  },
  {
    title: 'Incubation de projets',
    text: 'ProjectCenter aide les porteurs de projet a clarifier, tester, financer et developper leurs initiatives entrepreneuriales.',
    icon: 'ri-rocket-line',
  },
];

const values = [
  'Exigence operationnelle',
  'Confiance et verification',
  'Transmission utile',
  'Impact economique',
  'Vision panafricaine',
  'Accompagnement durable',
];

const milestones = [
  {
    year: '2019',
    title: 'Creation de C2P',
    desc: 'Fondation du Centre de Developpement et de Prestations Professionnels a Dakar autour d une ambition : structurer un ecosysteme utile aux talents et entrepreneurs.',
    icon: 'ri-rocket-line',
  },
  {
    year: '2020',
    title: 'Lancement AlloPresta',
    desc: 'Premiere brique de la plateforme : connecter des prestataires verifies a des clients qui recherchent des services fiables et mieux cadres.',
    icon: 'ri-store-2-line',
  },
  {
    year: '2021',
    title: 'Espace Numerique',
    desc: 'Mise en place des parcours de formation pour renforcer les competences, certifier les apprentissages et accompagner la progression professionnelle.',
    icon: 'ri-graduation-cap-line',
  },
  {
    year: '2022',
    title: 'ProjectCenter',
    desc: 'Structuration de l incubateur C2P pour aider les porteurs de projet a passer de l idee au dossier finançable, avec mentorat et suivi.',
    icon: 'ri-building-2-line',
  },
  {
    year: '2024',
    title: 'Expansion de l ecosysteme',
    desc: 'Renforcement du reseau de formateurs, prestataires, porteurs de projet et partenaires pour soutenir davantage de parcours sur le continent.',
    icon: 'ri-global-line',
  },
  {
    year: '2026',
    title: 'Vision 2030',
    desc: 'Consolidation de la plateforme autour d un backend C2P propre, avec l objectif de former, connecter et accompagner toujours plus d acteurs africains.',
    icon: 'ri-eye-line',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <section className="relative min-h-[680px] overflow-hidden bg-[#090909]">
        <div className="absolute inset-0">
          <img
            src="/images/home/global.jpg"
            alt="C2P ecosysteme professionnel"
            className="h-full w-full object-cover object-center opacity-45"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.94)_0%,rgba(7,7,7,0.76)_46%,rgba(7,7,7,0.34)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

        <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">
                A propos de C2P
              </p>
              <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-white sm:text-5xl lg:text-7xl">
                Un ecosysteme professionnel concu pour faire avancer les talents
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                C2P rassemble services, formation et incubation dans une plateforme unique pour transformer les ambitions en actions mesurables.
              </p>
            </div>

            <div className="mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 sm:grid-cols-3">
              {[
                ['2,500+', 'Professionnels'],
                ['150+', 'Projets accompagnes'],
                ['98%', 'Satisfaction'],
              ].map(([value, label]) => (
                <div key={label} className="bg-black/25 p-5 text-center">
                  <div className="mb-1 text-3xl font-semibold">{value}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/55">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-white/10">
            <img src="/images/home/trust.jpg" alt="Mission C2P" className="h-[520px] w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur">
              <div className="text-3xl font-semibold text-[#d5b46f]">98%</div>
              <p className="mt-1 text-sm leading-6 text-white/68">des apprenants recommandent l accompagnement C2P.</p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">Notre mission</p>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Donner a chaque acteur les moyens d apprendre, produire et entreprendre.
            </h2>
            <p className="mt-6 text-base leading-8 text-white/62">
              C2P part d une conviction simple : les talents ont besoin d un cadre fiable, de bons outils, de reseaux solides et d accompagnement concret. La plateforme organise ces besoins autour de parcours clairs pour les apprenants, prestataires, formateurs, porteurs de projet et partenaires.
            </p>
            <div className="mt-8 grid gap-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d5b46f] text-[#111]">
                      <i className={`${pillar.icon} text-lg`}></i>
                    </span>
                    <h3 className="font-semibold text-white">{pillar.title}</h3>
                  </div>
                  <p className="text-sm leading-7 text-white/58">{pillar.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#111] px-4 py-20 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">Nos valeurs</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Une culture orientee qualite, impact et confiance.</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <div key={value} className="bg-[#0b0b0b] p-6">
                <div className="mb-5 h-px w-12 bg-[#d5b46f]"></div>
                <h3 className="text-lg font-semibold text-white">{value}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="absolute left-1/2 top-56 hidden h-[calc(100%-18rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d5b46f]/45 to-transparent lg:block"></div>

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">Notre Parcours</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Une Histoire de Croissance
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/58 sm:text-base">
              De la fondation a la vision 2030, decouvrez les etapes cles qui ont faconne C2P.
            </p>
          </div>

          <div className="space-y-8 lg:space-y-0">
            {milestones.map((milestone, index) => {
              const isLeft = index % 2 === 0;

              return (
                <div
                  key={milestone.year}
                  className="relative grid items-center gap-6 lg:grid-cols-[1fr_90px_1fr] lg:gap-0"
                >
                  <div className={`${isLeft ? 'lg:pr-10' : 'lg:col-start-3 lg:pl-10'} ${isLeft ? '' : 'lg:row-start-1'}`}>
                    <div className={`group rounded-[24px] border border-white/10 bg-white/[0.05] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#d5b46f]/45 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)] ${isLeft ? 'lg:text-right' : ''}`}>
                      <span className="inline-flex rounded-full border border-[#d5b46f]/35 bg-[#d5b46f]/10 px-3 py-1 text-sm font-semibold text-[#d5b46f]">
                        {milestone.year}
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-white transition-colors group-hover:text-[#d5b46f]">
                        {milestone.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-white/58">
                        {milestone.desc}
                      </p>
                    </div>
                  </div>

                  <div className="hidden justify-center lg:col-start-2 lg:row-start-1 lg:flex">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-[#d5b46f]/45 bg-[#0b0b0b] shadow-[0_0_0_10px_rgba(213,180,111,0.06)]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d5b46f] text-[#111]">
                        <i className={`${milestone.icon} text-lg`}></i>
                      </div>
                    </div>
                  </div>

                  <div className={`${isLeft ? 'hidden lg:block lg:col-start-3' : 'hidden lg:block lg:col-start-1 lg:row-start-1'}`}></div>
                </div>
              );
            })}
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ['AlloPresta', 'Services verifies'],
              ['Espace Numerique', 'Competences certifiees'],
              ['ProjectCenter', 'Projets accompagnes'],
            ].map(([name, label]) => (
              <div key={name} className="bg-[#111] p-6 text-center">
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
