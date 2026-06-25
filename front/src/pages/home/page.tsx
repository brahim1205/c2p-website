import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageMeta';

const heroImage =
  '/images/brand/image44';

const heroPeople = [
  {
    image: '/images/home/service.jpg',
    label: 'Prestataire',
    className: 'left-0 top-8 h-36 w-32 sm:h-44 sm:w-40 lg:h-52 lg:w-48',
  },
  {
    image: '/images/home/academy.jpg',
    label: 'Formateur',
    className: 'right-2 top-0 h-40 w-36 sm:h-52 sm:w-44 lg:h-60 lg:w-52',
  },
  {
    image: '/images/home/venture.jpg',
    label: 'Porteur de projet',
    className: 'bottom-0 left-10 h-36 w-36 sm:h-44 sm:w-44 lg:h-52 lg:w-52',
  },
  {
    image: '/images/home/support.jpg',
    label: 'Partenaire',
    className: 'bottom-8 right-0 h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48',
  },
];

const quickActions = [
  {
    label: 'Prestations',
    title: 'Trouvez des experts qualifiés',
    description: 'Services, prix, localisation et notes.',
    icon: 'ri-service-line',
    path: '/allopresta',
  },
  {
    label: 'Formation',
    title: 'Développez vos compétences',
    description: 'Cours, contenus réels et certificats.',
    icon: 'ri-graduation-cap-line',
    path: '/espace-numerique',
  },
  {
    label: 'Projets',
    title: 'Soumettez ou financez',
    description: 'Incubation, suivi et partenaires.',
    icon: 'ri-rocket-line',
    path: '/project-center',
  },
  {
    label: 'Opportunités',
    title: 'Construisez des offres',
    description: 'Coaching, financement et collaboration.',
    icon: 'ri-lightbulb-flash-line',
    path: '/tarifs',
  },
];

const fleet = [
  {
    eyebrow: 'AlloPresta',
    title: 'Prestations Qualifiées',
    subtitle: 'Publiez un besoin, trouvez un professionnel fiable ou proposez vos services dans un cadre simple et sécurisé.',
    image: '/images/brand/image2.jpeg',
    path: '/allopresta',
  },
  {
    eyebrow: 'Espace Numérique',
    title: 'Formations Certifiantes',
    subtitle: 'Des formations en ligne, en présentiel ou hybrides pour apprendre à votre rythme et obtenir des certifications utiles.',
    image: '/images/brand/image3.jpeg',
    path: '/espace-numerique',
  },
  {
    eyebrow: 'ProjectCenter',
    title: 'Incubation de projets',
    subtitle: 'Un accompagnement complet pour transformer une idée en projet structuré, finançable et prêt à être lancé.',
    image: '/images/brand/image8.jpeg',
    path: '/project-center',
  },
];

const mobileFirstPrinciples = [
  'Parcours en 3 choix des la premiere vue',
  'Boutons larges utilisables au pouce',
  'Textes courts, priorite aux actions',
  'Acces direct aux espaces publics sans menu complexe',
];

