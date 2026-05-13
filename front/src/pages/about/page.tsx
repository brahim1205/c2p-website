const pillars = [
  {
    title: 'Services qualifiés',
    text: 'SenPresta organise les offres et demandes de prestations, avec recherche, alertes, vérification et prise en charge opérationnelle par C2P.',
    icon: 'ri-shield-check-line',
  },
  {
    title: 'Formation continue',
    text: 'L’Espace Numérique regroupe Form’Actions et l’END pour couvrir post-formation, apprentissage programmé, présentiel et distanciel.',
    icon: 'ri-graduation-cap-line',
  },
  {
    title: 'Incubation de projets',
    text: 'Projects Center relie porteurs, experts associés et financiers associés dans une logique de co-portage et d’autonomisation.',
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
    title: 'Création de C2P',
    desc: 'Fondation du Centre de Développement et de Prestations Professionnels à Dakar autour d’une ambition : structurer un écosystème utile aux talents et entrepreneurs.',
    icon: 'ri-rocket-line',
  },
  {
    year: '2020',
    title: 'Lancement AlloPresta',
    desc: 'Première brique de la plateforme : connecter des prestataires vérifiés à des clients qui recherchent des services fiables et mieux cadrés.',
    icon: 'ri-store-2-line',
  },
  {
    year: '2021',
    title: 'Espace Numérique',
    desc: 'Mise en place des parcours de formation pour renforcer les compétences, certifier les apprentissages et accompagner la progression professionnelle.',
    icon: 'ri-graduation-cap-line',
  },
  {
    year: '2022',
    title: 'ProjectCenter',
    desc: 'Structuration de l’incubateur C2P pour aider les porteurs de projet à passer de l’idée au dossier finançable, avec mentorat et suivi.',
    icon: 'ri-building-2-line',
  },
  {
    year: '2024',
    title: 'Expansion de l’écosystème',
    desc: 'Renforcement du réseau de formateurs, prestataires, porteurs de projet et partenaires pour soutenir davantage de parcours sur le continent.',
    icon: 'ri-global-line',
  },
  {
    year: '2026',
    title: 'Vision 2030',
    desc: 'Consolidation de la plateforme autour d’un backend C2P propre, avec l’objectif de former, connecter et accompagner toujours plus d’acteurs africains.',
    icon: 'ri-eye-line',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-c2p-bg text-c2p-text">
      <section className="relative min-h-[680px] overflow-hidden bg-[#ffffff]">
        <div className="absolute inset-0">
          <img
            src="/images/brand/images12.jpeg"
            alt="C2P ecosysteme professionnel"
            className="h-full w-full object-cover object-center opacity-24"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.94)_0%,rgba(247,248,252,0.76)_46%,rgba(247,248,252,0.30)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="c2p-eyebrow mb-5">
                À propos de C2P
              </p>
              <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#06053a] sm:text-5xl lg:text-7xl">
                Un écosystème professionnel conçu pour faire avancer les talents
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
                C2P rassemble SenPresta, Form’Actions, l’END et Projects Center dans une plateforme unique pour transformer les ambitions en actions mesurables.
              </p>
            </div>

            <div className="mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#80bfdf] bg-[#80bfdf] sm:grid-cols-3">
              {[
                ['2,500+', 'Professionnels'],
                ['150+', 'Projets accompagnes'],
                ['98%', 'Satisfaction'],
              ].map(([value, label]) => (
                <div key={label} className="bg-white/84 p-5 text-center">
                  <div className="mb-1 text-3xl font-semibold text-[#06053a]">{value}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-[#80bfdf]">
            <img src="/images/brand/_.jpeg" alt="Mission C2P" className="h-[520px] w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06053a]/48 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-[#80bfdf] bg-white/88 p-5 backdrop-blur">
              <div className="text-3xl font-semibold text-[#27346b]">98%</div>
              <p className="mt-1 text-sm leading-6 text-[#27346b]">des apprenants recommandent l’accompagnement C2P.</p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#27346b]">Notre mission</p>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-[#06053a] sm:text-4xl lg:text-5xl">
              Donner à chaque acteur les moyens d’apprendre, produire et entreprendre.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#27346b]">
              C2P part d’une conviction simple : les talents ont besoin d’un cadre fiable, de bons outils, de réseaux solides et d’un accompagnement concret. La plateforme organise ces besoins autour de parcours clairs pour les apprenants, prestataires, formateurs, porteurs de projet et partenaires.
            </p>
            <div className="mt-8 grid gap-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="c2p-card rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="c2p-icon-badge h-10 w-10">
                      <i className={`${pillar.icon} text-lg`}></i>
                    </span>
                    <h3 className="font-semibold text-[#06053a]">{pillar.title}</h3>
                  </div>
                  <p className="text-sm leading-7 text-[#27346b]">{pillar.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#80bfdf] bg-[#ffffff] px-4 py-20 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#27346b]">Nos valeurs</p>
            <h2 className="text-3xl font-semibold text-[#06053a] sm:text-4xl">Une culture orientée qualité, impact et confiance.</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-[#80bfdf] bg-[#80bfdf] sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <div key={value} className="bg-white p-6">
                <div className="mb-5 h-px w-12 bg-[#27346b]"></div>
                <h3 className="text-lg font-semibold text-[#06053a]">{value}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="absolute left-1/2 top-56 hidden h-[calc(100%-18rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#27346b]/45 to-transparent lg:block"></div>

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#27346b]">Notre Parcours</p>
            <h2 className="text-3xl font-semibold text-[#06053a] sm:text-4xl lg:text-5xl">
              Une Histoire de Croissance
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#27346b] sm:text-base">
              De la fondation à la vision 2030, découvrez les étapes clés qui ont façonné C2P.
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
                    <div className={`c2p-card group rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#27346b]/45 hover:shadow-[0_24px_60px_rgba(12,14,58,0.08)] ${isLeft ? 'lg:text-right' : ''}`}>
                      <span className="inline-flex rounded-full border border-[#27346b]/35 bg-[#27346b]/10 px-3 py-1 text-sm font-semibold text-[#27346b]">
                        {milestone.year}
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-[#06053a] transition-colors group-hover:text-[#27346b]">
                        {milestone.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#27346b]">
                        {milestone.desc}
                      </p>
                    </div>
                  </div>

                  <div className="hidden justify-center lg:col-start-2 lg:row-start-1 lg:flex">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-[#27346b]/45 bg-white shadow-[0_0_0_10px_rgba(39,52,107,0.10)]">
                      <div className="c2p-icon-badge h-10 w-10">
                        <i className={`${milestone.icon} text-lg`}></i>
                      </div>
                    </div>
                  </div>

                  <div className={`${isLeft ? 'hidden lg:block lg:col-start-3' : 'hidden lg:block lg:col-start-1 lg:row-start-1'}`}></div>
                </div>
              );
            })}
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-[#80bfdf] bg-[#80bfdf] sm:grid-cols-3">
            {[
              ['AlloPresta', 'Services vérifiés'],
              ['Espace Numérique', 'Compétences certifiées'],
              ['ProjectCenter', 'Projets accompagnés'],
            ].map(([name, label]) => (
              <div key={name} className="bg-white p-6 text-center">
                <div className="text-lg font-semibold text-[#06053a]">{name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#5fa6f3]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
