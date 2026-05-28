import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';

const sujets = [
  'Question générale',
  'Formation / Espace Numérique',
  'Service AlloPresta',
  'ProjectCenter / Incubation',
  'Partenariat',
  'Autre',
];

const infos = [
  {
    icon: 'ri-map-pin-line',
    title: 'Adresse',
    lines: ['Almadies 2 - Villa n° 39', 'Route des Émetteurs, Keur Massar'],
  },
  {
    icon: 'ri-phone-line',
    title: 'Téléphone',
    lines: ['+221 78 444 43 46', '+221 76 744 44 24'],
  },
  {
    icon: 'ri-mail-line',
    title: 'Email',
    lines: ['c2psenegal@gmail.com', 'senc2p@gmail.com'],
  },
  {
    icon: 'ri-time-line',
    title: 'Horaires',
    lines: ['Lun - Ven : 8h - 18h'],
  },
];

const inputClass = 'c2p-input w-full px-4 py-3 text-sm';

function splitFullName(value: string) {
  const chunks = value.trim().split(/\s+/).filter(Boolean);
  if (chunks.length <= 1) {
    return {
      firstName: chunks[0] ?? '',
      lastName: '',
    };
  }

  return {
    firstName: chunks.slice(0, -1).join(' '),
    lastName: chunks[chunks.length - 1],
  };
}

