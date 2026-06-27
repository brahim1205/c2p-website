import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageMeta';

const pillars = [
  {
    label: 'Prestation',
    title: 'Trouver des experts qualifiés',
    icon: 'ri-service-line',
    path: '/allopresta',
  },
  {
    label: 'Formation',
    title: 'Développer vos compétences',
    icon: 'ri-graduation-cap-line',
    path: '/espace-numerique',
  },
  {
    label: 'Projets',
    title: 'Soumettre ou financer',
    icon: 'ri-rocket-line',
    path: '/project-center',
  },
  {
    label: 'Opportunités',
    title: 'Parcours vers l’autonomie',
    icon: 'ri-sparkling-line',
    path: '/tarifs',
  },
];

const featuredCards = [
  {
    badge: 'AlloPresta',
    title: 'Services professionnels vérifiés',
    description: 'Comparez les prix, la localisation, les notes et demandez un devis.',
    image: '/images/home/service.jpg',
    price: 'Devis encadré',
    rating: '4.8',
    path: '/allopresta',
  },
  {
    badge: 'Espace Numérique',
    title: 'Formations en ligne et certificats',
    description: 'Achetez un cours, suivez les vidéos, documents et évaluations.',
    image: '/images/home/academy.jpg',
    price: 'Accès formation',
    rating: '4.9',
    path: '/espace-numerique',
  },
  {
    badge: 'ProjectCenter',
    title: 'Incubation et financement participatif',
    description: 'Soumettez un projet, trouvez des mentors et partenaires financiers.',
    image: '/images/home/venture.jpg',
    price: 'Dossier projet',
    rating: '4.7',
    path: '/project-center',
  },
  {
    badge: 'Prestataires',
    title: 'Publier vos services',
    description: 'Créez votre offre, ajoutez vos images, prix, zones et disponibilités.',
    image: '/images/home/precision.jpg',
    price: 'Profil public',
    rating: '4.8',
    path: '/auth/register?role=prestataire',
  },
  {
    badge: 'Formateurs',
    title: 'Créer et vendre vos cours',
    description: 'Organisez vos modules, vidéos, documents, classes et certifications.',
    image: '/images/home/support.jpg',
    price: 'Revenus cours',
    rating: '4.9',
    path: '/auth/register?role=formateur',
  },
  {
    badge: 'Partenaires',
    title: 'Coacher ou financer des projets',
    description: 'Recevez les alertes, simulez vos contributions et suivez l’évolution.',
    image: '/images/home/global.jpg',
    price: 'Badge partenaire',
    rating: '4.8',
    path: '/auth/register?role=partenaire',
  },
];

const categories = ['AlloPresta', 'Formation', 'ProjectCenter', 'Partenaires', 'Certification'];

