import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageMeta';

const categories = ['AlloPresta', 'Formations', 'ProjectCenter', 'Partenaires', 'Certificats'];

const platformCards = [
  {
    author: 'C2P AlloPresta',
    tag: 'Services',
    title: 'Trouver un prestataire fiable pour vos besoins',
    image: '/images/home/mechanic-with-spanners-pockets-optimized.webp',
    path: '/allopresta',
    price: 'Devis',
    rating: '4.8',
    meta: 'Prix • localisation • avis',
  },
  {
    author: 'Espace Numérique',
    tag: 'Formation',
    title: 'Suivre des cours, vidéos, documents et certificats',
    image: '/images/home/shocked-international-student-holding-pen-notebook-optimized.webp',
    path: '/espace-numerique',
    price: 'Cours',
    rating: '4.9',
    meta: 'Modules • quiz • suivi',
  },
  {
    author: 'ProjectCenter',
    tag: 'Projet',
    title: 'Soumettre un projet et chercher des partenaires',
    image: '/images/home/modern-man-working-caffe-optimized.webp',
    path: '/project-center',
    price: 'Gratuit',
    rating: '4.7',
    meta: 'Incubation • financement',
  },
  {
    author: 'Prestataires',
    tag: 'AlloPresta',
    title: 'Publier vos services professionnels sur C2P',
    image: '/images/home/close-up-man-working-computer-chips-optimized.webp',
    path: '/auth/register?role=prestataire',
    price: 'Profil',
    rating: '4.8',
    meta: 'Agenda • devis • avis',
  },
  {
    author: 'Formateurs',
    tag: 'Cours',
    title: 'Créer et vendre vos formations numériques',
    image: '/images/home/photo-editor-using-editing-software-digital-workspace-home-optimized.webp',
    path: '/auth/register?role=formateur',
    price: 'Revenus',
    rating: '4.9',
    meta: 'Vidéos • classes • quiz',
  },
  {
    author: 'Partenaires',
    tag: 'Projet',
    title: 'Coacher, financer et suivre des projets',
    image: '/images/home/venture.jpg',
    path: '/auth/register?role=partenaire',
    price: 'Badge',
    rating: '4.8',
    meta: 'Simulation • suivi • contrat',
  },
];

const steps = [
  {
    icon: 'ri-search-line',
    title: 'Trouvez votre parcours',
    text: 'Choisissez un service, une formation ou un projet à accompagner.',
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Réservez ou démarrez',
    text: 'Envoyez une demande, achetez un cours ou soumettez un projet.',
  },
  {
    icon: 'ri-award-line',
    title: 'Devenez autonome',
    text: 'Progressez avec les outils, partenaires, certificats et suivis C2P.',
  },
];

const testimonials = [
  {
    name: 'Awa Diop',
    role: 'Apprenante',
    text: 'J’ai pu suivre une formation complète et retrouver mes documents directement dans mon espace.',
  },
  {
    name: 'Mamadou Fall',
    role: 'Prestataire',
    text: 'C2P me permet de présenter mes services, recevoir des demandes et organiser mes disponibilités.',
  },
];

const news = [
  {
    title: 'Comment préparer un bon profil prestataire',
    tag: 'AlloPresta',
    image: '/images/home/precision.jpg',
    path: '/a-propos',
  },
  {
    title: 'Pourquoi structurer vos cours en modules',
    tag: 'Formation',
    image: '/images/home/front-view-stacked-book-with-glasses-academic-cap-optimized.webp',
    path: '/espace-numerique',
  },
  {
    title: 'Financement participatif : comprendre la logique C2P',
    tag: 'ProjectCenter',
    image: '/images/home/trust.jpg',
    path: '/project-center',
  },
];

