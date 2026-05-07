import { Link } from 'react-router-dom';

const heroImage =
  '/images/home/hero.jpg';
const ecosystemVideo = '/videos/c2p-ecosystem.mp4';

const fleet = [
  {
    eyebrow: 'AlloPresta',
    title: 'Prestations Qualifiees',
    subtitle: 'Trouvez, comparez et reservez des prestataires verifies pour vos besoins quotidiens ou professionnels.',
    image: '/images/home/service.jpg',
    stats: [
      ['24/7', 'Assistance'],
      ['1.2K+', 'Experts'],
      ['4.8/5', 'Satisfaction'],
    ],
    path: '/allopresta',
  },
  {
    eyebrow: 'Espace Numerique',
    title: 'Formations Certifiantes',
    subtitle: 'Developpez vos competences avec des cours, classes virtuelles, examens et certificats suivis.',
    image: '/images/home/academy.jpg',
    stats: [
      ['50+', 'Formations'],
      ['98%', 'Reussite'],
      ['Live', 'Classes'],
    ],
    path: '/espace-numerique',
  },
  {
    eyebrow: 'ProjectCenter',
    title: 'Incubation de Projets',
    subtitle: 'Soumettez une idee, structurez votre projet, trouvez des mentors et accedez aux partenaires.',
    image: '/images/home/venture.jpg',
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
    title: "Un seul point d'entree",
    text: "Un utilisateur peut trouver un service, suivre une formation ou soumettre un projet sans changer d'ecosysteme.",
    image: '/images/home/precision.jpg',
  },
  {
    title: 'Des profils mieux encadres',
    text: "Prestataires, formateurs, apprenants et porteurs de projets disposent chacun d'un espace adapte a leur role.",
    image: '/images/home/trust.jpg',
  },
  {
    title: "Du besoin a l'impact",
    text: 'C2P relie execution terrain, montee en competence et developpement entrepreneurial pour creer des resultats mesurables.',
    image: '/images/home/support.jpg',
  },
];

const destinations = [
  'Prestataires',
  'Clients',
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
  return (
    <div className="bg-[#090909] text-white">
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Centre C2P premium"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#090909] to-transparent"></div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-32 sm:px-8 lg:px-10">
          <div className="max-w-5xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.38em] text-[#d5b46f]">
              Centre C2P | Services, Formation, Incubation
            </p>
            <h1 className="max-w-3xl animate-fade-in-up text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Le hub professionnel qui transforme vos ambitions en actions.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
              C2P connecte les clients aux prestataires, les apprenants aux formations et les
              porteurs de projets aux ressources qui les font avancer.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-[#d5b46f]"
              >
                Creer mon compte
              </Link>
              <Link
                to="/project-center"
                className="inline-flex items-center justify-center rounded-full border border-white/35 px-7 py-4 text-sm font-semibold text-white transition hover:border-[#d5b46f] hover:text-[#d5b46f]"
              >
                Soumettre un projet
              </Link>
            </div>
          </div>

          <div className="mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 backdrop-blur md:grid-cols-4">
            {[
              ['3', 'Piliers C2P'],
              ['7', 'Espaces roles'],
              ['150+', 'Projets suivis'],
              ['24/7', 'Acces plateforme'],
            ].map(([value, label]) => (
              <div key={label} className="bg-black/35 px-5 py-5">
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative isolate">
        <div className="pointer-events-none sticky top-0 z-0 h-screen overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-[0.52] brightness-110 contrast-110"
            autoPlay
            loop
            muted
            playsInline
            poster="/images/home/global.jpg"
            aria-hidden="true"
          >
            <source src={ecosystemVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#090909]/64"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(213,180,111,0.18),transparent_30%),radial-gradient(circle_at_80%_42%,rgba(255,255,255,0.10),transparent_28%)]"></div>
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#090909] to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#090909] to-transparent"></div>
        </div>

        <div className="relative z-10 -mt-[100vh]">
        <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Ecosysteme C2P</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Une plateforme unique pour travailler, apprendre et entreprendre.
            </h2>
          </div>
          <div className="space-y-8 text-lg leading-9 text-white/70">
            <p>
              Le projet C2P rassemble trois besoins concrets: commander une prestation fiable,
              progresser par la formation et structurer des projets avec un accompagnement visible.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {['AlloPresta', 'Espace Numerique', 'ProjectCenter'].map((item) => (
                <div key={item} className="border-t border-[#d5b46f]/35 pt-4 text-sm uppercase tracking-[0.18em] text-white">
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Modules principaux</p>
              <h2 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">
                Trois portes d&apos;entree pour chaque parcours.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/58">
              Chaque module correspond a un usage clair de la plateforme: trouver une competence,
              se former ou faire avancer un projet.
            </p>
          </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {fleet.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  className="group relative min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/35"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-black/8"></div>
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d5b46f]">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-3 text-4xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-4 min-h-16 text-sm leading-7 text-white/68">{item.subtitle}</p>
                    <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/18">
                      {item.stats.map(([value, label]) => (
                        <div key={label} className="bg-black/45 px-3 py-4">
                          <p className="text-base font-semibold text-white">{value}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/48">{label}</p>
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
          <div className="grid gap-5 lg:grid-cols-3">
            {advantages.map((advantage) => (
              <article key={advantage.title} className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111]/88 shadow-2xl shadow-black/30 backdrop-blur">
                <img src={advantage.image} alt={advantage.title} className="h-64 w-full object-cover" />
                <div className="p-7">
                  <h3 className="text-2xl font-semibold text-white">{advantage.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/62">{advantage.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>
      </div>

      <section className="relative overflow-hidden px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <img
          src="/images/home/global.jpg"
          alt="Reseau global C2P"
          className="absolute inset-0 h-full w-full object-cover opacity-42"
        />
        <div className="absolute inset-0 bg-black/68"></div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Roles et usages</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="animate-fade-in-up text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Un tableau de bord adapte a chaque acteur de l&apos;ecosysteme.
            </h2>
            <p className="text-base leading-8 text-white/68">
              Les droits, les menus et les actions changent selon le profil: client, prestataire,
              apprenant, formateur, porteur, partenaire ou administrateur.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[26px] border border-white/12 bg-white/12 sm:grid-cols-3 lg:grid-cols-6">
            {destinations.map((city) => (
              <div key={city} className="bg-black/50 px-5 py-6 text-center text-sm font-semibold uppercase tracking-[0.16em] text-white/78">
                {city}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Demarrer</p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Choisissez votre role et accedez au bon espace.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/62">
            Que vous soyez client, prestataire, apprenant, formateur ou porteur de projet,
            C2P vous oriente vers les outils utiles des votre connexion.
          </p>
        </div>
        <div className="rounded-[28px] border border-white/12 bg-white/[0.06] p-7">
          <div className="grid gap-4">
            {['Nom complet', 'Email', 'Votre role ou besoin'].map((label) => (
              <label key={label} className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/48">{label}</span>
                <input className="w-full rounded-full border border-white/12 bg-black/40 px-5 py-4 text-white outline-none transition placeholder:text-white/28 focus:border-[#d5b46f]" />
              </label>
            ))}
            <Link
              to="/contact"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-[#d5b46f] px-7 py-4 text-sm font-semibold text-black transition hover:bg-white"
            >
              Contacter C2P
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