export default function HomePage() {
  usePageMeta({
    title: 'C2P Sénégal | Services, formation et incubation',
    description: 'C2P connecte prestataires, apprenants, entrepreneurs et partenaires dans un écosystème numérique unique.',
    path: '/',
  });

  return (
    <main className="bg-white text-[#0f1c35]">
      <section className="bg-[#eaf8f1]">
        <div className="mx-auto max-w-7xl overflow-hidden px-4 pb-10 pt-24 sm:px-8 lg:px-14 lg:py-16">
          <div className="grid items-center gap-7 lg:min-h-[620px] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative z-10 max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#147f7b] shadow-sm">
                <i className="ri-leaf-line text-base" />
                Construisez vos opportunités avec C2P
              </div>
              <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-[#102033] sm:text-5xl lg:text-6xl">
                Oser rêver et devenir autonome.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-[#526275]">
                C2P est une plateforme qui réunit services professionnels, formations, projets à incuber et partenaires pour vous aider à apprendre, travailler, financer et avancer vers l’autonomie.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#147f7b] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(20,127,123,0.22)] transition hover:bg-[#0f6b68]"
                >
                  Démarrer mon parcours
                </Link>
                <Link
                  to="/allopresta"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#cfe3dd] bg-white px-6 py-3 text-sm font-bold text-[#102033] transition hover:border-[#147f7b]"
                >
                  Nous rejoindre
                </Link>
              </div>
            </div>

            <div className="relative min-h-[270px] sm:min-h-[360px] lg:min-h-[540px]">
              <div className="absolute right-0 top-2 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)]">
                <div className="flex items-center gap-1 text-sm font-black text-[#147f7b]">
                  4.8 <i className="ri-star-fill text-[#f5b642]" />
                </div>
                <p className="text-[11px] font-medium text-[#6b7a8d]">Avis utilisateurs</p>
              </div>

              <div className="absolute left-2 top-16 z-10 rounded-full bg-[#147f7b] px-5 py-4 text-center text-white shadow-[0_18px_40px_rgba(20,127,123,0.28)] sm:left-8">
                <i className="ri-book-open-line text-xl" />
                <p className="mt-1 text-xl font-black leading-none">1,235</p>
                <p className="text-[11px] font-semibold">opportunités</p>
              </div>

              <div className="absolute bottom-2 left-2 z-10 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,28,53,0.12)] sm:left-10">
                <p className="text-xs font-bold text-[#102033]">Services • cours • projets</p>
                <p className="mt-1 text-[11px] text-[#6b7a8d]">Un seul compte pour évoluer</p>
              </div>

              <div className="absolute inset-x-6 bottom-0 h-[74%] rounded-t-full bg-[#ffd15a] sm:inset-x-16" />
              <img
                src="/images/home/acceuil.jpg"
                alt="Utilisateur C2P"
                className="absolute bottom-0 right-0 h-[88%] w-full rounded-b-[28px] object-cover object-center sm:h-[92%] lg:w-[82%]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-[24px] border border-[#e6eee9] bg-white p-4 shadow-[0_18px_50px_rgba(15,28,53,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <Link
              key={pillar.label}
              to={pillar.path}
              className="group rounded-2xl p-4 transition hover:bg-[#f2fbf6]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8ff] text-[#147f7b]">
                <i className={`${pillar.icon} text-2xl`} />
              </span>
              <h2 className="mt-4 text-base font-black text-[#102033]">{pillar.label}</h2>
              <p className="mt-1 text-sm leading-6 text-[#607083]">{pillar.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#147f7b]">Explorer C2P</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#102033] sm:text-4xl">
                Choisissez ce que vous voulez faire.
              </h2>
            </div>
            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] px-4">
              <i className="ri-search-line text-[#147f7b]" />
              <span className="text-sm text-[#708194]">Chercher un service, une formation ou un projet</span>
            </div>
          </div>

          <div className="mb-7 flex gap-2 overflow-x-auto rounded-2xl bg-[#f2fbf6] p-2">
            {categories.map((category, index) => (
              <Link
                key={category}
                to={index === 0 ? '/allopresta' : index === 1 ? '/espace-numerique' : index === 2 ? '/project-center' : '/tarifs'}
                className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-bold transition ${
                  index === 0 ? 'bg-white text-[#147f7b] shadow-sm' : 'text-[#617386] hover:bg-white'
                }`}
              >
                {category}
              </Link>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCards.map((card) => (
              <Link
                key={card.title}
                to={card.path}
                className="group overflow-hidden rounded-[22px] border border-[#e1e8e5] bg-white shadow-[0_18px_44px_rgba(15,28,53,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,28,53,0.1)]"
              >
                <div className="h-48 overflow-hidden p-3">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full rounded-2xl object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="px-5 pb-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#eef9f4] px-3 py-1 text-[11px] font-bold text-[#147f7b]">
                      {card.badge}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#f5a623]">
                      {card.rating} <i className="ri-star-fill" />
                    </span>
                  </div>
                  <h3 className="text-lg font-black leading-snug text-[#102033]">{card.title}</h3>
                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#607083]">{card.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#edf1ef] pt-4">
                    <span className="text-sm font-black text-[#147f7b]">{card.price}</span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f2fbf6] text-[#147f7b] transition group-hover:bg-[#147f7b] group-hover:text-white">
                      <i className="ri-arrow-right-line" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/tarifs"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#147f7b] px-6 py-3 text-sm font-bold text-[#147f7b] transition hover:bg-[#147f7b] hover:text-white"
            >
              Voir les modalités d’accès
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[28px] bg-[#eaf8f1] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-10">
          <div>
            <p className="text-sm font-bold text-[#147f7b]">Devenir acteur C2P</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-[#102033] sm:text-4xl">
              Vous pouvez rejoindre C2P comme prestataire, formateur, porteur de projet ou partenaire.
            </h2>
          </div>
          <Link
            to="/auth/register"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#147f7b] px-7 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(20,127,123,0.22)] transition hover:bg-[#0f6b68]"
          >
            Créer mon compte
          </Link>
        </div>
      </section>
    </main>
  );
}
