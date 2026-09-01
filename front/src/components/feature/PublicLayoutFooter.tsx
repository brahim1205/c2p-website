import { Link } from 'react-router-dom';
import BrandLogo from '@/components/base/BrandLogo';
import { apiRequest } from '@/lib/api';
import { FOOTER_CONTACT_LINKS, type PublicInternalLinkHandler } from './publicLayoutModel';

interface PublicLayoutFooterProps {
  onInternalLinkClick: PublicInternalLinkHandler;
}

async function submitNewsletter(form: HTMLFormElement) {
  const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;

  if (!emailInput?.value) return;

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
    successEl?.classList.remove('hidden');
    setTimeout(() => successEl?.classList.add('hidden'), 4000);
  } catch {
    const errorEl = form.querySelector('.newsletter-error');
    errorEl?.classList.remove('hidden');
    setTimeout(() => errorEl?.classList.add('hidden'), 4000);
  }
}

function FooterContactLinks({ onInternalLinkClick }: PublicLayoutFooterProps) {
  return (
    <div className="flex gap-3">
      {FOOTER_CONTACT_LINKS.map((item) => (
        item.internal ? (
          <Link key={item.label} to={item.href} onClick={onInternalLinkClick(item.href)} aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dbe1] bg-white text-[#64748b] transition-all duration-300 hover:border-[#1a9a96] hover:text-[#1a9a96]">
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
  );
}

export default function PublicLayoutFooter({ onInternalLinkClick }: PublicLayoutFooterProps) {
  return (
    <footer className="border-t border-[#d6dbe1] bg-[#ffffff] text-[#0f1c35]">
      <div className="border-b border-[#d6dbe1] bg-[radial-gradient(circle_at_15%_0%,rgba(15,28,53,0.08),transparent_34%),radial-gradient(circle_at_85%_100%,rgba(26,154,150,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,246,244,0.96))]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-18">
          <div className="c2p-panel grid items-center gap-6 p-4 sm:gap-10 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div>
              <p className="c2p-eyebrow mb-3">C2P updates</p>
              <h3 className="max-w-xl text-2xl font-semibold leading-tight text-[#0f1c35] sm:text-3xl lg:text-4xl">
                Restez connecté au hub C2P
              </h3>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#64748b]">
                Abonnements, missions attribuées, formations supervisées et projets suivis : recevez les signaux utiles pour avancer avec l&apos;équipe C2P.
              </p>
            </div>
            <form
              data-readdy-form
              id="footer-newsletter-form"
              aria-label="Inscription à la newsletter C2P"
              onSubmit={(event) => {
                event.preventDefault();
                void submitNewsletter(event.currentTarget);
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Votre adresse email
              </label>
              <input id="footer-newsletter-email" type="email" name="email" placeholder="Votre adresse email" required className="c2p-input min-h-12 w-full flex-1 rounded-full px-5 py-3.5 text-sm" />
              <button type="submit" className="c2p-btn-accent flex min-h-12 w-full items-center justify-center gap-2 px-8 py-3.5 active:scale-95 sm:w-auto">
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

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-5">
              <p className="c2p-eyebrow mb-3">Premium professional hub</p>
              <BrandLogo to="/" className="inline-flex items-center" imageClassName="h-12 w-auto object-contain" />
            </div>
            <p className="mb-7 max-w-sm text-[14px] leading-relaxed text-[#64748b]">
              C2P opere une plateforme SaaS qui centralise les demandes, attribue les missions, supervise les parcours de formation et structure l&apos;accompagnement projet.
            </p>
            <FooterContactLinks onInternalLinkClick={onInternalLinkClick} />
          </div>

          <div>
            <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Modules</h4>
            <ul className="space-y-3">
              <li><Link to="/allopresta" onClick={onInternalLinkClick('/allopresta')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">AlloPresta</Link></li>
              <li><Link to="/espace-numerique" onClick={onInternalLinkClick('/espace-numerique')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Espace Numerique</Link></li>
              <li><Link to="/project-center" onClick={onInternalLinkClick('/project-center')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">ProjectCenter</Link></li>
              <li><Link to="/tarifs" onClick={onInternalLinkClick('/tarifs')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Tarifs</Link></li>
              <li><Link to="/auth/login" onClick={onInternalLinkClick('/auth/login')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Mon espace</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Acces</h4>
            <ul className="space-y-3">
              <li><Link to="/a-propos" onClick={onInternalLinkClick('/a-propos')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">A propos</Link></li>
              <li><Link to="/contact" onClick={onInternalLinkClick('/contact')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Contact</Link></li>
              <li><Link to="/auth/register" onClick={onInternalLinkClick('/auth/register')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Creer un compte</Link></li>
              <li><Link to="/auth/login" onClick={onInternalLinkClick('/auth/login')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Espace C2P</Link></li>
              <li><Link to="/contact" onClick={onInternalLinkClick('/contact')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Parler a C2P</Link></li>
              <li><Link to="/mentions-legales" onClick={onInternalLinkClick('/mentions-legales')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Mentions legales</Link></li>
              <li><Link to="/confidentialite" onClick={onInternalLinkClick('/confidentialite')} className="text-[14px] text-[#64748b] transition-colors duration-200 hover:text-[#0f1c35]">Confidentialite</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="c2p-eyebrow mb-6 tracking-[0.28em]">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0"><i className="ri-map-pin-line text-[#64748b] text-sm"></i></div>
                <span className="text-[14px] leading-relaxed text-[#64748b]">Almadies 2 - Villa n° 39<br />Route des Emetteurs, Keur Massar</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0"><i className="ri-phone-line text-[#64748b] text-sm"></i></div>
                <span className="text-[14px] leading-relaxed text-[#64748b]">+221 78 444 43 46<br />+221 76 744 44 24</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0"><i className="ri-mail-line text-[#64748b] text-sm"></i></div>
                <span className="text-[14px] leading-relaxed text-[#64748b]">c2psenegal@gmail.com<br />senc2p@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-[#d6dbe1]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <div className="text-sm text-[#1a9a96]">© 2026 Groupe C2P Consulting L&amp;M. Tous droits reserves.</div>
          <a href="https://porfolio-theta-orcin.vercel.app/" target="_blank" rel="noreferrer" aria-label="Voir le portfolio de Kodify" className="text-[11px] text-[#64748b] transition-colors hover:text-[#0f1c35]">
            Développé par Kodify
          </a>
          <div className="flex gap-6">
            <Link to="/cgu" onClick={onInternalLinkClick('/cgu')} className="text-sm text-[#1a9a96] transition-colors hover:text-[#0f1c35]">CGU</Link>
            <Link to="/cookies" onClick={onInternalLinkClick('/cookies')} className="text-sm text-[#1a9a96] transition-colors hover:text-[#0f1c35]">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