export default function ContactPage() {
  usePageMeta({
    title: 'Contact C2P Sénégal | Parler à l’équipe',
    description: "Contactez C2P pour une demande de service, une formation, un projet d'incubation ou un partenariat.",
    path: '/contact',
    image: 'https://c2p.sn/images/home/support.jpg',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [formState, setFormState] = useState<'idle' | 'success' | 'error'>('idle');

  const initialValues = useMemo(() => {
    const fullName = searchParams.get('fullName') ?? '';
    const { firstName, lastName } = splitFullName(fullName);
    const need = searchParams.get('need') ?? '';

    return {
      prenom: firstName,
      nom: lastName,
      email: searchParams.get('email') ?? '',
      sujet: need ? 'Question générale' : '',
      message: need ? `Bonjour C2P,\n\nJe souhaite être recontacté pour le besoin suivant : ${need}` : '',
    };
  }, [searchParams]);

  const [formValues, setFormValues] = useState(initialValues);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const charCount = formValues.message.length;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formValues.prenom,
          lastName: formValues.nom,
          email: formValues.email,
          subject: formValues.sujet,
          message: formValues.message,
        }),
      }, { retryOnAuth: false });
      setFormValues({
        prenom: '',
        nom: '',
        email: '',
        sujet: '',
        message: '',
      });
      setSearchParams({});
      setFormState('success');
      setTimeout(() => setFormState('idle'), 5000);
    } catch {
      setFormState('error');
      setTimeout(() => setFormState('idle'), 5000);
    }
  };

  return (
    <main className="public-premium-page min-h-screen bg-c2p-bg text-c2p-text">
      <section className="relative min-h-[520px] overflow-hidden bg-[#ffffff]">
        <div className="absolute inset-0">
          <img
            src="/images/home/support.jpg"
            alt="Contact C2P"
            className="h-full w-full object-cover object-center opacity-[0.36]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.82)_48%,rgba(248,250,252,0.48)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#ffffff] to-transparent"></div>

        <div className="relative z-10 flex min-h-[520px] items-center px-4 pt-24 sm:px-6 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="c2p-eyebrow mb-5">
                Contact C2P
              </p>
              <h1 className="mb-5 text-4xl font-semibold leading-tight text-[#0f1c35] sm:text-5xl">
                Parlons de votre prochain mouvement professionnel
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#64748b] sm:text-lg">
                Que vous soyez apprenant, prestataire, formateur, porteur de projet ou partenaire, notre équipe vous oriente vers le bon parcours.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-20 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="c2p-panel p-6 sm:p-8 lg:p-10">
            <p className="c2p-eyebrow mb-3">Message</p>
            <h2 className="mb-2 text-2xl font-semibold text-[#0f1c35] sm:text-3xl">Envoyez-nous un message</h2>
            <p className="mb-8 text-sm leading-7 text-[#64748b]">Nous vous répondons sous 24h ouvrées avec une orientation claire.</p>

            <form id="contact-form" data-readdy-form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="prenom" className="mb-1.5 block text-sm font-medium text-[#64748b]">Prénom *</label>
                  <input type="text" id="prenom" name="prenom" required placeholder="Jean" className={inputClass} value={formValues.prenom} onChange={(e) => setFormValues((prev) => ({ ...prev, prenom: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-[#64748b]">Nom *</label>
                  <input type="text" id="nom" name="nom" required placeholder="Dupont" className={inputClass} value={formValues.nom} onChange={(e) => setFormValues((prev) => ({ ...prev, nom: e.target.value }))} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#64748b]">Email *</label>
                <input type="email" id="email" name="email" required placeholder="jean.dupont@email.com" className={inputClass} value={formValues.email} onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))} />
              </div>

              <div>
                <label htmlFor="sujet" className="mb-1.5 block text-sm font-medium text-[#64748b]">Sujet *</label>
                <select id="sujet" name="sujet" required value={formValues.sujet} onChange={(e) => setFormValues((prev) => ({ ...prev, sujet: e.target.value }))} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="" disabled>Choisissez un sujet</option>
                  {sujets.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[#64748b]">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  maxLength={500}
                  rows={5}
                  placeholder="Décrivez votre demande..."
                  value={formValues.message}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, message: e.target.value }))}
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">Maximum 500 caractères</span>
                  <span className={`text-xs ${charCount >= 500 ? 'text-red-500' : 'text-[#94a3b8]'}`}>{charCount}/500</span>
                </div>
              </div>

              <button
                type="submit"
                className="c2p-btn-accent flex w-full items-center justify-center gap-2 px-8 py-3.5 sm:w-auto"
              >
                <span>Envoyer le message</span>
                <i className="ri-send-plane-line text-lg"></i>
              </button>

              {formState === 'success' && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Message envoyé avec succès. Nous vous répondrons sous peu.
                </div>
              )}
              {formState === 'error' && (
                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Une erreur est survenue. Veuillez réessayer.
                </div>
              )}
            </form>
          </div>

          <aside className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {infos.map((info) => (
                <div key={info.title} className="c2p-card rounded-2xl p-5">
                  <div className="c2p-icon-badge mb-4 h-11 w-11">
                    <i className={`${info.icon} text-xl`}></i>
                  </div>
                  <h3 className="mb-2 font-semibold text-[#0f1c35]">{info.title}</h3>
                  {info.lines.map((line) => (
                    <p key={line} className="text-sm leading-6 text-[#64748b]">{line}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="c2p-soft-highlight p-6">
              <h3 className="mb-2 text-xl font-semibold text-[#0f1c35]">Vous avez un projet ?</h3>
              <p className="mb-5 text-sm leading-7 text-[#64748b]">
                ProjectCenter peut vous aider à structurer votre idée et préparer votre accompagnement.
              </p>
              <Link to="/project-center" className="c2p-link inline-flex items-center gap-2 text-sm font-semibold">
                <span>Explorer ProjectCenter</span>
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-[#d6dbe1] bg-[#ffffff] px-4 py-16 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.34em] text-[#1a9a96]">Localisation</p>
            <h2 className="text-3xl font-semibold text-[#0f1c35]">Où nous trouver</h2>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">
              Groupe C2P Consulting L&M, Almadies 2 - Villa n° 39, Route des Émetteurs, Keur Massar, Dakar, Sénégal.
            </p>
          </div>
          <div className="h-[320px] overflow-hidden rounded-[28px] border border-[#d6dbe1] bg-white shadow-[0_22px_60px_rgba(15,28,53,0.06)] sm:h-[430px]">
            <iframe
              title="Carte C2P Dakar"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15438.861977226!2d-17.4534189!3d14.7645042!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xec172f4e3e2f8c5%3A0x3e7f4e3e2f8c5!2sKeur%20Massar%2C%20Dakar%2C%20S%C3%A9n%C3%A9gal!5e0!3m2!1sfr!2s!4v1700000000000!5m2!1sfr!2s"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
