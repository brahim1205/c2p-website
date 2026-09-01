import { usePageMeta } from '@/lib/usePageMeta';
import { Link } from 'react-router-dom';

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

const quickLinks = [
  {
    id: 'services',
    title: 'Trouver un service',
    text: 'Chercher un prestataire, demander un devis, réserver un créneau et suivre la prestation.',
    to: '/allopresta',
  },
  {
    id: 'formations',
    title: 'Suivre ou publier une formation',
    text: 'Accéder aux cours, ressources, classes virtuelles, quiz et certificats.',
    to: '/espace-numerique',
  },
  {
    id: 'projets',
    title: 'Soumettre un projet',
    text: 'Déposer un dossier, structurer le financement et mobiliser des partenaires.',
    to: '/project-center',
  },
  {
    id: 'tarifs',
    title: 'Comprendre les accès',
    text: 'Voir quels rôles ont un abonnement et ce que chaque accès débloque.',
    to: '/tarifs',
  },
];

export default function AboutPage() {
  usePageMeta({
    title: 'À propos de C2P | Écosystème professionnel au Sénégal',
    description: 'C2P réunit services qualifiés, formation continue et incubation pour accompagner les talents et entrepreneurs.',
    path: '/a-propos',
    image: 'https://c2p.sn/images/home/apropos.png',
  });

  return (
    <main className="public-premium-page min-h-screen bg-[#fbfdf7] text-c2p-text">
      <section className="relative overflow-hidden bg-[#e8f5d8] px-4 pb-10 pt-[92px] sm:px-6 lg:px-20 lg:pb-16 lg:pt-28">
        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-[#f5c542]/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#147f7b] shadow-sm">
              <i className="ri-community-line text-lg" />
              À propos de C2P
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] text-[#0f1c35] sm:text-5xl lg:text-6xl">
              Un écosystème pour apprendre, travailler et devenir autonome.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#506176] sm:text-lg">
              C2P rassemble AlloPresta, l’Espace Numérique et ProjectCenter dans une plateforme unique pour transformer les ambitions en actions mesurables.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ['Un seul compte', 'pour évoluer selon votre rôle'],
                ['Des parcours réels', 'services, cours, projets et partenariats'],
                ['Une logique progressive', 'de découverte vers l’autonomie'],
              ].map(([title, label]) => (
                <div key={title} className="rounded-3xl border border-white/70 bg-white/82 p-5 text-center shadow-sm backdrop-blur">
                  <div className="text-lg font-black text-[#147f7b]">{title}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              src="/images/home/apropos.png"
              alt="C2P ecosysteme professionnel"
              className="h-[320px] w-full rounded-[32px] object-cover object-center shadow-[0_28px_80px_rgba(15,28,53,0.16)] sm:h-[430px] lg:h-[520px]"
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-3xl bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,28,53,0.12)] backdrop-blur">
              <p className="text-sm font-black text-[#0f1c35]">AlloPresta • Espace Numérique • ProjectCenter</p>
              <p className="mt-1 text-xs leading-5 text-[#64748b]">Un seul compte pour évoluer selon votre parcours.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-20 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-[#1a9a96]">Repères utiles</p>
            <h2 className="text-3xl font-semibold text-[#0f1c35] sm:text-4xl">Tout ce qu’un utilisateur doit savoir avant de démarrer.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="rounded-[24px] border border-[#d6dbe1] bg-[#fbfdf7] p-6 transition hover:-translate-y-1 hover:border-[#1a9a96]/35 hover:shadow-[0_24px_60px_rgba(15,28,53,0.08)]"
              >
                <h3 className="text-lg font-semibold text-[#0f1c35]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#64748b]">{item.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1a9a96]">
                  Ouvrir la page
                  <i className="ri-arrow-right-line"></i>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[30px] border border-[#d6dbe1]">
            <img src="/images/brand/image7.jpeg" alt="Mission C2P" className="h-[520px] w-full object-cover object-center" />
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
            <div className="mt-8 rounded-[24px] border border-[#d6dbe1] bg-[#fbfdf7] p-6">
              <h3 className="text-lg font-semibold text-[#0f1c35]">Ce que vous trouverez sur cette page</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#64748b]">
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Le rôle de chaque espace : AlloPresta, Espace Numérique et ProjectCenter.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>La logique d’autonomisation C2P et les parcours possibles selon votre rôle.</span></li>
                <li className="flex gap-3"><i className="ri-check-line text-[#1a9a96]"></i><span>Des redirections simples vers les pages où agir : s’inscrire, publier, suivre ou financer.</span></li>
              </ul>
            </div>
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

      <section className="border-y border-[#e3eadb] bg-[#f7fbef] px-4 py-16 sm:px-6 lg:px-20 lg:py-20">
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

      <section className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 lg:px-20 lg:py-24">
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
