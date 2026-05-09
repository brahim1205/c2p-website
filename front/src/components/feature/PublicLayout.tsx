import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { apiRequest } from '@/lib/api';

interface PublicLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

interface FooterContactLink {
  href: string;
  label: string;
  icon: string;
  internal?: boolean;
}

export default function PublicLayout({ children, hideFooter = false, hideHeader = false }: PublicLayoutProps) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navBg = !isScrolled
    ? 'bg-transparent'
    : 'border-b border-white/10 bg-[#090909]/78 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur-2xl';
  const textColor = 'text-[#d5b46f]';
  const linkColor = 'text-[#d5b46f] hover:text-white';
  const contactLinks: FooterContactLink[] = [
    { href: 'https://wa.me/221784444346', label: 'WhatsApp', icon: 'ri-whatsapp-line' },
    { href: 'mailto:c2psenegal@gmail.com', label: 'Email', icon: 'ri-mail-line' },
    { href: 'tel:+221784444346', label: 'Telephone', icon: 'ri-phone-line' },
    { href: '/contact', label: 'Contact', icon: 'ri-map-pin-line', internal: true },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      {!hideHeader && (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <BrandLogo
                to="/"
                className="flex items-center"
                imageClassName="h-10 w-auto object-contain"
              />

              {/* Desktop Links */}
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  to="/allopresta"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  AlloPresta
                </Link>
                <Link
                  to="/espace-numerique"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  Espace Numérique
                </Link>
                <Link
                  to="/project-center"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  ProjectCenter
                </Link>
                <Link
                  to="/a-propos"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  À propos
                </Link>
                <Link
                  to="/contact"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  Contact
                </Link>
                <Link
                  to="/auth/login"
                  className={`text-sm font-medium transition-colors ${linkColor} whitespace-nowrap`}
                >
                  Connexion
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line text-xl text-[#d5b46f]`}></i>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-[#090909]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="px-4 py-4 space-y-2">
                <Link
                  to="/allopresta"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  AlloPresta
                </Link>
                <Link
                  to="/espace-numerique"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  Espace Numérique
                </Link>
                <Link
                  to="/project-center"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  ProjectCenter
                </Link>
                <Link
                  to="/a-propos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  À propos
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  Contact
                </Link>
                <div className="border-t border-white/10 my-2"></div>
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#d5b46f] hover:bg-white/10 hover:text-white"
                >
                  Connexion
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      {!hideFooter && (
        <footer className="border-t border-white/10 bg-[#090909] text-white">
          {/* Newsletter Section */}
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(213,180,111,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
              <div className="grid items-center gap-10 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">
                    C2P updates
                  </p>
                  <h3 className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
                    Restez connecte a l&apos;ecosysteme C2P
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/62">
                    Opportunites, formations, prestataires verifies et projets a fort potentiel : recevez les signaux utiles pour avancer avec le bon accompagnement.
                  </p>
                </div>
                <form
                  data-readdy-form
                  id="footer-newsletter-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new URLSearchParams();
                    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
                    if (!emailInput?.value) return;
                    formData.append('email', emailInput.value);
                    try {
                      await apiRequest('/public/newsletter', {
                        method: 'POST',
                        body: JSON.stringify({
                          email: emailInput.value,
                          source: 'footer-newsletter',
                        }),
                      }, { retryOnAuth: false });
                      emailInput.value = '';
                      const successEl = form.querySelector('.newsletter-success');
                      if (successEl) successEl.classList.remove('hidden');
                      setTimeout(() => {
                        if (successEl) successEl.classList.add('hidden');
                      }, 4000);
                    } catch {
                      const errorEl = form.querySelector('.newsletter-error');
                      if (errorEl) errorEl.classList.remove('hidden');
                      setTimeout(() => {
                        if (errorEl) errorEl.classList.add('hidden');
                      }, 4000);
                    }
                  }}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="Votre adresse email"
                    required
                    className="min-h-12 flex-1 rounded-full border border-white/15 bg-black/30 px-5 py-3.5 text-sm text-white placeholder-white/42 transition-all focus:border-[#d5b46f] focus:outline-none focus:ring-2 focus:ring-[#d5b46f]/25"
                  />
                  <button
                    type="submit"
                    className="flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#d5b46f] px-8 py-3.5 text-sm font-semibold text-[#111] transition-all duration-300 hover:bg-[#f1d58c] hover:shadow-[0_18px_40px_rgba(213,180,111,0.22)] active:scale-95"
                  >
                    <span>S&apos;inscrire</span>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-arrow-right-line"></i>
                    </div>
                  </button>
                  <div className="newsletter-success hidden w-full sm:w-auto flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-check-line"></i>
                    </div>
                    <span>Inscription confirmée !</span>
                  </div>
                  <div className="newsletter-error hidden w-full sm:w-auto flex items-center gap-2 rounded-full bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-error-warning-line"></i>
                    </div>
                    <span>Erreur, réessayez.</span>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Main Footer Content */}
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
              {/* Brand + Description */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="mb-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.34em] text-[#d5b46f]">
                    Premium professional hub
                  </p>
                  <BrandLogo
                    to="/"
                    className="inline-flex items-center"
                    imageClassName="h-12 w-auto object-contain"
                  />
                </div>
                <p className="mb-7 max-w-sm text-[14px] leading-relaxed text-white/58">
                  Groupe C2P Consulting L&amp;M : services, formation et incubation reunis dans une experience professionnelle claire, selective et orientee resultat.
                </p>
                <div className="flex gap-3">
                  {contactLinks.map((item) => (
                    item.internal ? (
                      <Link key={item.label} to={item.href} aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/70 transition-all duration-300 hover:border-[#d5b46f] hover:text-[#d5b46f]">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className={`${item.icon} text-lg`}></i>
                        </div>
                      </Link>
                    ) : (
                      <a key={item.label} href={item.href} rel="noreferrer" target={item.href.startsWith('http') ? '_blank' : undefined} aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/70 transition-all duration-300 hover:border-[#d5b46f] hover:text-[#d5b46f]">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className={`${item.icon} text-lg`}></i>
                        </div>
                      </a>
                    )
                  ))}
                </div>
              </div>

              {/* Sitemap - Services */}
              <div>
                <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#d5b46f]">Modules</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/allopresta" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">AlloPresta</Link>
                  </li>
                  <li>
                    <Link to="/espace-numerique" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Espace Numerique</Link>
                  </li>
                  <li>
                    <Link to="/project-center" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">ProjectCenter</Link>
                  </li>
                  <li>
                    <Link to="/dashboard/apprenant/mes-cours" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Mes Cours</Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Mon Dashboard</Link>
                  </li>
                </ul>
              </div>

              {/* Sitemap - Informations */}
              <div>
                <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#d5b46f]">Acces</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/a-propos" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">A propos</Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Contact</Link>
                  </li>
                  <li>
                    <Link to="/auth/register" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Creer un compte</Link>
                  </li>
                  <li>
                    <Link to="/auth/login" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Connexion</Link>
                  </li>
                  <li>
                    <Link to="/mentions-legales" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Mentions legales</Link>
                  </li>
                  <li>
                    <Link to="/confidentialite" className="text-[14px] text-white/58 transition-colors duration-200 hover:text-[#d5b46f]">Confidentialite</Link>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#d5b46f]">Contact</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-map-pin-line text-[#d5b46f] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-white/58">
                      Almadies 2 - Villa n° 39<br />
                      Route des Emetteurs, Keur Massar
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-phone-line text-[#d5b46f] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-white/58">
                      +221 78 444 43 46<br />
                      +221 76 744 44 24
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-mail-line text-[#d5b46f] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-white/58">
                      c2psenegal@gmail.com<br />
                      senc2p@gmail.com
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
              <div className="text-sm text-white/42">
                © 2026 Groupe C2P Consulting L&amp;M. Tous droits reserves.
              </div>
              <div className="flex gap-6">
                <Link to="/cgu" className="text-sm text-white/42 transition-colors hover:text-[#d5b46f]">CGU</Link>
                <Link to="/cookies" className="text-sm text-white/42 transition-colors hover:text-[#d5b46f]">Cookies</Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
