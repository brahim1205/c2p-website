import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageMeta';

const heroImage =
  '/images/brand/image44';

const quickActions = [
  {
    label: 'Je cherche un prestataire',
    title: 'Trouver un service fiable',
    description: 'Comparez les profils, tarifs, notes et disponibilites avant de reserver.',
    icon: 'ri-search-eye-line',
    path: '/allopresta',
    cta: 'Voir AlloPresta',
  },
  {
    label: 'Je veux apprendre',
    title: 'Acheter une formation',
    description: 'Accedez aux videos, documents et certificats depuis votre espace apprenant.',
    icon: 'ri-graduation-cap-line',
    path: '/espace-numerique',
    cta: 'Voir les formations',
  },
  {
    label: 'J’ai un projet',
    title: 'Soumettre ou financer',
    description: 'Deposez un projet, suivez son evaluation et mobilisez des partenaires.',
    icon: 'ri-rocket-line',
    path: '/project-center',
    cta: 'Ouvrir ProjectCenter',
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
    <div className="public-premium-page bg-c2p-bg text-c2p-text">
      <section className="relative overflow-hidden bg-white pt-20">
        <img
          src={heroImage}
          alt="Centre C2P premium"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.2] sm:opacity-[0.38]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_54%,rgba(239,246,255,0.9)_100%)] sm:bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.86)_54%,rgba(248,250,252,0.58)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] max-w-7xl flex-col justify-center px-4 py-8 sm:px-8 sm:py-14 lg:px-10">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex rounded-full border border-[#c8d6f0] bg-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#147f7b] shadow-sm sm:text-xs">
              Services • formations • projets
            </p>
            <h1 className="max-w-3xl animate-fade-in-up text-[2.35rem] font-black leading-[0.98] tracking-tight text-[#06053a] sm:text-5xl lg:text-6xl">
              C2P vous aide à trouver, apprendre et lancer votre projet.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#27346b] sm:text-lg sm:leading-8">
              Une plateforme simple pour réserver un professionnel, acheter une formation utile ou faire accompagner un projet entrepreneurial.
            </p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                to="/auth/register"
                className="c2p-btn-primary min-h-14 w-full px-6 py-4 text-center text-base sm:w-auto"
              >
                Créer mon compte
              </Link>
              <Link
                to="/allopresta"
                className="c2p-btn-secondary min-h-14 w-full border-c2p-accent bg-white/90 px-6 py-4 text-center text-base sm:w-auto"
              >
                Trouver un prestataire
              </Link>
              <Link
                to="/espace-numerique"
                className="c2p-btn-secondary min-h-14 w-full bg-c2p-surface-muted px-6 py-4 text-center text-base text-c2p-muted sm:w-auto"
              >
                Acheter une formation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-6 sm:px-8 lg:px-10">
        <div className="mx-auto -mt-2 grid max-w-7xl gap-3 sm:grid-cols-3 sm:gap-4">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              to={item.path}
              className="group rounded-[22px] border border-[#d6dbe1] bg-white p-4 shadow-[0_14px_36px_rgba(15,28,53,0.08)] transition hover:-translate-y-1 hover:border-[#1a9a96] sm:p-5"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#eaf4ff] text-[#147f7b]">
                  <i className={`${item.icon} text-2xl`}></i>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">{item.label}</p>
                  <h2 className="mt-1 text-lg font-bold leading-tight text-[#06053a]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#4a5b70]">{item.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#147f7b]">
                    {item.cta} <i className="ri-arrow-right-line transition group-hover:translate-x-1"></i>
                  </span>
                </div>
              </div>
            </Link>
          ))}
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
