import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const heroImage =
  '/images/brand/image1.jpeg';
const ecosystemVideo = '/videos/c2p-ecosystem.mp4';

const fleet = [
  {
    eyebrow: 'AlloPresta',
    title: 'Prestations Qualifiées',
    subtitle: 'Le module SenPresta permet de publier, rechercher et qualifier des prestations, avec prise en charge sensible par le centre d’opération C2P.',
    image: '/images/brand/image2.jpeg',
    stats: [
      ['24/7', 'Assistance'],
      ['1.2K+', 'Experts'],
      ['4.8/5', 'Satisfaction'],
    ],
    path: '/allopresta',
  },
  {
    eyebrow: 'Espace Numérique',
    title: 'Formations Certifiantes',
    subtitle: 'L’Espace Numérique regroupe Form’Actions et l’École Numérique de Dakar, avec cours en ligne, en présentiel, hybrides et programmés.',
    image: '/images/brand/image3.jpeg',
    stats: [
      ['50+', 'Formations'],
      ['98%', 'Reussite'],
      ['Live', 'Classes'],
    ],
    path: '/espace-numerique',
  },
  {
    eyebrow: 'ProjectCenter',
    title: 'Incubation de projets',
    subtitle: 'Projects Center aide les porteurs à structurer leurs dossiers et à mobiliser experts associés, partenaires techniques et financiers.',
    image: '/images/brand/image4',
    stats: [
      ['150+', 'Projets'],
      ['12M', 'FCFA leves'],
      ['Elite', 'Mentorat'],
    ],
    path: '/project-center',
  },
];

const advantages = [
  {
    title: "Un seul point d'entrée",
    text: "Un utilisateur peut trouver un service, suivre une formation ou soumettre un projet sans changer d'écosystème.",
    image: '/images/brand/image5.jpeg',
  },
  {
    title: 'Des profils mieux encadrés',
    text: "Prestataires, formateurs, apprenants et porteurs de projets disposent chacun d'un espace adapté à leur rôle.",
    image: '/images/brand/image6.jpeg',
  },
  {
    title: "Du besoin a l'impact",
    text: 'C2P relie exécution terrain, montée en compétence et développement entrepreneurial pour créer des résultats mesurables.',
    image: '/images/brand/image7.jpeg',
  },
];

const destinations = [
  'Prestataires',
  'Clients / Prestateurs',
  'Apprenants',
  'Formateurs',
  'Porteurs',
  'Partenaires',
  'Admin',
  'Paiements',
  'Messages',
  'Certificats',
  'Projets',
  'Services',
];