export default function HomePage() {
  usePageMeta({
    title: 'C2P Sénégal | Services, formation et incubation',
    description: 'C2P connecte prestataires, apprenants, entrepreneurs et partenaires dans un écosystème numérique unique.',
    path: '/',
  });

  return (
    <div className="public-premium-page bg-[#eef5ff] text-c2p-text">
      <section className="px-3 pb-8 pt-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[#dbe7fb] bg-white shadow-[0_28px_90px_rgba(15,28,53,0.1)]">
          <div className="grid gap-8 px-5 pb-6 pt-8 sm:px-8 sm:pb-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-12 lg:pb-10 lg:pt-12">
            <div className="flex flex-col justify-center">
              <p className="mb-4 inline-flex w-fit rounded-full bg-[#eaf4ff] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#147f7b]">
                C2P Sénégal
              </p>
              <h1 className="max-w-xl text-[2.25rem] font-black leading-[0.98] tracking-tight text-[#06053a] sm:text-5xl lg:text-[4rem]">
                Développez vos compétences, valorisez vos talents, créez vos opportunités.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#4a5b70] sm:text-lg sm:leading-8">
                C2P connecte les talents, les professionnels et les innovateurs pour construire ensemble un avenir meilleur.
              </p>
              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  to="/auth/register"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#0f4fb8] px-6 py-4 text-center text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,79,184,0.22)] transition hover:bg-[#0f1c35] sm:w-auto"
                >
                  Démarrer mon aventure
                </Link>
                <Link
                  to="/allopresta"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl border border-[#d6dbe1] bg-white px-6 py-4 text-center text-sm font-bold text-[#0f1c35] transition hover:border-[#0f4fb8] hover:text-[#0f4fb8] sm:w-auto"
                >
                  Nous rejoindre
                </Link>
              </div>
            </div>

            <div className="relative min-h-[330px] sm:min-h-[420px] lg:min-h-[520px]">
              <img
                src={heroImage}
                alt=""
                className="absolute inset-8 h-[calc(100%-4rem)] w-[calc(100%-4rem)] rounded-[36px] object-cover opacity-10"
              />
              <div className="absolute left-[12%] top-[8%] h-4 w-4 rounded-full bg-[#c8d7ff]"></div>
              <div className="absolute right-[8%] top-[24%] h-6 w-6 rounded-full bg-[#dfe8ff]"></div>
              <div className="absolute bottom-[18%] left-[3%] h-5 w-5 rounded-full bg-[#dfe8ff]"></div>
              <div className="absolute bottom-[8%] right-[22%] h-3 w-3 rounded-full bg-[#c8d7ff]"></div>

              {heroPeople.map((person) => (
                <div
                  key={person.label}
                  className={`absolute overflow-hidden rounded-[28px] bg-[#edf5ff] shadow-[0_18px_44px_rgba(15,28,53,0.16)] ring-8 ring-white ${person.className}`}
                >
                  <img src={person.image} alt={person.label} className="h-full w-full object-cover" />
                </div>
              ))}

              <div className="absolute right-[3%] top-[44%] flex h-14 w-14 items-center justify-center rounded-full bg-[#f4a11a] text-white shadow-[0_16px_34px_rgba(244,161,26,0.28)]">
                <i className="ri-user-star-line text-2xl"></i>
              </div>
              <div className="absolute bottom-[12%] left-[38%] flex h-16 w-16 items-center justify-center rounded-full bg-[#0f4fb8] text-white shadow-[0_16px_34px_rgba(15,79,184,0.26)]">
                <i className="ri-shield-check-line text-3xl"></i>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e6eefb] bg-[#fbfdff] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="group rounded-2xl border border-[#e6eefb] bg-white p-4 text-center shadow-[0_12px_32px_rgba(15,28,53,0.05)] transition hover:-translate-y-1 hover:border-[#0f4fb8]"
                >
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0f4fb8] transition group-hover:bg-[#0f4fb8] group-hover:text-white">
                    <i className={`${item.icon} text-2xl`}></i>
                  </span>
                  <p className="mt-3 text-sm font-black text-[#06053a]">{item.label}</p>
                  <h2 className="mt-1 text-sm font-semibold leading-5 text-[#27346b]">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <div>
              <p className="c2p-eyebrow">Parcours simplifié</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#06053a] sm:text-5xl">
                Un site pensé d’abord pour l’action.
              </h2>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#4a5b70]">
              L’utilisateur choisit son besoin, arrive dans le bon espace, puis avance sans devoir comprendre toute la plateforme.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {fleet.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                className="group relative min-h-[330px] overflow-hidden rounded-[22px] border border-[#d6dbe1] bg-white shadow-[0_14px_38px_rgba(15,28,53,0.055)]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/20"></div>
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-7">
                  <p className="inline-flex items-center rounded-full border border-[#d6dbe1] bg-white/86 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#147f7b] shadow-sm backdrop-blur-md">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold text-[#06053a]">{item.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#4a5b70]">{item.subtitle}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0f1c35]">
                    Découvrir <i className="ri-arrow-right-line"></i>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f1c35] px-4 py-12 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7ac943]">Mobile-first</p>
            <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Le mobile devient la référence, pas une adaptation tardive.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
              Les écrans publics sont maintenant structurés pour une lecture rapide sur smartphone, avec des actions visibles sans chercher dans le menu.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {mobileFirstPrinciples.map((principle) => (
              <div key={principle} className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#7ac943] text-[#0f1c35]">
                    <i className="ri-check-line"></i>
                  </span>
                  <p className="text-sm font-semibold leading-6 text-white/90">{principle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e6eaf4] bg-white px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl rounded-[24px] bg-[#f3f6ff] px-5 py-8 sm:px-8 sm:py-10 lg:rounded-[28px] lg:px-12">
          <div className="grid items-center gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] lg:gap-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center text-[#7ac943] sm:h-28 sm:w-28">
                <i className="ri-android-fill text-[4rem] leading-none sm:text-[5rem]"></i>
              </div>
              <p className="mt-1 text-2xl font-black tracking-tight text-[#c9ced8] sm:mt-2 sm:text-4xl">
                ANDROID
              </p>
            </div>

            <div>
              <h2 className="public-mobile-title text-2xl font-semibold leading-tight text-[#06053a] sm:text-4xl">
                Application mobile bientôt disponible !
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#4f5f78] sm:mt-4 sm:text-lg sm:leading-8">
                Profite bientôt de l&apos;expérience C2P sur ton smartphone Android. Suis tes
                demandes, apprends, reçois tes messages utiles et garde tes projets à portée de
                main où que tu sois.
              </p>

              <div className="mt-6 flex items-center gap-4 sm:mt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img
                      src="/images/stores/google-play-icon.png"
                      alt="Google Play"
                      className="h-12 w-12 flex-none sm:h-14 sm:w-14"
                    />
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#27346b]">
                        PlayStore
                      </p>
                      <p className="mt-0.5 text-base font-medium text-[#06053a] sm:mt-1 sm:text-xl">
                        Disponible prochainement sur Google Play
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img
                      src="/images/stores/app-store-icon.png"
                      alt="App Store"
                      className="h-12 w-12 flex-none sm:h-14 sm:w-14"
                    />
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#27346b]">
                        App Store
                      </p>
                      <p className="mt-0.5 text-base font-medium text-[#06053a] sm:mt-1 sm:text-xl">
                        Version iPhone à venir
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="rounded-[28px] border border-[#d6dbe1] bg-white px-6 py-8 shadow-[0_18px_48px_rgba(15,28,53,0.07)] sm:px-10 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div>
            <p className="c2p-eyebrow">Démarrer</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#06053a] sm:text-4xl">
              Accédez au bon espace C2P.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#4a5b70]">
              Créez un compte ou contactez l’équipe pour être orienté vers le bon parcours.
            </p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Link to="/auth/register" className="c2p-btn-primary px-7 py-4">
              Créer mon compte
            </Link>
            <Link to="/contact" className="c2p-btn-secondary px-7 py-4">
              Contacter C2P
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
