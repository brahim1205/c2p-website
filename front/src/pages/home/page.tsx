import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageMeta';

const heroImage =
  '/images/home/hero.jpg';

const fleet = [
  {
    eyebrow: 'AlloPresta',
    title: 'Prestations Qualifiées',
    subtitle: 'Publiez un besoin, trouvez un professionnel fiable ou proposez vos services dans un cadre simple et sécurisé.',
    image: '/images/home/service.jpg',
    path: '/allopresta',
  },
  {
    eyebrow: 'Espace Numérique',
    title: 'Formations Certifiantes',
    subtitle: 'Des formations en ligne, en présentiel ou hybrides pour apprendre à votre rythme et obtenir des certifications utiles.',
    image: '/images/home/academy.jpg',
    path: '/espace-numerique',
  },
  {
    eyebrow: 'ProjectCenter',
    title: 'Incubation de projets',
    subtitle: 'Un accompagnement complet pour transformer une idée en projet structuré, finançable et prêt à être lancé.',
    image: '/images/home/venture.jpg',
    path: '/project-center',
  },
];

export default function HomePage() {
  usePageMeta({
    title: 'C2P Sénégal | Services, formation et incubation',
    description: 'C2P connecte prestataires, apprenants, entrepreneurs et partenaires dans un écosystème numérique unique.',
    path: '/',
  });

  return (
    <div className="public-premium-page bg-c2p-bg text-c2p-text">
      <section className="relative min-h-[78vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Centre C2P premium"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.72]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.82)_46%,rgba(248,250,252,0.42)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-28 sm:px-8 lg:px-10">
          <div className="max-w-5xl">
            <p className="c2p-eyebrow mb-5 tracking-[0.38em]">
              Centre C2P | Services, Formation, Incubation
            </p>
            <h1 className="max-w-4xl animate-fade-in-up text-4xl font-semibold leading-[1.02] text-[#06053a] sm:text-5xl lg:text-6xl">
              Votre Succès Professionnel Commence Ici
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
              C2P connecte prestataires, apprenants, entrepreneurs et partenaires dans un écosystème numérique unique — services, formation et incubation de projets, tout en un.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="c2p-btn-primary px-7 py-4"
              >
                Créer mon compte
              </Link>
              <Link
                to="/tarifs"
                className="c2p-btn-secondary border-c2p-accent bg-white/80 px-7 py-4"
              >
                Voir les abonnements
              </Link>
              <Link
                to="/project-center"
                className="c2p-btn-secondary bg-c2p-surface-muted px-7 py-4 text-c2p-muted"
              >
                Soumettre un projet
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <div>
              <p className="c2p-eyebrow">Modules principaux</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#06053a] sm:text-5xl">
                Choisissez ce que vous voulez faire.
              </h2>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#4a5b70]">
              Trois espaces, trois actions simples : trouver un service, apprendre, ou faire avancer un projet.
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
