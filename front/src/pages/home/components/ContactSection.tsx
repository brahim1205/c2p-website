import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { apiRequest } from '@/lib/api';

export default function ContactSection() {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>();
  const [newsletterState, setNewsletterState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [contactState, setContactState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('general');
  const formRef = useRef<HTMLFormElement>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setNewsletterState('loading');

    try {
      await apiRequest('/public/newsletter', {
        method: 'POST',
        body: JSON.stringify({
          email: newsletterEmail,
          source: 'home-contact-section',
        }),
      }, { retryOnAuth: false });

      setNewsletterState('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterState('idle'), 4000);
    } catch {
      setNewsletterState('error');
      setTimeout(() => setNewsletterState('idle'), 4000);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !prenom || !nom || !message) return;

    setContactState('loading');

    try {
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          firstName: prenom,
          lastName: nom,
          email,
          subject,
          message,
        }),
      }, { retryOnAuth: false });

      setContactState('success');
      setEmail('');
      setPrenom('');
      setNom('');
      setMessage('');
      setTimeout(() => setContactState('idle'), 4000);
    } catch {
      setContactState('error');
      setTimeout(() => setContactState('idle'), 4000);
    }
  };

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 px-4 sm:px-6 lg:px-20 bg-[#faf8f3] relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#14B8A6]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#1a2b4a]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left column - Newsletter + Info */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-3 h-3 bg-[#14B8A6] rotate-45"></div>
              <span className="text-[#1a2b4a] text-sm font-medium uppercase tracking-wider">Contact</span>
            </div>

            <h2 className="text-[#1a2b4a] font-bold text-2xl sm:text-3xl lg:text-[48px] leading-tight mb-4 sm:mb-6">
              Restons en<br />
              <span className="text-[#14B8A6]">Contact</span>
            </h2>

            <p className="text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed mb-8 lg:mb-10 max-w-lg">
              Que vous soyez apprenant, prestataire, formateur ou porteur de projet, notre équipe est là pour vous accompagner. Envoyez-nous un message ou inscrivez-vous à notre newsletter.
            </p>

            {/* Newsletter mini-card */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-mail-send-line text-[#14B8A6]"></i>
                  </div>
                </div>
                <h3 className="font-semibold text-[#1a2b4a] text-lg">Newsletter C2P</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                Recevez nos meilleures offres de formation, les nouveaux services AlloPresta et les opportunités de financement chaque semaine.
              </p>
              <form
                ref={formRef}
                id="newsletter-contact-form"
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="email"
                  name="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Votre email"
                  required
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50"
                />
                <input type="hidden" name="subject" value="newsletter" />
                <button
                  type="submit"
                  disabled={newsletterState === 'loading'}
                  className="px-6 py-3 bg-[#14B8A6] text-white text-sm font-semibold rounded-xl hover:bg-[#0D9488] hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {newsletterState === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>S'inscrire</span>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-arrow-right-line"></i>
                      </div>
                    </>
                  )}
                </button>
              </form>

              {/* Status messages */}
              {newsletterState === 'success' && (
                <div className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-check-line"></i>
                  </div>
                  <span>Inscription confirmée ! Merci de votre confiance.</span>
                </div>
              )}
              {newsletterState === 'error' && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-error-warning-line"></i>
                  </div>
                  <span>Une erreur est survenue. Veuillez réessayer.</span>
                </div>
              )}
            </div>

            {/* Contact info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: 'ri-map-pin-line', label: 'Adresse', value: 'Avenue de la République, Dakar, Sénégal' },
                { icon: 'ri-phone-line', label: 'Téléphone', value: '+221 33 XXX XX XX' },
                { icon: 'ri-mail-line', label: 'Email', value: 'contact@c2p.africa' },
                { icon: 'ri-time-line', label: 'Horaires', value: 'Lun - Ven : 8h - 18h' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-white/80 transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={`${item.icon} text-[#14B8A6]`}></i>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-[#1a2b4a] text-sm font-medium leading-snug">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              {[
                { icon: 'ri-whatsapp-line', label: 'WhatsApp', href: 'https://wa.me/221784444346' },
                { icon: 'ri-mail-line', label: 'Email', href: 'mailto:c2psenegal@gmail.com' },
                { icon: 'ri-phone-line', label: 'Telephone', href: 'tel:+221784444346' },
                { icon: 'ri-map-pin-line', label: 'Contact', href: '/contact' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  rel="noreferrer"
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#14B8A6] hover:border-[#14B8A6] hover:bg-[#14B8A6]/5 transition-all duration-300"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={s.icon}></i>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Right column - Contact form */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-[#1a2b4a] text-xl mb-1">Envoyez-nous un message</h3>
              <p className="text-gray-500 text-sm mb-6">Nous vous répondons sous 24h ouvrées.</p>

              <form onSubmit={handleContactSubmit} id="contact-form-main" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                    <input
                      type="text"
                      name="prenom"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                    <input
                      type="text"
                      name="nom"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50"
                    placeholder="jean.dupont@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet</label>
                  <select
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50 appearance-none cursor-pointer"
                  >
                    <option value="general">Question générale</option>
                    <option value="formation">Formation / Cours</option>
                    <option value="prestation">Service / AlloPresta</option>
                    <option value="projet">Incubation de projet</option>
                    <option value="partenariat">Partenariat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] transition-all bg-gray-50/50 resize-none"
                    placeholder="Décrivez votre demande..."
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">{message.length}/500</div>
                </div>

                <button
                  type="submit"
                  disabled={contactState === 'loading'}
                  className="w-full group inline-flex items-center justify-center gap-3 bg-[#1a2b4a] text-white px-6 py-4 rounded-xl font-semibold text-sm hover:bg-[#14B8A6] hover:scale-[1.02] active:scale-95 transition-all duration-300 whitespace-nowrap"
                >
                  {contactState === 'loading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Envoyer le message</span>
                      <div className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                        <i className="ri-send-plane-line"></i>
                      </div>
                    </>
                  )}
                </button>

                {contactState === 'success' && (
                  <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                    Message envoye. Nous revenons vers vous rapidement.
                  </div>
                )}
                {contactState === 'error' && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    Impossible d&apos;envoyer le message pour le moment.
                  </div>
                )}
              </form>
            </div>

            {/* Quick CTA below form */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Link
                to="/a-propos"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-[#1a2b4a] hover:border-[#14B8A6] hover:text-[#14B8A6] hover:bg-[#14B8A6]/5 transition-all duration-300 whitespace-nowrap"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-information-line"></i>
                </div>
                <span>En savoir plus sur C2P</span>
              </Link>
              <Link
                to="/auth/register"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#14B8A6]/10 text-sm font-medium text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-all duration-300 whitespace-nowrap"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-user-add-line"></i>
                </div>
                <span>Créer un compte</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