export default function HomePage() {
  const navigate = useNavigate();

  const handleStarterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const need = String(formData.get('need') || '').trim();

    if (fullName) params.set('fullName', fullName);
    if (email) params.set('email', email);
    if (need) params.set('need', need);

    navigate(`/contact${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="bg-c2p-bg text-c2p-text">
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Centre C2P premium"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.92)_0%,rgba(247,248,252,0.76)_44%,rgba(247,248,252,0.28)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-32 sm:px-8 lg:px-10">
          <div className="max-w-5xl">
            <p className="c2p-eyebrow mb-5 tracking-[0.38em]">
              Centre C2P | Services, Formation, Incubation
            </p>
            <h1 className="max-w-2xl animate-fade-in-up text-3xl font-semibold leading-[1.08] text-[#06053a] sm:text-4xl lg:text-[3.25rem]">
              Le hub professionnel qui transforme vos ambitions en actions.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#27346b] sm:text-lg">
              C2P relie les besoins de prestations, la montee en competence et l incubation de
              projets autour d un meme centre d operation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="c2p-btn-primary px-7 py-4"
              >
                Creer mon compte
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
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#27346b]">
              Les plans publics concernent surtout les prestataires, formateurs et porteurs de projet.
              Les clients / prestateurs et apprenants peuvent entrer sans abonnement mensuel.
            </p>
          </div>

          <div className="mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/20 bg-white/22 backdrop-blur-[2px] md:grid-cols-4">
            {[
              ['3', 'Piliers C2P'],
              ['7', 'Espaces roles'],
              ['150+', 'Projets suivis'],
              ['24/7', 'Acces plateforme'],
            ].map(([value, label]) => (
              <div key={label} className="bg-white/72 px-5 py-5">
                <p className="text-2xl font-semibold text-[#06053a]">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#5fa6f3]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative isolate bg-[#ffffff]">
        <div className="pointer-events-none sticky top-0 z-0 h-screen overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-[0.18] brightness-125 contrast-105"
            autoPlay
            loop
            muted
            playsInline
            poster="/images/brand/image8.jpeg"
            aria-hidden="true"
          >
            <source src={ecosystemVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#ffffff]/88"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(39,52,107,0.14),transparent_30%),radial-gradient(circle_at_80%_42%,rgba(219,173,41,0.10),transparent_28%)]"></div>
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#ffffff] to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#ffffff] to-transparent"></div>
        </div>

        <div className="relative z-10 -mt-[100vh]">
        <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
            <p className="c2p-eyebrow">Écosystème C2P</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-[#06053a] sm:text-5xl">
              Une plateforme unique pour travailler, apprendre et entreprendre.
            </h2>
          </div>
          <div className="space-y-8 text-lg leading-9 text-[#27346b]">
              <p>
              Le projet C2P rassemble SenPresta pour les prestations, Form’Actions et l’END pour
              la formation, puis Projects Center pour l’incubation et le co-portage.
              </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {['AlloPresta', 'Espace Numérique', 'ProjectCenter'].map((item) => (
                <div key={item} className="border-t border-[#27346b]/45 pt-4 text-sm uppercase tracking-[0.18em] text-[#06053a]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="c2p-eyebrow">Modules principaux</p>
              <h2 className="mt-4 text-4xl font-semibold text-[#06053a] sm:text-6xl">
                Trois portes d&apos;entrée pour chaque parcours.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#27346b]">
              Chaque module correspond à un usage clair de la plateforme : trouver une compétence,
              se former ou faire avancer un projet.
            </p>
          </div>

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
              {fleet.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="group relative min-h-[500px] overflow-hidden rounded-[24px] border border-[#80bfdf] bg-white shadow-[0_20px_56px_rgba(12,14,58,0.10)] sm:min-h-[560px] sm:rounded-[28px] lg:min-h-[620px]"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#ffffff] via-[#ffffff]/68 to-transparent"></div>
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-7">
                    <p className="inline-flex items-center rounded-full border border-white/14 bg-[#06053a]/84 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c24141] shadow-[0_12px_30px_rgba(6,5,58,0.24)] backdrop-blur-[2px] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.28em]">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-[#06053a] sm:text-3xl lg:text-4xl">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#27346b] sm:mt-4 sm:min-h-16 sm:leading-7">{item.subtitle}</p>
                    <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-[#80bfdf] sm:mt-7">
                      {item.stats.map(([value, label]) => (
                        <div key={label} className="bg-[#ffffff] px-2.5 py-3 sm:px-3 sm:py-4">
                          <p className="text-sm font-semibold text-[#06053a] sm:text-base">{value}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#5fa6f3]">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {advantages.map((advantage) => (
              <article key={advantage.title} className="overflow-hidden rounded-[26px] border border-[#80bfdf] bg-white shadow-[0_24px_60px_rgba(12,14,58,0.08)]">
                <img src={advantage.image} alt={advantage.title} className="h-52 w-full object-cover sm:h-64" />
                <div className="p-5 sm:p-7">
                  <h3 className="text-xl font-semibold text-[#06053a] sm:text-2xl">{advantage.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#27346b] sm:mt-4 sm:leading-7">{advantage.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#ffffff] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <img
          src="/images/brand/image8.jpeg"
          alt="Réseau global C2P"
          className="absolute inset-0 h-full w-full object-cover opacity-18"
        />
        <div className="absolute inset-0 bg-[#ffffff]/82"></div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <p className="c2p-eyebrow">Rôles et usages</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="animate-fade-in-up text-3xl font-semibold leading-tight text-[#06053a] sm:text-4xl lg:text-5xl">
              Un tableau de bord adapté à chaque acteur de l&apos;écosystème.
            </h2>
            <p className="rounded-2xl bg-white/88 px-5 py-4 text-base leading-8 text-[#06053a] shadow-[0_14px_34px_rgba(12,14,58,0.08)] backdrop-blur-[2px]">
              Les droits, les menus et les actions changent selon le profil: client / prestateur, prestataire,
              apprenant, formateur, porteur, partenaire ou administrateur.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-[#80bfdf] bg-[#80bfdf] sm:mt-12 sm:rounded-[26px] sm:grid-cols-3 lg:grid-cols-6">
            {destinations.map((city) => (
              <div key={city} className="bg-white px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937] sm:px-5 sm:py-6 sm:text-sm sm:tracking-[0.16em]">
                {city}
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
              <h2 className="text-2xl font-semibold leading-tight text-[#06053a] sm:text-4xl">
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

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-28">
        <div>
          <p className="c2p-eyebrow">Démarrer</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#06053a] sm:text-6xl">
            Choisissez votre rôle et accédez au bon espace.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#27346b]">
            Que vous soyez client / prestateur, prestataire, apprenant, formateur ou porteur de projet,
            C2P vous oriente vers les outils utiles dès votre connexion.
          </p>
        </div>
        <div className="c2p-panel p-7">
          <form className="grid gap-4" onSubmit={handleStarterSubmit}>
            <label htmlFor="starter-full-name" className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#5fa6f3]">Nom complet</span>
              <input
                id="starter-full-name"
                name="fullName"
                type="text"
                className="w-full rounded-full border border-[#80bfdf] bg-[#ffffff] px-5 py-4 text-[#1f2937] outline-none transition placeholder:text-[#94a3b8] focus:border-[#27346b]"
                placeholder="Votre nom complet"
              />
            </label>
            <label htmlFor="starter-email" className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#5fa6f3]">Email</span>
              <input
                id="starter-email"
                name="email"
                type="email"
                className="w-full rounded-full border border-[#80bfdf] bg-[#ffffff] px-5 py-4 text-[#1f2937] outline-none transition placeholder:text-[#94a3b8] focus:border-[#27346b]"
                placeholder="votre@email.com"
              />
            </label>
            <label htmlFor="starter-need" className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#5fa6f3]">Votre rôle ou besoin</span>
              <input
                id="starter-need"
                name="need"
                type="text"
                className="w-full rounded-full border border-[#80bfdf] bg-[#ffffff] px-5 py-4 text-[#1f2937] outline-none transition placeholder:text-[#94a3b8] focus:border-[#27346b]"
                placeholder="Ex. prestataire, apprenant, projet à lancer"
              />
            </label>
            <button
              type="submit"
              className="c2p-btn-accent mt-2 px-7 py-4"
            >
              Contacter C2P
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