export default function HomePage() {
  usePageMeta({
    title: 'C2P Sénégal | Oser rêver et devenir autonome',
    description: 'C2P réunit services professionnels, formations, projets à incuber et partenaires dans un parcours vers l’autonomie.',
    path: '/',
  });

  return (
    <main className="bg-white text-[#123026]">
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

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-black text-[#112238]">Tout l’écosystème C2P</h2>
              <span className="mt-2 block h-1 w-24 rounded-full bg-[#15945f]" />
            </div>
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[#e0ece6] px-4 md:w-80">
              <i className="ri-search-line text-[#15945f]" />
              <input aria-label="Rechercher" placeholder="Rechercher sur C2P" className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>

          <div className="mb-8 flex gap-3 overflow-x-auto rounded-2xl bg-[#edf9f2] p-3">
            {categories.map((category, index) => (
              <Link
                key={category}
                to={index === 0 ? '/allopresta' : index === 1 ? '/espace-numerique' : index === 2 ? '/project-center' : '/tarifs'}
                className={`whitespace-nowrap rounded-xl px-6 py-3 text-sm font-black transition ${index === 0 ? 'bg-white text-[#15945f] shadow-sm' : 'text-[#486254] hover:bg-white'}`}
              >
                {category}
              </Link>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {platformCards.map((card) => (
              <Link key={card.title} to={card.path} className="group rounded-[22px] border border-[#e5eee9] bg-white p-3 shadow-[0_18px_45px_rgba(17,34,56,0.06)] transition hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(17,34,56,0.11)]">
                <img src={card.image} alt={card.title} className="h-48 w-full rounded-2xl object-cover" />
                <div className="px-3 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#7a8898]">{card.author}</span>
                    <span className="rounded-full bg-[#edf9f2] px-3 py-1 text-[11px] font-black text-[#15945f]">{card.tag}</span>
                  </div>
                  <h3 className="min-h-[52px] text-lg font-black leading-tight text-[#112238]">{card.title}</h3>
                  <p className="mt-3 text-sm text-[#6a7b8c]">{card.meta}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#edf1ef] pt-4">
                    <span className="text-sm font-black text-[#15945f]">{card.price}</span>
                    <span className="flex items-center gap-1 text-sm font-black text-[#112238]">
                      {card.rating} <i className="ri-star-fill text-[#f5b642]" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-9 text-center">
            <Link to="/tarifs" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#15945f] px-7 py-3 text-sm font-black text-[#15945f] transition hover:bg-[#15945f] hover:text-white">
              Voir les accès C2P
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[28px] bg-[#eaf8f1] p-7 md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <p className="text-sm font-black text-[#15945f]">Devenir acteur C2P</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight text-[#112238] sm:text-3xl">
              Vous pouvez rejoindre C2P comme prestataire, formateur, porteur de projet ou partenaire.
            </h2>
          </div>
          <Link to="/auth/register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#15945f] px-7 py-3 text-sm font-black text-white transition hover:bg-[#107b50]">
            Déposer mes informations
          </Link>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-black text-[#15945f]">Un parcours simple</p>
          <h2 className="mt-2 text-3xl font-black text-[#112238]">Comment ça marche ?</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[22px] bg-[#eaf8f1] p-7 text-left">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#15945f]">
                  <i className={`${step.icon} text-2xl`} />
                </span>
                <h3 className="mt-6 text-xl font-black text-[#112238]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#667789]">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-0 sm:px-8 lg:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-none bg-gradient-to-r from-[#178750] via-[#239a5f] to-[#2fad71] px-6 py-10 text-white shadow-[0_24px_70px_rgba(23,135,80,0.18)] sm:rounded-[26px] sm:px-12 lg:px-16">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute left-[40%] top-[-40px] h-52 w-52 rounded-full border border-white/50" />
            <div className="absolute right-[8%] top-[-80px] h-80 w-80 rounded-full border border-white/40" />
            <div className="absolute bottom-[-120px] left-[55%] h-72 w-72 rounded-full border border-white/30" />
          </div>
          <div className="pointer-events-none absolute -left-10 bottom-[-60px] h-44 w-44 rounded-full bg-white/10 blur-sm" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-white/75">Ready to start?</p>
              <h2 className="mt-2 max-w-md text-2xl font-black leading-tight sm:text-3xl">
                Download our mobile app. <br />
                for easy to start your course.
              </h2>
            </div>
            <div className="hidden items-center gap-2 text-white/80 md:flex">
              <span className="h-px w-24 bg-white/35" />
              <i className="ri-arrow-right-up-line text-6xl" />
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <a href="/contact" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-left text-[#112238] shadow-[0_16px_34px_rgba(17,34,56,0.16)] transition hover:-translate-y-0.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#15945f]">
                  <i className="ri-google-play-fill text-2xl" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[#64748b]">Get it on</span>
                  <span className="block text-sm font-black">Google Play</span>
                </span>
              </a>
              <a href="/contact" className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-left text-[#112238] shadow-[0_16px_34px_rgba(17,34,56,0.16)] transition hover:-translate-y-0.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc] text-[#112238]">
                  <i className="ri-app-store-fill text-2xl" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[#64748b]">Download on</span>
                  <span className="block text-sm font-black">App Store</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-black text-[#15945f]">Témoignages</p>
          <h2 className="mt-2 text-3xl font-black text-[#112238]">Feedback des utilisateurs</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-[22px] border border-[#e5eee9] bg-white p-8 shadow-[0_18px_45px_rgba(17,34,56,0.05)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf8f1] text-[#15945f]">
                  <i className="ri-user-smile-line text-3xl" />
                </div>
                <div className="mt-4 text-[#f5b642]">
                  <i className="ri-star-fill" /><i className="ri-star-fill" /><i className="ri-star-fill" /><i className="ri-star-fill" /><i className="ri-star-fill" />
                </div>
                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#667789]">{item.text}</p>
                <h3 className="mt-5 font-black text-[#112238]">{item.name}</h3>
                <p className="text-sm text-[#15945f]">{item.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-[#eaf8f1] p-8 text-center">
          <h2 className="text-2xl font-black text-[#112238]">Les acteurs qui font vivre C2P</h2>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {['Prestataires', 'Formateurs', 'Porteurs', 'Partenaires', 'Apprenants'].map((item) => (
              <div key={item} className="rounded-2xl bg-white px-4 py-5 text-sm font-black text-[#15945f] shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black text-[#15945f]">Actualités</p>
            <h2 className="mt-2 text-3xl font-black text-[#112238]">Conseils pour avancer avec C2P</h2>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {news.map((item) => (
              <article key={item.title} className="rounded-[22px] border border-[#e5eee9] bg-white p-3 shadow-[0_18px_45px_rgba(17,34,56,0.06)]">
                <img src={item.image} alt={item.title} className="h-44 w-full rounded-2xl object-cover" />
                <div className="p-4">
                  <span className="text-xs font-black text-[#15945f]">{item.tag}</span>
                  <h3 className="mt-2 text-lg font-black leading-tight text-[#112238]">{item.title}</h3>
                  <Link to={item.path} className="mt-4 inline-flex text-sm font-black text-[#15945f]">
                    Lire plus
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
