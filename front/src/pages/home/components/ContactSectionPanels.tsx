import type { FormEvent } from 'react';
import { contactInfoItems, contactSocialLinks, type ContactSubmitState } from './contactSectionModel';
import { NewsletterPanel } from './NewsletterPanel';
import { ContactCtas, ContactFormPanel, type ContactFormPanelProps } from './ContactFormPanel';

export function ContactIntroColumn({
  isVisible,
  newsletterEmail,
  newsletterState,
  onNewsletterEmailChange,
  onNewsletterSubmit,
}: {
  isVisible: boolean;
  newsletterEmail: string;
  newsletterState: ContactSubmitState;
  onNewsletterEmailChange: (value: string) => void;
  onNewsletterSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className={`transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}>
      <div className="mb-5 inline-flex items-center gap-2">
        <div className="h-3 w-3 rotate-45 bg-[#5fa6f3]" />
        <span className="text-sm font-medium uppercase tracking-wider text-[#06053a]">Contact</span>
      </div>

      <h2 className="mb-4 text-2xl font-bold leading-tight text-[#06053a] sm:mb-6 sm:text-3xl lg:text-[48px]">
        Restons en<br />
        <span className="text-[#5fa6f3]">Contact</span>
      </h2>

      <p className="mb-8 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base lg:mb-10 lg:text-lg">
        Que vous soyez apprenant, prestataire, formateur ou porteur de projet, notre équipe est là pour vous accompagner. Envoyez-nous un message ou inscrivez-vous à notre newsletter.
      </p>

      <NewsletterPanel
        email={newsletterEmail}
        state={newsletterState}
        onEmailChange={onNewsletterEmailChange}
        onSubmit={onNewsletterSubmit}
      />
      <ContactInfoGrid />
      <SocialLinks />
    </div>
  );
}

export function ContactFormColumn({ isVisible, ...props }: { isVisible: boolean } & ContactFormPanelProps) {
  return (
    <div className={`transition-all delay-200 duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
      <ContactFormPanel {...props} />
      <ContactCtas />
    </div>
  );
}

function ContactInfoGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {contactInfoItems.map((item) => (
        <div key={item.label} className="flex items-start gap-3 rounded-xl p-4 transition-colors duration-300 hover:bg-white/80">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#5fa6f3]/10">
            <div className="flex h-5 w-5 items-center justify-center">
              <i className={`${item.icon} text-[#5fa6f3]`} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-gray-400">{item.label}</div>
            <div className="text-sm font-medium leading-snug text-[#06053a]">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialLinks() {
  return (
    <div className="mt-8 flex gap-4">
      {contactSocialLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          rel="noreferrer"
          target={link.href.startsWith('http') ? '_blank' : undefined}
          aria-label={link.label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all duration-300 hover:border-[#5fa6f3] hover:bg-[#5fa6f3]/5 hover:text-[#5fa6f3]"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <i className={link.icon} />
          </div>
        </a>
      ))}
    </div>
  );
}
