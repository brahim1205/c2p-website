import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api';

const sujets = [
  'Question generale',
  'Formation / Espace Numerique',
  'Service AlloPresta',
  'ProjectCenter / Incubation',
  'Partenariat',
  'Autre',
];

const infos = [
  {
    icon: 'ri-map-pin-line',
    title: 'Adresse',
    lines: ['Almadies 2 - Villa n° 39', 'Route des Emetteurs, Keur Massar'],
  },
  {
    icon: 'ri-phone-line',
    title: 'Telephone',
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

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-[#d5b46f] focus:ring-2 focus:ring-[#d5b46f]/20';

export default function ContactPage() {
  const [charCount, setCharCount] = useState(0);
  const [formState, setFormState] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          firstName: String(formData.get('prenom') || ''),
          lastName: String(formData.get('nom') || ''),
          email: String(formData.get('email') || ''),
          subject: String(formData.get('sujet') || ''),
          message: String(formData.get('message') || ''),
        }),
      }, { retryOnAuth: false });
      form.reset();
      setCharCount(0);
      setFormState('success');
      setTimeout(() => setFormState('idle'), 5000);
    } catch {
      setFormState('error');
      setTimeout(() => setFormState('idle'), 5000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <section className="relative min-h-[620px] overflow-hidden bg-[#090909]">
        <div className="absolute inset-0">
          <img
            src="/images/home/support.jpg"
            alt="Contact C2P"
            className="h-full w-full object-cover object-center opacity-45"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,0.94)_0%,rgba(7,7,7,0.76)_46%,rgba(7,7,7,0.34)_100%)]"></div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0b0b0b] to-transparent"></div>

        <div className="relative z-10 flex min-h-[620px] items-center px-4 pt-24 sm:px-6 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.36em] text-[#d5b46f]">
                Contact C2P
              </p>
              <h1 className="mb-6 text-4xl font-semibold leading-[0.98] text-white sm:text-5xl lg:text-7xl">
                Parlons de votre prochain mouvement professionnel
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                Que vous soyez apprenant, prestataire, formateur, porteur de projet ou partenaire, notre equipe vous oriente vers le bon parcours.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d5b46f]">Message</p>
            <h2 className="mb-2 text-2xl font-semibold text-white sm:text-3xl">Envoyez-nous un message</h2>
            <p className="mb-8 text-sm leading-7 text-white/58">Nous vous repondons sous 24h ouvrees avec une orientation claire.</p>

            <form id="contact-form" data-readdy-form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="prenom" className="mb-1.5 block text-sm font-medium text-white/70">Prenom *</label>
                  <input type="text" id="prenom" name="prenom" required placeholder="Jean" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-white/70">Nom *</label>
                  <input type="text" id="nom" name="nom" required placeholder="Dupont" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">Email *</label>
                <input type="email" id="email" name="email" required placeholder="jean.dupont@email.com" className={inputClass} />
              </div>

              <div>
                <label htmlFor="sujet" className="mb-1.5 block text-sm font-medium text-white/70">Sujet *</label>
                <select id="sujet" name="sujet" required defaultValue="" className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="" disabled>Choisissez un sujet</option>
                  {sujets.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-white/70">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  maxLength={500}
                  rows={5}
                  placeholder="Decrivez votre demande..."
                  onChange={(e) => setCharCount(e.target.value.length)}
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-white/38">Maximum 500 caracteres</span>
                  <span className={`text-xs ${charCount >= 500 ? 'text-red-300' : 'text-white/38'}`}>{charCount}/500</span>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d5b46f] px-8 py-3.5 text-sm font-semibold text-[#111] transition-all hover:bg-white sm:w-auto"
              >
                <span>Envoyer le message</span>
                <i className="ri-send-plane-line text-lg"></i>
              </button>

              {formState === 'success' && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                  Message envoye avec succes. Nous vous repondrons sous peu.
                </div>
              )}
              {formState === 'error' && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  Une erreur est survenue. Veuillez reessayer.
                </div>
              )}
            </form>
          </div>

          <aside className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {infos.map((info) => (
                <div key={info.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#d5b46f] text-[#111]">
                    <i className={`${info.icon} text-xl`}></i>
                  </div>
                  <h3 className="mb-2 font-semibold text-white">{info.title}</h3>
                  {info.lines.map((line) => (
                    <p key={line} className="text-sm leading-6 text-white/58">{line}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(213,180,111,0.16),rgba(255,255,255,0.05))] p-6">
              <h3 className="mb-2 text-xl font-semibold text-white">Vous avez un projet ?</h3>
              <p className="mb-5 text-sm leading-7 text-white/62">
                ProjectCenter peut vous aider a structurer votre idee et preparer votre accompagnement.
              </p>
              <Link to="/project-center" className="inline-flex items-center gap-2 text-sm font-semibold text-[#d5b46f] hover:text-white">
                <span>Explorer ProjectCenter</span>
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#111] px-4 py-16 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">Localisation</p>
            <h2 className="text-3xl font-semibold text-white">Ou nous trouver</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">
              Groupe C2P Consulting L&M, Almadies 2 - Villa n° 39, Route des Emetteurs, Keur Massar, Dakar, Senegal.
            </p>
          </div>
          <div className="h-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] sm:h-[430px]">
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
