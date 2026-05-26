const pillars = [
  {
    title: 'Services qualifiés',
    text: 'AlloPresta organise les offres et demandes de services, avec recherche, alertes, vérification et mise en relation cadrée par C2P.',
    icon: 'ri-shield-check-line',
  },
  {
    title: 'Formation continue',
    text: 'L’Espace Numérique propose des cours, classes virtuelles, parcours hybrides et certifications pour progresser durablement.',
    icon: 'ri-graduation-cap-line',
  },
  {
    title: 'Incubation de projets',
    text: 'ProjectCenter aide les porteurs à structurer leur idée, préparer leur dossier et accéder à un réseau d’experts et de partenaires.',
    icon: 'ri-rocket-line',
  },
];

const values = [
  'Exigence opérationnelle',
  'Confiance et vérification',
  'Transmission utile',
  'Impact économique',
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
    desc: 'Consolidation de la plateforme avec l’objectif de former, connecter et accompagner toujours plus d’acteurs africains.',
    icon: 'ri-eye-line',
  },
];

export default function AboutPage() {
  return (
    <main className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
      <section className="relative min-h-[680px] overflow-hidden bg-[#ffffff]">
        <div className="absolute inset-0">
          <img
            src="/images/home/global.jpg"
            alt="C2P ecosysteme professionnel"
            className="h-full w-full object-cover object-center opacity-[0.36]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.82)_48%,rgba(248,250,252,0.48)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 flex min-h-[680px] items-center px-4 pt-24 sm:px-6 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="c2p-eyebrow mb-5">
                À propos de C2P
              </p>
              <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-[#0f1c35] sm:text-5xl lg:text-7xl">
                Un écosystème professionnel conçu pour faire avancer les talents
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#64748b] sm:text-lg">
                C2P rassemble AlloPresta, l’Espace Numérique et ProjectCenter dans une plateforme unique pour transformer les ambitions en actions mesurables.
              </p>
            </div>

            <div className="mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#d6dbe1] bg-[#d6dbe1] sm:grid-cols-3">
              {[
                ['2,500+', 'Professionnels'],
                ['150+', 'Projets accompagnes'],
                ['98%', 'Satisfaction'],
              ].map(([value, label]) => (
                <div key={label} className="bg-[#f7f6f4] p-5 text-center">
                  <div className="mb-1 text-3xl font-semibold text-[#0f1c35]">{value}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[#1a9a96]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-[#d6dbe1]">
            <img src="/images/home/trust.jpg" alt="Mission C2P" className="h-[520px] w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1c35]/42 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-[#d6dbe1] bg-white/86 p-5 backdrop-blur-sm">
              <div className="text-3xl font-semibold text-[#0f1c35]">98%</div>
              <p className="mt-1 text-sm leading-6 text-[#64748b]">des apprenants recommandent l’accompagnement C2P.</p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#1a9a96]">Notre mission</p>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-[#0f1c35] sm:text-4xl lg:text-5xl">
              Donner à chaque acteur les moyens d’apprendre, produire et entreprendre.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#64748b]">
              C2P part d’une conviction simple : les talents ont besoin d’un cadre fiable, de bons outils, de réseaux solides et d’un accompagnement concret. La plateforme organise ces besoins autour de parcours clairs pour les apprenants, prestataires, formateurs, porteurs de projet et partenaires.
            </p>
            <div className="mt-8 grid gap-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="c2p-card rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="c2p-icon-badge h-10 w-10">
                      <i className={`${pillar.icon} text-lg`}></i>
                    </span>
                    <h3 className="font-semibold text-[#0f1c35]">{pillar.title}</h3>
                  </div>
                  <p className="text-sm leading-7 text-[#64748b]">{pillar.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d6dbe1] bg-[#ffffff] px-4 py-20 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#1a9a96]">Nos valeurs</p>
            <h2 className="text-3xl font-semibold text-[#0f1c35] sm:text-4xl">Une culture orientée qualité, impact et confiance.</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-[#d6dbe1] bg-[#d6dbe1] sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <div key={value} className="bg-white p-6">
                <div className="mb-5 h-px w-12 bg-[#1a9a96]"></div>
                <h3 className="text-lg font-semibold text-[#0f1c35]">{value}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-20 lg:py-28">
        <div className="absolute left-1/2 top-56 hidden h-[calc(100%-18rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d6dbe1] to-transparent lg:block"></div>

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#1a9a96]">Notre Parcours</p>
            <h2 className="text-3xl font-semibold text-[#0f1c35] sm:text-4xl lg:text-5xl">
              Une Histoire de Croissance
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#64748b] sm:text-base">
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
                    <div className={`c2p-card group rounded-[24px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#1a9a96]/35 hover:shadow-[0_24px_60px_rgba(15,28,53,0.08)] ${isLeft ? 'lg:text-right' : ''}`}>
                      <span className="inline-flex rounded-full border border-[#d6dbe1] bg-[#1a9a96]/10 px-3 py-1 text-sm font-semibold text-[#1a9a96]">
                        {milestone.year}
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-[#0f1c35] transition-colors group-hover:text-[#1a9a96]">
                        {milestone.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#64748b]">
                        {milestone.desc}
                      </p>
                    </div>
                  </div>

                  <div className="hidden justify-center lg:col-start-2 lg:row-start-1 lg:flex">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-[#d6dbe1] bg-white shadow-[0_0_0_10px_rgba(26,154,150,0.10)]">
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

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[26px] border border-[#d6dbe1] bg-[#d6dbe1] sm:grid-cols-3">
            {[
              ['AlloPresta', 'Services vérifiés'],
              ['Espace Numérique', 'Compétences certifiées'],
              ['ProjectCenter', 'Projets accompagnés'],
            ].map(([name, label]) => (
              <div key={name} className="bg-white p-6 text-center">
                <div className="text-lg font-semibold text-[#0f1c35]">{name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#1a9a96]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
