import { useState, useEffect, type MouseEvent } from 'react';
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

  const scrollToPageTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    scrollToPageTop();
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navBg = isScrolled
    ? 'border-b border-[#d6dbe1] bg-white/97 shadow-[0_18px_55px_rgba(15,28,53,0.08)] backdrop-blur-md'
    : 'border-b border-[#d6dbe1] bg-white/95 shadow-[0_14px_40px_rgba(15,28,53,0.08)] backdrop-blur-md';
  const getLinkClass = (path: string) => {
    const isActive = path === '/'
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

    return [
      'rounded-full px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-[#0f1c35] text-white shadow-[0_10px_24px_rgba(15,28,53,0.18)]'
        : 'text-[#0f1c35] hover:text-[#1a9a96]',
    ].join(' ');
  };
  const handleInternalLinkClick = (path: string, closeMenu = false) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (closeMenu) {
      setMobileMenuOpen(false);
    }

    if (location.pathname === path) {
      event.preventDefault();
      scrollToPageTop();
    }
  };
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
        <nav aria-label="Navigation publique principale" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
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
                  to="/"
                  onClick={handleInternalLinkClick('/')}
                  className={getLinkClass('/')}
                >
                  Accueil
                </Link>
                <Link
                  to="/allopresta"
                  onClick={handleInternalLinkClick('/allopresta')}
                  className={getLinkClass('/allopresta')}
                >
                  AlloPresta
                </Link>
                <Link
                  to="/espace-numerique"
                  onClick={handleInternalLinkClick('/espace-numerique')}
                  className={getLinkClass('/espace-numerique')}
                >
                  Espace Numérique
                </Link>
                <Link
                  to="/project-center"
                  onClick={handleInternalLinkClick('/project-center')}
                  className={getLinkClass('/project-center')}
                >
                  ProjectCenter
                </Link>
                <Link
                  to="/tarifs"
                  onClick={handleInternalLinkClick('/tarifs')}
                  className={getLinkClass('/tarifs')}
                >
                  Tarifs
                </Link>
                <Link
                  to="/a-propos"
                  onClick={handleInternalLinkClick('/a-propos')}
                  className={getLinkClass('/a-propos')}
                >
                  À propos
                </Link>
                <Link
                  to="/contact"
                  onClick={handleInternalLinkClick('/contact')}
                  className={getLinkClass('/contact')}
                >
                  Contact
                </Link>
                <Link
                  to="/auth/login"
                  onClick={handleInternalLinkClick('/auth/login')}
                  className={getLinkClass('/auth/login')}
                >
                  Connexion
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-menu"
                aria-label={mobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
                className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-[#f7f6f4]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line text-xl text-[#0f1c35]`}></i>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="public-mobile-menu" className="md:hidden border-t border-[#d6dbe1] bg-[#ffffff]/96 shadow-[0_24px_80px_rgba(15,28,53,0.08)] backdrop-blur-md">
              <div className="px-4 py-4 space-y-2">
                <Link
                  to="/"
                  onClick={handleInternalLinkClick('/', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  Accueil
                </Link>
                <Link
                  to="/allopresta"
                  onClick={handleInternalLinkClick('/allopresta', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  AlloPresta
                </Link>
                <Link
                  to="/espace-numerique"
                  onClick={handleInternalLinkClick('/espace-numerique', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  Espace Numérique
                </Link>
                <Link
                  to="/project-center"
                  onClick={handleInternalLinkClick('/project-center', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  ProjectCenter
                </Link>
                <Link
                  to="/tarifs"
                  onClick={handleInternalLinkClick('/tarifs', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  Tarifs
                </Link>
                <Link
                  to="/a-propos"
                  onClick={handleInternalLinkClick('/a-propos', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  À propos
                </Link>
                <Link
                  to="/contact"
                  onClick={handleInternalLinkClick('/contact', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
                >
                  Contact
                </Link>
                <div className="my-2 border-t border-[#d6dbe1]"></div>
                <Link
                  to="/auth/login"
                  onClick={handleInternalLinkClick('/auth/login', true)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-[#64748b] hover:bg-[#ffffff] hover:text-[#0f1c35]"
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
        <footer className="border-t border-[#d6dbe1] bg-[#ffffff] text-[#0f1c35]">
          {/* Newsletter Section */}
          <div className="border-b border-[#d6dbe1] bg-[radial-gradient(circle_at_15%_0%,rgba(15,28,53,0.08),transparent_34%),radial-gradient(circle_at_85%_100%,rgba(26,154,150,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,246,244,0.96))]">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
              <div className="c2p-panel grid items-center gap-10 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
                <div>
                  <p className="c2p-eyebrow mb-3">
                    C2P updates
                  </p>
                  <h3 className="max-w-xl text-2xl font-semibold leading-tight text-[#0f1c35] sm:text-3xl lg:text-4xl">
                    Restez connecte au hub C2P
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#64748b]">
                    Abonnements, missions attribuees, formations supervisees et projets suivis : recevez les signaux utiles pour avancer avec l&apos;equipe C2P.
                  </p>
                </div>
                <form
                  data-readdy-form
                  id="footer-newsletter-form"
                  aria-label="Inscription a la newsletter C2P"
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
                  <label htmlFor="footer-newsletter-email" className="sr-only">
                    Votre adresse email
                  </label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    name="email"
                    placeholder="Votre adresse email"
                    required
                    className="c2p-input min-h-12 flex-1 rounded-full px-5 py-3.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="c2p-btn-accent flex min-h-12 items-center justify-center gap-2 whitespace-nowrap px-8 py-3.5 active:scale-95"
                  >
                    <span>S&apos;inscrire</span>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-arrow-right-line"></i>
                    </div>
                  </button>
                  <div role="status" aria-live="polite" className="newsletter-success hidden w-full sm:w-auto flex items-center gap-2 rounded-full bg-[#ffffff] px-4 py-3 text-sm text-[#64748b]">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className="ri-check-line"></i>
                    </div>
                    <span>Inscription confirmée !</span>
                  </div>
                  <div role="alert" className="newsletter-error hidden w-full sm:w-auto flex items-center gap-2 rounded-full bg-[#f7f6f4] px-4 py-3 text-sm text-[#64748b]">
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
                  <p className="c2p-eyebrow mb-3">
                    Premium professional hub
                  </p>
                  <BrandLogo
                    to="/"
                    className="inline-flex items-center"
                    imageClassName="h-12 w-auto object-contain"
                  />
                </div>
                  <p className="mb-7 max-w-sm text-[14px] leading-relaxed text-[#64748b]">
                  C2P opere une plateforme SaaS qui centralise les demandes, attribue les missions, supervise les parcours de formation et structure l&apos;accompagnement projet.
                </p>
                <div className="flex gap-3">
                  {contactLinks.map((item) => (
                    item.internal ? (
                      <Link key={item.label} to={item.href} onClick={handleInternalLinkClick(item.href)} aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dbe1] bg-white text-[#64748b] transition-all duration-300 hover:border-[#1a9a96] hover:text-[#1a9a96]">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <i className={`${item.icon} text-lg`}></i>
                        </div>
                      </Link>
                    ) : (
                      <a key={item.label} href={item.href} rel="noreferrer" target={item.href.startsWith('http') ? '_blank' : undefined} aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dbe1] bg-white text-[#64748b] transition-all duration-300 hover:border-[#1a9a96] hover:text-[#1a9a96]">
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
                <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Modules</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/allopresta" onClick={handleInternalLinkClick('/allopresta')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">AlloPresta</Link>
                  </li>
                  <li>
                    <Link to="/espace-numerique" onClick={handleInternalLinkClick('/espace-numerique')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Espace Numerique</Link>
                  </li>
                  <li>
                    <Link to="/project-center" onClick={handleInternalLinkClick('/project-center')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">ProjectCenter</Link>
                  </li>
                  <li>
                    <Link to="/dashboard/apprenant/mes-cours" onClick={handleInternalLinkClick('/dashboard/apprenant/mes-cours')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Mes Cours</Link>
                  </li>
                  <li>
                    <Link to="/dashboard" onClick={handleInternalLinkClick('/dashboard')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Mon Dashboard</Link>
                  </li>
                </ul>
              </div>

              {/* Sitemap - Informations */}
              <div>
                <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Acces</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/a-propos" onClick={handleInternalLinkClick('/a-propos')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">A propos</Link>
                  </li>
                  <li>
                    <Link to="/contact" onClick={handleInternalLinkClick('/contact')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Contact</Link>
                  </li>
                  <li>
                    <Link to="/auth/register" onClick={handleInternalLinkClick('/auth/register')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Creer un compte</Link>
                  </li>
                  <li>
                    <Link to="/auth/login" onClick={handleInternalLinkClick('/auth/login')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Espace C2P</Link>
                  </li>
                  <li>
                    <Link to="/contact" onClick={handleInternalLinkClick('/contact')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Parler a C2P</Link>
                  </li>
                  <li>
                    <Link to="/mentions-legales" onClick={handleInternalLinkClick('/mentions-legales')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Mentions legales</Link>
                  </li>
                  <li>
                    <Link to="/confidentialite" onClick={handleInternalLinkClick('/confidentialite')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Confidentialite</Link>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Contact</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-map-pin-line text-[#64748b] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-[#64748b]">
                      Almadies 2 - Villa n° 39<br />
                      Route des Emetteurs, Keur Massar
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-phone-line text-[#64748b] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-[#64748b]">
                      +221 78 444 43 46<br />
                      +221 76 744 44 24
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="ri-mail-line text-[#64748b] text-sm"></i>
                    </div>
                    <span className="text-[14px] leading-relaxed text-[#64748b]">
                      c2psenegal@gmail.com<br />
                      senc2p@gmail.com
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#d6dbe1]">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
              <div className="text-sm text-[#1a9a96]">
                © 2026 Groupe C2P Consulting L&amp;M. Tous droits reserves.
              </div>
              <a
                href="https://porfolio-theta-orcin.vercel.app/"
                target="_blank"
                rel="noreferrer"
                aria-label="Voir le portfolio de Kodify"
                className="text-[11px] text-[#64748b] transition-colors hover:text-[#0f1c35]"
              >
                Développé par Kodify
              </a>
              <div className="flex gap-6">
                <Link to="/cgu" onClick={handleInternalLinkClick('/cgu')} className="text-sm text-[#1a9a96] transition-colors hover:text-[#0f1c35]">CGU</Link>
                <Link to="/cookies" onClick={handleInternalLinkClick('/cookies')} className="text-sm text-[#1a9a96] transition-colors hover:text-[#0f1c35]">Cookies</Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
